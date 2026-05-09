'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Activity, Clock, DollarSign, AlertTriangle, Brain, ArrowRightLeft } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'

const PIE_COLORS = ['#34D399', '#38BDF8', '#F472B6', '#A78BFA', '#FB923C', '#FBBF24', '#94A3B8']

export function ObservabilityView({ workspaceId }: { workspaceId: string }) {
  return (
    <Tabs defaultValue="traces" className="space-y-4">
      <TabsList className="bg-muted/50">
        <TabsTrigger value="traces">Traces</TabsTrigger>
        <TabsTrigger value="costs">Costs</TabsTrigger>
        <TabsTrigger value="hallucinations">Hallucinations</TabsTrigger>
        <TabsTrigger value="drift">Drift</TabsTrigger>
      </TabsList>

      <TabsContent value="traces">
        <TracesTab workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="costs">
        <CostsTab workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="hallucinations">
        <HallucinationsTab workspaceId={workspaceId} />
      </TabsContent>
      <TabsContent value="drift">
        <DriftTab workspaceId={workspaceId} />
      </TabsContent>
    </Tabs>
  )
}

function TracesTab({ workspaceId }: { workspaceId: string }) {
  const [filter, setFilter] = useState('')
  const { data: traces, isLoading } = useQuery({
    queryKey: ['traces', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/observability/traces?workspaceId=${workspaceId}`)
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

  const filtered = traces?.filter((t: { eventType: string; agentName: string | null; status: string }) =>
    !filter || t.eventType.toLowerCase().includes(filter.toLowerCase()) ||
    (t.agentName || '').toLowerCase().includes(filter.toLowerCase()) ||
    t.status.toLowerCase().includes(filter.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    SUCCESS: 'border-emerald-500/30 text-emerald-400',
    ERROR: 'border-red-500/30 text-red-400',
    TIMEOUT: 'border-amber-500/30 text-amber-400',
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter traces..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm bg-muted/50"
      />
      <Card className="border-border/50 bg-card">
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-1 p-1">
            {filtered?.map((trace: { id: string; eventType: string; agentName: string | null; duration: number; status: string; createdAt: string; metadata: string | null }, i: number) => (
              <motion.div
                key={trace.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{trace.eventType}</span>
                    {trace.agentName && (
                      <Badge variant="outline" className="text-[10px] h-5">{trace.agentName}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{trace.duration}ms</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[trace.status] || ''}`}>
                    {trace.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {new Date(trace.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

function CostsTab({ workspaceId }: { workspaceId: string }) {
  const { data: costs, isLoading } = useQuery({
    queryKey: ['costs', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/observability/costs?workspaceId=${workspaceId}`)
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

  const totalCost = costs?.reduce((sum: number, c: { cost: number }) => sum + c.cost, 0) || 0

  // Cost by agent
  const agentCosts: Record<string, number> = {}
  costs?.forEach((c: { agentName: string; cost: number }) => {
    agentCosts[c.agentName] = (agentCosts[c.agentName] || 0) + c.cost
  })
  const costByAgent = Object.entries(agentCosts).map(([name, cost]) => ({ name, cost: Math.round(cost * 100) / 100 }))

  // Cost by model
  const modelCosts: Record<string, number> = {}
  costs?.forEach((c: { model: string; cost: number }) => {
    modelCosts[c.model] = (modelCosts[c.model] || 0) + c.cost
  })
  const costByModel = Object.entries(modelCosts).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))

  // Cost over time (group by date)
  const dailyCosts: Record<string, number> = {}
  costs?.forEach((c: { createdAt: string; cost: number }) => {
    const date = new Date(c.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    dailyCosts[date] = (dailyCosts[date] || 0) + c.cost
  })
  const costOverTime = Object.entries(dailyCosts).map(([date, cost]) => ({ date, cost: Math.round(cost * 1000) / 1000 }))

  return (
    <div className="space-y-4">
      {/* Total Cost Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-3 bg-emerald-500/10">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cost by Agent */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost by Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costByAgent}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="cost" fill="#34D399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cost by Model */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={costByModel} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {costByModel.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {costByModel.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">${item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cost Over Time */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={costOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                  <Line type="monotone" dataKey="cost" stroke="#34D399" strokeWidth={2} dot={{ fill: '#34D399', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

function HallucinationsTab({ workspaceId }: { workspaceId: string }) {
  const { data: hallucinations, isLoading } = useQuery({
    queryKey: ['hallucinations', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/observability/hallucinations?workspaceId=${workspaceId}`)
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

  const severityColors: Record<string, string> = {
    LOW: 'border-sky-500/30 text-sky-400 bg-sky-500/10',
    MEDIUM: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    HIGH: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    CRITICAL: 'border-red-500/30 text-red-400 bg-red-500/10',
  }

  return (
    <div className="space-y-3">
      {hallucinations?.map((h: { id: string; severity: string; type: string; content: string; suggestedCorrection: string | null; createdAt: string }, i: number) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangle className={`h-4 w-4 ${h.severity === 'CRITICAL' || h.severity === 'HIGH' ? 'text-red-400' : 'text-amber-400'}`} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${severityColors[h.severity] || ''}`}>
                      {h.severity}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-border">
                      {h.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(h.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm">{h.content}</p>
                  {h.suggestedCorrection && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2">
                      <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">Suggested Correction</span>
                      <p className="text-xs text-muted-foreground mt-1">{h.suggestedCorrection}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      {(!hallucinations || hallucinations.length === 0) && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No hallucinations detected</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DriftTab({ workspaceId }: { workspaceId: string }) {
  const { data: driftEvents, isLoading } = useQuery({
    queryKey: ['drift', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/observability/drift?workspaceId=${workspaceId}`)
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
    <div className="space-y-3">
      {driftEvents?.map((d: { id: string; agentName: string; beforeState: string; afterState: string; description: string | null; createdAt: string }, i: number) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Brain className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                      Cognitive Drift
                    </Badge>
                    <Badge variant="outline" className="text-xs">{d.agentName}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(d.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  {/* Before/After States */}
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted/50 p-2 flex-1">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">Before</span>
                      <p className="text-sm mt-0.5">{d.beforeState}</p>
                    </div>
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 flex-1">
                      <span className="text-[10px] font-medium text-amber-400 uppercase">After</span>
                      <p className="text-sm mt-0.5">{d.afterState}</p>
                    </div>
                  </div>

                  {d.description && (
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      {(!driftEvents || driftEvents.length === 0) && (
        <Card className="border-border/50 bg-card">
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground text-sm">No drift events detected</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
