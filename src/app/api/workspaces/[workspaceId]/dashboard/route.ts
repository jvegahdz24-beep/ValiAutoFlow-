import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireWorkspaceAccess } from '@/lib/auth';
import { isPrismaReachable, fetchDashboardData } from '@/lib/db-supabase';

// GET /api/workspaces/[workspaceId]/dashboard — Unified Dashboard aggregation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    await requireWorkspaceAccess(workspaceId);

    // Try Supabase REST API fallback first if Prisma is unreachable
    if (!(await isPrismaReachable())) {
      console.log('[DASHBOARD] Prisma unreachable, using Supabase REST API fallback')
      const dashboard = await fetchDashboardData(workspaceId)
      return NextResponse.json({ dashboard })
    }

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      );
    }

    // Run all queries in parallel
    const [
      totalLeads,
      activeConversations,
      wonLeads,
      lostLeads,
      leadsByStatus,
      leadsByTemperature,
      contactsBySource,
      conversationsByStage,
      activeAgents,
      recentExecutions,
      leadScores,
      totalDealValue,
      wonDeals,
      pipelineDeals,
      campaignsActive,
      campaignsTotal,
      totalCampaignsSent,
      totalCampaignsConverted,
      appointmentsScheduled,
      unreadNotifications,
      recentNotifications,
      campaignsRecent,
    ] = await Promise.all([
      // Sales KPIs
      db.lead.count({ where: { workspaceId } }),
      db.conversation.count({ where: { workspaceId, status: 'ACTIVE' } }),
      db.lead.count({ where: { workspaceId, status: 'WON' } }),
      db.lead.count({ where: { workspaceId, status: 'LOST' } }),
      db.lead.groupBy({ by: ['status'], where: { workspaceId }, _count: { status: true } }),
      db.lead.groupBy({ by: ['temperature'], where: { workspaceId }, _count: { temperature: true } }),
      db.contact.groupBy({ by: ['source'], where: { workspaceId }, _count: { source: true } }),
      db.conversation.groupBy({ by: ['currentStage'], where: { workspaceId }, _count: { currentStage: true } }),
      db.agent.count({ where: { workspaceId, isActive: true } }),
      db.agentExecution.count({
        where: { agent: { workspaceId }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      db.lead.findMany({ where: { workspaceId }, select: { score: true } }),
      db.lead.aggregate({ where: { workspaceId }, _sum: { dealValue: true } }),
      db.deal.findMany({
        where: { workspaceId, pipelineStage: { isWonStage: true } },
        select: { value: true },
      }),
      db.deal.findMany({ where: { workspaceId }, select: { value: true } }),

      // Marketing KPIs
      db.campaign.count({ where: { workspaceId, status: 'active' } }),
      db.campaign.count({ where: { workspaceId } }),
      db.campaign.findMany({
        where: { workspaceId },
        select: { stats: true },
      }),
      db.campaign.findMany({
        where: { workspaceId },
        select: { stats: true },
      }),

      // Calendar
      db.calendarEvent.count({ where: { workspaceId, status: 'scheduled' } }),

      // Notifications
      db.notification.count({ where: { workspaceId, read: false } }),
      db.notification.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent campaigns
      db.campaign.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { campaignMessages: true } } },
      }),
    ]);

    // Derived metrics
    const conversionRate = wonLeads + lostLeads > 0
      ? (wonLeads / (wonLeads + lostLeads)) * 100 : 0;

    const revenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
    const pipelineValue = pipelineDeals.reduce((sum, deal) => sum + deal.value, 0);

    const avgLeadScore = leadScores.length > 0
      ? leadScores.reduce((sum, l) => sum + l.score, 0) / leadScores.length : 0;

    // Marketing aggregated
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalConverted = 0;

    for (const c of totalCampaignsSent) {
      try {
        const stats = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
        totalSent += stats.sent || 0;
        totalDelivered += stats.delivered || 0;
      } catch {}
    }
    for (const c of totalCampaignsConverted) {
      try {
        const stats = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
        totalOpened += stats.opened || 0;
        totalConverted += stats.converted || 0;
      } catch {}
    }

    const openRate = totalSent > 0 ? (totalOpened / totalSent * 100) : 0;
    const marketingConversionRate = totalOpened > 0 ? (totalConverted / totalOpened * 100) : 0;

    // Estimated revenue loss from lost leads (using workspace config ticket)
    let averageTicket = 500
    try {
      const config = await db.workspaceConfig.findUnique({ where: { workspaceId } })
      if (config) {
        const formula = typeof config.leadFormula === 'string' ? JSON.parse(config.leadFormula) : config.leadFormula
        if (formula?.average_ticket) averageTicket = formula.average_ticket
      }
    } catch {}
    const estimatedLoss = lostLeads * averageTicket

    return NextResponse.json({
      dashboard: {
        // Sales KPIs
        totalLeads,
        activeConversations,
        conversionRate: Math.round(conversionRate * 100) / 100,
        revenue,
        pipelineValue,
        avgLeadScore: Math.round(avgLeadScore * 100) / 100,
        totalDealValue: totalDealValue._sum.dealValue || 0,
        activeAgents,
        recentExecutions,
        wonLeads,
        lostLeads,
        appointmentsScheduled,
        estimatedLoss,

        // Marketing KPIs
        campaignsActive,
        campaignsTotal,
        totalCampaignsSent: totalSent,
        totalCampaignsDelivered: totalDelivered,
        totalCampaignsOpened: totalOpened,
        totalCampaignsConverted: totalConverted,
        openRate: Math.round(openRate * 100) / 100,
        marketingConversionRate: Math.round(marketingConversionRate * 100) / 100,

        // Notifications
        unreadNotifications,

        // Distributions
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

        // Recent data
        recentNotifications,
        recentCampaigns: campaignsRecent,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'You do not have access to this workspace') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    console.error('[DASHBOARD_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
