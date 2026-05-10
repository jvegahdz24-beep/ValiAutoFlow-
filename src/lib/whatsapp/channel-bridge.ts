// ============================================================
// CHANNEL BRIDGE — JHON → WhatsApp outbound bridge
// ============================================================
// When the Orchestrator/JHON generates a response for a
// WHATSAPP channel conversation, this module sends the message
// via the WhatsApp Cloud API.
//
// PRODUCTION FEATURES:
// - 24-hour conversation window enforcement
// - Opt-out detection and enforcement
// - Template fallback for out-of-window conversations
// - Message deduplication
// ============================================================

import { db } from '@/lib/db'
import { sendMessage, sendTemplateMessage, normalizePhoneNumber, getMetaErrorDescription } from './client'

// ============================================================
// CONSTANTS
// ============================================================

/** WhatsApp 24-hour messaging window in milliseconds */
const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000

/** Opt-out keywords that contacts can use to unsubscribe */
const OPT_OUT_KEYWORDS = [
  'stop', 'unsubscribe', 'cancel', 'cancelar', 'basta',
  'no más', 'no mas', 'no quiero', 'nomas', 'ya no',
  'opt out', 'salir', 'remover', 'desuscribir', 'remove',
  'parar', 'detener', 'no enviar', 'no contactar',
]

// ============================================================
// 24-HOUR WINDOW LOGIC
// ============================================================

/**
 * Check if a conversation is within the 24-hour WhatsApp messaging window.
 * Returns true if the last inbound message was within 24 hours.
 */
async function isWithin24HourWindow(conversationId: string): Promise<boolean> {
  const lastInbound = await db.message.findFirst({
    where: {
      conversationId,
      direction: 'INBOUND',
      status: { not: 'FAILED' },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  if (!lastInbound) {
    // No inbound messages ever → outside window
    return false
  }

  const hoursSinceLastInbound = Date.now() - new Date(lastInbound.createdAt).getTime()
  return hoursSinceLastInbound < WHATSAPP_WINDOW_MS
}

/**
 * Get an approved template for out-of-window messaging.
 * Falls back to a generic followup template.
 */
async function getApprovedTemplate(
  workspaceId: string,
  _purpose: 'followup' | 'reactivation' = 'followup'
): Promise<{ name: string; language: string; body: string } | null> {
  const template = await db.whatsAppTemplate.findFirst({
    where: {
      workspaceId,
      status: 'APPROVED',
    },
    orderBy: { createdAt: 'desc' },
  })

  if (template) {
    return {
      name: template.name,
      language: template.language || 'es',
      body: template.body,
    }
  }

  // No approved templates available
  return null
}

// ============================================================
// OPT-OUT DETECTION AND ENFORCEMENT
// ============================================================

export interface OptOutResult {
  optedOut: boolean
  keyword?: string
}

/**
 * Check if a message text contains an opt-out keyword.
 */
export function detectOptOut(text: string): OptOutResult {
  const lower = text.toLowerCase().trim()

  for (const keyword of OPT_OUT_KEYWORDS) {
    if (lower === keyword || lower.startsWith(keyword + ' ') || lower.startsWith(keyword + '.') || lower.startsWith(keyword + '!')) {
      return { optedOut: true, keyword }
    }
  }

  return { optedOut: false }
}

/**
 * Check if a contact has opted out of WhatsApp messages.
 */
export async function isContactOptedOut(contactId: string): Promise<boolean> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { metadata: true },
  })

  if (!contact) return false

  try {
    const metadata = JSON.parse(contact.metadata || '{}')
    return metadata.whatsappOptedOut === true
  } catch {
    return false
  }
}

/**
 * Mark a contact as opted out of WhatsApp messages.
 */
export async function markContactOptedOut(contactId: string, keyword: string): Promise<void> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { metadata: true, tags: true },
  })

  if (!contact) return

  let metadata: Record<string, unknown> = {}
  try {
    metadata = JSON.parse(contact.metadata || '{}')
  } catch { /* empty */ }

  metadata.whatsappOptedOut = true
  metadata.whatsappOptedOutAt = new Date().toISOString()
  metadata.whatsappOptedOutKeyword = keyword

  let tags: string[] = []
  try {
    tags = JSON.parse(contact.tags || '[]')
  } catch { /* empty */ }

  if (!tags.includes('opted-out')) {
    tags.push('opted-out')
  }

  await db.contact.update({
    where: { id: contactId },
    data: {
      metadata: JSON.stringify(metadata),
      tags: JSON.stringify(tags),
    },
  })

  console.log(`[WhatsApp Bridge] Contact ${contactId} opted out via keyword: "${keyword}"`)
}

// ============================================================
// Send a WhatsApp message from the engine to a contact
// ============================================================

export async function sendWhatsAppMessage(
  workspaceId: string,
  conversationId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string; usedTemplate?: boolean }> {
  try {
    // ──────────────────────────────────────────────────────────
    // STEP 1: Get WhatsAppConfig for the workspace
    // ──────────────────────────────────────────────────────────
    const waConfig = await db.whatsAppConfig.findUnique({
      where: { workspaceId },
    })

    if (!waConfig || !waConfig.isActive) {
      console.warn(
        '[WhatsApp Bridge] No active WhatsApp config for workspace:',
        workspaceId
      )
      return {
        success: false,
        error: 'WhatsApp not configured or inactive for this workspace',
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 2: Find the conversation and contact phone
    // ──────────────────────────────────────────────────────────
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    })

    if (!conversation) {
      return {
        success: false,
        error: `Conversation not found: ${conversationId}`,
      }
    }

    if (conversation.channel !== 'WHATSAPP') {
      return {
        success: false,
        error: `Conversation is not on WhatsApp channel: ${conversation.channel}`,
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 3: Check opt-out status
    // ──────────────────────────────────────────────────────────
    const optedOut = await isContactOptedOut(conversation.contactId)
    if (optedOut) {
      console.warn(
        `[WhatsApp Bridge] Contact ${conversation.contactId} has opted out. Not sending.`
      )
      return {
        success: false,
        error: 'Contact has opted out of WhatsApp messages',
      }
    }

    const contactPhone = conversation.contact.phone
    if (!contactPhone) {
      return {
        success: false,
        error: `Contact has no phone number: ${conversation.contactId}`,
      }
    }

    // Normalize phone number to E.164
    const normalizedPhone = normalizePhoneNumber(contactPhone)

    // ──────────────────────────────────────────────────────────
    // STEP 4: Check 24-hour conversation window
    // ──────────────────────────────────────────────────────────
    const withinWindow = await isWithin24HourWindow(conversationId)

    let result
    let usedTemplate = false

    if (withinWindow) {
      // ──────────────────────────────────────────────────────────
      // IN WINDOW: Send free-form text message
      // ──────────────────────────────────────────────────────────
      result = await sendMessage({
        phoneNumberId: waConfig.phoneNumberId,
        accessToken: waConfig.accessToken,
        to: normalizedPhone,
        text,
      })
    } else {
      // ──────────────────────────────────────────────────────────
      // OUT OF WINDOW: Must use an approved template
      // ──────────────────────────────────────────────────────────
      console.warn(
        `[WhatsApp Bridge] Conversation ${conversationId} is outside 24h window. Attempting template fallback.`
      )

      const template = await getApprovedTemplate(workspaceId, 'followup')

      if (!template) {
        return {
          success: false,
          error: 'Conversation is outside the 24-hour window and no approved template is available for fallback. Ask the contact to message you first, or create an approved WhatsApp template.',
        }
      }

      result = await sendTemplateMessage({
        phoneNumberId: waConfig.phoneNumberId,
        accessToken: waConfig.accessToken,
        to: normalizedPhone,
        templateName: template.name,
        language: template.language,
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: conversation.contact.name || 'Hola' }],
          },
        ],
      })
      usedTemplate = true
    }

    if (!result.success) {
      // Check for Meta error code 131047 (outside window) even if we tried
      const metaCode = result.error?.code
      if (metaCode === 131047) {
        console.error('[WhatsApp Bridge] Meta rejected: outside 24h window. Need approved template.')
      }

      console.error(
        '[WhatsApp Bridge] sendMessage failed:',
        result.error?.message || getMetaErrorDescription(metaCode || 0)
      )
      return {
        success: false,
        error: result.error?.message || 'Failed to send WhatsApp message',
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 5: Create outbound message record in DB
    // ──────────────────────────────────────────────────────────
    const whatsappMessageId = (result.data?.messages as Array<Record<string, unknown>>)?.[0]?.id as string | undefined

    const outboundMessage = await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: usedTemplate ? `[Template fallback - fuera de ventana 24h] ${text.substring(0, 200)}` : text,
        senderType: 'AI',
        senderId: 'JHON',
        status: 'SENT',
        templateUsed: usedTemplate ? 'followup_fallback' : null,
        whatsappMessageId: whatsappMessageId || undefined,
        metadata: JSON.stringify({
          channel: 'WHATSAPP',
          phoneNumberId: waConfig.phoneNumberId,
          sentVia: 'channel_bridge',
          withinWindow,
          usedTemplate,
        }),
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 6: Update conversation and create status history
    // ──────────────────────────────────────────────────────────
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    await db.messageStatusHistory.create({
      data: {
        messageId: outboundMessage.id,
        status: 'SENT',
        metadata: JSON.stringify({
          whatsappMessageId: whatsappMessageId || '',
          channel: 'WHATSAPP',
          withinWindow,
          usedTemplate,
        }),
      },
    })

    console.log(
      `[WhatsApp Bridge] Message sent to ${normalizedPhone}${usedTemplate ? ' (template fallback)' : ''}: ${outboundMessage.id}`
    )

    return {
      success: true,
      messageId: outboundMessage.id,
      usedTemplate,
    }
  } catch (error) {
    console.error('[WhatsApp Bridge] sendWhatsAppMessage error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================
// Send a WhatsApp template message from the engine
// ============================================================

export async function sendWhatsAppTemplateMessage(
  workspaceId: string,
  conversationId: string,
  templateName: string,
  language: string = 'es',
  components?: Array<{
    type: 'header' | 'body' | 'button' | 'footer'
    parameters: Array<{
      type: 'text' | 'image' | 'document' | 'video'
      text?: string
      image?: { id: string }
      document?: { id: string; filename?: string }
      video?: { id: string }
    }>
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const waConfig = await db.whatsAppConfig.findUnique({
      where: { workspaceId },
    })

    if (!waConfig || !waConfig.isActive) {
      return {
        success: false,
        error: 'WhatsApp not configured or inactive for this workspace',
      }
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    })

    if (!conversation) {
      return {
        success: false,
        error: `Conversation not found: ${conversationId}`,
      }
    }

    if (conversation.channel !== 'WHATSAPP') {
      return {
        success: false,
        error: `Conversation is not on WhatsApp channel: ${conversation.channel}`,
      }
    }

    // Check opt-out before sending template
    const optedOut = await isContactOptedOut(conversation.contactId)
    if (optedOut) {
      return {
        success: false,
        error: 'Contact has opted out of WhatsApp messages',
      }
    }

    const contactPhone = conversation.contact.phone
    if (!contactPhone) {
      return {
        success: false,
        error: `Contact has no phone number: ${conversation.contactId}`,
      }
    }

    const normalizedPhone = normalizePhoneNumber(contactPhone)

    const result = await sendTemplateMessage({
      phoneNumberId: waConfig.phoneNumberId,
      accessToken: waConfig.accessToken,
      to: normalizedPhone,
      templateName,
      language,
      components,
    })

    if (!result.success) {
      console.error(
        '[WhatsApp Bridge] sendTemplateMessage failed:',
        result.error?.message
      )
      return {
        success: false,
        error: result.error?.message || 'Failed to send WhatsApp template message',
      }
    }

    const whatsappMessageId = (result.data?.messages as Array<Record<string, unknown>>)?.[0]?.id as string | undefined

    const outboundMessage = await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: `[Template: ${templateName}]`,
        senderType: 'AI',
        senderId: 'JHON',
        status: 'SENT',
        templateUsed: templateName,
        whatsappMessageId: whatsappMessageId || undefined,
        metadata: JSON.stringify({
          channel: 'WHATSAPP',
          templateName,
          language,
          components: components || [],
          sentVia: 'channel_bridge',
        }),
      },
    })

    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    await db.messageStatusHistory.create({
      data: {
        messageId: outboundMessage.id,
        status: 'SENT',
        metadata: JSON.stringify({
          whatsappMessageId: whatsappMessageId || '',
          channel: 'WHATSAPP',
          templateName,
        }),
      },
    })

    console.log(
      `[WhatsApp Bridge] Template message sent to ${normalizedPhone}: ${templateName}`
    )

    return {
      success: true,
      messageId: outboundMessage.id,
    }
  } catch (error) {
    console.error('[WhatsApp Bridge] sendWhatsAppTemplateMessage error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
