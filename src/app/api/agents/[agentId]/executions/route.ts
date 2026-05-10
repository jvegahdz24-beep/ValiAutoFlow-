import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession, requireWorkspaceAccess } from '@/lib/auth';

// GET /api/agents/[agentId]/executions — List executions for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { agentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Verify workspace access
    await requireWorkspaceAccess(agent.workspaceId);

    const where: Record<string, unknown> = { agentId };

    if (status) {
      where.status = status;
    }

    if (cursor) {
      where.id = { lt: cursor };
    }

    const executions = await db.agentExecution.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        conversation: {
          select: {
            id: true,
            channel: true,
            currentStage: true,
            contact: {
              select: { id: true, name: true },
            },
          },
        },
        lead: {
          select: { id: true, status: true, temperature: true },
        },
        behavioralValidations: true,
        responseEvaluations: true,
        hallucinationDetections: true,
      },
    });

    const hasMore = executions.length > limit;
    const items = hasMore ? executions.slice(0, -1) : executions;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      executions: items,
      pagination: {
        hasMore,
        nextCursor,
        limit,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('[AGENT_EXECUTIONS_LIST]', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent executions' },
      { status: 500 }
    );
  }
}
