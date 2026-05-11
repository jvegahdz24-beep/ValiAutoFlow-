'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'

interface Workspace {
  id: string
  name: string
  createdAt: string
}

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [initializedFromStorage, setInitializedFromStorage] = useState(false)
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

  // Initialize workspace from localStorage (client-only, avoids hydration mismatch)
  useEffect(() => {
    if (initializedFromStorage) return
    const stored = localStorage.getItem('valiautoflow_workspace_id')
    if (stored) {
      setWorkspaceId(stored)
    }
    setInitializedFromStorage(true)
  }, [initializedFromStorage])

  // Auto-select or seed workspace when API data is available
  useEffect(() => {
    if (!initializedFromStorage || workspaceId || seedMutation.isPending) return

    if (workspaces && workspaces.length > 0) {
      setWorkspaceId(workspaces[0].id)
      localStorage.setItem('valiautoflow_workspace_id', workspaces[0].id)
    } else if (workspaces && workspaces.length === 0) {
      seedMutation.mutate()
    }
  }, [initializedFromStorage, workspaceId, workspaces, seedMutation])

  return {
    workspaceId,
    setWorkspaceId,
    isLoading: !workspaceId && (seedMutation.isPending || !initializedFromStorage || !workspaces),
    seed: seedMutation.mutate,
  }
}
