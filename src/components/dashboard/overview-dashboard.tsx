'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatCard, StageBadge, TemperatureBadge, CARNALES, CarnalIcon, ChannelIcon } from './shared'
import { useDashboard } from '@/hooks/use-dashboard'
import { useConversations } from '@/hooks/use-conversations'
import { motion } from 'framer-motion'
import { Users, MessageSquare, TrendingUp, DollarSign, Activity } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const PIE_COLORS = ['#34D399', '#38BDF8', '#F472B6', '#A78BFA']

const STAGE_COLORS: Record<string, string> = {
  EXPLORATION: '#94A3B8',
  INTEREST: '#38BDF8',
  INTENT: '#FBBF24',
  OBJECTION: '#FB923C',
  CLOSING: '#34D399',
  FOLLOW_UP: '#A78BFA',
}

const TEMP_COLORS: Record<string, string> = {
  COLD: '#60A5FA',
  WARM: '#FBBF24',
  HOT: '#EF4444',
}

export function OverviewDashboard({ workspaceId }: { workspaceId: string }) {
  const { data: dashboardData, isLoading } = useDashboard(workspaceId)
  const { data: conversations } = useConversations(workspaceId)

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse text-emerald-400" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    )
  }

  const d = dashboardData.dashboard

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Leads" value={d.totalLeads} icon={Users} trend={12} />
        <StatCard title="Active Conversations" value={d.activeConversations} icon={MessageSquare} trend={8} />
        <StatCard title="Conversion Rate" value={d.conversionRate} format="percent" icon={TrendingUp} trend={3.2} />
        <StatCard title="Revenue" value={d.revenue} format="currency" icon={DollarSign} trend={18} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lead Source Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lead Source Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={d.leadSourceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {d.leadSourceDistribution.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {d.leadSourceDistribution.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Temperature Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Temperature Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={d.temperatureDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {d.temperatureDistribution.map((entry) => (
                      <Cell key={entry.name} fill={TEMP_COLORS[entry.name] || '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pipeline Stage Funnel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Stage Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={d.stageDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {d.stageDistribution.map((entry) => (
                      <Cell key={entry.name} fill={STAGE_COLORS[entry.name] || '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Conversations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px]">
                <div className="space-y-1 px-6 pb-4">
                  {conversations?.slice(0, 8).map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="mt-0.5">
                        <ChannelIcon channel={conv.channel} className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{conv.lead.name}</span>
                          <StageBadge stage={conv.stage} />
                          <TemperatureBadge temperature={conv.temperature} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                      <div className="text-[10px] text-muted-foreground shrink-0">
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                          : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* 7 Carnales Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                The 7 Carnales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px]">
                <div className="grid grid-cols-1 gap-2 px-6 pb-4 sm:grid-cols-2">
                  {CARNALES.map((carnal) => {
                    const activity = d.agentActivity.find(a => a.name === carnal.key)
                    const Icon = carnal.icon
                    return (
                      <div
                        key={carnal.key}
                        className={`flex items-center gap-3 rounded-lg border ${carnal.borderColor} ${carnal.bgColor} p-3`}
                      >
                        <div className={`rounded-lg p-2 ${carnal.bgColor}`}>
                          <Icon className={`h-4 w-4 ${carnal.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{carnal.name}</span>
                            {activity?.status === 'ACTIVE' ? (
                              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            ) : (
                              <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{carnal.role}</span>
                          {activity && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground">{activity.executionCount} execs</span>
                              <span className="text-[10px] text-emerald-400">Score: {activity.avgScore.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
