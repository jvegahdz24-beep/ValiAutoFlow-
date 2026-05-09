import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const workspaces = await db.workspace.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ workspaces })
}
