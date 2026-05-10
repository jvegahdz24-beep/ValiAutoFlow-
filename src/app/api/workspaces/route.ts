import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const workspaces = await db.workspace.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ workspaces })
  } catch (error) {
    console.error('[Workspaces] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
