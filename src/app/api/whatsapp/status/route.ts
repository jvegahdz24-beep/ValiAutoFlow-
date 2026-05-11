// ============================================================
// BAILEYS CONNECTION STATUS ENDPOINT — Serverless-Compatible
// ============================================================
// GET /api/whatsapp/status?workspaceId=xxx
// Returns current WhatsApp connection status via Baileys.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { getBaileysStatus } from '@/lib/whatsapp/baileys'

export const maxDuration = 10
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

    await requireWorkspaceAccess(workspaceId)

    const status = await getBaileysStatus(workspaceId)

    return NextResponse.json({
      connected: status.connected,
      status: status.status,
      phone: status.phone,
      userName: status.userName,
      lastConnectedAt: status.lastConnectedAt,
    })
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
