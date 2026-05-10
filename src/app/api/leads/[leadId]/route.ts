import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession, requireWorkspaceAccess } from '@/lib/auth';

// GET /api/leads/[leadId] — Get lead details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { leadId } = await params;

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        contact: true,
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true },
        },
        leadTags: true,
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            _count: { select: { messages: true } },
          },
        },
        cognitiveStates: {
          orderBy: { updatedAt: 'desc' },
        },
        agentExecutions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            agent: { select: { id: true, name: true, type: true } },
          },
        },
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        dealValueHistories: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify workspace access
    await requireWorkspaceAccess(lead.workspaceId);

    return NextResponse.json({ lead });
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('[LEAD_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[leadId] — Update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { leadId } = await params;
    const body = await request.json();
    const {
      status,
      temperature,
      archetype,
      score,
      dealValue,
      assignedAgentId,
      pipelineStage,
      lostReason,
      lastContactAt,
    } = body;

    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify workspace access
    await requireWorkspaceAccess(lead.workspaceId);

    // Track state transition if status changed
    if (status && status !== lead.status) {
      await db.stateTransition.create({
        data: {
          leadId,
          fromStage: lead.status,
          toStage: status,
          trigger: 'MANUAL_UPDATE',
          context: JSON.stringify({ previousStatus: lead.status }),
        },
      });
    }

    // Track deal value change if changed
    if (dealValue !== undefined && dealValue !== lead.dealValue) {
      await db.dealValueHistory.create({
        data: {
          leadId,
          previousValue: lead.dealValue,
          newValue: dealValue,
          reason: 'MANUAL_UPDATE',
        },
      });
    }

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        ...(status !== undefined && { status }),
        ...(temperature !== undefined && { temperature }),
        ...(archetype !== undefined && { archetype }),
        ...(score !== undefined && { score }),
        ...(dealValue !== undefined && { dealValue }),
        ...(assignedAgentId !== undefined && { assignedAgentId }),
        ...(pipelineStage !== undefined && { pipelineStage }),
        ...(lostReason !== undefined && { lostReason }),
        ...(lastContactAt !== undefined && {
          lastContactAt: new Date(lastContactAt),
        }),
      },
      include: {
        contact: true,
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ lead: updated });
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('[LEAD_UPDATE]', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}
