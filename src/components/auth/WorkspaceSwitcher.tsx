'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Check,
  ChevronsUpDown,
  Plus,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  role: string
  createdAt: string
}

interface WorkspaceSwitcherProps {
  userId: string
  currentWorkspaceId?: string
}

export function WorkspaceSwitcher({ userId, currentWorkspaceId }: WorkspaceSwitcherProps) {
  const { data: _session, update: updateSession } = useSession()
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSwitching, setIsSwitching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')

  // Fetch user's workspaces
  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await fetch('/api/auth/workspaces')
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data.workspaces || [])
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      fetchWorkspaces()
    }
  }, [userId])

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) return

    setIsSwitching(true)
    try {
      const res = await fetch('/api/auth/switch-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })

      if (res.ok) {
        const data = await res.json()
        // Update NextAuth session with new workspace
        await updateSession({
          workspaceId: data.workspace.id,
          role: data.workspace.role,
        })
        toast.success(`Switched to ${data.workspace.name}`)
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to switch workspace')
      }
    } catch {
      toast.error('Failed to switch workspace')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      const res = await fetch('/api/auth/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      })

      if (res.ok) {
        const data = await res.json()
        setWorkspaces((prev) => [
          ...prev,
          {
            id: data.workspace.id,
            name: data.workspace.name,
            slug: data.workspace.slug,
            plan: data.workspace.plan,
            role: 'OWNER',
            createdAt: data.workspace.createdAt,
          },
        ])
        // Switch to new workspace
        await handleSwitchWorkspace(data.workspace.id)
        setShowCreateInput(false)
        setNewWorkspaceName('')
        toast.success(`Created workspace "${data.workspace.name}"`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create workspace')
      }
    } catch {
      toast.error('Failed to create workspace')
    } finally {
      setIsCreating(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-2"
        disabled
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-2 hover:bg-zinc-800"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="bg-emerald-600/20 text-xs text-emerald-400">
                {currentWorkspace ? getInitials(currentWorkspace.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {currentWorkspace?.name ?? 'Select Workspace'}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-64 border-zinc-800 bg-zinc-900"
      >
        <DropdownMenuLabel className="text-xs text-zinc-500">
          Workspaces
        </DropdownMenuLabel>

        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSwitchWorkspace(workspace.id)}
            className="flex cursor-pointer items-center justify-between gap-2 focus:bg-zinc-800"
            disabled={isSwitching}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="bg-emerald-600/20 text-[10px] text-emerald-400">
                  {getInitials(workspace.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm">{workspace.name}</span>
                <span className="text-[10px] text-zinc-500">
                  {workspace.role} · {workspace.plan}
                </span>
              </div>
            </div>
            {workspace.id === currentWorkspaceId && (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="bg-zinc-800" />

        {showCreateInput ? (
          <div className="p-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateWorkspace()
                  if (e.key === 'Escape') {
                    setShowCreateInput(false)
                    setNewWorkspaceName('')
                  }
                }}
                className="h-8 flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                autoFocus
                disabled={isCreating}
              />
              <Button
                size="sm"
                className="h-8 bg-emerald-600 hover:bg-emerald-500"
                onClick={handleCreateWorkspace}
                disabled={isCreating || !newWorkspaceName.trim()}
              >
                {isCreating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </div>
            <button
              className="mt-1 text-xs text-zinc-500 hover:text-zinc-400"
              onClick={() => {
                setShowCreateInput(false)
                setNewWorkspaceName('')
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <DropdownMenuItem
            onClick={() => setShowCreateInput(true)}
            className="flex cursor-pointer items-center gap-2 focus:bg-zinc-800"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            <span className="text-sm">Create new workspace</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
