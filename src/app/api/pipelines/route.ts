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
      // Fetch pipelines and their stages in parallel
      const [pipelines, stages] = await Promise.all([
        findMany('pipelines', { workspaceId }),
        findMany('pipeline_stages', { workspaceId }, { orderBy: 'order', orderAsc: true }),
      ])
      // Assemble simplified nested structure: each pipeline gets its stages with empty deals
      const pipelinesWithStages = pipelines.map((pipeline: any) => ({
        ...pipeline,
        stages: stages
          .filter((stage: any) => stage.pipelineId === pipeline.id)
          .map((stage: any) => ({ ...stage, deals: [] })),
      }))
      return NextResponse.json(pipelinesWithStages)
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
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Pipelines] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
