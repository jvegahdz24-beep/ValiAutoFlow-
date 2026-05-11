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
    } else {
      // Supabase REST API fallback
      const followups = await findMany(
        'follow_up_sequences',
        { workspaceId },
        { orderBy: 'createdAt', orderAsc: false }
      )

      // Enrich with nested steps and executions to match Prisma format
      const enriched = await Promise.all(
        followups.map(async (seq: any) => {
          const steps = await findMany(
            'follow_up_steps',
            { sequenceId: seq.id },
            { orderBy: 'order', orderAsc: true }
          )

          const stepsWithExecutions = await Promise.all(
            steps.map(async (step: any) => {
              const executions = await findMany(
                'follow_up_executions',
                { stepId: step.id },
                { orderBy: 'createdAt', orderAsc: false, limit: 20 }
              )
              return { ...step, executions }
            })
          )

          return { ...seq, steps: stepsWithExecutions }
        })
      )

      return NextResponse.json(enriched)
    }
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    console.error('[Followups] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
