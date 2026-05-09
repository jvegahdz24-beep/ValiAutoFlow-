'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  Smartphone, Shield, Send, Activity, CheckCircle2, XCircle, Plus, Loader2,
  ExternalLink, Trash2, MessageSquare,
} from 'lucide-react'

interface WhatsAppConfig {
  id: string
  workspaceId: string
  phoneNumberId: string
  businessAccountId?: string
  accessToken: string
  verifyToken: string
  wabaId?: string
  isActive: boolean
  webhookUrl?: string
  lastSyncAt?: string
  createdAt: string
}

interface WhatsAppTemplate {
  id: string
  name: string
  language: string
  category: string
  status: string
  body: string
  metaId?: string
  createdAt: string
}

interface WhatsAppData {
  config: WhatsAppConfig | null
  templates: WhatsAppTemplate[]
}

export function WhatsAppView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [isSetupMode, setIsSetupMode] = useState(false)

  const { data, isLoading } = useQuery<WhatsAppData>({
    queryKey: ['whatsapp', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`)
      return res.json()
    },
  })

  const config = data?.config
  const templates = data?.templates || []

  const setupMutation = useMutation({
    mutationFn: async (params: { phoneNumberId: string; accessToken: string; verifyToken: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al configurar WhatsApp')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'WhatsApp configurado exitosamente')
      setIsSetupMode(false)
      setPhoneNumberId('')
      setAccessToken('')
      setVerifyToken('')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      return res.json()
    },
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'WhatsApp activado' : 'WhatsApp desactivado')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Configuración de WhatsApp eliminada')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Smartphone className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  if (!config && !isSetupMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">WhatsApp Business</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Smartphone className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold">WhatsApp Cloud API</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Conecta tu WhatsApp Business para que JHON envíe y reciba mensajes reales.
                Requiere una app en Meta for Developers con el producto WhatsApp activado.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
                {[
                  { icon: '💬', label: 'Mensajes reales', desc: 'Envío y recepción 24/7' },
                  { icon: '📢', label: 'Templates', desc: 'Campañas con plantillas aprobadas' },
                  { icon: '📊', label: 'Analytics', desc: 'Delivery, reads, responses' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                    <div className="text-lg">{item.icon}</div>
                    <p className="text-xs font-semibold mt-1">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <Button onClick={() => setIsSetupMode(true)} className="mt-4 bg-green-600 hover:bg-green-700">
                <Smartphone className="h-4 w-4 mr-2" />
                Configurar WhatsApp
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  if (isSetupMode && !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configurar WhatsApp Cloud API</h2>
          <Button variant="ghost" onClick={() => setIsSetupMode(false)}>Cancelar</Button>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Credenciales de Meta</CardTitle>
              <CardDescription>
                Obtén estos datos desde developers.facebook.com en tu app de WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Ve a <span className="font-mono text-foreground">developers.facebook.com/apps/</span></li>
                <li>Crea una app tipo "Business" con producto WhatsApp</li>
                <li>Copia el Phone Number ID y el Access Token</li>
                <li>Configura el webhook con tu verify token</li>
              </ol>
              <Separator className="my-4" />
              <div className="space-y-3">
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input id="phoneNumberId" placeholder="123456789012345" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="accessToken">Access Token Permanente</Label>
                <Input id="accessToken" type="password" placeholder="EAAxxxxxxxxx..." value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="verifyToken">Webhook Verify Token</Label>
                <Input id="verifyToken" placeholder="MiTokenSecreto123" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />
                <p className="text-xs text-muted-foreground">Define este token y úsalo también en Meta al configurar el webhook</p>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => {
                  if (phoneNumberId.trim() && accessToken.trim() && verifyToken.trim()) {
                    setupMutation.mutate({
                      phoneNumberId: phoneNumberId.trim(),
                      accessToken: accessToken.trim(),
                      verifyToken: verifyToken.trim(),
                    })
                  }
                }}
                disabled={!phoneNumberId.trim() || !accessToken.trim() || !verifyToken.trim() || setupMutation.isPending}
              >
                {setupMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando credenciales...</>
                ) : (
                  <><Shield className="h-4 w-4 mr-2" /> Activar WhatsApp</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">WhatsApp Business</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={config?.isActive ? 'border-green-500/30 text-green-400' : 'border-slate-500/30 text-slate-400'}>
            {config?.isActive ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</> : <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Estado', value: config?.isActive ? 'Activo' : 'Inactivo', icon: Activity, color: config?.isActive ? 'text-green-400' : 'text-red-400' },
          { label: 'Phone ID', value: config?.phoneNumberId ? `...${config.phoneNumberId.slice(-6)}` : '-', icon: Smartphone, color: 'text-sky-400' },
          { label: 'Templates', value: templates.length, icon: MessageSquare, color: 'text-amber-400' },
          { label: 'Webhook', value: config?.webhookUrl ? 'Configurado' : 'Pendiente', icon: Send, color: config?.webhookUrl ? 'text-emerald-400' : 'text-red-400' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Control de Conexión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp Activo</Label>
                  <p className="text-xs text-muted-foreground">Cuando está activo, JHON envía y recibe mensajes por WhatsApp</p>
                </div>
                <Switch checked={config?.isActive || false} onCheckedChange={(checked) => toggleMutation.mutate(checked)} disabled={toggleMutation.isPending} />
              </div>
              {config?.webhookUrl && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <span>Webhook: {config.webhookUrl}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-red-400">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Eliminar configuración de WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Se eliminará el webhook y la configuración</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => { if (confirm('¿Eliminar la configuración de WhatsApp?')) deleteMutation.mutate() }} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Plantillas de Mensaje</CardTitle>
              <CardDescription>
                Las plantillas deben ser aprobadas por Meta antes de poder usarse en campañas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay templates registrados. Aprueba plantillas en Meta for Developers y se sincronizarán aquí.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Idioma</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.name}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={t.status === 'APPROVED' ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'}>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.language}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
