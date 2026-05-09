import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const severity = searchParams.get('severity')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const where: Record<string, unknown> = { workspaceId }
  if (severity) where.severity = severity

  const auditLogs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(auditLogs)
}
