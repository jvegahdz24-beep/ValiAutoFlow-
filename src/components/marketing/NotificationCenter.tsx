'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Bell, X, AlertTriangle, Calendar, TrendingUp, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  description: string
  read: boolean
  createdAt: string
}

interface NotificationCenterProps {
  workspaceId: string
}

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  alert: AlertTriangle,
  calendar: Calendar,
  campaign: TrendingUp,
  system: Settings,
}

const COLOR_MAP: Record<string, string> = {
  alert: 'text-red-400',
  calendar: 'text-blue-400',
  campaign: 'text-emerald-400',
  system: 'text-muted-foreground',
}

export function NotificationCenter({ workspaceId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/notifications`)
      return res.json() as Promise<{ notifications: Notification[]; unread: number }>
    },
    refetchInterval: 30000,
  })

  const notifications = data?.notifications || []
  const unread = data?.unread || 0

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/workspaces/${workspaceId}/notifications/${id}/read`, { method: 'POST' })
      queryClient.invalidateQueries({ queryKey: ['notifications', workspaceId] })
    } catch {}
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="relative">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 text-[10px] p-0 flex items-center justify-center bg-emerald-500">
            {unread}
          </Badge>
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 top-12 w-96 z-50 shadow-xl border-border/50">
          <div className="flex items-center justify-between p-3 border-b border-border/50">
            <h3 className="text-sm font-semibold">Notificaciones</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <ScrollArea className="h-80">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = ICON_MAP[notif.type] || Bell
                const color = COLOR_MAP[notif.type] || 'text-muted-foreground'
                return (
                  <button
                    key={notif.id}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    className={cn(
                      'w-full p-3 text-left hover:bg-muted/50 transition-colors flex gap-3 border-b border-border/30',
                      !notif.read && 'bg-emerald-500/5'
                    )}
                  >
                    <div className="mt-0.5">
                      <Icon className={cn('w-4 h-4', color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>
                      {notif.description && (
                        <p className="text-xs text-muted-foreground truncate">{notif.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(notif.createdAt).toLocaleString('es-MX')}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
