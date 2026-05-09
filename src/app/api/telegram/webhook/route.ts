// ============================================================
// TELEGRAM WEBHOOK — Receives updates from Telegram
// ============================================================
// This is the public endpoint that Telegram calls when a user
// sends a message to the bot. It processes the update and
// sends a reply back via the Telegram API.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { processTelegramUpdate, sendTelegramMessage } from '@/lib/telegram/bot'
import { db } from '@/lib/db'
import { type TelegramUpdate } from '@/lib/telegram/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TelegramUpdate

    // ──────────────────────────────────────────────────────────
    // Find which workspace this bot belongs to
    // We need to look up the bot token from the request context.
    // Telegram doesn't send the bot token, so we use a URL param
    // or look up by finding the active bot config.
    // ──────────────────────────────────────────────────────────

    // Strategy: Look up all active bot configs and match by processing
    // the update with each workspace (in practice, a single instance
    // serves one workspace, but we support multi-tenant)
    const chatId = String(body.message?.chat?.id || body.callback_query?.message?.chat?.id || '')

    if (!chatId) {
      return NextResponse.json({ ok: true })
    }

    // Find the session for this chat ID to determine workspace
    let workspaceId: string | null = null

    // Try to find existing session
    const session = await db.telegramBotSession.findFirst({
      where: { chatId },
      select: { workspaceId: true },
    })

    if (session) {
      workspaceId = session.workspaceId
    } else {
      // New chat — try to find the workspace with active bot that allows this chat
      // For single-tenant setups, just use the first active bot
      const activeBot = await db.telegramBotConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      })

      if (activeBot) {
        workspaceId = activeBot.workspaceId
      }
    }

    if (!workspaceId) {
      // No workspace found — try to reply with an error
      const anyBot = await db.telegramBotConfig.findFirst()
      if (anyBot) {
        await sendTelegramMessage(
          anyBot.botToken,
          chatId,
          '⚠️ Bot no vinculado a ningún workspace. Configúralo desde ValiAutoFlow.'
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Get bot config for this workspace
    const botConfig = await db.telegramBotConfig.findUnique({
      where: { workspaceId },
    })

    if (!botConfig || !botConfig.isActive) {
      return NextResponse.json({ ok: true })
    }

    // ──────────────────────────────────────────────────────────
    // Process the update
    // ──────────────────────────────────────────────────────────
    const result = await processTelegramUpdate(body, workspaceId)

    // ──────────────────────────────────────────────────────────
    // Send reply if we have one
    // ──────────────────────────────────────────────────────────
    if (result) {
      await sendTelegramMessage(
        botConfig.botToken,
        chatId,
        result.replyText,
        result.replyParseMode,
        result.replyMarkup
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// Telegram sends a GET request to verify webhook
export async function GET() {
  return NextResponse.json({ status: 'Telegram webhook endpoint active' })
}
