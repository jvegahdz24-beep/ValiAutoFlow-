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
    if (await isPrismaReachable()) {
      const policies = await db.salesPolicy.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(policies)
    } else {
      const policies = await findMany('sales_policies', { workspaceId }, { orderBy: 'priority', orderAsc: true })

      return NextResponse.json(policies)
    }
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Policies] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
