import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isPrismaReachable, count } from "@/lib/db-supabase"

export async function GET() {
  try {
    // Supabase REST API fallback when Prisma can't connect
    if (!(await isPrismaReachable())) {
      const [userCount, workspaceCount, leadCount] = await Promise.all([
        count('users'),
        count('workspaces'),
        count('leads'),
      ])

      return NextResponse.json({
        status: "ok",
        db: "supabase-fallback",
        counts: { users: userCount, workspaces: workspaceCount, leads: leadCount }
      })
    }

    const userCount = await db.user.count()
    const workspaceCount = await db.workspace.count()
    const leadCount = await db.lead.count()
    
    return NextResponse.json({
      status: "ok",
      db: "connected",
      counts: { users: userCount, workspaces: workspaceCount, leads: leadCount }
    })
  } catch (error: any) {
    // Enhanced error info including Supabase key diagnostics
    const raw = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const b64 = process.env.SUPABASE_SERVICE_ROLE_KEY_B64 || ''
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    let b64Decoded = ''
    if (b64) {
      try { b64Decoded = Buffer.from(b64, 'base64').toString('utf-8') } catch {}
    }
    const keyToUse = b64Decoded || raw

    // Test the key with a direct fetch to Supabase
    let supabaseTest = {}
    try {
      const testUrl = url + '/rest/v1/users?select=id&limit=1'
      const res = await fetch(testUrl, {
        headers: {
          'apikey': keyToUse,
          'Authorization': 'Bearer ' + keyToUse,
          'Accept-Profile': 'public',
        },
      })
      const text = await res.text()
      supabaseTest = {
        status: res.status,
        body: text.substring(0, 300),
        responseHeaders: Object.fromEntries(res.headers.entries()),
      }
    } catch (e: any) {
      supabaseTest = { error: e.message }
    }

    return NextResponse.json({
      status: "error",
      db: "disconnected",
      error: error.message,
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta ? JSON.stringify(error.meta) : undefined,
      _supabaseDiag: {
        url,
        rawKeyLen: raw.length,
        rawKeyFirst15: raw.substring(0, 15),
        rawKeyLast15: raw.slice(-15),
        b64Present: !!b64,
        b64DecodedLen: b64Decoded.length,
        keyUsedLen: keyToUse.length,
        keyUsedFirst15: keyToUse.substring(0, 15),
        hexFirst20: Buffer.from(keyToUse.substring(0, 20)).toString('hex'),
        directFetchTest: supabaseTest,
      }
    }, { status: 500 })
  }
}
