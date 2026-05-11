import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findAgentsWithExecutions } from '@/lib/db-supabase'

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
      const agents = await findAgentsWithExecutions(workspaceId)
      return NextResponse.json(agents)
    }

    // Prisma path — include execution count and recent executions
    const agents = await db.agent.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
      include: {
        agentExecutions: {
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: {
            id: true,
            status: true,
            createdAt: true,
            duration: true,
          },
        },
        _count: {
          select: { agentExecutions: true },
        },
      },
    })

    // Transform to include executionCount, avgScore, recentExecutions, and carnal mapping
    const agentsWithStats = agents.map((agent: any) => {
      const executionCount = agent._count?.agentExecutions || 0
      const successCount = agent.agentExecutions?.filter((e: any) => e.status === 'SUCCESS').length || 0
      const avgScore = executionCount > 0 ? (successCount / executionCount) * 100 : 0

      return {
        ...agent,
        carnal: agent.type, // Map type -> carnal for frontend compatibility
        executionCount,
        avgScore,
        recentExecutions: agent.agentExecutions || [],
        // Remove nested relations to keep response clean
        agentExecutions: undefined,
        _count: undefined,
      }
    })

    return NextResponse.json(agentsWithStats)
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
