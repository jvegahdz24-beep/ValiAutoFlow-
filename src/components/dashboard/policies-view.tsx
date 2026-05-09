'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'

const TYPE_ICONS: Record<string, typeof Shield> = {
  SALES: ShieldCheck,
  COMPLIANCE: ShieldAlert,
  PRICING: ShieldQuestion,
  COMMUNICATION: Shield,
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'border-slate-500/30 text-slate-400',
  MEDIUM: 'border-amber-500/30 text-amber-400',
  HIGH: 'border-orange-500/30 text-orange-400',
  CRITICAL: 'border-red-500/30 text-red-400',
}

export function PoliciesView({ workspaceId }: { workspaceId: string }) {
  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/policies?workspaceId=${workspaceId}`)
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sales Policies</h2>
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
          {policies?.filter((p: { enabled: boolean }) => p.enabled).length || 0} active
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {policies?.map((policy: {
          id: string
          name: string
          type: string
          priority: string
          enabled: boolean
          description: string | null
        }, i: number) => {
          const Icon = TYPE_ICONS[policy.type] || Shield
          return (
            <motion.div
              key={policy.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`border-border/50 bg-card transition-colors ${policy.enabled ? 'hover:border-emerald-500/20' : 'opacity-60'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-emerald-500/10 p-2">
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium truncate">{policy.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {policy.type}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] h-5 ${PRIORITY_COLORS[policy.priority] || ''}`}>
                          {policy.priority}
                        </Badge>
                      </div>
                      {policy.description && (
                        <p className="text-xs text-muted-foreground mt-2">{policy.description}</p>
                      )}
                    </div>
                    <Switch checked={policy.enabled} className="shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
