// ============================================================
// BAILEYS WHATSAPP CLIENT — Serverless-Compatible Direct Connection
// ============================================================
// Integrates @whiskeysockets/baileys directly into ValiAutoFlow
// without requiring Evolution API or any external service.
//
// Architecture for Vercel Serverless:
// - Singleton socket per workspace (in-memory while function warm)
// - Auth state persisted to Supabase (whatsapp_configs table)
// - QR code generation for phone scanning (one-shot per request)
// - Auto-reconnection on disconnect (if function still warm)
// - Incoming messages forwarded to JHON engine pipeline
// - Graceful degradation: connection lost = reconnect on next request
//
// Key Limitations:
// - WebSocket connection dies when serverless function goes cold
// - Auth state survives via Supabase (reconnect without new QR)
// - For 24/7 persistent connection, use a VPS/Railway server
// ============================================================

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys'
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
  saveCreds: (() => Promise<void>) | null
  authDir: string | null
}

interface BaileysQRResult {
  qr: string | null        // base64 PNG data URL
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
// Supabase Admin Client (reuses same pattern as db-supabase.ts)
// ============================================================

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnqhxtqkjbawajmollfg.supabase.co'
}

function getSupabaseServiceKey(): string {
  const b64 = process.env.SUPABASE_SERVICE_ROLE_KEY_B64 || ''
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf-8')
      if (decoded.startsWith('eyJ')) return decoded
    } catch {}
  }

  return raw || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucWh4dHFramJhd2FqbW9sbGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM4NzA2OSwiZXhwIjoyMDg4OTYzMDY5fQ.k95PFOztjqsw7BHoywuDeXnGs9zUdStv1j2YlmODiC8'
}

let adminClient: SupabaseClient | null = null
let cachedKey = ''

function getAdminClient(): SupabaseClient {
  const key = getSupabaseServiceKey()
  if (!adminClient || cachedKey !== key) {
    adminClient = createClient(getSupabaseUrl(), key, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    })
    cachedKey = key
  }
  return adminClient
}

// ============================================================
// In-Memory Session Store (per workspace, survives while function warm)
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
      saveCreds: null,
      authDir: null,
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
 * Save auth state files from /tmp to Supabase as JSON blob.
 * Stores in `accessToken` column with `baileys_auth:` prefix as fallback
 * (the `baileysAuthState` column may not exist yet).
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

    // Try with baileysAuthState column first
    const { error } = await supabase
      .from('whatsapp_configs')
      .update({
        baileysAuthState: authStateJson,
        baileysConnected: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('workspaceId', workspaceId)

    if (error) {
      // Column doesn't exist yet — use accessToken as fallback storage
      console.warn('[Baileys] baileysAuthState column not found, using accessToken fallback:', error.message)
      const { error: error2 } = await supabase
        .from('whatsapp_configs')
        .update({
          accessToken: `baileys_auth:${authStateJson}`,
          isActive: true,
          updatedAt: new Date().toISOString(),
        })
        .eq('workspaceId', workspaceId)

      if (error2) {
        console.error('[Baileys] Could not save auth state:', error2.message)
      } else {
        console.log('[Baileys] Auth state saved (accessToken fallback) for workspace', workspaceId.substring(0, 8))
      }
    } else {
      console.log('[Baileys] Auth state saved to Supabase for workspace', workspaceId.substring(0, 8))
    }
  } catch (err: any) {
    console.error('[Baileys] Error saving auth state:', err.message)
  }
}

/**
 * Restore auth state files from Supabase to /tmp directory.
 * Returns true if auth state was found and restored.
 */
async function restoreAuthStateFromSupabase(workspaceId: string, authDir: string): Promise<boolean> {
  try {
    const supabase = getAdminClient()

    // Try with baileysAuthState column first
    const { data, error } = await supabase
      .from('whatsapp_configs')
      .select('baileysAuthState, accessToken')
      .eq('workspaceId', workspaceId)
      .single()

    let authStateJson: string | null = null

    if (!error && data?.baileysAuthState) {
      authStateJson = data.baileysAuthState as string
    } else if (!error && data?.accessToken?.startsWith('baileys_auth:')) {
      authStateJson = (data.accessToken as string).substring('baileys_auth:'.length)
    } else {
      // Try selecting only accessToken if baileysAuthState column doesn't exist
      const { data: data2, error: error2 } = await supabase
        .from('whatsapp_configs')
        .select('accessToken')
        .eq('workspaceId', workspaceId)
        .single()

      if (!error2 && data2?.accessToken?.startsWith('baileys_auth:')) {
        authStateJson = (data2.accessToken as string).substring('baileys_auth:'.length)
      }
    }

    if (!authStateJson) {
      console.log('[Baileys] No saved auth state found for workspace', workspaceId.substring(0, 8))
      return false
    }

    const files: Record<string, string> = JSON.parse(authStateJson)

    // Create directory and write files
    fs.mkdirSync(authDir, { recursive: true })
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(authDir, filename), content, 'utf-8')
    }

    console.log('[Baileys] Auth state restored from Supabase for workspace', workspaceId.substring(0, 8), '- files:', Object.keys(files).join(', '))
    return true
  } catch (err: any) {
    console.error('[Baileys] Error restoring auth state:', err.message)
    return false
  }
}

/**
 * Update connection status in Supabase.
 * Uses available columns with creative fallbacks.
 */
async function updateConnectionStatus(
  workspaceId: string,
  connected: boolean,
  phone?: string | null,
  userName?: string | null,
): Promise<void> {
  try {
    const supabase = getAdminClient()

    // Try with new Baileys columns
    const updateData: Record<string, unknown> = {
      baileysConnected: connected,
      isActive: connected,
      updatedAt: new Date().toISOString(),
    }

    if (phone) {
      updateData.baileysPhone = phone
    }

    if (connected) {
      updateData.lastSyncAt = new Date().toISOString()
      updateData.connectionType = 'baileys'
      updateData.channelName = 'bielys'
      if (phone) {
        updateData.businessAccountId = `baileys:${phone}`
      }
    }

    const { error } = await supabase
      .from('whatsapp_configs')
      .update(updateData)
      .eq('workspaceId', workspaceId)

    if (error) {
      console.warn('[Baileys] Some columns not found, using basic columns fallback:', error.message)
      const basicUpdate: Record<string, unknown> = {
        isActive: connected,
        updatedAt: new Date().toISOString(),
      }

      if (connected) {
        basicUpdate.lastSyncAt = new Date().toISOString()
        if (phone) {
          basicUpdate.businessAccountId = `baileys:${phone}`
        }
        basicUpdate.wabaId = 'baileys'
      } else {
        basicUpdate.businessAccountId = null
      }

      const { error: error2 } = await supabase
        .from('whatsapp_configs')
        .update(basicUpdate)
        .eq('workspaceId', workspaceId)

      if (error2) {
        console.warn('[Baileys] Basic update also failed:', error2.message)
        // Last resort: just update isActive
        try {
          await supabase
            .from('whatsapp_configs')
            .update({ isActive: connected, updatedAt: new Date().toISOString() })
            .eq('workspaceId', workspaceId)
        } catch {}
      }
    }
  } catch (err: any) {
    console.error('[Baileys] Error updating connection status:', err.message)
  }
}

// ============================================================
// Extract disconnect status code (without importing @hapi/boom)
// ============================================================

/**
 * Extract the status code from a Baileys disconnect error.
 * Avoids direct dependency on @hapi/boom by using duck typing.
 */
function getDisconnectStatusCode(lastDisconnect: any): number | undefined {
  if (!lastDisconnect?.error) return undefined

  const err = lastDisconnect.error

  // @hapi/boom stores status in error.output.statusCode
  if (err.output?.statusCode) return err.output.statusCode

  // Some versions store it differently
  if (err.statusCode) return err.statusCode

  // Check the data property
  if (err.data?.statusCode) return err.data.statusCode

  // Try to parse from the error message
  if (typeof err.message === 'string') {
    const match = err.message.match(/status code[:\s]+(\d+)/i)
    if (match) return parseInt(match[1], 10)
  }

  return undefined
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

  // If currently connecting with QR ready, wait and return current state
  if (session.status === 'connecting' || session.status === 'qr_ready') {
    // Wait up to 15 seconds for QR or connection
    for (let i = 0; i < 30; i++) {
      await sleep(500)
      if (session.qrImageBase64 || (session.status as string) === 'connected') {
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
  console.log('[Baileys] Existing auth state:', hasExistingAuth, 'for workspace', workspaceId.substring(0, 8))

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
    // Ensure /tmp directory exists
    fs.mkdirSync(authDir, { recursive: true })

    // Use multi-file auth state (reads/writes to /tmp)
    const { state, saveCreds } = await useMultiFileAuthState(authDir)
    session.saveCreds = saveCreds
    session.authDir = authDir

    // Create the socket with serverless-friendly settings
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['ValiAutoFlow', 'Chrome', '1.0'] as any,
      connectTimeoutMs: 20_000,     // 20s connection timeout
      keepAliveIntervalMs: 25_000,   // Keep alive ping
      defaultQueryTimeoutMs: 30_000, // 30s for queries
      retryRequestDelayMs: 250,      // Faster retries
      maxMsgRetryCount: 3,
      // Important for serverless: don't use mobile API
      mobile: false,
    })

    session.socket = socket

    // ─── Handle credentials updates ───────────────────────
    socket.ev.on('creds.update', async () => {
      try {
        await saveCreds()
        // Save auth state to Supabase after each credential update
        await saveAuthStateToSupabase(workspaceId, authDir)
      } catch (err: any) {
        console.error('[Baileys] Error in creds.update:', err.message)
      }
    })

    // ─── Handle connection updates ────────────────────────
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      // QR code received
      if (qr) {
        session.qrString = qr
        session.status = 'qr_ready'

        try {
          // Generate QR code image as base64 PNG data URL
          const qrImage = await QRCode.toDataURL(qr, {
            width: 512,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          })
          session.qrImageBase64 = qrImage
        } catch (err: any) {
          console.error('[Baileys] Error generating QR image:', err.message)
          // Fallback: try simpler QR generation
          try {
            const qrBuffer = await QRCode.toBuffer(qr, { width: 256, margin: 1 })
            session.qrImageBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`
          } catch (err2: any) {
            console.error('[Baileys] Fallback QR generation also failed:', err2.message)
            session.qrImageBase64 = null
          }
        }

        console.log('[Baileys] QR code generated for workspace', workspaceId.substring(0, 8))
      }

      // Connection opened (user scanned QR or reconnected with saved state)
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
        const statusCode = getDisconnectStatusCode(lastDisconnect)
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
          && statusCode !== 401
          && statusCode !== 403

        console.log('[Baileys] Connection closed. Status code:', statusCode, 'Should reconnect:', shouldReconnect)

        if (shouldReconnect && session.status !== 'disconnected') {
          session.status = 'disconnected'
          // Auto-reconnect after delay (only if function is still warm)
          setTimeout(async () => {
            if (session.status === 'disconnected') {
              console.log('[Baileys] Auto-reconnecting...')
              try {
                await initBaileysSocket(workspaceId)
              } catch (err: any) {
                console.error('[Baileys] Reconnection failed:', err.message)
              }
            }
          }, 5000)
        } else {
          // User logged out or fatal error — clean up
          session.status = 'disconnected'
          session.socket = null
          session.phone = null
          session.userName = null
          await updateConnectionStatus(workspaceId, false)
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

    // ─── Wait for QR or connection ─────────────────────────
    // Wait up to 20 seconds for QR generation or connection
    const qrPromise = new Promise<BaileysQRResult>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[Baileys] Timed out waiting for QR/connection, returning current state:', session.status)
        resolve({
          qr: session.qrImageBase64,
          qrString: session.qrString,
          pairingCode: session.pairingCode,
          status: session.status,
        })
      }, 20_000)

      // Check periodically for QR or connection
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
      }, 300)
    })

    return await qrPromise

  } catch (error: any) {
    console.error('[Baileys] Error initializing socket:', error.message)
    console.error('[Baileys] Error stack:', error.stack?.substring(0, 500))

    session.status = 'disconnected'
    session.socket = null

    // Return a meaningful error rather than throwing
    return {
      qr: null,
      qrString: null,
      pairingCode: null,
      status: 'disconnected',
      error: error.message,
    } as BaileysQRResult & { error: string }
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

    // Try with all available columns
    const { data, error } = await supabase
      .from('whatsapp_configs')
      .select('isActive, baileysConnected, baileysPhone, connectionType, lastSyncAt, businessAccountId, wabaId, channelName')
      .eq('workspaceId', workspaceId)
      .single()

    if (!error && data) {
      // Check via baileys* columns or markers
      const isBaileysConnection =
        data.connectionType === 'baileys' ||
        data.wabaId === 'baileys' ||
        data.businessAccountId?.startsWith('baileys:') ||
        data.channelName === 'bielys'

      const isConnected = (data.baileysConnected === true) ||
        (isBaileysConnection && data.isActive === true)

      const phone = data.baileysPhone ||
        (data.businessAccountId?.startsWith('baileys:')
          ? (data.businessAccountId as string).replace('baileys:', '')
          : null)

      return {
        connected: isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        phone,
        userName: null,
        lastConnectedAt: data.lastSyncAt || null,
      }
    }

    // Try with only basic columns
    const { data: data2, error: error2 } = await supabase
      .from('whatsapp_configs')
      .select('isActive, lastSyncAt, businessAccountId, wabaId')
      .eq('workspaceId', workspaceId)
      .single()

    if (!error2 && data2) {
      const isBaileys = data2.wabaId === 'baileys' || data2.businessAccountId?.startsWith('baileys:')
      const phone = data2.businessAccountId?.startsWith('baileys:')
        ? (data2.businessAccountId as string).replace('baileys:', '')
        : null

      return {
        connected: isBaileys && data2.isActive === true,
        status: (isBaileys && data2.isActive) ? 'connected' : 'disconnected',
        phone,
        userName: null,
        lastConnectedAt: data2.lastSyncAt || null,
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
    session.saveCreds = null

    if (clearSession) {
      cleanAuthDir(workspaceId)

      // Clear auth state from Supabase
      try {
        const supabase = getAdminClient()
        // Try with baileys* columns
        const { error } = await supabase
          .from('whatsapp_configs')
          .update({
            baileysAuthState: null,
            baileysConnected: false,
            baileysPhone: null,
            isActive: false,
            accessToken: '',
            businessAccountId: null,
            wabaId: null,
            updatedAt: new Date().toISOString(),
          })
          .eq('workspaceId', workspaceId)

        if (error) {
          // Fallback: clear only basic columns
          await supabase
            .from('whatsapp_configs')
            .update({
              isActive: false,
              accessToken: '',
              businessAccountId: null,
              wabaId: null,
              updatedAt: new Date().toISOString(),
            })
            .eq('workspaceId', workspaceId)
        }
      } catch (err: any) {
        console.warn('[Baileys] Error clearing Supabase session:', err.message)
        // Last resort
        try {
          const supabase = getAdminClient()
          await supabase
            .from('whatsapp_configs')
            .update({ isActive: false, updatedAt: new Date().toISOString() })
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
 * If not connected, attempts to reconnect first using saved auth state.
 */
export async function sendBaileysMessage(
  workspaceId: string,
  jid: string,
  text: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const session = getSession(workspaceId)

  // If not connected, try to reconnect
  if (!session.socket || session.status !== 'connected') {
    console.log('[Baileys] Not connected, attempting reconnect for message send...')
    const result = await initBaileysSocket(workspaceId)
    if (result.status !== 'connected') {
      return { success: false, error: 'WhatsApp no está conectado y no se pudo reconectar' }
    }
  }

  if (!session.socket) {
    return { success: false, error: 'WhatsApp socket no disponible' }
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
  const from = msg.key.remoteJid
  const fromPhone = from?.replace('@s.whatsapp.net', '')

  // Extract text content from various message types
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
        } else {
          console.log('[Baileys] Created config (basic columns) for workspace', workspaceId.substring(0, 8))
        }
      } else {
        console.log('[Baileys] Created config for workspace', workspaceId.substring(0, 8))
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
