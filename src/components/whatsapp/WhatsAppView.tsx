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
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Smartphone, Shield, Send, Activity, CheckCircle2, XCircle, Loader2,
  ExternalLink, Trash2, MessageSquare, QrCode, RefreshCw, Wifi, WifiOff,
  Zap, Settings2, Cable,
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
  baileysConnected?: boolean
  baileysPhone?: string
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

type ConnectionMode = 'select' | 'baileys' | 'meta'

export function WhatsAppView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('select')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [channelName] = useState('bielys')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [baileysStatus, setBaileysStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'qr_ready'>('disconnected')
  const [isConnecting, setIsConnecting] = useState(false)
  const [baileysPhone, setBaileysPhone] = useState<string | null>(null)
  const [baileysUserName, setBaileysUserName] = useState<string | null>(null)
  const statusPollRef = useRef<NodeJS.Timeout | null>(null)

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

  // ─── Baileys QR Code Connection Flow ─────────────────────

  /**
   * Safe JSON fetch — handles empty responses, non-JSON, and network errors.
   * Returns { ok, data, error } instead of throwing.
   */
  const safeFetch = useCallback(async (url: string, options?: RequestInit): Promise<{
    ok: boolean
    data: any
    error: string | null
  }> => {
    try {
      const res = await fetch(url, options)
      const text = await res.text()
      let data: any = null
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        return {
          ok: false,
          data: null,
          error: `El servidor devolvió una respuesta inválida (status ${res.status}). Esto suele ocurrir cuando Baileys no puede iniciar en el entorno serverless.`,
        }
      }
      if (!res.ok) {
        return { ok: false, data, error: data?.error || `Error del servidor (${res.status})` }
      }
      return { ok: true, data, error: null }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { ok: false, data: null, error: 'La petición fue cancelada por timeout.' }
      }
      return { ok: false, data: null, error: `Error de red: ${err.message}. Verifica tu conexión a internet.` }
    }
  }, [])

  const generateBaileysQR = useCallback(async () => {
    setIsConnecting(true)
    setQrCode(null)
    setPairingCode(null)
    setBaileysStatus('connecting')

    const { ok, data, error } = await safeFetch('/api/whatsapp/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    })

    if (!ok || !data) {
      const msg = error || 'No se recibió respuesta del servidor'
      toast.error('Error al generar QR', {
        description: msg,
      })
      setBaileysStatus('disconnected')
      setIsConnecting(false)
      return
    }

    if (data.status === 'connected') {
      setBaileysStatus('connected')
      setBaileysPhone(data.phone || null)
      setIsConnecting(false)
      toast.success('WhatsApp ya está conectado')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
      return
    }

    if (data.qr) {
      // QR image is already a data URL from the server
      setQrCode(data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`)
      setBaileysStatus('qr_ready')
    }

    if (data.pairingCode) {
      setPairingCode(data.pairingCode)
    }

    // Start polling for connection status
    startStatusPolling()
  }, [workspaceId, queryClient, safeFetch])

  const refreshBaileysQR = useCallback(async () => {
    setIsConnecting(true)
    const { ok, data, error } = await safeFetch('/api/whatsapp/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId }),
    })

    if (!ok || !data) {
      toast.error('Error refrescando QR', { description: error || 'Respuesta inválida del servidor' })
      setIsConnecting(false)
      return
    }

    if (data.status === 'connected') {
      setBaileysStatus('connected')
      setQrCode(null)
      setPairingCode(null)
      setIsConnecting(false)
      toast.success('WhatsApp conectado')
      queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
      return
    }

    if (data.qr) {
      setQrCode(data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`)
      setBaileysStatus('qr_ready')
    }
    if (data.pairingCode) {
      setPairingCode(data.pairingCode)
    }
    setIsConnecting(false)
  }, [workspaceId, queryClient, safeFetch])

  // ─── Status Polling ──────────────────────────────────────

  const startStatusPolling = useCallback(() => {
    // Clear existing poll
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current)
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/status?workspaceId=${workspaceId}`)
        const text = await res.text()
        if (!text) return // Empty response, keep polling
        let data: any
        try { data = JSON.parse(text) } catch { return } // Invalid JSON, keep polling

        if (data.connected) {
          setBaileysStatus('connected')
          setBaileysPhone(data.phone || null)
          setBaileysUserName(data.userName || null)
          setQrCode(null)
          setPairingCode(null)
          setIsConnecting(false)
          clearInterval(interval)
          statusPollRef.current = null
          toast.success('WhatsApp conectado exitosamente', {
            description: data.phone ? `Número: ${data.phone}` : `Canal "${channelName}" está activo.`,
          })
          queryClient.invalidateQueries({ queryKey: ['whatsapp', workspaceId] })
        } else if (data.status === 'qr_ready') {
          setBaileysStatus('qr_ready')
        } else if (data.status === 'connecting') {
          setBaileysStatus('connecting')
        }
      } catch {
        // Silently continue polling
      }
    }, 3000)

    statusPollRef.current = interval
  }, [workspaceId, channelName, queryClient])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current)
    }
  }, [])

  // If config exists and has Baileys connection, check initial status
  useEffect(() => {
    if (config?.connectionType === 'baileys' || (!config?.connectionType && config?.isActive)) {
      const checkInitialStatus = async () => {
        try {
          const res = await fetch(`/api/whatsapp/status?workspaceId=${workspaceId}`)
          const text = await res.text()
          if (!text) return
          let data: any
          try { data = JSON.parse(text) } catch { return }
          if (data.connected) {
            setBaileysStatus('connected')
            setBaileysPhone(data.phone || null)
            setBaileysUserName(data.userName || null)
          }
        } catch {}
      }
      checkInitialStatus()
    }
  }, [config?.connectionType, config?.isActive, workspaceId])

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
      // Disconnect Baileys first if connected
      if (config?.connectionType === 'baileys' || !config?.connectionType) {
        await fetch('/api/whatsapp/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId, clearSession: true }),
        }).catch(() => {})
      }
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
      setBaileysStatus('disconnected')
      setBaileysPhone(null)
      setBaileysUserName(null)
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
                Conecta tu WhatsApp para que JHON envíe y reciba mensajes reales.
                Elige el método de conexión:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
                {/* Baileys QR Code Connection */}
                <button
                  onClick={() => setConnectionMode('baileys')}
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
                    Escanea el QR con tu WhatsApp. Conexión directa sin intermediarios.
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

  // ─── Baileys QR Code Setup ────────────────────────────────

  if (connectionMode === 'baileys' && !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conectar WhatsApp con QR</h2>
          <Button variant="ghost" onClick={() => {
            setConnectionMode('select')
            setQrCode(null)
            setPairingCode(null)
            setBaileysStatus('disconnected')
          }}>Cancelar</Button>
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
              {!qrCode ? (
                <div className="text-center space-y-4 py-8">
                  <div className="mx-auto w-48 h-48 rounded-2xl border-2 border-dashed border-green-500/30 flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 text-green-400/50 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">El QR aparecerá aquí</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 max-w-sm mx-auto">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Cable className="h-3.5 w-3.5 text-green-400" />
                      <span>Conexión directa vía Baileys — sin servidor intermediario</span>
                    </div>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={generateBaileysQR}
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
                      {isConnecting && baileysStatus !== 'connected' && (
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
                      {baileysStatus === 'connected' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                        </Badge>
                      ) : baileysStatus === 'qr_ready' ? (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Esperando escaneo...
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Conectando...
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
                      onClick={refreshBaileysQR}
                      disabled={isConnecting}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Refrescar QR
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        setConnectionMode('select')
                        setQrCode(null)
                        setPairingCode(null)
                        if (statusPollRef.current) {
                          clearInterval(statusPollRef.current)
                          statusPollRef.current = null
                        }
                      }}
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

  const isBaileys = config?.connectionType === 'baileys' || (!config?.connectionType && !config?.phoneNumberId)
  const isMeta = config?.connectionType === 'meta'
  const isConnected = config?.isActive || config?.evolutionConnected || baileysStatus === 'connected'
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
          { label: 'Conexión', value: isBaileys ? 'QR Directo' : isMeta ? 'Meta API' : 'QR Directo', icon: isBaileys ? QrCode : Shield, color: 'text-sky-400' },
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

      {/* Connected phone info for Baileys */}
      {isBaileys && (baileysPhone || config?.baileysPhone) && (
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">WhatsApp conectado</p>
                <p className="text-xs text-muted-foreground">
                  Número: {baileysPhone || config?.baileysPhone}
                  {baileysUserName ? ` · Nombre: ${baileysUserName}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                Canal: <b>{displayName}</b> · Método: {isBaileys ? 'QR Directo (Baileys)' : 'Meta Cloud API'}
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
                  <p className="text-xs text-muted-foreground">Se eliminará la sesión, la configuración y se desconectará el canal</p>
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
              {isBaileys ? (
                <div className="flex flex-col items-center gap-4">
                  {baileysStatus === 'connected' ? (
                    <div className="text-center space-y-3 py-4">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                        <Wifi className="h-8 w-8 text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-green-400">WhatsApp Conectado</p>
                      <p className="text-xs text-muted-foreground">
                        El canal <b>{displayName}</b> está activo y recibiendo mensajes.
                      </p>
                      {(baileysPhone || config?.baileysPhone) && (
                        <p className="text-xs text-muted-foreground">
                          Número: <b>{baileysPhone || config?.baileysPhone}</b>
                        </p>
                      )}
                      <Button
                        variant="outline"
                        onClick={refreshBaileysQR}
                        className="mt-2"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" /> Generar nuevo QR
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
                        onClick={generateBaileysQR}
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
                    La conexión por QR requiere el modo Baileys.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Elimina la configuración actual y reconecta usando &quot;Código QR&quot;.
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
