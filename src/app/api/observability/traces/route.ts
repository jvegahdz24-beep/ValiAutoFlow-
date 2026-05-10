import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'

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
    const traces = await db.observabilityTrace.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(traces)
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Observability/Traces] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
