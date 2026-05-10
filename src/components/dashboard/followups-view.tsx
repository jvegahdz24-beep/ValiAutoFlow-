'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Clock, CheckCircle, XCircle } from 'lucide-react'

export function FollowupsView({ workspaceId }: { workspaceId: string }) {
  const { data: followups, isLoading } = useQuery({
    queryKey: ['followups', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/followups?workspaceId=${workspaceId}`)
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
        <h2 className="text-lg font-semibold">Follow-up Sequences</h2>
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
          {followups?.length || 0} sequences
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {followups?.map((fu: {
          id: string
          name: string
          description: string | null
          status: string
          steps: string
          executions: { id: string; status: string; executedAt: string | null; createdAt: string }[]
        }, i: number) => {
          const steps = JSON.parse(fu.steps || '[]') as { day: number; action: string; channel: string }[]
          const executionStats = {
            completed: fu.executions.filter((e: { status: string }) => e.status === 'COMPLETED').length,
            pending: fu.executions.filter((e: { status: string }) => e.status === 'PENDING').length,
            failed: fu.executions.filter((e: { status: string }) => e.status === 'FAILED').length,
          }

          return (
            <motion.div
              key={fu.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border/50 bg-card hover:border-emerald-500/20 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{fu.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        fu.status === 'ACTIVE'
                          ? 'text-xs border-emerald-500/30 text-emerald-400'
                          : 'text-xs border-amber-500/30 text-amber-400'
                      }
                    >
                      {fu.status}
                    </Badge>
                  </div>
                  {fu.description && (
                    <p className="text-xs text-muted-foreground">{fu.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Steps */}
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Steps</span>
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                          {idx + 1}
                        </div>
                        <span className="flex-1 text-muted-foreground">{step.action}</span>
                        <Badge variant="outline" className="text-[9px] h-4">{step.channel}</Badge>
                        <span className="text-[10px] text-muted-foreground">Day {step.day}</span>
                      </div>
                    ))}
                  </div>

                  {/* Execution Stats */}
                  <div className="flex items-center gap-3 text-xs pt-2 border-t border-border/30">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      {executionStats.completed}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Clock className="h-3 w-3" />
                      {executionStats.pending}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle className="h-3 w-3" />
                      {executionStats.failed}
                    </span>
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
