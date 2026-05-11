// ============================================================
// DATABASE MIGRATION ENDPOINT
// ============================================================
// Run this endpoint once to add missing columns to the
// whatsapp_configs table. This is needed because we can't
// run ALTER TABLE through the Supabase REST API.
//
// Usage:
//   POST /api/migrate
//   Authorization: Bearer valiautoflow-migrate-2024
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { isPrismaReachable } from '@/lib/db-supabase'

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - require an internal API key
    const authHeader = request.headers.get('authorization')
    const internalKey = process.env.INTERNAL_API_KEY || 'valiautoflow-migrate-2024'

    if (authHeader !== `Bearer ${internalKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results: string[] = []

    // Migrations to add new columns to whatsapp_configs
    const migrations = [
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "channelName" TEXT`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "connectionType" TEXT DEFAULT 'meta'`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "evolutionInstanceName" TEXT`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "evolutionConnected" BOOLEAN DEFAULT false`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "baileysAuthState" TEXT`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "baileysConnected" BOOLEAN DEFAULT false`,
      `ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS "baileysPhone" TEXT`,
      `ALTER TABLE whatsapp_configs ALTER COLUMN "phoneNumberId" SET DEFAULT ''`,
      `ALTER TABLE whatsapp_configs ALTER COLUMN "accessToken" SET DEFAULT ''`,
      `ALTER TABLE whatsapp_configs ALTER COLUMN "verifyToken" SET DEFAULT ''`,
    ]

    // Try Prisma first, then fallback instructions
    const prismaOk = await isPrismaReachable()

    if (prismaOk) {
      const { db } = await import('@/lib/db')

      for (const sql of migrations) {
        try {
          await db.$executeRawUnsafe(sql)
          results.push(`OK: ${sql.substring(0, 70)}...`)
        } catch (err: any) {
          results.push(`SKIP: ${sql.substring(0, 70)}... — ${err.message}`)
        }
      }

      // Seed the bielys channel for demo workspace
      try {
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
              verifyToken: 'baileys_verify_token',
              isActive: false,
              channelName: 'bielys',
              connectionType: 'baileys',
              evolutionInstanceName: instanceName,
              evolutionConnected: false,
              baileysConnected: false,
            },
            update: {
              channelName: 'bielys',
              connectionType: 'baileys',
              evolutionInstanceName: instanceName,
            },
          })
          results.push(`OK: WhatsApp channel "bielys" configured for workspace ${wsId}`)
        }
      } catch (err: any) {
        results.push(`SKIP: Seed — ${err.message}`)
      }
    } else {
      // Prisma unreachable — return SQL for manual execution
      results.push('Prisma unreachable. Run the following SQL in the Supabase SQL Editor:')
      for (const sql of migrations) {
        results.push(sql + ';')
      }
      results.push('-- Also run this to seed the bielys channel:')
      results.push(`INSERT INTO whatsapp_configs ("workspaceId", "phoneNumberId", "accessToken", "verifyToken", "isActive", "channelName", "connectionType", "evolutionInstanceName", "evolutionConnected", "baileysConnected")
SELECT w.id, '', '', 'baileys_verify_token', false, 'bielys', 'baileys', 'bielys_' || LEFT(w.id, 8), false, false
FROM workspaces w LIMIT 1
ON CONFLICT ("workspaceId") DO UPDATE SET "channelName" = 'bielys', "connectionType" = 'baileys';`)
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
