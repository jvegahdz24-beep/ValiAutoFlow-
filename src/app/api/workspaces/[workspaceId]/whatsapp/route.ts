// ============================================================
// WHATSAPP CONFIG API — CRUD for WhatsApp Cloud API settings
// ============================================================
// GET    — Retrieve WhatsApp config (accessToken masked)
// POST   — Create or update config with phoneNumberId, accessToken, verifyToken
// PUT    — Update specific fields and optionally set up webhook with Meta
// DELETE — Remove config
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable } from '@/lib/db-supabase'
import {
  findWhatsAppConfig,
  upsertWhatsAppConfig,
  deleteWhatsAppConfig as deleteWhatsAppConfigSupabase,
  findWhatsAppTemplates,
} from '@/lib/db-supabase'
import { getPhoneNumberDetails, subscribeAppToWaba } from '@/lib/whatsapp/client'
import {
  createInstance,
  connectInstance,
  getInstanceStatus,
  logoutInstance,
  deleteInstance,
  isEvolutionConfigured,
} from '@/lib/whatsapp/evolution-api'

// ============================================================
// Helper — Mask access token for safe responses
// ============================================================

function maskAccessToken(token: string): string {
  if (!token || token.length <= 12) return '****'
  return token.substring(0, 8) + '...' + token.substring(token.length - 4)
}

function maskBotToken(token: string): string {
  if (!token || token.length <= 12) return '****'
  return token.substring(0, 8) + '...' + token.substring(token.length - 4)
}

// ============================================================
// GET — Retrieve WhatsApp config (accessToken masked)
// ============================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      const config = await db.whatsAppConfig.findUnique({
        where: { workspaceId },
      })

      if (!config) {
        return NextResponse.json({ config: null })
      }

      // Mask the access token — never expose the full token
      const maskedAccessToken = maskAccessToken(config.accessToken)

      // Get templates for this workspace
      const templates = await db.whatsAppTemplate.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      return NextResponse.json({
        config: {
          ...config,
          accessToken: maskedAccessToken,
        },
        templates,
        webhookUrl: config.webhookUrl || null,
        evolutionConfigured: isEvolutionConfigured(),
      })
    }

    // Supabase REST API fallback
    console.log('[WhatsApp/GET] Prisma unreachable, using Supabase REST API fallback')
    const config = await findWhatsAppConfig(workspaceId)

    if (!config) {
      return NextResponse.json({ 
        config: null,
        evolutionConfigured: isEvolutionConfigured(),
      })
    }

    // Mask access token
    const maskedAccessToken = maskAccessToken(config.accessToken || '')

    // Get templates
    const templates = await findWhatsAppTemplates(workspaceId)

    // Check Evolution API instance status if configured
    let evolutionStatus = null
    if (config.evolutionInstanceName && isEvolutionConfigured()) {
      const statusResult = await getInstanceStatus(config.evolutionInstanceName)
      if (statusResult.success) {
        evolutionStatus = statusResult.status
      }
    }

    return NextResponse.json({
      config: {
        ...config,
        accessToken: maskedAccessToken,
        // Provide defaults for columns that may not exist in DB yet
        channelName: config.channelName || 'bielys',
        connectionType: config.connectionType || 'evolution',
        evolutionInstanceName: config.evolutionInstanceName || `bielys_${workspaceId.slice(0, 8)}`,
        evolutionConnected: config.evolutionConnected || false,
        evolutionStatus,
      },
      templates,
      webhookUrl: config.webhookUrl || null,
      evolutionConfigured: isEvolutionConfigured(),
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// POST — Create or update WhatsApp config (Meta Cloud API or Evolution API)
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const body = await request.json()

    const { phoneNumberId, accessToken, verifyToken, businessAccountId, wabaId, isActive, connectionType, channelName } = body

    // ──────────────────────────────────────────────────────────
    // Evolution API connection (QR code-based)
    // ──────────────────────────────────────────────────────────
    if (connectionType === 'evolution' || (!phoneNumberId && !accessToken)) {
      if (!isEvolutionConfigured()) {
        return NextResponse.json(
          { error: 'Evolution API no configurada. Agrega EVOLUTION_API_URL y EVOLUTION_API_KEY en las variables de entorno.' },
          { status: 400 }
        )
      }

      const instanceName = channelName ? `bielys_${workspaceId.slice(0, 8)}` : `ws_${workspaceId.slice(0, 8)}`
      
      // Create instance in Evolution API
      const createResult = await createInstance(instanceName, workspaceId)
      if (!createResult.success) {
        return NextResponse.json(
          { error: createResult.error || 'Error creando instancia en Evolution API' },
          { status: 400 }
        )
      }

      // Connect and get QR code
      const connectResult = await connectInstance(instanceName)
      
      // Save config to database
      const configData = {
        phoneNumberId: phoneNumberId || '',
        accessToken: accessToken || '',
        verifyToken: verifyToken || `evolution_${Date.now()}`,
        businessAccountId: businessAccountId || null,
        wabaId: wabaId || null,
        isActive: isActive ?? true,
        evolutionInstanceName: instanceName,
        evolutionConnected: connectResult.status === 'open',
        channelName: channelName || 'bielys',
        connectionType: 'evolution',
      }

      let savedConfig
      if (await isPrismaReachable()) {
        const { db } = await import('@/lib/db')
        savedConfig = await db.whatsAppConfig.upsert({
          where: { workspaceId },
          create: { workspaceId, ...configData },
          update: configData,
        })
      } else {
        console.log('[WhatsApp/POST] Prisma unreachable, using Supabase REST API fallback')
        savedConfig = await upsertWhatsAppConfig(workspaceId, configData)
      }

      if (!savedConfig) {
        return NextResponse.json(
          { error: 'Error guardando configuración en la base de datos' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        config: {
          ...savedConfig,
          accessToken: maskAccessToken(savedConfig.accessToken || ''),
        },
        qrcode: connectResult.qrcode,
        pairingCode: connectResult.code,
        evolutionStatus: connectResult.status,
        message: connectResult.status === 'open'
          ? 'WhatsApp conectado exitosamente'
          : 'Escanea el código QR con tu WhatsApp para conectar',
      })
    }

    // ──────────────────────────────────────────────────────────
    // Meta Cloud API connection (token-based)
    // ──────────────────────────────────────────────────────────
    if (!phoneNumberId || !accessToken || !verifyToken) {
      return NextResponse.json(
        { error: 'phoneNumberId, accessToken, and verifyToken are required' },
        { status: 400 }
      )
    }

    // Verify the access token by calling the Meta API
    const phoneDetails = await getPhoneNumberDetails(phoneNumberId, accessToken)
    if (!phoneDetails.success) {
      return NextResponse.json(
        {
          error: 'Token de acceso inválido o Phone Number ID incorrecto. Verifica tus credenciales.',
          details: phoneDetails.error,
        },
        { status: 400 }
      )
    }

    // Upsert config
    const configData = {
      phoneNumberId,
      accessToken,
      verifyToken,
      businessAccountId: businessAccountId || null,
      wabaId: wabaId || null,
      isActive: isActive ?? true,
      connectionType: 'meta',
      channelName: channelName || '',
    }

    let config
    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      config = await db.whatsAppConfig.upsert({
        where: { workspaceId },
        create: { workspaceId, ...configData },
        update: configData,
      })

      // Set up webhook with Meta if active
      if (config.isActive && config.wabaId) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : ''

        if (appUrl) {
          const webhookUrl = `${appUrl}/api/whatsapp/webhook`
          const subResult = await subscribeAppToWaba(config.wabaId, accessToken)
          if (subResult.success) {
            await db.whatsAppConfig.update({
              where: { id: config.id },
              data: { webhookUrl, lastSyncAt: new Date() },
            })
          }
        }
      }
    } else {
      console.log('[WhatsApp/POST] Prisma unreachable, using Supabase REST API fallback')
      config = await upsertWhatsAppConfig(workspaceId, configData)
    }

    // Mask access token in response
    const maskedAccessToken = maskAccessToken(accessToken)

    return NextResponse.json({
      config: {
        ...config,
        accessToken: maskedAccessToken,
      },
      phoneDetails: phoneDetails.data,
      message: config?.isActive
        ? 'WhatsApp configurado y activo'
        : 'WhatsApp configurado pero inactivo',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not follow access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/POST] Error:', error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}

// ============================================================
// PUT — Update specific fields
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)
    const body = await request.json()

    const updateData: Record<string, unknown> = {}

    // Only update provided fields
    if (body.phoneNumberId !== undefined) updateData.phoneNumberId = body.phoneNumberId
    if (body.accessToken !== undefined) updateData.accessToken = body.accessToken
    if (body.verifyToken !== undefined) updateData.verifyToken = body.verifyToken
    if (body.businessAccountId !== undefined) updateData.businessAccountId = body.businessAccountId
    if (body.wabaId !== undefined) updateData.wabaId = body.wabaId
    if (body.channelName !== undefined) updateData.channelName = body.channelName
    if (body.connectionType !== undefined) updateData.connectionType = body.connectionType

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive

      // When activating, check for Meta Cloud API webhook setup
      if (body.isActive) {
        if (await isPrismaReachable()) {
          const { db } = await import('@/lib/db')
          const existing = await db.whatsAppConfig.findUnique({ where: { workspaceId } })
          if (existing?.wabaId) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : ''

            if (appUrl) {
              const webhookUrl = `${appUrl}/api/whatsapp/webhook`
              const token = body.accessToken || existing.accessToken
              const subResult = await subscribeAppToWaba(existing.wabaId, token)
              if (subResult.success) {
                updateData.webhookUrl = webhookUrl
                updateData.lastSyncAt = new Date()
              }
            }
          }
        }
      }
    }

    let updated
    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      const existing = await db.whatsAppConfig.findUnique({ where: { workspaceId } })
      if (!existing) {
        return NextResponse.json(
          { error: 'WhatsApp config not found. Use POST to create.' },
          { status: 404 }
        )
      }
      updated = await db.whatsAppConfig.update({
        where: { workspaceId },
        data: updateData,
      })
    } else {
      console.log('[WhatsApp/PUT] Prisma unreachable, using Supabase REST API fallback')
      const existing = await findWhatsAppConfig(workspaceId)
      if (!existing) {
        return NextResponse.json(
          { error: 'WhatsApp config not found. Use POST to create.' },
          { status: 404 }
        )
      }
      updated = await upsertWhatsAppConfig(workspaceId, updateData)
    }

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update WhatsApp config' },
        { status: 500 }
      )
    }

    const maskedAccessToken = maskAccessToken(updated.accessToken || '')

    return NextResponse.json({
      config: {
        ...updated,
        accessToken: maskedAccessToken,
      },
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/PUT] Error:', error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}

// ============================================================
// DELETE — Remove WhatsApp config
// ============================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params
    await requireWorkspaceAccess(workspaceId)

    let existing: any = null

    if (await isPrismaReachable()) {
      const { db } = await import('@/lib/db')
      existing = await db.whatsAppConfig.findUnique({ where: { workspaceId } })

      if (existing) {
        // If using Evolution API, delete the instance
        if (existing.evolutionInstanceName && isEvolutionConfigured()) {
          await logoutInstance(existing.evolutionInstanceName)
          await deleteInstance(existing.evolutionInstanceName)
        }
        await db.whatsAppConfig.delete({ where: { workspaceId } })
      }
    } else {
      console.log('[WhatsApp/DELETE] Prisma unreachable, using Supabase REST API fallback')
      existing = await findWhatsAppConfig(workspaceId)

      if (existing) {
        // If using Evolution API, delete the instance
        if (existing.evolutionInstanceName && isEvolutionConfigured()) {
          await logoutInstance(existing.evolutionInstanceName)
          await deleteInstance(existing.evolutionInstanceName)
        }
        await deleteWhatsAppConfigSupabase(workspaceId)
      }
    }

    return NextResponse.json({ message: 'WhatsApp config removed' })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
