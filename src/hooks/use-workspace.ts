'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

interface Workspace {
  id: string
  name: string
  createdAt: string
}

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch workspaces
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces')
      return res.json() as Promise<Workspace[]>
    },
  })

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/seed', { method: 'POST' })
      return res.json() as Promise<{ workspaceId: string }>
    },
    onSuccess: (data) => {
      setWorkspaceId(data.workspaceId)
      localStorage.setItem('valiautoflow_workspace_id', data.workspaceId)
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })

  // Initialize workspace from localStorage or API
  const initializeWorkspace = useCallback(() => {
    if (workspaceId) return

    const stored = typeof window !== 'undefined' ? localStorage.getItem('valiautoflow_workspace_id') : null
    if (stored) {
      setWorkspaceId(stored)
      return
    }

    if (workspaces && workspaces.length > 0) {
      setWorkspaceId(workspaces[0].id)
      localStorage.setItem('valiautoflow_workspace_id', workspaces[0].id)
    } else if (workspaces && workspaces.length === 0 && !seedMutation.isPending) {
      seedMutation.mutate()
    }
  }, [workspaceId, workspaces, seedMutation])

  // Use a ref-based approach to avoid setting state in effects
  const initKey = workspaces?.length ?? -1
  const needsInit = !workspaceId && initKey >= 0

  if (needsInit) {
    // Schedule initialization outside of render
    Promise.resolve().then(() => initializeWorkspace())
  }

  // Also check localStorage on mount
  if (!workspaceId && typeof window !== 'undefined') {
    const stored = localStorage.getItem('valiautoflow_workspace_id')
    if (stored) {
      // Use microtask to avoid setState during render
      Promise.resolve().then(() => setWorkspaceId(stored))
    }
  }

  return {
    workspaceId,
    setWorkspaceId,
    isLoading: !workspaceId && (seedMutation.isPending || !workspaces),
    seed: seedMutation.mutate,
  }
}
