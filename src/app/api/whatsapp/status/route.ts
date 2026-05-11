// ============================================================
// WHATSAPP STATUS ENDPOINT — Hybrid: Evolution API + Baileys
// ============================================================
// GET /api/whatsapp/status?workspaceId=xxx
// Returns current WhatsApp connection status.
//
// Strategy:
//   1. If EVOLUTION_API_URL configured → check via Evolution API
//   2. Otherwise → check in-process Baileys + Supabase fallback
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { getBaileysStatus } from '@/lib/whatsapp/baileys'
import { isEvolutionConfigured, getInstanceStatus } from '@/lib/whatsapp/evolution-api'
import { findWhatsAppConfig } from '@/lib/db-supabase'

export const maxDuration = 10
export const dynamic = 'force-dynamic'

function getInstanceName(workspaceId: string): string {
  return `ws_${workspaceId.substring(0, 8)}`
}

async function handleStatusRequest(workspaceId: string) {
  await requireWorkspaceAccess(workspaceId)

  // ─── Route: Evolution API ───
  if (isEvolutionConfigured()) {
    const instanceName = getInstanceName(workspaceId)
    const result = await getInstanceStatus(instanceName)

    if (result.success) {
      const isConnected = result.status === 'open'
      return NextResponse.json({
        connected: isConnected,
        status: isConnected ? 'connected' : result.status === 'close' ? 'disconnected' : 'connecting',
        phone: null,
        userName: null,
      })
    }

    // Evolution API failed — fall through to DB check
    console.warn('[WhatsApp/Status] Evolution API check failed:', result.error)
  }

  // ─── Route: Direct Baileys ───
  const status = await getBaileysStatus(workspaceId)

  return NextResponse.json({
    connected: status.connected,
    status: status.status,
    phone: status.phone,
    userName: status.userName,
    lastConnectedAt: status.lastConnectedAt,
  })
}

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

    return await handleStatusRequest(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/Status] Error:', error.message)
    return NextResponse.json(
      { error: `Error obteniendo estado: ${error.message}` },
      { status: 500 }
    )
  }
}

// POST support — some callers may POST with { workspaceId } in body
export async function POST(request: NextRequest) {
  try {
    let workspaceId: string | null = null

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

    return await handleStatusRequest(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/Status] POST Error:', error.message)
    return NextResponse.json(
      { error: `Error obteniendo estado: ${error.message}` },
      { status: 500 }
    )
  }
}
