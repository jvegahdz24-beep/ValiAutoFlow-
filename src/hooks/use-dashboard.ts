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
    stageDistribution: { name: string; count: number }[]
    temperatureDistribution: { name: string; count: number }[]
    agentActivity: { name: string; executionCount: number; avgScore: number; status: string }[]
  }
}

export function useDashboard(workspaceId: string | null) {
  return useQuery({
    queryKey: ['dashboard', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/dashboard`)
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorBody.error || `Dashboard API error: ${res.status}`)
      }
      const data = await res.json() as DashboardData
      // Validate expected shape
      if (!data.dashboard) {
        throw new Error('Invalid dashboard response: missing dashboard field')
      }
      return data
    },
    enabled: !!workspaceId,
    refetchInterval: 30000,
    retry: 2,
  })
}
