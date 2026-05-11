/**
 * Evolution API Integration Module
 * 
 * Connects to Evolution API (https://github.com/EvolutionAPI/evolution-api)
 * for WhatsApp QR-code-based connection (WhatsApp Web style).
 * 
 * This allows scanning a QR code with the WhatsApp app to connect
 * a business number without needing Meta Business API credentials.
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

interface EvolutionInstance {
  instance: {
    instanceName: string
    status: string
  }
  qrcode?: {
    code: string
    base64: string
  }
  hash?: string
}

interface EvolutionStatus {
  instance: {
    instanceName: string
    status: 'open' | 'close' | 'connecting' | 'disconnected'
  }
}

// ─── Instance Management ────────────────────────────────────

/**
 * Create a new WhatsApp instance in Evolution API
 */
export async function createInstance(instanceName: string, workspaceId: string): Promise<{
  success: boolean
  data?: EvolutionInstance
  error?: string
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { 
      success: false, 
      error: 'Evolution API no configurada. Configura EVOLUTION_API_URL y EVOLUTION_API_KEY.' 
    }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        number: '', // No pre-defined number — use QR
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[EvolutionAPI] createInstance failed:', response.status, errorText)
      return { success: false, error: `Error creando instancia: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    console.error('[EvolutionAPI] createInstance error:', error.message)
    return { success: false, error: `Error de conexión: ${error.message}` }
  }
}

/**
 * Connect to an existing instance and get QR code
 */
export async function connectInstance(instanceName: string): Promise<{
  success: boolean
  qrcode?: string  // base64 QR code image
  code?: string    // pairing code
  status?: string
  error?: string
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { 
      success: false, 
      error: 'Evolution API no configurada.' 
    }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[EvolutionAPI] connectInstance failed:', response.status, errorText)
      return { success: false, error: `Error conectando instancia: ${response.status}` }
    }

    const data = await response.json()
    
    // Evolution API returns QR code as base64 in the response
    return {
      success: true,
      qrcode: data.qrcode?.base64 || data.base64,
      code: data.qrcode?.code || data.code,
      status: data.instance?.status,
    }
  } catch (error: any) {
    console.error('[EvolutionAPI] connectInstance error:', error.message)
    return { success: false, error: `Error de conexión: ${error.message}` }
  }
}

/**
 * Get connection state of an instance
 */
export async function getInstanceStatus(instanceName: string): Promise<{
  success: boolean
  status?: 'open' | 'close' | 'connecting' | 'disconnected'
  error?: string
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: 'Evolution API no configurada.' }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!response.ok) {
      return { success: false, error: `Error obteniendo estado: ${response.status}` }
    }

    const data: EvolutionStatus = await response.json()
    return {
      success: true,
      status: data.instance?.status,
    }
  } catch (error: any) {
    console.error('[EvolutionAPI] getInstanceStatus error:', error.message)
    return { success: false, error: `Error de conexión: ${error.message}` }
  }
}

/**
 * Logout / disconnect an instance
 */
export async function logoutInstance(instanceName: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: 'Evolution API no configurada.' }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!response.ok) {
      return { success: false, error: `Error desconectando: ${response.status}` }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[EvolutionAPI] logoutInstance error:', error.message)
    return { success: false, error: `Error de conexión: ${error.message}` }
  }
}

/**
 * Delete an instance entirely
 */
export async function deleteInstance(instanceName: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: 'Evolution API no configurada.' }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    })

    if (!response.ok) {
      return { success: false, error: `Error eliminando instancia: ${response.status}` }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[EvolutionAPI] deleteInstance error:', error.message)
    return { success: false, error: `Error de conexión: ${error.message}` }
  }
}

/**
 * Send a text message via Evolution API
 */
export async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string
): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: 'Evolution API no configurada.' }
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number,
        text,
        delay: 0,
      }),
    })

    if (!response.ok) {
      return { success: false, error: `Error enviando mensaje: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    console.error('[EvolutionAPI] sendTextMessage error:', error.message)
    return { success: false, error: `Error de conexión: ${error.message}` }
  }
}

/**
 * Check if Evolution API is configured
 */
export function isEvolutionConfigured(): boolean {
  return !!(EVOLUTION_API_URL && EVOLUTION_API_KEY)
}

/**
 * Get the Evolution API URL (for display purposes)
 */
export function getEvolutionApiUrl(): string {
  return EVOLUTION_API_URL
}
