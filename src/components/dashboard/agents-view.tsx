'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { CARNALES, type CarnalConfig } from './shared'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

export function AgentsView({ workspaceId }: { workspaceId: string }) {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/agents?workspaceId=${workspaceId}`)
      return res.json()
    },
  })

  const [expandedCarnal, setExpandedCarnal] = useState<string | null>(null)

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
        <h2 className="text-lg font-semibold">The 7 Carnales</h2>
        <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
          Cognitive Engines
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {CARNALES.map((carnal: CarnalConfig, index: number) => {
          const agent = agents?.find((a: { carnal: string | null }) => a.carnal === carnal.key)
          const Icon = carnal.icon
          const isExpanded = expandedCarnal === carnal.key

          // Generate mock performance data for expanded view
          const performanceData = Array.from({ length: 7 }, (_, i) => ({
            day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
            executions: Math.floor(Math.random() * 30 + 10),
          }))

          return (
            <motion.div
              key={carnal.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="sm:col-span-2 lg:col-span-1"
            >
              <Card className={`border ${carnal.borderColor} ${carnal.bgColor} hover:shadow-lg transition-all overflow-hidden`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-xl p-3 ${carnal.bgColor}`}>
                      <Icon className={`h-6 w-6 ${carnal.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold">{carnal.name}</h3>
                        <div className={`h-2 w-2 rounded-full ${agent?.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{carnal.role}</p>
                    </div>
                  </div>

                  {agent && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Executions</span>
                        <span className="font-medium">{agent.executionCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Avg Score</span>
                        <span className="font-medium text-emerald-400">{agent.avgScore.toFixed(1)}</span>
                      </div>
                      <Progress value={agent.avgScore} className="h-1.5" />
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setExpandedCarnal(isExpanded ? null : carnal.key)}
                  >
                    {isExpanded ? 'Less' : 'More'} Details
                    {isExpanded ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                  </Button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <Separator className="my-3 bg-border/50" />
                        
                        {/* Performance Chart */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <BarChart3 className="h-3 w-3" />
                            <span>Weekly Performance</span>
                          </div>
                          <ResponsiveContainer width="100%" height={100}>
                            <BarChart data={performanceData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} width={25} />
                              <Bar dataKey="executions" fill={carnal.color === 'text-emerald-400' ? '#34D399' : '#6B7280'} radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="space-y-1.5">
                          <span className="text-xs text-muted-foreground">Cost Estimate</span>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Tokens</span>
                            <span>{agent ? Math.floor(agent.executionCount * 450) : 0}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Est. Cost</span>
                            <span className="text-emerald-400">${agent ? (agent.executionCount * 0.03).toFixed(2) : '0.00'}</span>
                          </div>
                        </div>

                        {/* Recent Executions */}
                        <div className="mt-3 space-y-1">
                          <span className="text-xs text-muted-foreground">Recent Executions</span>
                          {['SUCCESS', 'SUCCESS', 'SUCCESS', 'ERROR'].map((status, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">#{(agent?.executionCount || 0) - i}</span>
                              <Badge
                                variant="outline"
                                className={status === 'SUCCESS'
                                  ? 'text-[9px] h-4 border-emerald-500/30 text-emerald-400'
                                  : 'text-[9px] h-4 border-red-500/30 text-red-400'
                                }
                              >
                                {status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
