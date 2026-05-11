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
    const severity = searchParams.get('severity')

    const where: Record<string, unknown> = { workspaceId }
    if (severity) where.severity = severity

    if (await isPrismaReachable()) {
      const auditLogs = await db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      return NextResponse.json(auditLogs)
    } else {
      const filters: Record<string, any> = { workspaceId }
      if (severity) filters.severity = severity

      const auditLogs = await findMany('audit_logs', filters, {
        orderBy: 'createdAt',
        orderAsc: false,
        limit: 100,
      })

      return NextResponse.json(auditLogs)
    }
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Audit] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
