// ============================================================
// BAILEYS QR CODE ENDPOINT
// ============================================================
// GET /api/whatsapp/qr?workspaceId=xxx
// Generates a QR code for WhatsApp connection via Baileys.
// Returns base64 PNG image and connection status.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { initBaileysSocket, ensureBaileysConfig } from '@/lib/whatsapp/baileys'

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
        qr: result.qr,           // base64 PNG image
        qrString: result.qrString, // raw QR string (for client-side rendering)
        pairingCode: result.pairingCode,
        status: result.status,
        message: 'Escanea el código QR con tu WhatsApp',
      })
    }

    // No QR yet — still connecting
    return NextResponse.json({
      qr: null,
      status: 'connecting',
      message: 'Conectando con WhatsApp...',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/QR] Error:', error)
    return NextResponse.json(
      { error: `Error generando QR: ${error.message}` },
      { status: 500 }
    )
  }
}

// POST also works for generating a fresh QR (re-initiates connection)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const workspaceId = body.workspaceId

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId es requerido' },
        { status: 400 }
      )
    }

    await requireWorkspaceAccess(workspaceId)
    await ensureBaileysConfig(workspaceId)

    const result = await initBaileysSocket(workspaceId)

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
      message: result.qr ? 'Escanea el código QR' : 'Conectando con WhatsApp...',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/QR] POST Error:', error)
    return NextResponse.json(
      { error: `Error generando QR: ${error.message}` },
      { status: 500 }
    )
  }
}
