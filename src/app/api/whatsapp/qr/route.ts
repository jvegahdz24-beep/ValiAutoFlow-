// ============================================================
// WHATSAPP QR CODE ENDPOINT — Hybrid: Evolution API + Baileys
// ============================================================
// GET /api/whatsapp/qr?workspaceId=xxx — Check current QR status
// POST /api/whatsapp/qr — Generate fresh QR code
// Body: { workspaceId: string }
//
// Strategy:
//   1. If EVOLUTION_API_URL is configured → use external Baileys server
//      (persistent WebSocket on Railway, 24/7 connection)
//   2. Otherwise → use in-process Baileys (serverless, connection
//      dies when function cools down)
//
// Both paths return the same JSON shape so the frontend doesn't
// need to know which backend is being used.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { initBaileysSocket, ensureBaileysConfig } from '@/lib/whatsapp/baileys'
import {
  isEvolutionConfigured,
  createInstance,
  connectInstance,
  getInstanceStatus,
} from '@/lib/whatsapp/evolution-api'
import { findWhatsAppConfig, upsertWhatsAppConfig } from '@/lib/db-supabase'

// Vercel serverless: max 60s on Hobby, 300s on Pro
export const maxDuration = 60

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'

// Instance name convention: ws_<first-8-chars-of-workspaceId>
function getInstanceName(workspaceId: string): string {
  return `ws_${workspaceId.substring(0, 8)}`
}

// ============================================================
// GET — Check current QR status
// ============================================================

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

    await requireWorkspaceAccess(workspaceId)

    // ─── Route: Evolution API (persistent Railway server) ───
    if (isEvolutionConfigured()) {
      return await handleEvolutionQR(workspaceId, 'GET')
    }

    // ─── Route: Direct Baileys (serverless) ───
    return await handleDirectBaileysQR(workspaceId, 'GET')
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

// ============================================================
// POST — Generate fresh QR code
// ============================================================

export async function POST(request: NextRequest) {
  try {
    let workspaceId: string | null = null

    // Try to get workspaceId from body first, then from URL params
    try {
      const body = await request.json()
      workspaceId = body.workspaceId
    } catch {
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

    // ─── Route: Evolution API (persistent Railway server) ───
    if (isEvolutionConfigured()) {
      return await handleEvolutionQR(workspaceId, 'POST')
    }

    // ─── Route: Direct Baileys (serverless) ───
    return await handleDirectBaileysQR(workspaceId, 'POST')
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

// ============================================================
// Evolution API Handler (Railway/Render persistent server)
// ============================================================

async function handleEvolutionQR(workspaceId: string, method: string): Promise<NextResponse> {
  const instanceName = getInstanceName(workspaceId)

  console.log(`[WhatsApp/QR] ${method} — Using Evolution API for instance`, instanceName)

  // Ensure config record exists
  await ensureBaileysConfig(workspaceId)

  // Check if instance already exists on the Evolution server
  const statusResult = await getInstanceStatus(instanceName)

  if (statusResult.success && statusResult.status === 'open') {
    // Already connected!
    return NextResponse.json({
      qr: null,
      status: 'connected',
      message: 'WhatsApp ya está conectado (vía Evolution API)',
    })
  }

  // For POST: create instance + connect to get QR
  // For GET: just try to connect if instance exists
  if (method === 'POST') {
    // Create instance (or get existing)
    await createInstance(instanceName, workspaceId)

    // Save instance name to DB
    await upsertWhatsAppConfig(workspaceId, {
      evolutionInstanceName: instanceName,
      connectionType: 'evolution',
    })
  }

  // Connect and get QR code
  const connectResult = await connectInstance(instanceName)

  if (!connectResult.success) {
    console.error('[WhatsApp/QR] Evolution connect error:', connectResult.error)
    return NextResponse.json(
      {
        error: `Error conectando con Evolution API: ${connectResult.error}`,
        status: 'error',
        hint: 'Verifica que el servidor de Evolution API esté corriendo en Railway/Render y que EVOLUTION_API_URL sea correcto.',
      },
      { status: 500 }
    )
  }

  if (connectResult.status === 'open') {
    // Connected! Update DB
    await upsertWhatsAppConfig(workspaceId, {
      isActive: true,
      evolutionConnected: true,
      connectionType: 'evolution',
    })

    return NextResponse.json({
      qr: null,
      status: 'connected',
      message: 'WhatsApp conectado exitosamente',
    })
  }

  // Return QR code for scanning
  return NextResponse.json({
    qr: connectResult.qrcode || null,
    qrString: null, // Evolution API doesn't return raw string
    pairingCode: connectResult.code || null,
    status: connectResult.status === 'open' ? 'connected' : connectResult.qrcode ? 'qr_ready' : 'connecting',
    message: connectResult.qrcode
      ? 'Escanea el código QR con tu WhatsApp'
      : 'Conectando con WhatsApp... Espera unos segundos y vuelve a intentar.',
  })
}

// ============================================================
// Direct Baileys Handler (serverless, in-process)
// ============================================================

async function handleDirectBaileysQR(workspaceId: string, method: string): Promise<NextResponse> {
  await ensureBaileysConfig(workspaceId)

  console.log(`[WhatsApp/QR] ${method} — Using direct Baileys for workspace`, workspaceId.substring(0, 8))

  const result = await initBaileysSocket(workspaceId)

  // Check for init errors
  if ((result as any).error) {
    console.error('[WhatsApp/QR] Baileys init error:', (result as any).error)
    return NextResponse.json(
      {
        error: `Error de conexión Baileys: ${(result as any).error}`,
        status: 'error',
        hint: 'Si el error persiste, configura un servidor Evolution API en Railway para conexión persistente. Configura EVOLUTION_API_URL y EVOLUTION_API_KEY.',
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
}
