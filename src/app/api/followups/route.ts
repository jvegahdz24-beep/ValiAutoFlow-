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

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }

  const followups = await db.followUpSequence.findMany({
    where: { workspaceId },
    include: {
      steps: {
        include: {
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(followups)
}
