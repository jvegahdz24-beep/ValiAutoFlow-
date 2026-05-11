// ============================================================
// WHATSAPP DISCONNECT ENDPOINT — Hybrid: Evolution API + Baileys
// ============================================================
// POST /api/whatsapp/disconnect
// Body: { workspaceId: string, clearSession?: boolean }
//
// Strategy:
//   1. If EVOLUTION_API_URL configured → disconnect via Evolution API
//   2. Otherwise → disconnect in-process Baileys
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { disconnectBaileys } from '@/lib/whatsapp/baileys'
import { isEvolutionConfigured, logoutInstance } from '@/lib/whatsapp/evolution-api'
import { findWhatsAppConfig, upsertWhatsAppConfig } from '@/lib/db-supabase'

export const maxDuration = 10
export const dynamic = 'force-dynamic'

function getInstanceName(workspaceId: string): string {
  return `ws_${workspaceId.substring(0, 8)}`
}

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

    // ─── Route: Evolution API ───
    if (isEvolutionConfigured()) {
      const instanceName = getInstanceName(workspaceId)
      const result = await logoutInstance(instanceName)

      if (!result.success) {
        console.warn('[WhatsApp/Disconnect] Evolution logout failed:', result.error)
        // Don't fail — still update local DB
      }

      // Update local DB
      await upsertWhatsAppConfig(workspaceId, {
        isActive: false,
        evolutionConnected: false,
      })

      return NextResponse.json({
        success: true,
        message: clearSession
          ? 'WhatsApp desconectado y sesión eliminada (vía Evolution API)'
          : 'WhatsApp desconectado (sesión preservada)',
      })
    }

    // ─── Route: Direct Baileys ───
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
