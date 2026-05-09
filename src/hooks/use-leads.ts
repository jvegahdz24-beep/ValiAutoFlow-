'use client'

import { useQuery } from '@tanstack/react-query'

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  temperature: string
  score: number
  dealValue: number
  archetype: string
  intentScore: number
  churnRisk: number
  lastContact: string | null
  workspaceId: string
  leadMemories: { conversational: string; commercial: string; operational: string }[]
  conversations: { id: string; stage: string; channel: string }[]
}

interface UseLeadsOptions {
  workspaceId: string | null
  status?: string
  temperature?: string
  archetype?: string
  search?: string
}

export function useLeads({ workspaceId, status, temperature, archetype, search }: UseLeadsOptions) {
  return useQuery({
    queryKey: ['leads', workspaceId, status, temperature, archetype, search],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: workspaceId! })
      if (status) params.set('status', status)
      if (temperature) params.set('temperature', temperature)
      if (archetype) params.set('archetype', archetype)
      if (search) params.set('search', search)
      const res = await fetch(`/api/leads?${params}`)
      return res.json() as Promise<Lead[]>
    },
    enabled: !!workspaceId,
  })
}
