import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
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
      code: error.code,
      clientVersion: error.clientVersion,
      meta: error.meta ? JSON.stringify(error.meta) : undefined
    }, { status: 500 })
  }
}
