// ============================================================
// WHATSAPP CONFIG API — CRUD for WhatsApp Cloud API settings
// ============================================================
// GET    — Retrieve WhatsApp config (accessToken masked)
// POST   — Create or update config with phoneNumberId, accessToken, verifyToken
// PUT    — Update specific fields and optionally set up webhook with Meta
// DELETE — Remove config
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPhoneNumberDetails, subscribeAppToWaba } from '@/lib/whatsapp/client'

// ============================================================
// Helper — Mask access token for safe responses
// ============================================================

function maskAccessToken(token: string): string {
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
  const { workspaceId } = await params

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
  })
}

// ============================================================
// POST — Create or update WhatsApp config
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const body = await request.json()

  const { phoneNumberId, accessToken, verifyToken, businessAccountId, wabaId, isActive } = body

  if (!phoneNumberId || !accessToken || !verifyToken) {
    return NextResponse.json(
      { error: 'phoneNumberId, accessToken, and verifyToken are required' },
      { status: 400 }
    )
  }

  // ──────────────────────────────────────────────────────────
  // Verify the access token by calling the Meta API
  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // Upsert config
  // ──────────────────────────────────────────────────────────
  const config = await db.whatsAppConfig.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      phoneNumberId,
      accessToken,
      verifyToken,
      businessAccountId: businessAccountId || null,
      wabaId: wabaId || null,
      isActive: isActive ?? true,
    },
    update: {
      phoneNumberId,
      accessToken,
      verifyToken,
      businessAccountId: businessAccountId || null,
      wabaId: wabaId || null,
      isActive: isActive ?? true,
    },
  })

  // ──────────────────────────────────────────────────────────
  // Set up webhook with Meta if active
  // ──────────────────────────────────────────────────────────
  if (config.isActive && config.wabaId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : ''

    if (appUrl) {
      const webhookUrl = `${appUrl}/api/whatsapp/webhook`

      // Subscribe the app to the WABA
      const subResult = await subscribeAppToWaba(config.wabaId, accessToken)

      if (subResult.success) {
        await db.whatsAppConfig.update({
          where: { id: config.id },
          data: {
            webhookUrl,
            lastSyncAt: new Date(),
          },
        })
      }
    }
  }

  // Mask access token in response
  const maskedAccessToken = maskAccessToken(accessToken)

  return NextResponse.json({
    config: {
      ...config,
      accessToken: maskedAccessToken,
    },
    phoneDetails: phoneDetails.data,
    message: config.isActive
      ? 'WhatsApp configurado y activo'
      : 'WhatsApp configurado pero inactivo',
  })
}

// ============================================================
// PUT — Update specific fields
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params
  const body = await request.json()

  const existing = await db.whatsAppConfig.findUnique({
    where: { workspaceId },
  })

  if (!existing) {
    return NextResponse.json(
      { error: 'WhatsApp config not found. Use POST to create.' },
      { status: 404 }
    )
  }

  const updateData: Record<string, unknown> = {}

  // Only update provided fields
  if (body.phoneNumberId !== undefined) {
    updateData.phoneNumberId = body.phoneNumberId
  }
  if (body.accessToken !== undefined) {
    updateData.accessToken = body.accessToken
  }
  if (body.verifyToken !== undefined) {
    updateData.verifyToken = body.verifyToken
  }
  if (body.businessAccountId !== undefined) {
    updateData.businessAccountId = body.businessAccountId
  }
  if (body.wabaId !== undefined) {
    updateData.wabaId = body.wabaId
  }
  if (body.isActive !== undefined) {
    updateData.isActive = body.isActive

    // When activating, set up the webhook with Meta
    if (body.isActive && existing.wabaId) {
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

  const updated = await db.whatsAppConfig.update({
    where: { workspaceId },
    data: updateData,
  })

  const maskedAccessToken = maskAccessToken(updated.accessToken)

  return NextResponse.json({
    config: {
      ...updated,
      accessToken: maskedAccessToken,
    },
  })
}

// ============================================================
// DELETE — Remove WhatsApp config
// ============================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  const existing = await db.whatsAppConfig.findUnique({
    where: { workspaceId },
  })

  if (existing) {
    // Delete the config
    await db.whatsAppConfig.delete({
      where: { workspaceId },
    })
  }

  return NextResponse.json({ message: 'WhatsApp config removed' })
}
