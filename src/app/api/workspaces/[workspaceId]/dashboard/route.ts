import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/workspaces/[workspaceId]/dashboard — Dashboard aggregation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Total leads
    const totalLeads = await db.lead.count({
      where: { workspaceId },
    });

    // Active conversations
    const activeConversations = await db.conversation.count({
      where: { workspaceId, status: 'ACTIVE' },
    });

    // Lead status distribution
    const leadsByStatus = await db.lead.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { status: true },
    });

    // Lead temperature distribution
    const leadsByTemperature = await db.lead.groupBy({
      by: ['temperature'],
      where: { workspaceId },
      _count: { temperature: true },
    });

    // Lead source breakdown (from contacts)
    const contactsBySource = await db.contact.groupBy({
      by: ['source'],
      where: { workspaceId },
      _count: { source: true },
    });

    // Won leads for conversion rate
    const wonLeads = await db.lead.count({
      where: { workspaceId, status: 'WON' },
    });

    const lostLeads = await db.lead.count({
      where: { workspaceId, status: 'LOST' },
    });

    const conversionRate =
      wonLeads + lostLeads > 0
        ? (wonLeads / (wonLeads + lostLeads)) * 100
        : 0;

    // Revenue from won deals
    const wonDeals = await db.deal.findMany({
      where: {
        workspaceId,
        pipelineStage: { isWonStage: true },
      },
      select: { value: true },
    });

    const revenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);

    // Pipeline value
    const pipelineDeals = await db.deal.findMany({
      where: { workspaceId },
      select: { value: true },
    });

    const pipelineValue = pipelineDeals.reduce(
      (sum, deal) => sum + deal.value,
      0
    );

    // Stage distribution (from conversations)
    const conversationsByStage = await db.conversation.groupBy({
      by: ['currentStage'],
      where: { workspaceId },
      _count: { currentStage: true },
    });

    // Agent activity
    const activeAgents = await db.agent.count({
      where: { workspaceId, isActive: true },
    });

    const recentExecutions = await db.agentExecution.count({
      where: {
        agent: { workspaceId },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24h
        },
      },
    });

    // Average lead score
    const leadScores = await db.lead.findMany({
      where: { workspaceId },
      select: { score: true },
    });

    const avgLeadScore =
      leadScores.length > 0
        ? leadScores.reduce((sum, l) => sum + l.score, 0) / leadScores.length
        : 0;

    // Deal value by lead
    const totalDealValue = await db.lead.aggregate({
      where: { workspaceId },
      _sum: { dealValue: true },
    });

    return NextResponse.json({
      dashboard: {
        totalLeads,
        activeConversations,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue,
        pipelineValue,
        avgLeadScore: Math.round(avgLeadScore * 100) / 100,
        totalDealValue: totalDealValue._sum.dealValue || 0,
        activeAgents,
        recentExecutions,
        leadSources: contactsBySource.map((item) => ({
          source: item.source,
          count: item._count.source,
        })),
        stageDistribution: conversationsByStage.map((item) => ({
          stage: item.currentStage,
          count: item._count.currentStage,
        })),
        statusDistribution: leadsByStatus.map((item) => ({
          status: item.status,
          count: item._count.status,
        })),
        temperatureDistribution: leadsByTemperature.map((item) => ({
          temperature: item.temperature,
          count: item._count.temperature,
        })),
      },
    });
  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
