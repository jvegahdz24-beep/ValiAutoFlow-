// ============================================================
// TELEGRAM BOT CONFIG API — CRUD for bot settings
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable } from '@/lib/db-supabase'
import {
  findTelegramConfig,
  upsertTelegramConfig,
  deleteTelegramConfig as deleteTelegramConfigSupabase,
  findTelegramSessions,
  findTelegramCommands,
} from '@/lib/db-supabase'
import {
  setupTelegramWebhook,
  removeTelegramWebhook,
  getTelegramBotInfo,
} from '@/lib/telegram/bot'

function maskBotToken(token: string): string {
  if (!token || token.length <= 12) return '****'
  return token.substring(0, 8) + '...' + token.substring(token.length - 4)
}

// GET — Retrieve bot config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      const config = await db.telegramBotConfig.findUnique({
        where: { workspaceId },
      })

      if (!config) {
        return NextResponse.json({ config: null })
      }

      const maskedToken = maskBotToken(config.botToken)

      const sessions = await db.telegramBotSession.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      })

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

      for (const cmd of recentCommands) {
        commandStats.byCommand[cmd.command] = (commandStats.byCommand[cmd.command] || 0) + 1
      }

      return NextResponse.json({
        config: { ...config, botToken: maskedToken },
        sessions,
        commandStats,
        recentCommands: recentCommands.slice(0, 20),
      })
    }

    // Supabase REST API fallback
    console.log('[Telegram/GET] Prisma unreachable, using Supabase REST API fallback')
    const config = await findTelegramConfig(workspaceId)

    if (!config) {
      return NextResponse.json({ config: null })
    }

    const maskedToken = maskBotToken(config.botToken || '')
    const sessions = await findTelegramSessions(workspaceId)
    const commands = await findTelegramCommands(workspaceId, 50)

    const commandStats = {
      total: commands.length,
      today: commands.filter((c: any) => new Date(c.createdAt) >= new Date(new Date().setHours(0, 0, 0, 0))).length,
      byCommand: {} as Record<string, number>,
    }
    for (const cmd of commands) {
      commandStats.byCommand[cmd.command] = (commandStats.byCommand[cmd.command] || 0) + 1
    }

    return NextResponse.json({
      config: { ...config, botToken: maskedToken },
      sessions,
      commandStats,
      recentCommands: commands.slice(0, 20),
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Telegram/GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — Create or update bot config
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
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

    const configData = {
      botToken,
      botUsername: botInfo.username || '',
      allowedChatIds: JSON.stringify(allowedChatIds || []),
      isActive: isActive ?? true,
    }

    let config
    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      config = await db.telegramBotConfig.upsert({
        where: { workspaceId },
        create: { workspaceId, ...configData },
        update: configData,
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
            data: { webhookUrl, lastSyncAt: new Date() },
          })
        }
      } else {
        await removeTelegramWebhook(botToken)
      }
    } else {
      console.log('[Telegram/POST] Prisma unreachable, using Supabase REST API fallback')
      config = await upsertTelegramConfig(workspaceId, configData)

      // Set up webhook if active (via direct HTTP call)
      if (config?.isActive) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : ''

        if (appUrl) {
          const webhookUrl = `${appUrl}/api/telegram/webhook`
          await setupTelegramWebhook(botToken, webhookUrl)
          await upsertTelegramConfig(workspaceId, { webhookUrl, lastSyncAt: new Date().toISOString() })
        }
      }
    }

    const maskedToken = maskBotToken(botToken)

    return NextResponse.json({
      config: {
        ...config,
        botToken: maskedToken,
      },
      botInfo,
      message: config?.isActive
        ? `Bot @${botInfo.username} activado y webhook configurado`
        : `Bot @${botInfo.username} configurado pero inactivo`,
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Telegram/POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — Update specific fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    if (body.allowedChatIds !== undefined) {
      updateData.allowedChatIds = JSON.stringify(body.allowedChatIds)
    }
    if (body.botToken !== undefined) {
      updateData.botToken = body.botToken
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    let existing: any = null
    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      existing = await db.telegramBotConfig.findUnique({ where: { workspaceId } })
      if (!existing) {
        return NextResponse.json({ error: 'Bot config not found. Use POST to create.' }, { status: 404 })
      }

      if (body.isActive !== undefined) {
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

      const updated = await db.telegramBotConfig.update({
        where: { workspaceId },
        data: updateData,
      })

      const maskedToken = maskBotToken(updated.botToken)
      return NextResponse.json({ config: { ...updated, botToken: maskedToken } })
    }

    // Supabase REST API fallback
    console.log('[Telegram/PUT] Prisma unreachable, using Supabase REST API fallback')
    existing = await findTelegramConfig(workspaceId)
    if (!existing) {
      return NextResponse.json({ error: 'Bot config not found. Use POST to create.' }, { status: 404 })
    }

    if (body.isActive !== undefined) {
      if (body.isActive) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : ''

        if (appUrl) {
          const webhookUrl = `${appUrl}/api/telegram/webhook`
          await setupTelegramWebhook(existing.botToken, webhookUrl)
          updateData.webhookUrl = webhookUrl
          updateData.lastSyncAt = new Date().toISOString()
        }
      } else {
        await removeTelegramWebhook(existing.botToken)
      }
    }

    const updated = await upsertTelegramConfig(workspaceId, updateData)
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }

    const maskedToken = maskBotToken(updated.botToken || '')
    return NextResponse.json({ config: { ...updated, botToken: maskedToken } })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Telegram/PUT] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — Remove bot config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      const existing = await db.telegramBotConfig.findUnique({ where: { workspaceId } })
      if (existing) {
        await removeTelegramWebhook(existing.botToken)
        await db.telegramBotConfig.delete({ where: { workspaceId } })
      }
    } else {
      console.log('[Telegram/DELETE] Prisma unreachable, using Supabase REST API fallback')
      const existing = await findTelegramConfig(workspaceId)
      if (existing) {
        await removeTelegramWebhook(existing.botToken)
        await deleteTelegramConfigSupabase(workspaceId)
      }
    }

    return NextResponse.json({ message: 'Bot config removed and webhook deleted' })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Telegram/DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
