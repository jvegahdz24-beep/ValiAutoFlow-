// ============================================================
// CHANNEL BRIDGE — JHON → WhatsApp outbound bridge
// ============================================================
// When the Orchestrator/JHON generates a response for a
// WHATSAPP channel conversation, this module sends the message
// via the WhatsApp Cloud API.
//
// Called from the engine/process route after JHON generates a
// response for WHATSAPP channel conversations.
// ============================================================

import { db } from '@/lib/db'
import { sendMessage, sendTemplateMessage } from './client'

// ============================================================
// Send a WhatsApp message from the engine to a contact
// ============================================================
// Looks up the WhatsAppConfig for the workspace, finds the
// contact's phone number, and sends the message via the
// WhatsApp Cloud API client.
// ============================================================

export async function sendWhatsAppMessage(
  workspaceId: string,
  conversationId: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    // Verify this is a WhatsApp conversation
    if (conversation.channel !== 'WHATSAPP') {
      return {
        success: false,
        error: `Conversation is not on WhatsApp channel: ${conversation.channel}`,
      }
    }

    const contactPhone = conversation.contact.phone

    if (!contactPhone) {
      return {
        success: false,
        error: `Contact has no phone number: ${conversation.contactId}`,
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 3: Send the message via WhatsApp Cloud API
    // ──────────────────────────────────────────────────────────
    const result = await sendMessage({
      phoneNumberId: waConfig.phoneNumberId,
      accessToken: waConfig.accessToken,
      to: contactPhone,
      text,
    })

    if (!result.success) {
      console.error(
        '[WhatsApp Bridge] sendMessage failed:',
        result.error?.message
      )
      return {
        success: false,
        error: result.error?.message || 'Failed to send WhatsApp message',
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 4: Create outbound message record in DB
    // ──────────────────────────────────────────────────────────
    const whatsappMessageId = (result.data?.messages as Array<Record<string, unknown>>)?.[0]?.id as string | undefined

    const outboundMessage = await db.message.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        content: text,
        senderType: 'AI',
        senderId: 'JHON',
        status: 'SENT',
        metadata: JSON.stringify({
          whatsappMessageId: whatsappMessageId || '',
          channel: 'WHATSAPP',
          phoneNumberId: waConfig.phoneNumberId,
          sentVia: 'channel_bridge',
        }),
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 5: Update conversation's lastMessageAt
    // ──────────────────────────────────────────────────────────
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 6: Create initial status history entry
    // ──────────────────────────────────────────────────────────
    await db.messageStatusHistory.create({
      data: {
        messageId: outboundMessage.id,
        status: 'SENT',
        metadata: JSON.stringify({
          whatsappMessageId: whatsappMessageId || '',
          channel: 'WHATSAPP',
        }),
      },
    })

    console.log(
      `[WhatsApp Bridge] Message sent to ${contactPhone}: ${outboundMessage.id}`
    )

    return {
      success: true,
      messageId: outboundMessage.id,
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
    // ──────────────────────────────────────────────────────────
    // STEP 1: Get WhatsAppConfig for the workspace
    // ──────────────────────────────────────────────────────────
    const waConfig = await db.whatsAppConfig.findUnique({
      where: { workspaceId },
    })

    if (!waConfig || !waConfig.isActive) {
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

    const contactPhone = conversation.contact.phone
    if (!contactPhone) {
      return {
        success: false,
        error: `Contact has no phone number: ${conversation.contactId}`,
      }
    }

    // ──────────────────────────────────────────────────────────
    // STEP 3: Send the template message
    // ──────────────────────────────────────────────────────────
    const result = await sendTemplateMessage({
      phoneNumberId: waConfig.phoneNumberId,
      accessToken: waConfig.accessToken,
      to: contactPhone,
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

    // ──────────────────────────────────────────────────────────
    // STEP 4: Create outbound message record
    // ──────────────────────────────────────────────────────────
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
        metadata: JSON.stringify({
          whatsappMessageId: whatsappMessageId || '',
          channel: 'WHATSAPP',
          templateName,
          language,
          components: components || [],
          sentVia: 'channel_bridge',
        }),
      },
    })

    // ──────────────────────────────────────────────────────────
    // STEP 5: Update conversation and create status history
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
          templateName,
        }),
      },
    })

    console.log(
      `[WhatsApp Bridge] Template message sent to ${contactPhone}: ${templateName}`
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
