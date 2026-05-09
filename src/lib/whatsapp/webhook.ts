// ============================================================
// WHATSAPP WEBHOOK HANDLER — Verify & parse incoming payloads
// ============================================================
// Handles: webhook verification (GET), incoming message parsing,
// and delivery/read status update parsing from Meta.
// ============================================================

// ============================================================
// Types
// ============================================================

/** Parsed incoming WhatsApp message */
export interface ParsedIncomingMessage {
  from: string          // Phone number of the sender (e.g. "5215512345678")
  messageId: string     // WhatsApp message ID (wamid)
  text: string          // Text content (empty string if not a text message)
  timestamp: string     // Unix timestamp of the message
  type: string          // Message type: "text", "image", "document", "audio", "video", "location", "contacts", "sticker", "reaction", "interactive", "button", "order", "system", "unknown"
  mediaId?: string      // Media ID for image/document/audio/video messages
  mimeType?: string     // MIME type of the media
  fileName?: string     // Filename for document messages
  caption?: string      // Caption for image/document messages
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
  raw: Record<string, unknown>  // Original entry for any additional data
}

/** Parsed delivery/read status update */
export interface ParsedStatusUpdate {
  messageId: string     // WhatsApp message ID (wamid)
  status: string        // "sent", "delivered", "read", "failed"
  timestamp: string     // Unix timestamp of the status change
  recipientId: string   // Phone number that the message was sent to
  errors?: Array<{
    code: number
    title: string
    message: string
  }>
  raw: Record<string, unknown>  // Original entry for any additional data
}

/** Webhook verification result */
export interface WebhookVerificationResult {
  verified: boolean
  challenge?: string
  error?: string
}

// ============================================================
// Verify webhook subscription (GET handler logic)
// ============================================================
// Meta sends hub.mode=subscribe, hub.verify_token=<your_token>,
// and hub.challenge=<challenge>. We must verify the token matches
// and return the challenge string.
// ============================================================

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  verifyToken: string
): WebhookVerificationResult {
  if (!mode || !token) {
    return {
      verified: false,
      error: 'Missing hub.mode or hub.verify_token',
    }
  }

  if (mode !== 'subscribe') {
    return {
      verified: false,
      error: `Invalid hub.mode: ${mode}. Expected "subscribe".`,
    }
  }

  if (token !== verifyToken) {
    return {
      verified: false,
      error: 'hub.verify_token does not match the configured verify token',
    }
  }

  // Verified — the challenge will be returned by the caller
  return {
    verified: true,
  }
}

// ============================================================
// Parse incoming message from webhook POST body
// ============================================================
// The Meta webhook payload structure:
// {
//   "object": "whatsapp_business_account",
//   "entry": [{
//     "id": "<WABA_ID>",
//     "changes": [{
//       "value": {
//         "messaging_product": "whatsapp",
//         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
//         "contacts": [{ "profile": { "name": "..." }, "wa_id": "..." }],
//         "messages": [{
//           "from": "5215512345678",
//           "id": "wamid.XXXX",
//           "timestamp": "1234567890",
//           "type": "text",
//           "text": { "body": "Hello" }
//         }]
//       },
//       "field": "messages"
//     }]
//   }]
// }
// ============================================================

export function parseIncomingMessage(
  body: Record<string, unknown>
): ParsedIncomingMessage | null {
  try {
    // Validate top-level structure
    if (body.object !== 'whatsapp_business_account') {
      return null
    }

    const entries = body.entry as Array<Record<string, unknown>> | undefined
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return null
    }

    // Process the first entry (typically only one per webhook)
    const entry = entries[0]
    const changes = entry.changes as Array<Record<string, unknown>> | undefined
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return null
    }

    const change = changes[0]
    if (change.field !== 'messages') {
      return null
    }

    const value = change.value as Record<string, unknown>
    if (!value) return null

    // Check that this is a message (not a status update)
    const messages = value.messages as Array<Record<string, unknown>> | undefined
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return null
    }

    const message = messages[0]
    const messageType = (message.type as string) || 'unknown'
    const from = (message.from as string) || ''
    const messageId = (message.id as string) || ''
    const timestamp = (message.timestamp as string) || ''

    if (!from || !messageId) {
      return null
    }

    // Extract message content based on type
    const parsed: ParsedIncomingMessage = {
      from,
      messageId,
      timestamp,
      type: messageType,
      text: '',
      raw: entry,
    }

    switch (messageType) {
      case 'text': {
        const textObj = message.text as Record<string, unknown> | undefined
        parsed.text = (textObj?.body as string) || ''
        break
      }
      case 'image': {
        const imageObj = message.image as Record<string, unknown> | undefined
        parsed.mediaId = (imageObj?.id as string) || undefined
        parsed.mimeType = (imageObj?.mime_type as string) || undefined
        parsed.caption = (imageObj?.caption as string) || undefined
        parsed.text = (imageObj?.caption as string) || '[Image]'
        break
      }
      case 'document': {
        const docObj = message.document as Record<string, unknown> | undefined
        parsed.mediaId = (docObj?.id as string) || undefined
        parsed.mimeType = (docObj?.mime_type as string) || undefined
        parsed.fileName = (docObj?.filename as string) || undefined
        parsed.caption = (docObj?.caption as string) || undefined
        parsed.text = (docObj?.caption as string) || (docObj?.filename as string) || '[Document]'
        break
      }
      case 'audio': {
        const audioObj = message.audio as Record<string, unknown> | undefined
        parsed.mediaId = (audioObj?.id as string) || undefined
        parsed.mimeType = (audioObj?.mime_type as string) || undefined
        parsed.text = '[Audio]'
        break
      }
      case 'video': {
        const videoObj = message.video as Record<string, unknown> | undefined
        parsed.mediaId = (videoObj?.id as string) || undefined
        parsed.mimeType = (videoObj?.mime_type as string) || undefined
        parsed.caption = (videoObj?.caption as string) || undefined
        parsed.text = (videoObj?.caption as string) || '[Video]'
        break
      }
      case 'sticker': {
        const stickerObj = message.sticker as Record<string, unknown> | undefined
        parsed.mediaId = (stickerObj?.id as string) || undefined
        parsed.mimeType = (stickerObj?.mime_type as string) || undefined
        parsed.text = '[Sticker]'
        break
      }
      case 'location': {
        const locObj = message.location as Record<string, unknown> | undefined
        if (locObj) {
          parsed.location = {
            latitude: (locObj.latitude as number) || 0,
            longitude: (locObj.longitude as number) || 0,
            name: (locObj.name as string) || undefined,
            address: (locObj.address as string) || undefined,
          }
        }
        parsed.text = parsed.location
          ? `📍 ${parsed.location.name || parsed.location.address || `${parsed.location.latitude}, ${parsed.location.longitude}`}`
          : '[Location]'
        break
      }
      case 'contacts': {
        const contactsArr = message.contacts as Array<Record<string, unknown>> | undefined
        if (contactsArr && contactsArr.length > 0) {
          const contact = contactsArr[0]
          const nameObj = contact.name as Record<string, unknown> | undefined
          const phones = contact.phones as Array<Record<string, unknown>> | undefined
          const contactName = (nameObj?.formatted_name as string) || 'Unknown'
          const phone = phones && phones.length > 0 ? (phones[0].phone as string) || '' : ''
          parsed.text = `👤 ${contactName}${phone ? ` - ${phone}` : ''}`
        } else {
          parsed.text = '[Contact]'
        }
        break
      }
      case 'interactive': {
        const interactiveObj = message.interactive as Record<string, unknown> | undefined
        if (interactiveObj) {
          const interactiveType = (interactiveObj.type as string) || ''
          if (interactiveType === 'button_reply') {
            const buttonReply = interactiveObj.button_reply as Record<string, unknown> | undefined
            parsed.text = (buttonReply?.title as string) || '[Button Reply]'
          } else if (interactiveType === 'list_reply') {
            const listReply = interactiveObj.list_reply as Record<string, unknown> | undefined
            parsed.text = (listReply?.title as string) || '[List Reply]'
          } else if (interactiveType === 'nfm_reply') {
            const nfmReply = interactiveObj.nfm_reply as Record<string, unknown> | undefined
            parsed.text = (nfmReply?.body as string) || '[Flow Reply]'
          } else {
            parsed.text = `[Interactive: ${interactiveType}]`
          }
        }
        break
      }
      case 'button': {
        const buttonObj = message.button as Record<string, unknown> | undefined
        parsed.text = (buttonObj?.text as string) || '[Button]'
        break
      }
      case 'reaction': {
        const reactionObj = message.reaction as Record<string, unknown> | undefined
        const emoji = (reactionObj?.emoji as string) || ''
        parsed.text = emoji || '[Reaction removed]'
        break
      }
      case 'order': {
        const orderObj = message.order as Record<string, unknown> | undefined
        parsed.text = `[Order: ${orderObj?.catalog_id || 'unknown'}]`
        break
      }
      case 'system': {
        const systemObj = message.system as Record<string, unknown> | undefined
        parsed.text = (systemObj?.body as string) || '[System message]'
        break
      }
      default:
        parsed.text = `[${messageType}]`
        break
    }

    // Also extract contact name if available
    const contacts = value.contacts as Array<Record<string, unknown>> | undefined
    if (contacts && contacts.length > 0) {
      const profile = contacts[0].profile as Record<string, unknown> | undefined
      const waId = (contacts[0].wa_id as string) || ''
      // Store the contact's WhatsApp name and wa_id in raw for reference
      parsed.raw = {
        ...parsed.raw,
        contactName: (profile?.name as string) || '',
        contactWaId: waId,
      }
    }

    return parsed
  } catch (error) {
    console.error('[WhatsApp Webhook] parseIncomingMessage error:', error)
    return null
  }
}

// ============================================================
// Parse delivery/read status update from webhook POST body
// ============================================================
// Status update payload structure:
// {
//   "object": "whatsapp_business_account",
//   "entry": [{
//     "id": "<WABA_ID>",
//     "changes": [{
//       "value": {
//         "messaging_product": "whatsapp",
//         "metadata": { "display_phone_number": "...", "phone_number_id": "..." },
//         "statuses": [{
//           "id": "wamid.XXXX",
//           "status": "delivered",
//           "timestamp": "1234567890",
//           "recipient_id": "5215512345678"
//         }]
//       },
//       "field": "messages"
//     }]
//   }]
// }
// ============================================================

export function parseStatusUpdate(
  body: Record<string, unknown>
): ParsedStatusUpdate | null {
  try {
    if (body.object !== 'whatsapp_business_account') {
      return null
    }

    const entries = body.entry as Array<Record<string, unknown>> | undefined
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return null
    }

    const entry = entries[0]
    const changes = entry.changes as Array<Record<string, unknown>> | undefined
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return null
    }

    const change = changes[0]
    if (change.field !== 'messages') {
      return null
    }

    const value = change.value as Record<string, unknown>
    if (!value) return null

    // Check for statuses array
    const statuses = value.statuses as Array<Record<string, unknown>> | undefined
    if (!statuses || !Array.isArray(statuses) || statuses.length === 0) {
      return null
    }

    const status = statuses[0]
    const messageId = (status.id as string) || ''
    const statusValue = (status.status as string) || ''
    const timestamp = (status.timestamp as string) || ''
    const recipientId = (status.recipient_id as string) || ''

    if (!messageId || !statusValue) {
      return null
    }

    const parsed: ParsedStatusUpdate = {
      messageId,
      status: statusValue,
      timestamp,
      recipientId,
      raw: entry,
    }

    // Extract errors if present (for failed status)
    const errors = status.errors as Array<Record<string, unknown>> | undefined
    if (errors && Array.isArray(errors) && errors.length > 0) {
      parsed.errors = errors.map(e => ({
        code: (e.code as number) || 0,
        title: (e.title as string) || '',
        message: (e.message as string) || ((e.error_data as Record<string, unknown> | undefined)?.message as string) || '',
      }))
    }

    return parsed
  } catch (error) {
    console.error('[WhatsApp Webhook] parseStatusUpdate error:', error)
    return null
  }
}
