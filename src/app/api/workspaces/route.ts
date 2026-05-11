import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { isPrismaReachable, findMany } from '@/lib/db-supabase'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Supabase REST API fallback when Prisma can't connect
    if (!(await isPrismaReachable())) {
      const workspaces = await findMany('workspaces', {}, { orderBy: 'createdAt', orderAsc: false })
      return NextResponse.json({ workspaces })
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
