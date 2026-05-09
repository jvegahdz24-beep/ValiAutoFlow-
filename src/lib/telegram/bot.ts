// ============================================================
// TELEGRAM BOT ENGINE — Core bot orchestration
// ============================================================
// Handles: webhook verification, command dispatch, session management,
// authentication (chat ID whitelist), and human-in-the-loop handoff.
// ============================================================

import { db } from '@/lib/db'
import {
  handleStart,
  handleHelp,
  handleVer,
  handleResponder,
  handleTomarMando,
  handleSoltar,
  handleLeads,
  handleStats,
  handleCampana,
  handleCampanas,
  handlePausar,
  handleConfig,
  handleFreeText,
} from './commands'
import {
  type TelegramUpdate,
  type BotContext,
  type CommandResult,
  type SessionState,
} from './types'

// ============================================================
// Command Registry — Maps command names to handlers
// ============================================================
const COMMAND_MAP: Record<string, (ctx: BotContext) => Promise<CommandResult>> = {
  '/start': handleStart,
  '/help': handleHelp,
  '/ver': handleVer,
  '/responder': handleResponder,
  '/tomar_mando': handleTomarMando,
  '/soltar': handleSoltar,
  '/leads': handleLeads,
  '/stats': handleStats,
  '/campaña': handleCampana,
  '/campañas': handleCampanas,
  '/pausar': handlePausar,
  '/config': handleConfig,
}

// ============================================================
// MAIN: Process incoming Telegram update
// ============================================================
export async function processTelegramUpdate(
  update: TelegramUpdate,
  workspaceId: string
): Promise<{ replyText: string; replyParseMode?: string; replyMarkup?: Record<string, unknown> } | null> {
  const message = update.message || update.callback_query?.message
  const text = update.message?.text || ''
  const chatId = String(update.message?.chat?.id || update.callback_query?.message?.chat?.id || '')

  if (!chatId || !text) return null

  // ──────────────────────────────────────────────────────────
  // STEP 1: AUTH — Verify this chat ID is authorized
  // ──────────────────────────────────────────────────────────
  const botConfig = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!botConfig || !botConfig.isActive) {
    return {
      replyText: '⚠️ Bot no configurado o inactivo. Actívalo desde el dashboard de ValiAutoFlow.',
    }
  }

  const allowedChatIds: string[] = JSON.parse(botConfig.allowedChatIds || '[]')
  if (allowedChatIds.length > 0 && !allowedChatIds.includes(chatId)) {
    return {
      replyText: '🚫 No estás autorizado para usar este bot. Agrega tu Chat ID desde la configuración.',
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 2: SESSION — Get or create session
  // ──────────────────────────────────────────────────────────
  let session = await db.telegramBotSession.upsert({
    where: {
      // Use a composite unique approach — find by workspaceId + chatId
      id: `${workspaceId}_${chatId}`,
    },
    create: {
      id: `${workspaceId}_${chatId}`,
      workspaceId,
      chatId,
      state: 'idle',
    },
    update: {},
  })

  // ──────────────────────────────────────────────────────────
  // STEP 3: PARSE COMMAND
  // ──────────────────────────────────────────────────────────
  const isCommand = text.startsWith('/')
  const commandParts = text.split(' ')
  const commandName = commandParts[0].toLowerCase() as keyof typeof COMMAND_MAP
  const commandArgs = commandParts.slice(1).join(' ')

  // ──────────────────────────────────────────────────────────
  // STEP 4: DISPATCH
  // ──────────────────────────────────────────────────────────
  let result: CommandResult

  const ctx: BotContext = {
    workspaceId,
    chatId,
    session: {
      state: session.state as SessionState,
      currentLeadId: session.currentLeadId,
      currentConversationId: session.currentConversationId,
      lastCommand: session.lastCommand,
    },
    command: {
      name: commandName as BotContext['command']['name'],
      args: commandArgs,
    },
  }

  if (isCommand && COMMAND_MAP[commandName]) {
    // Known command → dispatch to handler
    const handler = COMMAND_MAP[commandName]
    result = await handler(ctx)
  } else if (isCommand) {
    // Unknown command
    result = {
      text: `❓ Comando desconocido: ${commandName}\nUsa /help para ver los comandos disponibles.`,
      newState: session.state as SessionState,
    }
  } else {
    // Free text → handle based on session state
    result = await handleFreeText(ctx, text)
  }

  // ──────────────────────────────────────────────────────────
  // STEP 5: UPDATE SESSION
  // ──────────────────────────────────────────────────────────
  await db.telegramBotSession.update({
    where: { id: session.id },
    data: {
      state: result.newState || session.state,
      currentLeadId: result.currentLeadId !== undefined ? result.currentLeadId : session.currentLeadId,
      currentConversationId: result.currentConversationId !== undefined ? result.currentConversationId : session.currentConversationId,
      lastCommand: isCommand ? commandName : session.lastCommand,
      lastCommandAt: new Date(),
    },
  })

  // ──────────────────────────────────────────────────────────
  // STEP 6: LOG COMMAND
  // ──────────────────────────────────────────────────────────
  await db.telegramBotCommand.create({
    data: {
      workspaceId,
      chatId,
      command: isCommand ? commandName : 'free_text',
      arguments: commandArgs,
      response: result.text.substring(0, 500),
      leadId: result.currentLeadId || session.currentLeadId,
      conversationId: result.currentConversationId || session.currentConversationId,
      status: 'processed',
    },
  })

  // ──────────────────────────────────────────────────────────
  // STEP 7: RETURN REPLY
  // ──────────────────────────────────────────────────────────
  return {
    replyText: result.text,
    replyParseMode: result.parseMode,
    replyMarkup: result.replyMarkup,
  }
}

// ============================================================
// Send message via Telegram Bot API
// ============================================================
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode?: string,
  replyMarkup?: Record<string, unknown>
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: parseMode || 'Markdown',
    }

    if (replyMarkup) {
      body.reply_markup = replyMarkup
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      // If Markdown parse fails, retry with plain text
      if (parseMode && parseMode !== 'HTML') {
        return sendTelegramMessage(botToken, chatId, text, undefined, replyMarkup)
      }
      console.error('[Telegram] Send failed:', await res.text())
      return false
    }

    return true
  } catch (error) {
    console.error('[Telegram] Send error:', error)
    return false
  }
}

// ============================================================
// Set up webhook for the bot
// ============================================================
export async function setupTelegramWebhook(
  botToken: string,
  webhookUrl: string
): Promise<{ ok: boolean; description?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    })

    const data = await res.json()
    return { ok: data.ok, description: data.description }
  } catch (error) {
    console.error('[Telegram] Webhook setup error:', error)
    return { ok: false, description: String(error) }
  }
}

// ============================================================
// Remove webhook (switch to polling mode)
// ============================================================
export async function removeTelegramWebhook(
  botToken: string
): Promise<{ ok: boolean }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`
    const res = await fetch(url, { method: 'POST' })
    const data = await res.json()
    return { ok: data.ok }
  } catch {
    return { ok: false }
  }
}

// ============================================================
// Get bot info
// ============================================================
export async function getTelegramBotInfo(
  botToken: string
): Promise<{ ok: boolean; username?: string; firstName?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/getMe`
    const res = await fetch(url)
    const data = await res.json()

    if (data.ok) {
      return {
        ok: true,
        username: data.result.username,
        firstName: data.result.first_name,
      }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}
