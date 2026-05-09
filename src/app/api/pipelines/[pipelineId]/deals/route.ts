import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pipelines/[pipelineId]/deals — List deals in pipeline (grouped by stage)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;

    const pipeline = await db.pipeline.findUnique({
      where: { id: pipelineId },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            deals: {
              include: {
                lead: {
                  include: {
                    contact: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                },
                assignedAgent: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    // Compute pipeline totals
    const allDeals = pipeline.stages.flatMap((stage) => stage.deals);
    const totalValue = allDeals.reduce((sum, deal) => sum + deal.value, 0);
    const weightedValue = allDeals.reduce(
      (sum, deal) => sum + deal.value * deal.probability,
      0
    );

    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
      },
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        isWonStage: stage.isWonStage,
        isLostStage: stage.isLostStage,
        deals: stage.deals,
        totalValue: stage.deals.reduce((sum, deal) => sum + deal.value, 0),
        dealCount: stage.deals.length,
      })),
      totals: {
        totalDeals: allDeals.length,
        totalValue,
        weightedValue,
      },
    });
  } catch (error) {
    console.error('[PIPELINE_DEALS_LIST]', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline deals' },
      { status: 500 }
    );
  }
}

// POST /api/pipelines/[pipelineId]/deals — Create a new deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pipelineId: string }> }
) {
  try {
    const { pipelineId } = await params;
    const body = await request.json();
    const {
      workspaceId,
      leadId,
      pipelineStageId,
      title,
      value,
      currency,
      probability,
      expectedCloseDate,
      assignedAgentId,
    } = body;

    if (!workspaceId || !leadId || !pipelineStageId || !title) {
      return NextResponse.json(
        {
          error:
            'workspaceId, leadId, pipelineStageId, and title are required',
        },
        { status: 400 }
      );
    }

    // Verify pipeline exists
    const pipeline = await db.pipeline.findUnique({
      where: { id: pipelineId },
    });
    if (!pipeline) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    // Verify stage belongs to this pipeline
    const stage = await db.pipelineStage.findUnique({
      where: { id: pipelineStageId },
    });
    if (!stage || stage.pipelineId !== pipelineId) {
      return NextResponse.json(
        { error: 'Invalid pipeline stage' },
        { status: 400 }
      );
    }

    // Verify lead exists
    const lead = await db.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const deal = await db.deal.create({
      data: {
        workspaceId,
        leadId,
        pipelineId,
        pipelineStageId,
        title,
        value: value || 0,
        currency: currency || 'USD',
        probability: probability || 0,
        expectedCloseDate: expectedCloseDate
          ? new Date(expectedCloseDate)
          : null,
        assignedAgentId,
      },
      include: {
        lead: {
          include: {
            contact: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        pipelineStage: {
          select: { id: true, name: true, order: true },
        },
        assignedAgent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    console.error('[DEAL_CREATE]', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
