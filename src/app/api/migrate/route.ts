// ============================================================
// DATABASE MIGRATION ENDPOINT
// ============================================================
// Run this endpoint once to add missing columns to the
// whatsapp_configs table. This is needed because we can't
// run ALTER TABLE through the Supabase REST API.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - require an internal API key
    const authHeader = request.headers.get('authorization')
    const internalKey = process.env.INTERNAL_API_KEY || 'valiautoflow-migrate-2024'
    
    if (authHeader !== `Bearer ${internalKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // Try to add new columns to whatsapp_configs
    const migrations = [
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "channelName" TEXT`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "connectionType" TEXT DEFAULT 'meta'`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "evolutionInstanceName" TEXT`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "evolutionConnected" BOOLEAN DEFAULT false`,
      `ALTER TABLE whatsapp_configs ALTER COLUMN "phoneNumberId" SET DEFAULT ''`,
      `ALTER TABLE whatsapp_configs ALTER COLUMN "accessToken" SET DEFAULT ''`,
      `ALTER TABLE whatsapp_configs ALTER COLUMN "verifyToken" SET DEFAULT ''`,
    ]

    for (const sql of migrations) {
      try {
        await db.$executeRawUnsafe(sql)
        results.push(`OK: ${sql.substring(0, 60)}...`)
      } catch (err: any) {
        results.push(`SKIP: ${sql.substring(0, 60)}... — ${err.message}`)
      }
    }

    // Seed the bielys channel for demo workspace
    const workspaces = await db.workspace.findMany({ take: 1 })
    if (workspaces.length > 0) {
      const wsId = workspaces[0].id
      const instanceName = `bielys_${wsId.slice(0, 8)}`

      await db.whatsAppConfig.upsert({
        where: { workspaceId: wsId },
        create: {
          workspaceId: wsId,
          phoneNumberId: '',
          accessToken: '',
          verifyToken: 'evolution_verify_token',
          isActive: false,
          channelName: 'bielys',
          connectionType: 'evolution',
          evolutionInstanceName: instanceName,
          evolutionConnected: false,
        },
        update: {
          channelName: 'bielys',
          connectionType: 'evolution',
          evolutionInstanceName: instanceName,
          evolutionConnected: false,
        },
      })
      results.push(`OK: WhatsApp channel "bielys" configured for workspace ${wsId}`)
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
