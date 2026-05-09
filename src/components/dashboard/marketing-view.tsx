'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  Megaphone, Target, TrendingUp, Send, Mail, MessageSquare, Smartphone,
  Plus, Play, Pause, Trash2, Loader2, BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { CampaignForm } from '@/components/marketing/CampaignForm'
import { SegmentBuilder } from '@/components/marketing/SegmentBuilder'

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Smartphone,
}

const COLORS = ['#34D399', '#38BDF8', '#FB923C', '#A78BFA', '#FBBF24']

interface CampaignStats {
  sent?: number
  delivered?: number
  opened?: number
  clicked?: number
  converted?: number
  totalLeads?: number
  failed?: number
}

interface Campaign {
  id: string
  name: string
  channel: string
  status: string
  description?: string
  templateBody?: string
  stats: CampaignStats | string
  startedAt?: string
  completedAt?: string
  createdAt: string
  _count?: { campaignMessages: number }
}

function parseStats(raw: CampaignStats | string): CampaignStats {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw || {}
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'border-slate-500/30 text-slate-400',
  active: 'border-emerald-500/30 text-emerald-400',
  paused: 'border-amber-500/30 text-amber-400',
  completed: 'border-sky-500/30 text-sky-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
}

export function MarketingView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [segmentQuery, setSegmentQuery] = useState<{ tags?: string[]; minScore?: number; status?: string; temperature?: string }>({})

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/campaigns`)
      return res.json()
    },
  })

  const campaigns: Campaign[] = campaignsData?.campaigns || []

  // Aggregated stats
  const totalSent = campaigns.reduce((sum, c) => sum + (parseStats(c.stats).sent || 0), 0)
  const totalDelivered = campaigns.reduce((sum, c) => sum + (parseStats(c.stats).delivered || 0), 0)
  const totalOpened = campaigns.reduce((sum, c) => sum + (parseStats(c.stats).opened || 0), 0)
  const totalConverted = campaigns.reduce((sum, c) => sum + (parseStats(c.stats).converted || 0), 0)
  const openRate = totalSent > 0 ? (totalOpened / totalSent * 100).toFixed(1) : '0'
  const conversionRate = totalDelivered > 0 ? (totalConverted / totalDelivered * 100).toFixed(1) : '0'

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
    { name: 'WhatsApp', value: campaigns.filter(c => c.channel === 'whatsapp').length || 0 },
    { name: 'Email', value: campaigns.filter(c => c.channel === 'email').length || 0 },
    { name: 'SMS', value: campaigns.filter(c => c.channel === 'sms').length || 0 },
  ].filter(d => d.value > 0)

  // Campaign actions
  const handleSend = async (campaignId: string) => {
    setActionLoading(campaignId)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/campaigns/${campaignId}/send`, { method: 'POST' })
      if (res.ok) {
        toast.success('Campaña enviada')
        queryClient.invalidateQueries({ queryKey: ['campaigns', workspaceId] })
      } else {
        toast.error('Error al enviar campaña')
      }
    } catch {
      toast.error('Error de red')
    }
    setActionLoading(null)
  }

  const handlePause = async (campaignId: string) => {
    setActionLoading(campaignId)
    try {
      await fetch(`/api/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })
      toast.success('Campaña pausada')
      queryClient.invalidateQueries({ queryKey: ['campaigns', workspaceId] })
    } catch {
      toast.error('Error al pausar')
    }
    setActionLoading(null)
  }

  const handleDelete = async (campaignId: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return
    setActionLoading(campaignId)
    try {
      await fetch(`/api/workspaces/${workspaceId}/campaigns/${campaignId}`, { method: 'DELETE' })
      toast.success('Campaña eliminada')
      queryClient.invalidateQueries({ queryKey: ['campaigns', workspaceId] })
    } catch {
      toast.error('Error al eliminar')
    }
    setActionLoading(null)
  }

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
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
            <Megaphone className="h-3 w-3 mr-1" /> Activo
          </Badge>
          <CampaignForm workspaceId={workspaceId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['campaigns', workspaceId] })} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Enviados', value: totalSent, icon: Send, color: 'text-emerald-400' },
          { label: 'Entregados', value: totalDelivered, icon: Mail, color: 'text-sky-400' },
          { label: 'Tasa Apertura', value: `${openRate}%`, icon: Target, color: 'text-amber-400' },
          { label: 'Conversiones', value: totalConverted, icon: TrendingUp, color: 'text-violet-400' },
          { label: 'Tasa Conversión', value: `${conversionRate}%`, icon: BarChart3, color: 'text-pink-400' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
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
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4" data-tour="marketing-campaigns">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No hay campañas. Crea la primera para activar leads automáticamente.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Entregados</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const stats = parseStats(campaign.stats)
                    const ChannelIcon = CHANNEL_ICONS[campaign.channel] || MessageSquare
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <ChannelIcon className="h-3 w-3" />
                            {campaign.channel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLES[campaign.status] || ''}>
                            {STATUS_LABELS[campaign.status] || campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{stats.sent || 0}/{stats.totalLeads || 0}</TableCell>
                        <TableCell>{stats.delivered || 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(campaign.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {campaign.status === 'draft' && (
                              <Button size="sm" variant="ghost" onClick={() => handleSend(campaign.id)} disabled={actionLoading === campaign.id}>
                                {actionLoading === campaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-emerald-400" />}
                              </Button>
                            )}
                            {campaign.status === 'active' && (
                              <Button size="sm" variant="ghost" onClick={() => handlePause(campaign.id)}>
                                <Pause className="w-4 h-4 text-amber-400" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setSelectedCampaign(campaign)}>
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(campaign.id)}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4" data-tour="marketing-segments">
          <SegmentBuilder
            value={segmentQuery}
            onChange={setSegmentQuery}
            workspaceId={workspaceId}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/50">
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
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Sin datos</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
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
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Sin datos</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLES[selectedCampaign.status] || ''}>
                  {STATUS_LABELS[selectedCampaign.status] || selectedCampaign.status}
                </Badge>
                <Badge variant="outline">{selectedCampaign.channel}</Badge>
              </div>
              {selectedCampaign.description && (
                <p className="text-sm text-muted-foreground">{selectedCampaign.description}</p>
              )}
              {selectedCampaign.templateBody && (
                <div>
                  <p className="text-xs font-medium mb-1">Template:</p>
                  <div className="rounded-lg bg-muted p-3 text-sm">{selectedCampaign.templateBody}</div>
                </div>
              )}
              {(() => {
                const stats = parseStats(selectedCampaign.stats)
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="border-border/50">
                      <CardContent className="p-3 text-center">
                        <p className="text-lg font-bold text-emerald-400">{stats.sent || 0}</p>
                        <p className="text-xs text-muted-foreground">Enviados</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50">
                      <CardContent className="p-3 text-center">
                        <p className="text-lg font-bold text-sky-400">{stats.delivered || 0}</p>
                        <p className="text-xs text-muted-foreground">Entregados</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50">
                      <CardContent className="p-3 text-center">
                        <p className="text-lg font-bold text-amber-400">{stats.converted || 0}</p>
                        <p className="text-xs text-muted-foreground">Conversiones</p>
                      </CardContent>
                    </Card>
                  </div>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
