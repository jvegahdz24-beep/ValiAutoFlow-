'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import {
  Megaphone, Target, TrendingUp, Send,
  Mail, MessageSquare, Smartphone,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Smartphone,
}

const COLORS = ['#34D399', '#38BDF8', '#FB923C', '#A78BFA', '#FBBF24']

interface CampaignStats {
  sent?: number
  opened?: number
  clicked?: number
  converted?: number
}

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  description?: string
  stats: CampaignStats | string
}

function parseStats(raw: CampaignStats | string): CampaignStats {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw || {}
}

export function MarketingView({ workspaceId }: { workspaceId: string }) {
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns?workspaceId=${workspaceId}`)
      return res.json()
    },
  })

  const campaigns: Campaign[] = campaignsData?.campaigns || []

  // Calculate stats
  const totalSent = campaigns.reduce((sum, c) => {
    const stats = parseStats(c.stats)
    return sum + (stats.sent || 0)
  }, 0)

  const totalOpened = campaigns.reduce((sum, c) => {
    const stats = parseStats(c.stats)
    return sum + (stats.opened || 0)
  }, 0)

  const totalConverted = campaigns.reduce((sum, c) => {
    const stats = parseStats(c.stats)
    return sum + (stats.converted || 0)
  }, 0)

  const openRate = totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : '0'
  const conversionRate = totalOpened > 0 ? (totalConverted / totalOpened * 100).toFixed(1) : '0'

  // Chart data
  const campaignPerformance = campaigns.slice(0, 6).map(c => {
    const stats = parseStats(c.stats)
    return {
      name: c.name.substring(0, 15),
      enviados: stats.sent || 0,
      abiertos: stats.opened || 0,
      conversiones: stats.converted || 0,
    }
  })

  const channelData = [
    { name: 'WhatsApp', value: campaigns.filter(c => c.channel === 'whatsapp').length || 1 },
    { name: 'Email', value: campaigns.filter(c => c.channel === 'email').length || 0 },
    { name: 'SMS', value: campaigns.filter(c => c.channel === 'sms').length || 0 },
  ].filter(d => d.value > 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Megaphone className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Marketing (MARK)</h2>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
          <Megaphone className="h-3 w-3 mr-1" /> Agente Activo
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Mensajes Enviados', value: totalSent, icon: Send, color: 'text-emerald-400' },
          { label: 'Tasa de Apertura', value: `${openRate}%`, icon: Mail, color: 'text-sky-400' },
          { label: 'Conversiones', value: totalConverted, icon: TrendingUp, color: 'text-amber-400' },
          { label: 'Tasa de Conversión', value: `${conversionRate}%`, icon: Target, color: 'text-violet-400' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Icon className={`h-5 w-5 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay campañas activas. MARK está listo para crear la primera.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(campaign => {
                const stats = parseStats(campaign.stats)
                const ChannelIcon = CHANNEL_ICONS[campaign.channel] || MessageSquare
                const statusColors: Record<string, string> = {
                  draft: 'border-slate-500/30 text-slate-400',
                  active: 'border-emerald-500/30 text-emerald-400',
                  paused: 'border-amber-500/30 text-amber-400',
                  completed: 'border-sky-500/30 text-sky-400',
                }

                return (
                  <motion.div key={campaign.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{campaign.name}</CardTitle>
                          <Badge variant="outline" className={statusColors[campaign.status] || ''}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-1.5 text-xs">
                          <ChannelIcon className="h-3 w-3" />
                          {campaign.channel}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {stats.sent && stats.sent > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Enviados: {stats.sent}</span>
                              <span>Abiertos: {stats.opened || 0}</span>
                            </div>
                            <Progress value={(stats.opened || 0) / stats.sent * 100} className="h-1.5" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>CTR: {stats.sent > 0 ? ((stats.clicked || 0) / stats.sent * 100).toFixed(1) : 0}%</span>
                              <span>Conv: {stats.converted || 0}</span>
                            </div>
                          </div>
                        )}
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Rendimiento por Campaña</CardTitle></CardHeader>
              <CardContent>
                {campaignPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={campaignPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} width={30} />
                      <Tooltip />
                      <Bar dataKey="enviados" fill="#34D399" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="abiertos" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="conversiones" fill="#FBBF24" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                    Sin datos de campañas
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Distribución por Canal</CardTitle></CardHeader>
              <CardContent>
                {channelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {channelData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                    Sin datos de canales
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
