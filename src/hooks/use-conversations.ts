'use client'

import { useQuery } from '@tanstack/react-query'

interface Message {
  id: string
  direction: string
  content: string
  agentId: string | null
  carnal: string | null
  createdAt: string
}

interface ToolAction {
  id: string
  type: string
  description: string
  status: string
}

interface BehavioralTrace {
  id: string
  policiesApplied: number
  violations: number
  responseScore: number
  details: string | null
}

interface Conversation {
  id: string
  workspaceId: string
  leadId: string
  channel: string
  stage: string
  temperature: string
  intentScore: number
  churnRisk: number
  priority: string
  lastMessage: string | null
  lastMessageAt: string | null
  lead: {
    id: string
    name: string
    email: string | null
    company: string | null
  }
  messages: Message[]
  toolActions: ToolAction[]
  behavioralTraces: BehavioralTrace[]
}

export function useConversations(workspaceId: string | null) {
  return useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/conversations?workspaceId=${workspaceId}`)
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorBody.error || `Conversations API error: ${res.status}`)
      }
      const data = await res.json() as Conversation[]
      // Ensure every conversation has a lead object (even if null from API)
      return data.map(conv => ({
        ...conv,
        lead: conv.lead || { id: conv.leadId || '', name: 'Lead sin nombre', email: null, company: null },
      }))
    },
    enabled: !!workspaceId,
    retry: 1,
  })
}

export type { Conversation, Message, ToolAction, BehavioralTrace }
