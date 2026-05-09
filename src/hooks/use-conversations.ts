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
      return res.json() as Promise<Conversation[]>
    },
    enabled: !!workspaceId,
  })
}

export type { Conversation, Message, ToolAction, BehavioralTrace }
