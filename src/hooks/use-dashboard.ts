'use client'

import { useQuery } from '@tanstack/react-query'

interface DashboardData {
  dashboard: {
    totalLeads: number
    activeConversations: number
    conversionRate: number
    revenue: number
    pipelineValue: number
    lostLeads: number
    estimatedLoss: number
    appointmentsScheduled: number
    campaignsActive: number
    totalCampaignsSent: number
    unreadNotifications: number
    leadSourceDistribution: { name: string; value: number }[]
    stageDistribution: { name: string; value: number }[]
    temperatureDistribution: { name: string; value: number }[]
    agentActivity: { name: string; executionCount: number; avgScore: number; status: string }[]
  }
}

export function useDashboard(workspaceId: string | null) {
  return useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/dashboard`)
      return res.json() as Promise<DashboardData>
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
  })
}
