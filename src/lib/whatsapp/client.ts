// ============================================================
// WHATSAPP CLOUD API CLIENT — Meta Business API wrapper
// ============================================================
// Handles: sending text messages, template messages, marking
// messages as read, and uploading media to the Meta Graph API.
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
  }
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
// POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
// Body: { messaging_product: "whatsapp", to, type: "text", text: { body } }
// ============================================================

export async function sendMessage(
  params: SendMessageParams
): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken, to, text } = params

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`

    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(accessToken),
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(
        '[WhatsApp Client] sendMessage error:',
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
// POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
// Body: { messaging_product: "whatsapp", to, type: "template", template: { name, language: { code }, components } }
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
      console.error(
        '[WhatsApp Client] sendTemplateMessage error:',
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
// Mark a message as read
// ============================================================
// POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
// Body: { messaging_product: "whatsapp", status: "read", message_id }
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
// POST https://graph.facebook.com/v21.0/{phoneNumberId}/media
// Form-data: file, messaging_product=whatsapp, type=mimetype
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
// Set up webhook subscription with Meta
// ============================================================
// POST https://graph.facebook.com/v21.0/{wabaId}/subscribed_apps
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
