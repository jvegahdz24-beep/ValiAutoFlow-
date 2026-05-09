'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, DollarSign, User } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  EXPLORATION: '#94A3B8',
  INTEREST: '#38BDF8',
  INTENT: '#FBBF24',
  OBJECTION: '#FB923C',
  CLOSING: '#34D399',
  FOLLOW_UP: '#A78BFA',
}

const STAGE_LABELS: Record<string, string> = {
  EXPLORATION: 'Exploración',
  INTEREST: 'Interés',
  INTENT: 'Intención',
  OBJECTION: 'Objeción',
  CLOSING: 'Cierre',
  FOLLOW_UP: 'Seguimiento',
}

export function PipelineView({ workspaceId }: { workspaceId: string }) {
  const { data: pipelines, isLoading } = useQuery({
    queryKey: ['pipelines', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/pipelines?workspaceId=${workspaceId}`)
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

  const pipeline = pipelines?.[0]
  if (!pipeline) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No pipeline data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{pipeline.name}</h2>
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
          {pipeline.stages?.length || 0} stages
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="flex gap-4 pb-4 min-w-max">
          {pipeline.stages?.map((stage: {
            id: string
            name: string
            order: number
            color: string
            deals: { id: string; title: string; value: number; probability: number; agentId: string | null; leadId: string | null }[]
          }) => {
            const stageTotal = stage.deals.reduce((sum: number, d: { value: number }) => sum + d.value, 0)
            const color = STAGE_COLORS[stage.name] || stage.color || '#6B7280'

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: stage.order * 0.1 }}
                className="w-72 shrink-0"
              >
                {/* Column Header */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <h3 className="text-sm font-medium">{STAGE_LABELS[stage.name] || stage.name}</h3>
                    <span className="text-xs text-muted-foreground ml-auto">{stage.deals.length}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    <span>${stageTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Deal Cards */}
                <div className="space-y-2">
                  {stage.deals.map((deal: { id: string; title: string; value: number; probability: number; agentId: string | null }) => (
                    <Card key={deal.id} className="border-border/50 bg-card hover:border-emerald-500/20 transition-colors cursor-pointer">
                      <CardContent className="p-3">
                        <h4 className="text-sm font-medium mb-2 truncate">{deal.title}</h4>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${deal.value.toLocaleString()}
                          </span>
                          <span>{deal.probability}%</span>
                        </div>
                        {/* Probability bar */}
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${deal.probability}%`, background: color }}
                          />
                        </div>
                        {deal.agentId && (
                          <div className="flex items-center gap-1 mt-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{deal.agentId}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
