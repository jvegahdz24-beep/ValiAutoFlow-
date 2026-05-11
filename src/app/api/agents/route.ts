import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findMany } from '@/lib/db-supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  try {
    await requireWorkspaceAccess(workspaceId)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  try {
    // Supabase REST API fallback when Prisma can't connect
    if (!(await isPrismaReachable())) {
      const agents = await findMany('agents', { workspaceId }, { orderBy: 'name', orderAsc: true })
      return NextResponse.json(agents)
    }

    const agents = await db.agent.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(agents)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Agents] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
