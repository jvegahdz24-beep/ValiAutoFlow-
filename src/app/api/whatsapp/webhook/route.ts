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
import { isPrismaReachable, upsertContact, findConversationByContact, createRecord, updateRecord, findMany, findById as findByIdSupabase, updateRecordBy } from '@/lib/db-supabase'
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
    let config: any = null
    const prismaOK = await isPrismaReachable()
    if (prismaOK) {
      config = await db.whatsAppConfig.findFirst({
        where: { verifyToken: token || '' },
      })
    } else {
      // Fallback: search via Supabase REST API
      const { data, error } = await (await import('@/lib/db-supabase')).findMany('whatsapp_configs', { verifyToken: token || '' }, { limit: 1 })
      config = data || (Array.isArray(data) ? data[0] : null)
      // findMany returns array, get first item
      if (Array.isArray(data)) config = data[0] || null
    }

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
    console.error('[WhatsApp Webhook] GET — Verification successful for workspace:', config.workspaceId)
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

    const rawBody = await request.text()
    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // ──────────────────────────────────────────────────────────
    // EVOLUTION API / BAILEYS RAILWAY MESSAGES
    // ──────────────────────────────────────────────────────────
    // Messages from the persistent Baileys server on Railway
    // have the header x-evolution-source: baileys-railway
    // and a different JSON format than Meta Cloud API.
    const evolutionSource = request.headers.get('x-evolution-source')
    if (evolutionSource === 'baileys-railway' || body.source === 'baileys_railway') {
      await handleEvolutionMessage(body)
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // ──────────────────────────────────────────────────────────
    // HMAC SIGNATURE VERIFICATION (Meta Cloud API only)
    // ──────────────────────────────────────────────────────────
    // Meta signs every webhook POST with X-Hub-Signature-256
    // We must verify it to prevent spoofed messages.
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
      // Uses the indexed whatsappMessageId field for O(1) lookup
      // ──────────────────────────────────────────────────────────
      if (incomingMessage.messageId) {
      let existingMessage: any = null
      const prismaOK = await isPrismaReachable()
      if (prismaOK) {
        existingMessage = await db.message.findUnique({
          where: { whatsappMessageId: incomingMessage.messageId },
          select: { id: true },
        })
      } else {
        // Fallback: check via Supabase
        const { data: msgs } = await (await import('@/lib/db-supabase')).findMany('messages', { whatsappMessageId: incomingMessage.messageId }, { limit: 1 })
        existingMessage = msgs?.[0] || null
      }

      if (existingMessage) {
        console.error(`[WhatsApp Webhook] Duplicate messageId: ${incomingMessage.messageId}. Skipping.`)
        return NextResponse.json({ status: 'ok' }, { status: 200 })
      }
    }

      // ──────────────────────────────────────────────────────────
      // HANDLE INCOMING MESSAGE
      // ──────────────────────────────────────────────────────────
      await handleIncomingMessage(incomingMessage, body)
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Neither message nor status — could be a system event or unknown payload
    console.error('[WhatsApp Webhook] POST — Unrecognized payload, object:', body.object)
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
    let waConfig: any = null
    const prismaOK2 = await isPrismaReachable()
    if (prismaOK2) {
      waConfig = await db.whatsAppConfig.findFirst({
        where: {
          phoneNumberId,
          isActive: true,
        },
      })
    } else {
      // Fallback: search via Supabase
      const configs = await findMany('whatsapp_configs', { phoneNumberId, isActive: true }, { limit: 1 })
      waConfig = configs?.[0] || null
    }

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

    // Find or create Contact
    let contact: any = null
    const prismaOK3 = await isPrismaReachable()
    if (prismaOK3) {
      contact = await db.contact.upsert({
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
    } else {
      // Fallback: use Supabase REST upsert
      contact = await upsertContact(workspaceId, contactPhone, {
        id: `${workspaceId}_wa_${contactPhone}`,
        name: contactName,
        source: 'WHATSAPP',
        metadata: JSON.stringify({
          whatsappId: contactPhone,
          firstMessageAt: new Date().toISOString(),
        }),
      })
    }

    // ──────────────────────────────────────────────────────────
    // STEP 5: Find or create Conversation
    // ──────────────────────────────────────────────────────────
    // Look for an active conversation for this contact on WhatsApp
    let conversation: any = null
    const prismaOK4 = await isPrismaReachable()
    if (prismaOK4) {
      conversation = await db.conversation.findFirst({
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
    } else {
      // Fallback: find or create via Supabase
      conversation = await findConversationByContact(workspaceId, contact.id)
      if (!conversation) {
        conversation = await createRecord('conversations', {
          workspaceId,
          contactId: contact.id,
          channel: 'WHATSAPP',
          status: 'ACTIVE',
          currentStage: 'EXPLORATION',
        })
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 5b: CHECK FOR OPT-OUT KEYWORDS
    // ──────────────────────────────────────────────────────────
    if (parsed.text) {
      const optOutResult = detectOptOut(parsed.text)
      if (optOutResult.optedOut) {
        await markContactOptedOut(contact.id, optOutResult.keyword || 'unknown')

        // Create inbound message record but do NOT route to engine
        const prismaOK5 = await isPrismaReachable()
        if (prismaOK5) {
          await db.message.create({
            data: {
              conversationId: conversation.id,
              direction: 'INBOUND',
              content: parsed.text,
              senderType: 'LEAD',
              status: 'DELIVERED',
              whatsappMessageId: parsed.messageId,
              metadata: JSON.stringify({
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
        } else {
          // Fallback: Supabase REST
          await createRecord('messages', {
            conversationId: conversation.id,
            direction: 'INBOUND',
            content: parsed.text,
            senderType: 'LEAD',
            status: 'DELIVERED',
            whatsappMessageId: parsed.messageId,
            metadata: JSON.stringify({ optOut: true, optOutKeyword: optOutResult.keyword }),
          })
          await createRecord('messages', {
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            content: 'Recibimos tu solicitud. No te enviaremos más mensajes por WhatsApp. Si cambias de opinión, envíanos un mensaje.',
            senderType: 'AI',
            senderId: 'SYSTEM',
            status: 'SENT',
            metadata: JSON.stringify({ type: 'opt_out_confirmation' }),
          })
        }

        console.error(`[WhatsApp Webhook] Contact ${contact.id} opted out via "${optOutResult.keyword}"`)
        return
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 6: Create the inbound message
    // ──────────────────────────────────────────────────────────
    // Create the inbound message
    const prismaOK6 = await isPrismaReachable()
    if (prismaOK6) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          content: parsed.text,
          senderType: 'LEAD',
          status: 'DELIVERED',
          whatsappMessageId: parsed.messageId,
          metadata: JSON.stringify({
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

      // Update conversation's lastMessageAt
      await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })
    } else {
      // Fallback: Supabase REST
      await createRecord('messages', {
        conversationId: conversation.id,
        direction: 'INBOUND',
        content: parsed.text,
        senderType: 'LEAD',
        status: 'DELIVERED',
        whatsappMessageId: parsed.messageId,
        metadata: JSON.stringify({
          messageType: parsed.type,
          from: parsed.from,
          timestamp: parsed.timestamp,
        }),
      })
      // Update conversation's lastMessageAt
      await updateRecord('conversations', conversation.id, { lastMessageAt: new Date().toISOString() })
    }

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

    console.error(
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

    // Find the message by WhatsApp message ID
    let message: any = null
    const prismaOK7 = await isPrismaReachable()
    if (prismaOK7) {
      message = await db.message.findUnique({
        where: { whatsappMessageId: parsed.messageId },
      })
    } else {
      // Fallback: Supabase REST
      const msgs = await findMany('messages', { whatsappMessageId: parsed.messageId }, { limit: 1 })
      message = msgs?.[0] || null
    }

    if (message) {
      // Update message status
      if (prismaOK7) {
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
        // Fallback: Supabase REST
        await updateRecord('messages', message.id, { status: internalStatus })
        await createRecord('message_status_histories', {
          messageId: message.id,
          status: internalStatus,
          metadata: JSON.stringify({
            whatsappMessageId: parsed.messageId,
            recipientId: parsed.recipientId,
            timestamp: parsed.timestamp,
          }),
        })
      }
    } else {
      // Message not found in our DB — could be a status for a message
      // sent outside our system. Log it for debugging.
      console.error(
        `[WhatsApp Webhook] Status update for unknown message: ${parsed.messageId} → ${parsed.status}`
      )
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] handleStatusUpdate error:', error)
  }
}

// ============================================================
// Handle Evolution API / Baileys Railway messages
// ============================================================
// Payload format from server-v2.js:
// {
//   event: 'messages.upsert',
//   instance: 'ws_xxxxx',
//   data: { key, pushName, message, messageTimestamp, source },
//   from: '521234567890',
//   text: 'Hello',
//   isGroup: false,
//   workspaceId: 'xxx',
//   phone: '521234567890',    // connected phone
//   timestamp: '2024-01-01T00:00:00.000Z'
// }
// ============================================================

async function handleEvolutionMessage(body: Record<string, unknown>): Promise<void> {
  try {
    const from = body.from as string | undefined
    const text = body.text as string | undefined
    const workspaceId = body.workspaceId as string | undefined
    const instanceName = body.instance as string | undefined
    const data = body.data as Record<string, unknown> | undefined
    const pushName = (data?.pushName as string) || ''
    const isGroup = body.isGroup as boolean | false
    const msgKey = data?.key as Record<string, unknown> | undefined
    const messageId = msgKey?.id as string | undefined

    if (!from || !text || !workspaceId) {
      console.warn('[WhatsApp Webhook] Evolution message missing required fields:', { from, text: text?.substring(0, 20), workspaceId })
      return
    }

    // Skip group messages for now (can be enabled later)
    if (isGroup) {
      console.log('[WhatsApp Webhook] Skipping group message from', from)
      return
    }

    console.log(`[WhatsApp Webhook] Evolution message: from=${from}, text="${text.substring(0, 40)}", workspace=${workspaceId.substring(0, 8)}`)

    // Deduplication
    if (messageId) {
      let existingMessage: any = null
      const prismaOK = await isPrismaReachable()
      if (prismaOK) {
        existingMessage = await db.message.findUnique({
          where: { whatsappMessageId: messageId },
          select: { id: true },
        })
      } else {
        const { data: msgs } = await (await import('@/lib/db-supabase')).findMany('messages', { whatsappMessageId: messageId }, { limit: 1 })
        existingMessage = msgs?.[0] || null
      }
      if (existingMessage) {
        console.log('[WhatsApp Webhook] Duplicate Evolution messageId:', messageId)
        return
      }
    }

    // Find or create Contact
    const contactName = pushName || `WhatsApp ${from}`
    const contactPhone = from

    let contact: any = null
    const prismaOK3 = await isPrismaReachable()
    if (prismaOK3) {
      contact = await db.contact.upsert({
        where: { id: `${workspaceId}_wa_${contactPhone}` },
        create: {
          id: `${workspaceId}_wa_${contactPhone}`,
          workspaceId,
          phone: contactPhone,
          name: contactName,
          source: 'WHATSAPP',
          metadata: JSON.stringify({
            whatsappId: contactPhone,
            firstMessageAt: new Date().toISOString(),
            baileysInstance: instanceName,
          }),
        },
        update: {
          name: contactName !== `WhatsApp ${from}` ? contactName : undefined,
          phone: contactPhone,
        },
      })
    } else {
      contact = await upsertContact(workspaceId, contactPhone, {
        id: `${workspaceId}_wa_${contactPhone}`,
        name: contactName,
        source: 'WHATSAPP',
        metadata: JSON.stringify({
          whatsappId: contactPhone,
          firstMessageAt: new Date().toISOString(),
          baileysInstance: instanceName,
        }),
      })
    }

    // Find or create Conversation
    let conversation: any = null
    const prismaOK4 = await isPrismaReachable()
    if (prismaOK4) {
      conversation = await db.conversation.findFirst({
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
    } else {
      conversation = await findConversationByContact(workspaceId, contact.id)
      if (!conversation) {
        conversation = await createRecord('conversations', {
          workspaceId,
          contactId: contact.id,
          channel: 'WHATSAPP',
          status: 'ACTIVE',
          currentStage: 'EXPLORATION',
        })
      }
    }

    // Check for opt-out keywords
    if (text) {
      const optOutResult = detectOptOut(text)
      if (optOutResult.optedOut) {
        await markContactOptedOut(contact.id, optOutResult.keyword || 'unknown')
        const prismaOK5 = await isPrismaReachable()
        if (prismaOK5) {
          await db.message.create({
            data: {
              conversationId: conversation.id,
              direction: 'INBOUND',
              content: text,
              senderType: 'LEAD',
              status: 'DELIVERED',
              whatsappMessageId: messageId,
              metadata: JSON.stringify({ optOut: true, optOutKeyword: optOutResult.keyword, source: 'baileys_railway' }),
            },
          })
        } else {
          await createRecord('messages', {
            conversationId: conversation.id,
            direction: 'INBOUND',
            content: text,
            senderType: 'LEAD',
            status: 'DELIVERED',
            whatsappMessageId: messageId,
            metadata: JSON.stringify({ optOut: true, optOutKeyword: optOutResult.keyword, source: 'baileys_railway' }),
          })
        }
        return
      }
    }

    // Create inbound message
    const prismaOK6 = await isPrismaReachable()
    if (prismaOK6) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          content: text,
          senderType: 'LEAD',
          status: 'DELIVERED',
          whatsappMessageId: messageId,
          metadata: JSON.stringify({
            source: 'baileys_railway',
            instance: instanceName,
            pushName,
            from,
          }),
        },
      })
      await db.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      })
    } else {
      await createRecord('messages', {
        conversationId: conversation.id,
        direction: 'INBOUND',
        content: text,
        senderType: 'LEAD',
        status: 'DELIVERED',
        whatsappMessageId: messageId,
        metadata: JSON.stringify({
          source: 'baileys_railway',
          instance: instanceName,
          pushName,
          from,
        }),
      })
      await updateRecord('conversations', conversation.id, { lastMessageAt: new Date().toISOString() })
    }

    // Route to engine/process pipeline
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      await fetch(`${appUrl}/api/engine/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': process.env.INTERNAL_API_KEY || '',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          messageContent: text,
          workspaceId,
        }),
      })
    } catch (engineError) {
      console.error('[WhatsApp Webhook] Engine process error (Evolution):', engineError)
    }

    console.log(`[WhatsApp Webhook] Evolution message processed: ${messageId} from ${from} in workspace ${workspaceId.substring(0, 8)}`)
  } catch (error) {
    console.error('[WhatsApp Webhook] handleEvolutionMessage error:', error)
  }
}
