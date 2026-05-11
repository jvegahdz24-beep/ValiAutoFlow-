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
    return NextResponse.json({
      status: "error",
      db: "disconnected",
      error: error.message,
    }, { status: 500 })
  }
}
