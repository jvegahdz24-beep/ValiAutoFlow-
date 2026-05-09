import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/agents/[agentId] — Get agent details with recent executions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
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
          },
        },
        _count: {
          select: {
            executions: true,
            aiCostTrackings: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Compute execution stats
    const executionStats = await db.agentExecution.aggregate({
      where: { agentId },
      _count: true,
      _avg: { duration: true, cost: true },
      _sum: { cost: true },
    });

    const successRate = await db.agentExecution.groupBy({
      by: ['status'],
      where: { agentId },
      _count: { status: true },
    });

    return NextResponse.json({
      agent,
      stats: {
        totalExecutions: executionStats._count,
        avgDuration: executionStats._avg.duration || 0,
        avgCost: executionStats._avg.cost || 0,
        totalCost: executionStats._sum.cost || 0,
        successRate: successRate.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
      },
    });
  } catch (error) {
    console.error('[AGENT_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[agentId] — Update agent configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { name, description, config, isActive } = body;

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const updated = await db.agent.update({
      where: { id: agentId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(isActive !== undefined && { isActive }),
        version: { increment: 1 },
      },
    });

    return NextResponse.json({ agent: updated });
  } catch (error) {
    console.error('[AGENT_UPDATE]', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}
