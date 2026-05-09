// ============================================================
// TELEGRAM BOT CONFIG API — CRUD for bot settings
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession } from '@/lib/auth'
import {
  setupTelegramWebhook,
  removeTelegramWebhook,
  getTelegramBotInfo,
} from '@/lib/telegram/bot'

// GET — Retrieve bot config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { workspaceId } = await params

  const config = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!config) {
    return NextResponse.json({ config: null })
  }

  // Don't expose full bot token — mask it
  const maskedToken = config.botToken
    ? config.botToken.substring(0, 8) + '...' + config.botToken.substring(config.botToken.length - 4)
    : ''

  // Get sessions separately
  const sessions = await db.telegramBotSession.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  // Get recent command stats
  const recentCommands = await db.telegramBotCommand.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const commandStats = {
    total: await db.telegramBotCommand.count({ where: { workspaceId } }),
    today: await db.telegramBotCommand.count({
      where: {
        workspaceId,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    byCommand: {} as Record<string, number>,
  }

  // Count by command type
  for (const cmd of recentCommands) {
    commandStats.byCommand[cmd.command] = (commandStats.byCommand[cmd.command] || 0) + 1
  }

  return NextResponse.json({
    config: {
      ...config,
      botToken: maskedToken,
      botTokenFull: config.botToken, // Include full token for webhook setup
    },
    sessions,
    commandStats,
    recentCommands: recentCommands.slice(0, 20),
  })
}

// POST — Create or update bot config
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { workspaceId } = await params
  const body = await request.json()

  const { botToken, allowedChatIds, isActive } = body

  if (!botToken) {
    return NextResponse.json({ error: 'botToken is required' }, { status: 400 })
  }

  // Verify the bot token is valid by calling getMe
  const botInfo = await getTelegramBotInfo(botToken)
  if (!botInfo.ok) {
    return NextResponse.json({ error: 'Token de bot inválido. Verifica que el token sea correcto.' }, { status: 400 })
  }

  // Upsert config
  const config = await db.telegramBotConfig.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      botToken,
      botUsername: botInfo.username || '',
      allowedChatIds: JSON.stringify(allowedChatIds || []),
      isActive: isActive ?? true,
    },
    update: {
      botToken,
      botUsername: botInfo.username || '',
      allowedChatIds: JSON.stringify(allowedChatIds || []),
      isActive: isActive ?? true,
    },
  })

  // Set up webhook if active
  if (config.isActive) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ''

    if (appUrl) {
      const webhookUrl = `${appUrl}/api/telegram/webhook`
      await setupTelegramWebhook(botToken, webhookUrl)

      await db.telegramBotConfig.update({
        where: { id: config.id },
        data: {
          webhookUrl,
          lastSyncAt: new Date(),
        },
      })
    }
  } else {
    await removeTelegramWebhook(botToken)
  }

  // Mask token in response
  const maskedToken = botToken.substring(0, 8) + '...' + botToken.substring(botToken.length - 4)

  return NextResponse.json({
    config: {
      ...config,
      botToken: maskedToken,
    },
    botInfo,
    message: config.isActive
      ? `Bot @${botInfo.username} activado y webhook configurado`
      : `Bot @${botInfo.username} configurado pero inactivo`,
  })
}

// PUT — Update specific fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { workspaceId } = await params
  const body = await request.json()

  const existing = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Bot config not found. Use POST to create.' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {}

  if (body.allowedChatIds !== undefined) {
    updateData.allowedChatIds = JSON.stringify(body.allowedChatIds)
  }
  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive

    if (body.isActive) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : ''

      if (appUrl) {
        const webhookUrl = `${appUrl}/api/telegram/webhook`
        await setupTelegramWebhook(existing.botToken, webhookUrl)
        updateData.webhookUrl = webhookUrl
        updateData.lastSyncAt = new Date()
      }
    } else {
      await removeTelegramWebhook(existing.botToken)
    }
  }
  if (body.botToken !== undefined) {
    updateData.botToken = body.botToken
  }

  const updated = await db.telegramBotConfig.update({
    where: { workspaceId },
    data: updateData,
  })

  const maskedToken = updated.botToken
    ? updated.botToken.substring(0, 8) + '...' + updated.botToken.substring(updated.botToken.length - 4)
    : ''

  return NextResponse.json({
    config: { ...updated, botToken: maskedToken },
  })
}

// DELETE — Remove bot config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { workspaceId } = await params

  const existing = await db.telegramBotConfig.findUnique({
    where: { workspaceId },
  })

  if (existing) {
    await removeTelegramWebhook(existing.botToken)
    await db.telegramBotConfig.delete({
      where: { workspaceId },
    })
  }

  return NextResponse.json({ message: 'Bot config removed and webhook deleted' })
}
