import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAccess } from '@/lib/auth'
import { isPrismaReachable, findAgentExecutions, findMany } from '@/lib/db-supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    await requireWorkspaceAccess(workspaceId)

    // Supabase REST API fallback when Prisma can't connect
    if (!(await isPrismaReachable())) {
      const executions = await findAgentExecutions(agentId, limit)
      return NextResponse.json({ executions })
    }

    // Prisma path
    const { db } = await import('@/lib/db')
    
    // Verify agent belongs to workspace
    const agent = await db.agent.findFirst({
      where: { id: agentId, workspaceId },
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const executions = await db.agentExecution.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ executions })
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('[AgentExecutions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
