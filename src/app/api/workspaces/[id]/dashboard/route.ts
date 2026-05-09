import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const workspace = await db.workspace.findUnique({
    where: { id },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const leads = await db.lead.findMany({ where: { workspaceId: id } })
  const conversations = await db.conversation.findMany({
    where: { workspaceId: id },
    include: { lead: true },
  })
  const convertedLeads = leads.filter((l) => l.status === 'CONVERTED')

  const totalLeads = leads.length
  const activeConversations = conversations.filter((c) => {
    if (!c.lastMessageAt) return false
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000)
    return c.lastMessageAt > threeDaysAgo
  }).length

  const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0
  const revenue = convertedLeads.reduce((sum, l) => sum + l.dealValue, 0)
  const pipelineValue = leads
    .filter((l) => l.status === 'ACTIVE')
    .reduce((sum, l) => sum + l.dealValue, 0)

  // Lead source distribution
  const channelCounts: Record<string, number> = {}
  conversations.forEach((c) => {
    channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1
  })
  const leadSourceDistribution = Object.entries(channelCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Stage distribution
  const stageCounts: Record<string, number> = {}
  conversations.forEach((c) => {
    stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1
  })
  const stageDistribution = Object.entries(stageCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Temperature distribution
  const tempCounts: Record<string, number> = {}
  leads.forEach((l) => {
    tempCounts[l.temperature] = (tempCounts[l.temperature] || 0) + 1
  })
  const temperatureDistribution = Object.entries(tempCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Agent activity
  const agents = await db.agent.findMany({ where: { workspaceId: id } })
  const agentActivity = agents.map((a) => ({
    name: a.name,
    executionCount: a.executionCount,
    avgScore: a.avgScore,
    status: a.status,
  }))

  return NextResponse.json({
    dashboard: {
      totalLeads,
      activeConversations,
      conversionRate: Math.round(conversionRate * 100) / 100,
      revenue,
      pipelineValue,
      leadSourceDistribution,
      stageDistribution,
      temperatureDistribution,
      agentActivity,
    },
  })
}
