'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Clock, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react'

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; badgeClass: string }> = {
  INFO: { icon: Info, color: 'text-sky-400', badgeClass: 'border-sky-500/30 text-sky-400 bg-sky-500/10' },
  DEBUG: { icon: Bug, color: 'text-slate-400', badgeClass: 'border-slate-500/30 text-slate-400 bg-slate-500/10' },
  WARN: { icon: AlertTriangle, color: 'text-amber-400', badgeClass: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  ERROR: { icon: AlertCircle, color: 'text-red-400', badgeClass: 'border-red-500/30 text-red-400 bg-red-500/10' },
}

export function AuditView({ workspaceId }: { workspaceId: string }) {
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit', workspaceId, severityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId })
      if (severityFilter) params.set('severity', severityFilter)
      const res = await fetch(`/api/audit?${params}`)
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
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[140px] bg-muted/50">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="WARN">Warning</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="DEBUG">Debug</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 bg-card">
        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="space-y-0.5 p-1">
            {auditLogs?.map((log: {
              id: string
              action: string
              entity: string
              entityId: string | null
              severity: string
              details: string | null
              createdAt: string
            }, i: number) => {
              const config = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO
              const Icon = config.icon
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.action}</span>
                      <Badge variant="outline" className="text-[10px] h-5">{log.entity}</Badge>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{log.details}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-[10px] h-5 shrink-0 ${config.badgeClass}`}>
                    {log.severity}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                    {new Date(log.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
