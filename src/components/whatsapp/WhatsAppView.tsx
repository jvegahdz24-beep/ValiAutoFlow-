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
import { useState, useEffect, useCallback } from 'react'
import {
  Smartphone, Shield, Send, Activity, CheckCircle2, XCircle, Loader2,
  ExternalLink, Trash2, MessageSquare, QrCode, RefreshCw, Wifi, WifiOff,
  Zap, Settings2,
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
  channelName?: string
  connectionType?: string
  evolutionInstanceName?: string
  evolutionConnected?: boolean
  evolutionStatus?: string
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
  evolutionConfigured?: boolean
}

type ConnectionMode = 'select' | 'evolution' | 'meta'

export function WhatsAppView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('select')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [channelName] = useState('bielys')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [evolutionStatus, setEvolutionStatus] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  const { data, isLoading, refetch } = useQuery<WhatsAppData>({
    queryKey: ['whatsapp', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`)
      if (!res.ok) {
        throw new Error('Error cargando configuración de WhatsApp')
      }
      return res.json()
    },
    retry: 1,
  })

  const config = data?.config
  const templates = data?.templates || []
  const evolutionConfigured = data?.evolutionConfigured || false

  // ─── QR Code connection flow ─────────────────────────────

  const startQRConnection = useCallback(async () => {
    setIsConnecting(true)
    setQrCode(null)
    setPairingCode(null)
    setEvolutionStatus('connecting')

    try {
      const res = await fetch('/api/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          workspaceId,
          channelName,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || 'Error creando instancia')
        setEvolutionStatus('disconnected')
        setIsConnecting(false)
        return
      }

      // Show QR code
      if (result.qrcode) {
        setQrCode(result.qrcode.startsWith('data:') ? result.qrcode : `data:image/png;base64,${result.qrcode}`)
      }
      if (result.pairingCode) {
        setPairingCode(result.pairingCode)
      }
      setEvolutionStatus(result.status || 'connecting')

      // Start polling for connection status
      const instanceName = result.instance?.instance?.instanceName || `ws_${workspaceId.slice(0, 8)}`
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/whatsapp/evolution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'status',
              instanceName,
              workspaceId,
            }),
          })
          const statusData = await statusRes.json()

          if (statusData.status === 'open') {
            setEvolutionStatus('open')
            setIsConnecting(false)
            clearInterval(interval)
            setPollInterval(null)
            toast.success('WhatsApp conectado exitosamente', {
              description: `Canal "${channelName}" está activo y listo para recibir mensajes.`,
            })
            queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
          } else if (statusData.status === 'close' || statusData.status === 'disconnected') {
            // Try to reconnect and get a fresh QR
            const connectRes = await fetch('/api/whatsapp/evolution', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'connect',
                instanceName,
                workspaceId,
              }),
            })
            const connectData = await connectRes.json()
            if (connectData.qrcode) {
              setQrCode(connectData.qrcode.startsWith('data:') ? connectData.qrcode : `data:image/png;base64,${connectData.qrcode}`)
            }
            if (connectData.pairingCode) {
              setPairingCode(connectData.pairingCode)
            }
            setEvolutionStatus(connectData.status || 'connecting')
          }
        } catch {
          // Silently continue polling
        }
      }, 5000)

      setPollInterval(interval)
    } catch (err: any) {
      toast.error('Error de conexión', { description: err.message })
      setEvolutionStatus('disconnected')
      setIsConnecting(false)
    }
  }, [workspaceId, channelName, queryClient])

  const refreshQR = useCallback(async () => {
    if (!config?.evolutionInstanceName) return
    setIsConnecting(true)

    try {
      const res = await fetch('/api/whatsapp/evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          instanceName: config.evolutionInstanceName,
          workspaceId,
        }),
      })
      const result = await res.json()
      if (result.qrcode) {
        setQrCode(result.qrcode.startsWith('data:') ? result.qrcode : `data:image/png;base64,${result.qrcode}`)
      }
      if (result.pairingCode) {
        setPairingCode(result.pairingCode)
      }
      setEvolutionStatus(result.status || 'connecting')
    } catch (err: any) {
      toast.error('Error refrescando QR', { description: err.message })
    } finally {
      setIsConnecting(false)
    }
  }, [config?.evolutionInstanceName, workspaceId])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pollInterval])

  // If config exists and has Evolution connection, check status
  useEffect(() => {
    if (config?.evolutionInstanceName && config?.connectionType === 'evolution' && evolutionConfigured) {
      const checkStatus = async () => {
        try {
          const res = await fetch('/api/whatsapp/evolution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'status',
              instanceName: config.evolutionInstanceName,
              workspaceId,
            }),
          })
          const data = await res.json()
          if (data.status) {
            setEvolutionStatus(data.status)
          }
        } catch {}
      }
      checkStatus()
    }
  }, [config?.evolutionInstanceName, config?.connectionType, workspaceId, evolutionConfigured])

  // ─── Meta Cloud API mutations ────────────────────────────

  const setupMutation = useMutation({
    mutationFn: async (params: { phoneNumberId: string; accessToken: string; verifyToken: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, connectionType: 'meta' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al configurar WhatsApp')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'WhatsApp configurado exitosamente')
      setConnectionMode('select')
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
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error cambiando estado')
      }
      return res.json()
    },
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'WhatsApp activado' : 'WhatsApp desactivado')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/whatsapp`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error eliminando configuración')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Configuración de WhatsApp eliminada')
      setQrCode(null)
      setPairingCode(null)
      setEvolutionStatus(null)
      setConnectionMode('select')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // ─── Loading state ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Smartphone className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  // ─── No config: Show connection mode selection ────────────

  if (!config && connectionMode === 'select') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">WhatsApp Business</h2>
          <Badge variant="outline" className="border-amber-500/30 text-amber-400">
            <XCircle className="h-3 w-3 mr-1" /> Sin conectar
          </Badge>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold">Conectar WhatsApp</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Conecta tu WhatsApp Business para que JHON envíe y reciba mensajes reales.
                Elige el método de conexión:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
                {/* QR Code Connection */}
                <button
                  onClick={() => setConnectionMode('evolution')}
                  className="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-5 text-left hover:border-green-500/60 hover:bg-green-500/10 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <QrCode className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Código QR</p>
                      <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px]">
                        Recomendado
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escanea el QR con tu WhatsApp. Conexión instantánea sin configuración en Meta.
                  </p>
                </button>

                {/* Meta Cloud API Connection */}
                <button
                  onClick={() => setConnectionMode('meta')}
                  className="rounded-xl border-2 border-blue-500/30 bg-blue-500/5 p-5 text-left hover:border-blue-500/60 hover:bg-blue-500/10 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Meta Cloud API</p>
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-[10px]">
                        Oficial
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usa las credenciales de Meta for Developers. Requiere app aprobada.
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                {[
                  { icon: '💬', label: 'Mensajes reales', desc: 'Envío y recepción 24/7' },
                  { icon: '🤖', label: 'JHON Activo', desc: 'Respuestas automáticas' },
                  { icon: '📊', label: 'Analytics', desc: 'Delivery, reads, responses' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                    <div className="text-lg">{item.icon}</div>
                    <p className="text-xs font-semibold mt-1">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ─── Evolution API (QR Code) Setup ────────────────────────

  if (connectionMode === 'evolution' && !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conectar WhatsApp con QR</h2>
          <Button variant="ghost" onClick={() => setConnectionMode('select')}>Cancelar</Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-green-500/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-5 w-5 text-green-400" />
                Canal: <span className="text-green-400">{channelName}</span>
              </CardTitle>
              <CardDescription>
                Escanea el código QR con la app de WhatsApp en tu teléfono para conectar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!evolutionConfigured ? (
                <div className="text-center space-y-4 py-4">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                    <Settings2 className="h-8 w-8 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold">Evolution API no configurada</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Para usar la conexión por QR, necesitas una instancia de Evolution API.
                    Configura las variables de entorno <code className="text-foreground bg-muted px-1 rounded">EVOLUTION_API_URL</code> y{' '}
                    <code className="text-foreground bg-muted px-1 rounded">EVOLUTION_API_KEY</code> en Vercel.
                  </p>
                  <ol className="text-xs text-muted-foreground text-left max-w-sm mx-auto space-y-1 list-decimal list-inside">
                    <li>Instala Evolution API en un servidor (VPS, Docker, etc.)</li>
                    <li>Obtén la URL y API Key</li>
                    <li>Agrega las variables de entorno en Vercel</li>
                    <li>Regresa aquí y conecta tu WhatsApp</li>
                  </ol>
                  <Button variant="outline" onClick={() => setConnectionMode('select')}>
                    Usar Meta Cloud API en su lugar
                  </Button>
                </div>
              ) : !qrCode ? (
                <div className="text-center space-y-4 py-8">
                  <div className="mx-auto w-48 h-48 rounded-2xl border-2 border-dashed border-green-500/30 flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 text-green-400/50 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">El QR aparecerá aquí</p>
                    </div>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={startQRConnection}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conectando...</>
                    ) : (
                      <><QrCode className="h-4 w-4 mr-2" /> Generar Código QR</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    {/* QR Code Display */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative"
                    >
                      <div className="p-4 bg-white rounded-2xl shadow-lg">
                        <img
                          src={qrCode}
                          alt="WhatsApp QR Code"
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                      {isConnecting && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-background/80 p-3">
                            <Loader2 className="h-6 w-6 animate-spin text-green-400" />
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Pairing Code */}
                    {pairingCode && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Código de emparejamiento</p>
                        <p className="text-2xl font-mono font-bold tracking-widest text-green-400">
                          {pairingCode}
                        </p>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {evolutionStatus === 'open' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Esperando escaneo...
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs font-semibold mb-2">Pasos para conectar:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Abre WhatsApp en tu teléfono</li>
                      <li>Ve a <b>Dispositivos vinculados</b></li>
                      <li>Toca <b>Vincular un dispositivo</b></li>
                      <li>Escanea este código QR</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={refreshQR}
                      disabled={isConnecting}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Refrescar QR
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => setConnectionMode('select')}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ─── Meta Cloud API Setup ────────────────────────────────

  if (connectionMode === 'meta' && !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configurar WhatsApp Cloud API</h2>
          <Button variant="ghost" onClick={() => setConnectionMode('select')}>Cancelar</Button>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Credenciales de Meta
              </CardTitle>
              <CardDescription>
                Obtén estos datos desde developers.facebook.com en tu app de WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Ve a <span className="font-mono text-foreground">developers.facebook.com/apps/</span></li>
                <li>Crea una app tipo &quot;Business&quot; con producto WhatsApp</li>
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
                className="w-full bg-blue-600 hover:bg-blue-700"
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

  // ─── Connected State (config exists) ─────────────────────

  const isConnected = config?.isActive || config?.evolutionConnected || evolutionStatus === 'open'
  const isEvolution = config?.connectionType === 'evolution'
  const displayName = config?.channelName || 'bielys'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">WhatsApp Business</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={isConnected ? 'border-green-500/30 text-green-400' : 'border-slate-500/30 text-slate-400'}>
            {isConnected ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
            )}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Estado', value: isConnected ? 'Activo' : 'Inactivo', icon: Activity, color: isConnected ? 'text-green-400' : 'text-red-400' },
          { label: 'Canal', value: displayName, icon: Smartphone, color: 'text-green-400' },
          { label: 'Templates', value: templates.length, icon: MessageSquare, color: 'text-amber-400' },
          { label: 'Conexión', value: isEvolution ? 'QR Code' : 'Meta API', icon: isEvolution ? QrCode : Shield, color: 'text-sky-400' },
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
          <TabsTrigger value="qrcode">Código QR</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {/* Connection Control */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Control de Conexión</CardTitle>
              <CardDescription>
                Canal: <b>{displayName}</b> · Método: {isEvolution ? 'Evolution API (QR)' : 'Meta Cloud API'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp Activo</Label>
                  <p className="text-xs text-muted-foreground">Cuando está activo, JHON envía y recibe mensajes por WhatsApp</p>
                </div>
                <Switch
                  checked={config?.isActive || false}
                  onCheckedChange={(checked) => toggleMutation.mutate(checked)}
                  disabled={toggleMutation.isPending}
                />
              </div>
              {config?.webhookUrl && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <span>Webhook: {config.webhookUrl}</span>
                </div>
              )}
              {config?.lastSyncAt && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  <span>Última sincronización: {new Date(config.lastSyncAt).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-red-400">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Eliminar configuración de WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Se eliminará el webhook, la instancia y la configuración</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('¿Eliminar la configuración de WhatsApp? Se desconectará el canal.'))
                      deleteMutation.mutate()
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrcode" className="space-y-4">
          <Card className="border-green-500/20">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <QrCode className="h-4 w-4 text-green-400" />
                Código QR de Conexión
              </CardTitle>
              <CardDescription>
                Escanea este código para vincular un nuevo dispositivo o reconectar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEvolution && config?.evolutionInstanceName ? (
                <div className="flex flex-col items-center gap-4">
                  {evolutionStatus === 'open' ? (
                    <div className="text-center space-y-3 py-4">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                        <Wifi className="h-8 w-8 text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-green-400">WhatsApp Conectado</p>
                      <p className="text-xs text-muted-foreground">
                        El canal <b>{displayName}</b> está activo y recibiendo mensajes.
                      </p>
                      <Button
                        variant="outline"
                        onClick={refreshQR}
                        className="mt-2"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Refrescar QR
                      </Button>
                    </div>
                  ) : (
                    <>
                      {qrCode ? (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="relative"
                        >
                          <div className="p-4 bg-white rounded-2xl shadow-lg">
                            <img
                              src={qrCode}
                              alt="WhatsApp QR Code"
                              className="w-64 h-64 object-contain"
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-green-500/30 flex items-center justify-center">
                          <div className="text-center">
                            <QrCode className="h-12 w-12 text-green-400/50 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Presiona para generar QR</p>
                          </div>
                        </div>
                      )}

                      {pairingCode && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Código de emparejamiento</p>
                          <p className="text-2xl font-mono font-bold tracking-widest text-green-400">
                            {pairingCode}
                          </p>
                        </div>
                      )}

                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={refreshQR}
                        disabled={isConnecting}
                      >
                        {isConnecting ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conectando...</>
                        ) : (
                          <><QrCode className="h-4 w-4 mr-2" /> Generar / Refrescar QR</>
                        )}
                      </Button>
                    </>
                  )}

                  {/* Instructions */}
                  <div className="bg-muted/50 rounded-lg p-4 w-full">
                    <p className="text-xs font-semibold mb-2">Cómo escanear el QR:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Abre <b>WhatsApp</b> en tu teléfono</li>
                      <li>Ve a <b>Dispositivos vinculados</b></li>
                      <li>Toca <b>Vincular un dispositivo</b></li>
                      <li>Apunta la cámara al código QR</li>
                      <li>Espera a que diga &quot;Conectado&quot;</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <WifiOff className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    La conexión por QR requiere Evolution API.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Configura <code className="bg-muted px-1 rounded">EVOLUTION_API_URL</code> y{' '}
                    <code className="bg-muted px-1 rounded">EVOLUTION_API_KEY</code> en las variables de entorno.
                  </p>
                </div>
              )}
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
