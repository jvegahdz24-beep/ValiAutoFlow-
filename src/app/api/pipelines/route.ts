import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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
