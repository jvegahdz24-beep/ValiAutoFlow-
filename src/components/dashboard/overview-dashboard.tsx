'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatCard, StageBadge, TemperatureBadge, CARNALES, CarnalIcon, ChannelIcon } from './shared'
import { useDashboard } from '@/hooks/use-dashboard'
import { useConversations } from '@/hooks/use-conversations'
import { motion } from 'framer-motion'
import {
  Users, MessageSquare, TrendingUp, DollarSign, Activity,
  Megaphone, Send, CalendarCheck, AlertTriangle, Bell,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
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
          <span>Cargando dashboard...</span>
        </div>
      </div>
    )
  }

  const d = dashboardData.dashboard

  return (
    <div className="space-y-6">
      {/* Unified KPI Cards - Sales + Marketing */}
      <div data-tour="dashboard-stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Leads Totales" value={d.totalLeads} icon={Users} trend={12} />
        <StatCard title="Conversaciones Activas" value={d.activeConversations} icon={MessageSquare} trend={8} />
        <StatCard title="Tasa de Conversión" value={d.conversionRate} format="percent" icon={TrendingUp} trend={3.2} />
        <StatCard title="Ingresos" value={d.revenue} format="currency" icon={DollarSign} trend={18} />
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-orange-500/20 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-500/10 p-2.5">
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-400">{d.lostLeads || 0}</p>
                  <p className="text-xs text-muted-foreground">Leads perdidos</p>
                  <p className="text-[10px] text-orange-300">~${(d.estimatedLoss || 0).toLocaleString()} pérdida estimada</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2.5">
                  <CalendarCheck className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{d.appointmentsScheduled || 0}</p>
                  <p className="text-xs text-muted-foreground">Citas agendadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                  <Megaphone className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{d.campaignsActive || 0}</p>
                  <p className="text-xs text-muted-foreground">Campañas activas</p>
                  <p className="text-[10px] text-emerald-300">{d.totalCampaignsSent || 0} enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-violet-500/10 p-2.5">
                  <Bell className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-violet-400">{d.unreadNotifications || 0}</p>
                  <p className="text-xs text-muted-foreground">Notificaciones</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div data-tour="dashboard-charts" className="grid gap-4 lg:grid-cols-3">
        {/* Lead Source Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribución por Fuente</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={d.leadSourceDistribution || d.leadSources || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="count" nameKey="source">
                    {(d.leadSourceDistribution || d.leadSources || []).map((_entry: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {(d.leadSourceDistribution || d.leadSources || []).map((item: { source: string; count: number }, i: number) => (
                  <div key={item.source} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{item.source}</span>
                    <span className="font-medium">{item.count}</span>
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
              <CardTitle className="text-sm font-medium">Distribución por Temperatura</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={d.temperatureDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="temperature" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(d.temperatureDistribution || []).map((entry: { temperature: string }) => (
                      <Cell key={entry.temperature} fill={TEMP_COLORS[entry.temperature] || '#6B7280'} />
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
              <CardTitle className="text-sm font-medium">Embudo por Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={d.stageDistribution || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(d.stageDistribution || []).map((entry: { stage: string }) => (
                      <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] || '#6B7280'} />
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
              <CardTitle className="text-sm font-medium">Conversaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px]">
                <div className="space-y-1 px-6 pb-4">
                  {conversations?.slice(0, 8).map((conv: { id: string; channel: string; lead: { name: string }; stage: string; temperature: string; lastMessage: string; lastMessageAt: string }) => (
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
                          {conv.lastMessage || 'Sin mensajes'}
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
                Los 7 Carnales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px]">
                <div className="grid grid-cols-1 gap-2 px-6 pb-4 sm:grid-cols-2">
                  {CARNALES.map((carnal) => {
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
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">{carnal.role}</span>
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
