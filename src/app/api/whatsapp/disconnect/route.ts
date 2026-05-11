// ============================================================
// BAILEYS DISCONNECT ENDPOINT — Serverless-Compatible
// ============================================================
// POST /api/whatsapp/disconnect
// Body: { workspaceId: string, clearSession?: boolean }
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { disconnectBaileys } from '@/lib/whatsapp/baileys'

export const maxDuration = 10
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workspaceId, clearSession = true } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId es requerido' },
        { status: 400 }
      )
    }

    await requireWorkspaceAccess(workspaceId)

    const result = await disconnectBaileys(workspaceId, clearSession)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Error desconectando WhatsApp' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: clearSession
        ? 'WhatsApp desconectado y sesión eliminada'
        : 'WhatsApp desconectado (sesión preservada para reconexión)',
    })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[WhatsApp/Disconnect] Error:', error)
    return NextResponse.json(
      { error: `Error desconectando: ${error.message}` },
      { status: 500 }
    )
  }
}
