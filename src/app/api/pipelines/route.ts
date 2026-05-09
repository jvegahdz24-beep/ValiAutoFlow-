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

  const pipelines = await db.pipeline.findMany({
    where: { workspaceId },
    include: {
      stages: {
        orderBy: { order: 'asc' },
        include: {
          deals: true,
        },
      },
    },
  })

  return NextResponse.json(pipelines)
}
