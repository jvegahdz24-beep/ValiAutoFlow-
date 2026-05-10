// ============================================================
// WHATSAPP CLOUD API CLIENT — Meta Business API wrapper
// ============================================================
// Handles: sending text messages, template messages, media
// messages, interactive messages, marking messages as read,
// uploading media, and downloading media from Meta Graph API.
// ============================================================

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// ============================================================
// Types
// ============================================================

interface SendMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  text: string
}

interface SendTemplateMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  templateName: string
  language: string
  components?: WhatsAppTemplateComponent[]
}

interface SendMediaMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  type: 'image' | 'document' | 'audio' | 'video' | 'sticker'
  mediaId: string
  caption?: string
  filename?: string
}

interface SendInteractiveMessageParams {
  phoneNumberId: string
  accessToken: string
  to: string
  bodyText: string
  buttons: Array<{ id: string; title: string }>
  headerText?: string
  footerText?: string
}

interface MarkMessageReadParams {
  phoneNumberId: string
  accessToken: string
  messageId: string
}

interface UploadMediaParams {
  phoneNumberId: string
  accessToken: string
  file: File | Blob
}

interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button' | 'footer'
  parameters: WhatsAppTemplateParameter[]
}

interface WhatsAppTemplateParameter {
  type: 'text' | 'image' | 'document' | 'video'
  text?: string
  image?: { id: string }
  document?: { id: string; filename?: string }
  video?: { id: string }
}

interface WhatsAppApiResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: {
    code: number
    message: string
    type: string
    fbtrace_id?: string
    error_subcode?: number
  }
}

// ============================================================
// Meta Error Code Map — for production error handling
// ============================================================

export const META_ERROR_CODES: Record<number, string> = {
  368: 'Template not found or not approved',
  131047: 'Message outside the 24-hour conversation window',
  131008: 'Recipient phone number not opted in',
  131009: 'Recipient phone number not registered',
  131010: 'Media upload error',
  131013: 'Template parameter count mismatch',
  131026: 'Message undeliverable — phone number may be invalid',
  131031: 'Rate limit exceeded — slow down sending',
  131042: 'Template not available in target language',
  131045: 'Media URL download failed',
  131052: 'Message type not supported',
  131073: 'User is not a valid WhatsApp user',
  100: 'Invalid parameter — check request body',
}

/**
 * Get a human-readable description for a Meta API error code.
 */
export function getMetaErrorDescription(code: number): string {
  return META_ERROR_CODES[code] || `Unknown Meta error code: ${code}`
}

// ============================================================
// Helper — Build common headers
// ============================================================

function buildHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

// ============================================================
// Send a text message
// ============================================================

export async function sendMessage(
  params: SendMessageParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, to, text } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`

    // WhatsApp text limit: 4096 chars. Truncate if needed.
    const truncatedText = text.length > 4096 ? text.substring(0, 4093) + '...' : text

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: truncatedText },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errCode = data.error?.code || response.status
      const errDesc = getMetaErrorDescription(errCode)
      console.error(
        `[WhatsApp Client] sendMessage error [${errCode}]: ${data.error?.message || errDesc}`
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText} — ${errDesc}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] sendMessage exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Send a template message
// ============================================================

export async function sendTemplateMessage(
  params: SendTemplateMessageParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, to, templateName, language, components } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`

    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: language },
    }

    if (components && components.length > 0) {
      template.components = components
    }

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errCode = data.error?.code || response.status
      console.error(
        `[WhatsApp Client] sendTemplateMessage error [${errCode}]: ${data.error?.message}`
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] sendTemplateMessage exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Send a media message (image, document, audio, video, sticker)
// ============================================================

export async function sendMediaMessage(
  params: SendMediaMessageParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, to, type, mediaId, caption, filename } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`

    const mediaContent: Record<string, unknown> = { id: mediaId }
    if (caption && (type === 'image' || type === 'document' || type === 'video')) {
      mediaContent.caption = caption
    }
    if (filename && type === 'document') {
      mediaContent.filename = filename
    }

    const body = {
      messaging_product: 'whatsapp',
      to,
      type,
      [type]: mediaContent,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errCode = data.error?.code || response.status
      console.error(
        `[WhatsApp Client] sendMediaMessage error [${errCode}]: ${data.error?.message}`
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] sendMediaMessage exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Send an interactive message (buttons)
// ============================================================

export async function sendInteractiveMessage(
  params: SendInteractiveMessageParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, to, bodyText, buttons, headerText, footerText } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`

    // WhatsApp allows max 3 buttons
    const limitedButtons = buttons.slice(0, 3).map(b => ({
      type: 'reply' as const,
      reply: { id: b.id, title: b.title.substring(0, 20) }, // Max 20 chars
    }))

    const interactive: Record<string, unknown> = {
      type: 'button',
      body: { text: bodyText.substring(0, 1024) },
      action: { buttons: limitedButtons },
    }

    if (headerText) {
      interactive.header = { type: 'text', text: headerText.substring(0, 60) }
    }
    if (footerText) {
      interactive.footer = { text: footerText.substring(0, 60) }
    }

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errCode = data.error?.code || response.status
      console.error(
        `[WhatsApp Client] sendInteractiveMessage error [${errCode}]: ${data.error?.message}`
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] sendInteractiveMessage exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Download media from Meta
// ============================================================

export async function downloadMedia(
  mediaId: string,
  accessToken: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Step 1: Get the media URL from Meta
    const url = `${GRAPH_API_BASE}/${mediaId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(accessToken),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to get media URL',
      }
    }

    // Meta returns { url: "https://..." } — this URL is valid for 5 minutes
    return {
      success: true,
      url: data.url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================================
// Mark a message as read
// ============================================================

export async function markMessageRead(
  params: MarkMessageReadParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, messageId } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`

    const body = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(
        '[WhatsApp Client] markMessageRead error:',
        data.error?.message || data
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] markMessageRead exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Upload media to WhatsApp
// ============================================================

export async function uploadMedia(
  params: UploadMediaParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, file } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/media`

    const formData = new FormData()
    formData.append('file', file)
    formData.append('messaging_product', 'whatsapp')
    formData.append('type', file.type || 'application/octet-stream')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(
        '[WhatsApp Client] uploadMedia error:',
        data.error?.message || data
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] uploadMedia exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Subscribe app to WABA
// ============================================================

export async function subscribeAppToWaba(
  wabaId: string,
  accessToken: string
): Promise<WhatsAppApiResponse> {
  try {
    const url = `${GRAPH_API_BASE}/${wabaId}/subscribed_apps`

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(
        '[WhatsApp Client] subscribeAppToWaba error:',
        data.error?.message || data
      )
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('[WhatsApp Client] subscribeAppToWaba exception:', error)
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Get phone number details from Meta
// ============================================================

export async function getPhoneNumberDetails(
  phoneNumberId: string,
  accessToken: string
): Promise<WhatsAppApiResponse> {
  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(accessToken),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || {
          code: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`,
          type: 'http_error',
        },
      }
    }

    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'network_error',
      },
    }
  }
}

// ============================================================
// Validate phone number format (E.164)
// ============================================================

const E164_REGEX = /^\+[1-9]\d{1,14}$/

export function isValidPhoneNumber(phone: string): boolean {
  return E164_REGEX.test(phone)
}

/**
 * Normalize a phone number to E.164 format.
 * Handles common LATAM formats: 5215512345678 → +5215512345678
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '')
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}
