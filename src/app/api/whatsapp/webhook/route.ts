// ============================================================
// WHATSAPP WEBHOOK API ROUTE — Meta Cloud API endpoint
// ============================================================
// GET  — Webhook verification (Meta subscription handshake)
// POST — Receive incoming messages and status updates
//
// IMPORTANT: POST must always return 200 to Meta, even on errors.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyWebhook, parseIncomingMessage, parseStatusUpdate } from '@/lib/whatsapp/webhook'
import { markMessageRead } from '@/lib/whatsapp/client'
import { verifyMetaSignature, checkRateLimit, getClientIdentifier } from '@/lib/security'
import { detectOptOut, markContactOptedOut } from '@/lib/whatsapp/channel-bridge'

// ============================================================
// GET — Webhook Verification
// ============================================================
// Meta sends: ?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=<CHALLENGE>
// We must find the WhatsAppConfig where verifyToken matches, then
// return hub.challenge as plain text with HTTP 200.
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    // Look up WhatsAppConfig where verifyToken matches
    const config = await db.whatsAppConfig.findFirst({
      where: { verifyToken: token || '' },
    })

    if (!config) {
      console.warn('[WhatsApp Webhook] GET — No config found for verify_token:', token)
      return new NextResponse('Forbidden', { status: 403 })
    }

    const result = verifyWebhook(mode, token, config.verifyToken)

    if (!result.verified) {
      console.warn('[WhatsApp Webhook] GET — Verification failed:', result.error)
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Return the challenge string as plain text
    console.log('[WhatsApp Webhook] GET — Verification successful for workspace:', config.workspaceId)
    return new NextResponse(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    console.error('[WhatsApp Webhook] GET — Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// ============================================================
// POST — Receive incoming messages & status updates
// ============================================================
// 1. Parse the incoming payload
// 2. If it's a message → find workspace → find/create Contact →
//    find/create Conversation → route to engine/process
// 3. If it's a status update → update MessageStatusHistory
// 4. ALWAYS return 200 to Meta
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // ──────────────────────────────────────────────────────────
    // RATE LIMIT: Prevent abuse on webhook endpoint
    // ──────────────────────────────────────────────────────────
    const clientId = getClientIdentifier(request)
    const rateCheck = checkRateLimit(`wa_webhook_${clientId}`, { limit: 100, windowMs: 60_000 })
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 60_000) / 1000)) } }
      )
    }

    // ──────────────────────────────────────────────────────────
    // HMAC SIGNATURE VERIFICATION
    // ──────────────────────────────────────────────────────────
    // Meta signs every webhook POST with X-Hub-Signature-256
    // We must verify it to prevent spoofed messages.
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const appSecret = process.env.WHATSAPP_APP_SECRET || ''

    if (appSecret) {
      // If APP_SECRET is configured, enforce HMAC verification
      const isValid = await verifyMetaSignature(rawBody, signature, appSecret)
      if (!isValid) {
        console.warn('[WhatsApp Webhook] POST — Invalid HMAC signature. Possible spoofed payload.')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      // PRODUCTION: Fail closed if no APP_SECRET configured
      console.error('[WhatsApp Webhook] POST — CRITICAL: WHATSAPP_APP_SECRET not set in production. Rejecting all webhook calls.')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    } else {
      // Development only: log warning but allow
      console.warn('[WhatsApp Webhook] POST — WHATSAPP_APP_SECRET not set. HMAC verification skipped. SET IT IN PRODUCTION!')
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 1: Determine if this is a message or a status update
    // ──────────────────────────────────────────────────────────
    const incomingMessage = parseIncomingMessage(body)
    const statusUpdate = parseStatusUpdate(body)

    if (statusUpdate) {
      // ──────────────────────────────────────────────────────────
      // HANDLE STATUS UPDATE (delivered, read, failed)
      // ──────────────────────────────────────────────────────────
      await handleStatusUpdate(statusUpdate)
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    if (incomingMessage) {
      // ──────────────────────────────────────────────────────────
      // DEDUPLICATION: Check if we already processed this messageId
      // ──────────────────────────────────────────────────────────
      const existingMessage = await db.message.findFirst({
        where: {
          metadata: { contains: incomingMessage.messageId },
          direction: 'INBOUND',
        },
        select: { id: true },
      })

      if (existingMessage) {
        console.log(`[WhatsApp Webhook] Duplicate messageId: ${incomingMessage.messageId}. Skipping.`)
        return NextResponse.json({ status: 'ok' }, { status: 200 })
      }

      // ──────────────────────────────────────────────────────────
      // HANDLE INCOMING MESSAGE
      // ──────────────────────────────────────────────────────────
      await handleIncomingMessage(incomingMessage, body)
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Neither message nor status — could be a system event or unknown payload
    console.log('[WhatsApp Webhook] POST — Unrecognized payload, object:', body.object)
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (error) {
    // ALWAYS return 200 to Meta, even on errors
    console.error('[WhatsApp Webhook] POST — Error:', error)
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}

// ============================================================
// Handle incoming message: find workspace → contact → conversation → process
// ============================================================

async function handleIncomingMessage(
  parsed: ReturnType<typeof parseIncomingMessage>,
  rawBody: Record<string, unknown>
): Promise<void> {
  if (!parsed) return

  try {
    // ──────────────────────────────────────────────────────────
    // STEP 2: Find the workspace by matching WhatsAppConfig
    // ──────────────────────────────────────────────────────────
    // Extract the phone_number_id from the webhook payload metadata
    const entries = (rawBody.entry ?? []) as Array<Record<string, unknown>>
    const firstEntry = entries[0] as Record<string, unknown> | undefined
    const changes = (firstEntry?.changes ?? []) as Array<Record<string, unknown>>
    const value = (changes[0]?.value ?? {}) as Record<string, unknown>
    const metadata = value?.metadata as Record<string, unknown> | undefined
    const phoneNumberId = (metadata?.phone_number_id as string) || ''

    // Find the WhatsAppConfig by phoneNumberId
    const waConfig = await db.whatsAppConfig.findFirst({
      where: {
        phoneNumberId,
        isActive: true,
      },
    })

    if (!waConfig) {
      console.warn(
        '[WhatsApp Webhook] No active config found for phoneNumberId:',
        phoneNumberId
      )
      return
    }

    const workspaceId = waConfig.workspaceId

    // ──────────────────────────────────────────────────────────
    // STEP 3: Mark message as read (best practice)
    // ──────────────────────────────────────────────────────────
    markMessageRead({
      phoneNumberId: waConfig.phoneNumberId,
      accessToken: waConfig.accessToken,
      messageId: parsed.messageId,
    }).catch(err =>
      console.error('[WhatsApp Webhook] markMessageRead error:', err)
    )

    // ──────────────────────────────────────────────────────────
    // STEP 4: Find or create Contact
    // ──────────────────────────────────────────────────────────
    const contactName = (parsed.raw?.contactName as string) || `WhatsApp ${parsed.from}`
    const contactPhone = parsed.from

    const contact = await db.contact.upsert({
      where: {
        id: `${workspaceId}_wa_${contactPhone}`,
      },
      create: {
        id: `${workspaceId}_wa_${contactPhone}`,
        workspaceId,
        phone: contactPhone,
        name: contactName,
        source: 'WHATSAPP',
        metadata: JSON.stringify({
          whatsappId: contactPhone,
          firstMessageAt: new Date().toISOString(),
        }),
      },
      update: {
        name: contactName !== `WhatsApp ${parsed.from}` ? contactName : undefined,
        phone: contactPhone,
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 5: Find or create Conversation
    // ──────────────────────────────────────────────────────────
    // Look for an active conversation for this contact on WhatsApp
    let conversation = await db.conversation.findFirst({
      where: {
        workspaceId,
        contactId: contact.id,
        channel: 'WHATSAPP',
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          workspaceId,
          contactId: contact.id,
          channel: 'WHATSAPP',
          status: 'ACTIVE',
          currentStage: 'EXPLORATION',
        },
      })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 5b: CHECK FOR OPT-OUT KEYWORDS
    // ──────────────────────────────────────────────────────────
    if (parsed.text) {
      const optOutResult = detectOptOut(parsed.text)
      if (optOutResult.optedOut) {
        await markContactOptedOut(contact.id, optOutResult.keyword || 'unknown')

        // Create inbound message record but do NOT route to engine
        await db.message.create({
          data: {
            conversationId: conversation.id,
            direction: 'INBOUND',
            content: parsed.text,
            senderType: 'LEAD',
            status: 'DELIVERED',
            metadata: JSON.stringify({
              whatsappMessageId: parsed.messageId,
              optOut: true,
              optOutKeyword: optOutResult.keyword,
            }),
          },
        })

        // Send confirmation
        await db.message.create({
          data: {
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            content: 'Recibimos tu solicitud. No te enviaremos más mensajes por WhatsApp. Si cambias de opinión, envíanos un mensaje.',
            senderType: 'AI',
            senderId: 'SYSTEM',
            status: 'SENT',
            metadata: JSON.stringify({
              type: 'opt_out_confirmation',
            }),
          },
        })

        console.log(`[WhatsApp Webhook] Contact ${contact.id} opted out via "${optOutResult.keyword}"`)
        return
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 6: Create the inbound message
    // ──────────────────────────────────────────────────────────
    const inboundMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        content: parsed.text,
        senderType: 'LEAD',
        status: 'DELIVERED',
        metadata: JSON.stringify({
          whatsappMessageId: parsed.messageId,
          messageType: parsed.type,
          from: parsed.from,
          timestamp: parsed.timestamp,
          mediaId: parsed.mediaId || undefined,
          mimeType: parsed.mimeType || undefined,
          fileName: parsed.fileName || undefined,
          caption: parsed.caption || undefined,
          location: parsed.location || undefined,
        }),
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 7: Update conversation's lastMessageAt
    // ──────────────────────────────────────────────────────────
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 8: Route to engine/process pipeline
    // ──────────────────────────────────────────────────────────
    // Call the engine process API to run through the 7 Carnales pipeline
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const processUrl = `${appUrl}/api/engine/process`

      await fetch(processUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          messageContent: parsed.text,
          workspaceId,
        }),
      })
    } catch (engineError) {
      console.error('[WhatsApp Webhook] Engine process error:', engineError)
      // Don't throw — we still return 200 to Meta
    }

    console.log(
      `[WhatsApp Webhook] Message processed: ${parsed.messageId} from ${parsed.from} in workspace ${workspaceId}`
    )
  } catch (error) {
    console.error('[WhatsApp Webhook] handleIncomingMessage error:', error)
  }
}

// ============================================================
// Handle status update: update MessageStatusHistory
// ============================================================

async function handleStatusUpdate(
  parsed: ReturnType<typeof parseStatusUpdate>
): Promise<void> {
  if (!parsed) return

  try {
    // Map WhatsApp status to our internal status
    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    }

    const internalStatus = statusMap[parsed.status] || parsed.status.toUpperCase()

    // Find the message by WhatsApp message ID stored in metadata
    const message = await db.message.findFirst({
      where: {
        metadata: { contains: parsed.messageId },
      },
    })

    if (message) {
      // Update message status
      await db.message.update({
        where: { id: message.id },
        data: { status: internalStatus },
      })

      // Create status history entry
      await db.messageStatusHistory.create({
        data: {
          messageId: message.id,
          status: internalStatus,
          metadata: JSON.stringify({
            whatsappMessageId: parsed.messageId,
            recipientId: parsed.recipientId,
            timestamp: parsed.timestamp,
            errors: parsed.errors || undefined,
          }),
        },
      })
    } else {
      // Message not found in our DB — could be a status for a message
      // sent outside our system. Log it for debugging.
      console.log(
        `[WhatsApp Webhook] Status update for unknown message: ${parsed.messageId} → ${parsed.status}`
      )
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] handleStatusUpdate error:', error)
  }
}
