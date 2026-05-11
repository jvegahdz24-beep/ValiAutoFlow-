// ============================================================
// BAILEYS QR CODE ENDPOINT — Serverless-Compatible
// ============================================================
// GET /api/whatsapp/qr?workspaceId=xxx — Check current QR status
// POST /api/whatsapp/qr — Generate fresh QR code
// Body: { workspaceId: string }
//
// IMPORTANT: This endpoint needs a longer timeout because
// Baileys needs time to connect to WhatsApp servers and
// generate the QR code. We set maxDuration = 60s.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { initBaileysSocket, ensureBaileysConfig } from '@/lib/whatsapp/baileys'

// Vercel serverless: max 60s on Hobby, 300s on Pro
export const maxDuration = 60

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId es requerido' },
        { status: 400 }
      )
    }

    // Verify workspace access
    await requireWorkspaceAccess(workspaceId)

    // Ensure config record exists
    await ensureBaileysConfig(workspaceId)

    // Initialize Baileys socket and get QR code
    const result = await initBaileysSocket(workspaceId)

    if (result.status === 'connected') {
      return NextResponse.json({
        qr: null,
        status: 'connected',
        message: 'WhatsApp ya está conectado',
      })
    }

    if (result.qr) {
      return NextResponse.json({
        qr: result.qr,           // base64 PNG data URL
        qrString: result.qrString,
        pairingCode: result.pairingCode,
        status: result.status,
        message: 'Escanea el código QR con tu WhatsApp',
      })
    }

    // No QR yet — still connecting
    return NextResponse.json({
      qr: null,
      status: 'connecting',
      message: 'Conectando con WhatsApp... Intenta de nuevo en unos segundos.',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/QR] GET Error:', error.message, error.stack?.substring(0, 300))
    return NextResponse.json(
      { error: `Error generando QR: ${error.message}` },
      { status: 500 }
    )
  }
}

// POST — Generate a fresh QR (re-initiates connection)
export async function POST(request: NextRequest) {
  try {
    let workspaceId: string | null = null

    // Try to get workspaceId from body first, then from URL params
    try {
      const body = await request.json()
      workspaceId = body.workspaceId
    } catch {
      // No body — check URL params
      const { searchParams } = new URL(request.url)
      workspaceId = searchParams.get('workspaceId')
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId es requerido' },
        { status: 400 }
      )
    }

    await requireWorkspaceAccess(workspaceId)
    await ensureBaileysConfig(workspaceId)

    console.log('[WhatsApp/QR] POST — Initializing Baileys socket for workspace', workspaceId.substring(0, 8))

    const result = await initBaileysSocket(workspaceId)

    // Check for init errors
    if ((result as any).error) {
      console.error('[WhatsApp/QR] Init error:', (result as any).error)
      return NextResponse.json(
        {
          error: `Error de conexión Baileys: ${(result as any).error}`,
          status: 'error',
          hint: 'Si el error persiste, verifica que @whiskeysockets/baileys esté instalado y que el entorno soporte WebSockets.',
        },
        { status: 500 }
      )
    }

    if (result.status === 'connected') {
      return NextResponse.json({
        qr: null,
        status: 'connected',
        message: 'WhatsApp ya está conectado',
      })
    }

    return NextResponse.json({
      qr: result.qr,
      qrString: result.qrString,
      pairingCode: result.pairingCode,
      status: result.status || 'connecting',
      message: result.qr ? 'Escanea el código QR' : 'Conectando con WhatsApp... Espera unos segundos y vuelve a intentar.',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/QR] POST Error:', error.message, error.stack?.substring(0, 300))
    return NextResponse.json(
      { error: `Error generando QR: ${error.message}` },
      { status: 500 }
    )
  }
}
