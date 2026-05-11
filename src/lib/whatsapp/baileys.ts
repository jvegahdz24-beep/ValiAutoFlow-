// ============================================================
// BAILEYS WHATSAPP CLIENT — Direct WhatsApp Web Connection
// ============================================================
// Integrates @whiskeysockets/baileys directly into ValiAutoFlow
// without requiring Evolution API or any external service.
//
// Architecture:
// - Singleton socket per workspace (in-memory while function warm)
// - Auth state persisted to Supabase (whatsapp_configs.baileysAuthState)
// - QR code generation for phone scanning
// - Auto-reconnection on disconnect
// - Incoming messages forwarded to JHON engine pipeline
// ============================================================

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type ConnectionState,
  type Browsers,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Types
// ============================================================

type BaileysConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr_ready'

interface BaileysSession {
  socket: WASocket | null
  status: BaileysConnectionStatus
  qrString: string | null
  qrImageBase64: string | null
  pairingCode: string | null
  phone: string | null
  userName: string | null
  lastConnectedAt: Date | null
  workspaceId: string
}

interface BaileysQRResult {
  qr: string | null        // base64 PNG image
  qrString: string | null  // raw QR string
  pairingCode: string | null
  status: BaileysConnectionStatus
}

interface BaileysStatusResult {
  connected: boolean
  status: BaileysConnectionStatus
  phone: string | null
  userName: string | null
  lastConnectedAt: string | null
}

// ============================================================
// Supabase Admin Client
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnqhxtqkjbawajmollfg.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucWh4dHFramJhd2FqbW9sbGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4NzA2OSwiZXhwIjoyMDg4OTYzMDY5fQ.k95PFOztjqsw7BHoywuDeXnGs9zUdStv1j2YlmODiC8'

let adminClient: SupabaseClient | null = null

function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return adminClient
}

// ============================================================
// In-Memory Session Store (per workspace)
// ============================================================

const sessions = new Map<string, BaileysSession>()

function getSession(workspaceId: string): BaileysSession {
  if (!sessions.has(workspaceId)) {
    sessions.set(workspaceId, {
      socket: null,
      status: 'disconnected',
      qrString: null,
      qrImageBase64: null,
      pairingCode: null,
      phone: null,
      userName: null,
      lastConnectedAt: null,
      workspaceId,
    })
  }
  return sessions.get(workspaceId)!
}

// ============================================================
// Auth State Persistence (Supabase <-> /tmp filesystem)
// ============================================================

const AUTH_BASE_DIR = '/tmp/whatsapp-baileys'

function getAuthDir(workspaceId: string): string {
  return path.join(AUTH_BASE_DIR, workspaceId)
}

/**
 * Save auth state files from /tmp to Supabase as JSON blob
 */
async function saveAuthStateToSupabase(workspaceId: string, authDir: string): Promise<void> {
  try {
    if (!fs.existsSync(authDir)) return

    const files: Record<string, string> = {}
    const entries = fs.readdirSync(authDir)

    for (const entry of entries) {
      const filePath = path.join(authDir, entry)
      const stat = fs.statSync(filePath)
      if (stat.isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8')
        files[entry] = content
      }
    }

    const authStateJson = JSON.stringify(files)

    const supabase = getAdminClient()
    // Try to update with baileysAuthState column
    const { error } = await supabase
      .from('whatsapp_configs')
      .update({
        baileysAuthState: authStateJson,
        baileysConnected: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('workspaceId', workspaceId)

    if (error) {
      // Column might not exist yet — try without baileysAuthState
      console.warn('[Baileys] Could not save auth state to Supabase:', error.message)
    } else {
      console.log('[Baileys] Auth state saved to Supabase for workspace', workspaceId.substring(0, 8))
    }
  } catch (err: any) {
    console.error('[Baileys] Error saving auth state:', err.message)
  }
}

/**
 * Restore auth state files from Supabase to /tmp directory
 */
async function restoreAuthStateFromSupabase(workspaceId: string, authDir: string): Promise<boolean> {
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('whatsapp_configs')
      .select('baileysAuthState')
      .eq('workspaceId', workspaceId)
      .single()

    if (error || !data?.baileysAuthState) {
      console.log('[Baileys] No saved auth state found for workspace', workspaceId.substring(0, 8))
      return false
    }

    const files: Record<string, string> = JSON.parse(data.baileysAuthState)

    // Create directory and write files
    fs.mkdirSync(authDir, { recursive: true })
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(authDir, filename), content, 'utf-8')
    }

    console.log('[Baileys] Auth state restored from Supabase for workspace', workspaceId.substring(0, 8))
    return true
  } catch (err: any) {
    console.error('[Baileys] Error restoring auth state:', err.message)
    return false
  }
}

/**
 * Update connection status in Supabase
 */
async function updateConnectionStatus(
  workspaceId: string,
  connected: boolean,
  phone?: string | null,
  userName?: string | null,
): Promise<void> {
  try {
    const supabase = getAdminClient()
    const updateData: Record<string, unknown> = {
      baileysConnected: connected,
      updatedAt: new Date().toISOString(),
    }

    // Only include baileysPhone if column exists
    if (phone) {
      updateData.baileysPhone = phone
    }

    // Update isActive based on connection
    updateData.isActive = connected

    if (connected) {
      updateData.lastSyncAt = new Date().toISOString()
      updateData.connectionType = 'baileys'
      updateData.channelName = 'bielys'
    }

    const { error } = await supabase
      .from('whatsapp_configs')
      .update(updateData)
      .eq('workspaceId', workspaceId)

    if (error) {
      console.warn('[Baileys] Could not update connection status:', error.message)
      // Try with just basic columns
      const { error: error2 } = await supabase
        .from('whatsapp_configs')
        .update({
          isActive: connected,
          updatedAt: new Date().toISOString(),
        })
        .eq('workspaceId', workspaceId)
      if (error2) {
        console.warn('[Baileys] Also failed with basic update:', error2.message)
      }
    }
  } catch (err: any) {
    console.error('[Baileys] Error updating connection status:', err.message)
  }
}

// ============================================================
// Core: Initialize Baileys Socket
// ============================================================

/**
 * Initialize a Baileys WhatsApp socket for a workspace.
 * Restores auth state from Supabase if available.
 * Returns QR code info if connection requires scanning.
 */
export async function initBaileysSocket(workspaceId: string): Promise<BaileysQRResult> {
  const session = getSession(workspaceId)

  // If already connected, return immediately
  if (session.status === 'connected' && session.socket) {
    return {
      qr: null,
      qrString: null,
      pairingCode: null,
      status: 'connected',
    }
  }

  // If currently connecting, wait a bit and return current state
  if (session.status === 'connecting') {
    // Wait up to 10 seconds for QR
    for (let i = 0; i < 20; i++) {
      await sleep(500)
      if (session.qrString || session.status === 'connected' || session.status === 'qr_ready') {
        break
      }
    }
    return {
      qr: session.qrImageBase64,
      qrString: session.qrString,
      pairingCode: session.pairingCode,
      status: session.status,
    }
  }

  // Set up auth directory
  const authDir = getAuthDir(workspaceId)

  // Restore auth state from Supabase
  const hasExistingAuth = await restoreAuthStateFromSupabase(workspaceId, authDir)

  // Clean up existing socket if any
  if (session.socket) {
    try {
      session.socket.end(undefined)
    } catch {}
    session.socket = null
  }

  session.status = 'connecting'
  session.qrString = null
  session.qrImageBase64 = null
  session.pairingCode = null

  try {
    // Use multi-file auth state (reads/writes to /tmp)
    const { state, saveCreds } = await useMultiFileAuthState(authDir)

    // Create the socket
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['ValiAutoFlow', 'Chrome', '1.0'] as any,
      connectTimeoutMs: 30_000,
      keepAliveIntervalMs: 25_000,
      // Mobile proxy is not needed for QR scanning
      defaultQueryTimeoutMs: 60_000,
    })

    session.socket = socket

    // ─── Handle credentials updates ───────────────────────
    socket.ev.on('creds.update', async () => {
      await saveCreds()
      // Save auth state to Supabase after each credential update
      await saveAuthStateToSupabase(workspaceId, authDir)
    })

    // ─── Handle connection updates ────────────────────────
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // QR code received
      if (qr) {
        session.qrString = qr
        session.status = 'qr_ready'

        try {
          // Generate QR code image as base64 PNG
          const qrImage = await QRCode.toDataURL(qr, {
            width: 512,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          })
          session.qrImageBase64 = qrImage
        } catch (err: any) {
          console.error('[Baileys] Error generating QR image:', err.message)
          session.qrImageBase64 = null
        }

        console.log('[Baileys] QR code generated for workspace', workspaceId.substring(0, 8))
      }

      // Connection opened (user scanned QR)
      if (connection === 'open') {
        session.status = 'connected'
        session.qrString = null
        session.qrImageBase64 = null
        session.lastConnectedAt = new Date()

        // Get user info
        const user = socket.user
        if (user) {
          session.userName = user.name || user.notify || null
          session.phone = user.id?.split(':')[0]?.replace('@s.whatsapp.net', '') || null
        }

        console.log('[Baileys] Connected! Phone:', session.phone, 'User:', session.userName)

        // Update Supabase
        await updateConnectionStatus(workspaceId, true, session.phone, session.userName)
      }

      // Connection closed
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        console.log('[Baileys] Connection closed. Status code:', statusCode, 'Should reconnect:', shouldReconnect)

        if (shouldReconnect) {
          session.status = 'disconnected'
          // Auto-reconnect after delay
          setTimeout(async () => {
            console.log('[Baileys] Auto-reconnecting...')
            try {
              await initBaileysSocket(workspaceId)
            } catch (err: any) {
              console.error('[Baileys] Reconnection failed:', err.message)
            }
          }, 3000)
        } else {
          // User logged out — clean up
          session.status = 'disconnected'
          session.socket = null
          session.phone = null
          session.userName = null
          await updateConnectionStatus(workspaceId, false)
          // Clean up auth files
          cleanAuthDir(workspaceId)
        }
      }
    })

    // ─── Handle incoming messages ─────────────────────────
    socket.ev.on('messages.upsert', async (msgUpdate) => {
      const { messages, type } = msgUpdate

      if (type !== 'notify') return // Only process new messages

      for (const msg of messages) {
        if (!msg.key.fromMe && msg.message) {
          try {
            await handleIncomingMessage(workspaceId, msg)
          } catch (err: any) {
            console.error('[Baileys] Error processing incoming message:', err.message)
          }
        }
      }
    })

    // Wait for QR or connection (up to 25 seconds)
    const qrPromise = new Promise<BaileysQRResult>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          qr: session.qrImageBase64,
          qrString: session.qrString,
          pairingCode: session.pairingCode,
          status: session.status,
        })
      }, 25_000)

      // Check periodically
      const checkInterval = setInterval(() => {
        if (session.qrImageBase64 || session.status === 'connected') {
          clearTimeout(timeout)
          clearInterval(checkInterval)
          resolve({
            qr: session.qrImageBase64,
            qrString: session.qrString,
            pairingCode: session.pairingCode,
            status: session.status,
          })
        }
      }, 500)
    })

    return await qrPromise

  } catch (error: any) {
    console.error('[Baileys] Error initializing socket:', error.message)
    session.status = 'disconnected'
    session.socket = null
    return {
      qr: null,
      qrString: null,
      pairingCode: null,
      status: 'disconnected',
    }
  }
}

// ============================================================
// Get Connection Status
// ============================================================

/**
 * Get the current Baileys connection status for a workspace.
 * First checks in-memory state, then falls back to Supabase.
 */
export async function getBaileysStatus(workspaceId: string): Promise<BaileysStatusResult> {
  const session = getSession(workspaceId)

  // If we have an in-memory session, use it
  if (session.status === 'connected') {
    return {
      connected: true,
      status: 'connected',
      phone: session.phone,
      userName: session.userName,
      lastConnectedAt: session.lastConnectedAt?.toISOString() || null,
    }
  }

  // Check Supabase for persisted status
  try {
    const supabase = getAdminClient()
    const { data, error } = await supabase
      .from('whatsapp_configs')
      .select('isActive, baileysConnected, baileysPhone, connectionType, lastSyncAt')
      .eq('workspaceId', workspaceId)
      .single()

    if (!error && data) {
      const isConnected = data.baileysConnected === true || (data.connectionType === 'baileys' && data.isActive === true)
      return {
        connected: isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        phone: data.baileysPhone || null,
        userName: null,
        lastConnectedAt: data.lastSyncAt || null,
      }
    }
  } catch (err: any) {
    console.warn('[Baileys] Error checking Supabase status:', err.message)
  }

  return {
    connected: false,
    status: session.status,
    phone: session.phone,
    userName: session.userName,
    lastConnectedAt: session.lastConnectedAt?.toISOString() || null,
  }
}

// ============================================================
// Disconnect Baileys
// ============================================================

/**
 * Disconnect Baileys and optionally clear the session.
 */
export async function disconnectBaileys(workspaceId: string, clearSession = true): Promise<{ success: boolean; error?: string }> {
  const session = getSession(workspaceId)

  try {
    if (session.socket) {
      try {
        session.socket.end(undefined)
      } catch {}
      session.socket = null
    }

    session.status = 'disconnected'
    session.qrString = null
    session.qrImageBase64 = null
    session.pairingCode = null
    session.phone = null
    session.userName = null

    if (clearSession) {
      cleanAuthDir(workspaceId)

      // Clear auth state from Supabase
      try {
        const supabase = getAdminClient()
        await supabase
          .from('whatsapp_configs')
          .update({
            baileysAuthState: null,
            baileysConnected: false,
            baileysPhone: null,
            isActive: false,
            updatedAt: new Date().toISOString(),
          })
          .eq('workspaceId', workspaceId)
      } catch (err: any) {
        console.warn('[Baileys] Error clearing Supabase session:', err.message)
        // Try basic update
        try {
          const supabase = getAdminClient()
          await supabase
            .from('whatsapp_configs')
            .update({
              isActive: false,
              updatedAt: new Date().toISOString(),
            })
            .eq('workspaceId', workspaceId)
        } catch {}
      }
    } else {
      // Just update status, keep auth state for reconnection
      await updateConnectionStatus(workspaceId, false)
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Baileys] Error disconnecting:', error.message)
    return { success: false, error: error.message }
  }
}

// ============================================================
// Send Message via Baileys
// ============================================================

/**
 * Send a text message via the Baileys socket.
 */
export async function sendBaileysMessage(
  workspaceId: string,
  jid: string,  // WhatsApp JID (e.g., "5212345678900@s.whatsapp.net")
  text: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const session = getSession(workspaceId)

  if (!session.socket || session.status !== 'connected') {
    return { success: false, error: 'WhatsApp no está conectado' }
  }

  try {
    const sent = await session.socket.sendMessage(jid, { text })
    return {
      success: true,
      messageId: sent?.key?.id || undefined,
    }
  } catch (error: any) {
    console.error('[Baileys] Error sending message:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Get the Baileys socket for a workspace (for advanced usage)
 */
export function getBaileysSocket(workspaceId: string): WASocket | null {
  return getSession(workspaceId).socket
}

// ============================================================
// Incoming Message Handler
// ============================================================

async function handleIncomingMessage(workspaceId: string, msg: any): Promise<void> {
  const from = msg.key.remoteJid  // e.g., "5212345678900@s.whatsapp.net"
  const fromPhone = from?.replace('@s.whatsapp.net', '').replace('@s.whatsapp.net', '')

  // Extract text content
  let textContent = ''
  if (msg.message?.conversation) {
    textContent = msg.message.conversation
  } else if (msg.message?.extendedTextMessage?.text) {
    textContent = msg.message.extendedTextMessage.text
  } else if (msg.message?.imageMessage?.caption) {
    textContent = msg.message.imageMessage.caption
  } else if (msg.message?.videoMessage?.caption) {
    textContent = msg.message.videoMessage.caption
  } else if (msg.message?.buttonsResponseMessage?.selectedDisplayText) {
    textContent = msg.message.buttonsResponseMessage.selectedDisplayText
  } else if (msg.message?.listResponseMessage?.title) {
    textContent = msg.message.listResponseMessage.title
  }

  if (!textContent || !from) return

  console.log('[Baileys] Incoming message from', fromPhone, ':', textContent.substring(0, 50))

  // Forward to JHON engine pipeline via internal API
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    await fetch(`${appUrl}/api/engine/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        channel: 'whatsapp_baileys',
        from: fromPhone,
        message: textContent,
        messageId: msg.key.id,
        timestamp: msg.messageTimestamp,
        rawMessage: {
          key: msg.key,
          pushName: msg.pushName,
          messageTimestamp: msg.messageTimestamp,
        },
      }),
    })
  } catch (err: any) {
    console.error('[Baileys] Error forwarding to engine:', err.message)
  }
}

// ============================================================
// Utility Functions
// ============================================================

function cleanAuthDir(workspaceId: string): void {
  const authDir = getAuthDir(workspaceId)
  try {
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true })
    }
  } catch {}
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// Ensure WhatsApp config exists for workspace
// ============================================================

/**
 * Ensure a whatsapp_configs record exists for this workspace
 * with connectionType = 'baileys'
 */
export async function ensureBaileysConfig(workspaceId: string): Promise<void> {
  try {
    const supabase = getAdminClient()

    // Check if config exists
    const { data: existing, error: fetchError } = await supabase
      .from('whatsapp_configs')
      .select('id, connectionType')
      .eq('workspaceId', workspaceId)
      .single()

    if (fetchError || !existing) {
      // Create new config
      const { error: insertError } = await supabase
        .from('whatsapp_configs')
        .insert({
          workspaceId,
          phoneNumberId: '',
          accessToken: '',
          verifyToken: `baileys_${Date.now()}`,
          isActive: false,
          connectionType: 'baileys',
          channelName: 'bielys',
        })

      if (insertError) {
        // Try without new columns
        const { error: insertError2 } = await supabase
          .from('whatsapp_configs')
          .insert({
            workspaceId,
            phoneNumberId: '',
            accessToken: '',
            verifyToken: `baileys_${Date.now()}`,
            isActive: false,
          })
        if (insertError2) {
          console.warn('[Baileys] Could not create config:', insertError2.message)
        }
      }
    } else if (existing.connectionType !== 'baileys') {
      // Update to baileys
      const { error: updateError } = await supabase
        .from('whatsapp_configs')
        .update({
          connectionType: 'baileys',
          channelName: 'bielys',
          updatedAt: new Date().toISOString(),
        })
        .eq('workspaceId', workspaceId)

      if (updateError) {
        console.warn('[Baileys] Could not update config type:', updateError.message)
      }
    }
  } catch (err: any) {
    console.error('[Baileys] Error ensuring config:', err.message)
  }
}
