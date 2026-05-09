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
  Bot, Shield, Send, Activity, Terminal, Trash2, Loader2,
  CheckCircle2, XCircle, ExternalLink, Copy, Plus, X,
} from 'lucide-react'

interface TelegramConfig {
  id: string
  workspaceId: string
  botToken: string
  botUsername: string
  allowedChatIds: string
  isActive: boolean
  webhookUrl?: string
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

interface TelegramSession {
  id: string
  chatId: string
  state: string
  currentLeadId?: string | null
  currentConversationId?: string | null
  lastCommand?: string | null
  lastCommandAt?: string | null
  updatedAt: string
}

interface TelegramCommand {
  id: string
  chatId: string
  command: string
  arguments: string
  response?: string | null
  status: string
  createdAt: string
}

interface TelegramData {
  config: TelegramConfig | null
  sessions: TelegramSession[]
  commandStats: {
    total: number
    today: number
    byCommand: Record<string, number>
  }
  recentCommands: TelegramCommand[]
}

const STATE_STYLES: Record<string, string> = {
  idle: 'border-slate-500/30 text-slate-400',
  viewing_lead: 'border-sky-500/30 text-sky-400',
  responding: 'border-amber-500/30 text-amber-400',
  commanding: 'border-violet-500/30 text-violet-400',
  taken_over: 'border-red-500/30 text-red-400',
}

const STATE_LABELS: Record<string, string> = {
  idle: 'Inactivo',
  viewing_lead: 'Viendo Lead',
  responding: 'Respondiendo',
  commanding: 'Comandando',
  taken_over: 'Control Manual',
}

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  '/start': 'Iniciar bot',
  '/help': 'Ver ayuda',
  '/ver': 'Ver conversaciones',
  '/responder': 'Responder lead',
  '/tomar_mando': 'Tomar control',
  '/soltar': 'Devolver a JHON',
  '/leads': 'Ver leads del día',
  '/stats': 'Métricas del negocio',
  '/campaña': 'Gestionar campaña',
  '/campañas': 'Listar campañas',
  '/pausar': 'Pausar campaña',
  '/config': 'Ver configuración',
  free_text: 'Texto libre (respuesta directa)',
}

export function TelegramView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [botToken, setBotToken] = useState('')
  const [newChatId, setNewChatId] = useState('')
  const [isSetupMode, setIsSetupMode] = useState(false)

  const { data, isLoading } = useQuery<TelegramData>({
    queryKey: ['telegram', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/telegram`)
      return res.json()
    },
  })

  const config = data?.config
  const sessions = data?.sessions || []
  const commandStats = data?.commandStats || { total: 0, today: 0, byCommand: {} }
  const recentCommands = data?.recentCommands || []

  // Parse allowed chat IDs
  const allowedChatIds: string[] = config?.allowedChatIds
    ? JSON.parse(config.allowedChatIds)
    : []

  // Setup mutation
  const setupMutation = useMutation({
    mutationFn: async (params: { botToken: string; allowedChatIds: string[] }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al configurar bot')
      }
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Bot configurado exitosamente')
      setIsSetupMode(false)
      setBotToken('')
      queryClient.invalidateQueries({ queryKey: ['telegram', workspaceId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/telegram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      return res.json()
    },
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'Bot activado' : 'Bot desactivado')
      queryClient.invalidateQueries({ queryKey: ['telegram', workspaceId] })
    },
  })

  // Add chat ID mutation
  const addChatIdMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const updated = [...allowedChatIds, chatId]
      const res = await fetch(`/api/workspaces/${workspaceId}/telegram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedChatIds: updated }),
      })
      return res.json()
    },
    onSuccess: () => {
      setNewChatId('')
      toast.success('Chat ID agregado')
      queryClient.invalidateQueries({ queryKey: ['telegram', workspaceId] })
    },
  })

  // Remove chat ID mutation
  const removeChatIdMutation = useMutation({
    mutationFn: async (chatId: string) => {
      const updated = allowedChatIds.filter(id => id !== chatId)
      const res = await fetch(`/api/workspaces/${workspaceId}/telegram`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedChatIds: updated }),
      })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Chat ID removido')
      queryClient.invalidateQueries({ queryKey: ['telegram', workspaceId] })
    },
  })

  // Delete bot mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/telegram`, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => {
      toast.success('Bot eliminado')
      queryClient.invalidateQueries({ queryKey: ['telegram', workspaceId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Bot className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // NO BOT CONFIGURED — Show setup wizard
  // ──────────────────────────────────────────────────────────
  if (!config && !isSetupMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Telegram Bot</h2>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardContent className="p-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/20 flex items-center justify-center">
                <Bot className="h-8 w-8 text-sky-400" />
              </div>
              <h3 className="text-lg font-semibold">Bot de Telegram — Control en Tiempo Real</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Conecta un bot de Telegram para controlar tu sistema cognitivo desde tu teléfono.
                JHON te avisa de leads calientes y tú puedes tomar control cuando quieras.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
                {[
                  { icon: '🔍', label: '/ver', desc: 'Ver conversaciones activas' },
                  { icon: '⚡', label: '/tomar_mando', desc: 'Tomar control de un lead' },
                  { icon: '📊', label: '/stats', desc: 'Métricas en tiempo real' },
                ].map((cmd) => (
                  <div key={cmd.label} className="rounded-lg bg-muted/50 p-3">
                    <div className="text-lg">{cmd.icon}</div>
                    <p className="text-xs font-mono font-semibold mt-1">{cmd.label}</p>
                    <p className="text-[10px] text-muted-foreground">{cmd.desc}</p>
                  </div>
                ))}
              </div>

              <Button onClick={() => setIsSetupMode(true)} className="mt-4 bg-sky-500 hover:bg-sky-600">
                <Bot className="h-4 w-4 mr-2" />
                Configurar Bot
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // SETUP MODE — Token input + chat ID configuration
  // ──────────────────────────────────────────────────────────
  if (isSetupMode && !config) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Configurar Bot de Telegram</h2>
          <Button variant="ghost" onClick={() => setIsSetupMode(false)}>Cancelar</Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Paso 1: Crear Bot en Telegram</CardTitle>
              <CardDescription>
                Sigue estos pasos para crear tu bot y obtener el token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Abre Telegram y busca <span className="font-mono text-foreground">@BotFather</span></li>
                <li>Envía <span className="font-mono text-foreground">/newbot</span></li>
                <li>Elige un nombre (ej: "Mi Negocio Control")</li>
                <li>Elige un username (ej: "minegocio_control_bot")</li>
                <li>Copia el token que te da BotFather</li>
              </ol>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Label htmlFor="botToken">Token del Bot</Label>
                <div className="flex gap-2">
                  <Input
                    id="botToken"
                    type="password"
                    placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  El token se almacena encriptado. Nunca se muestra completo después de guardar.
                </p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Label>Chat IDs Autorizados (Opcional)</Label>
                <p className="text-xs text-muted-foreground">
                  Si no especificas ningún Chat ID, cualquier persona puede usar el bot.
                  Para obtener tu Chat ID, envía un mensaje a <span className="font-mono">@userinfobot</span> en Telegram.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tu Chat ID de Telegram"
                    value={newChatId}
                    onChange={(e) => setNewChatId(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newChatId.trim()) {
                        addChatIdMutation.mutate(newChatId.trim())
                      }
                    }}
                    disabled={!newChatId.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                className="w-full bg-sky-500 hover:bg-sky-600"
                onClick={() => {
                  if (botToken.trim()) {
                    setupMutation.mutate({
                      botToken: botToken.trim(),
                      allowedChatIds: [],
                    })
                  }
                }}
                disabled={!botToken.trim() || setupMutation.isPending}
              >
                {setupMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando token...</>
                ) : (
                  <><Shield className="h-4 w-4 mr-2" /> Activar Bot</>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // BOT CONFIGURED — Show dashboard with tabs
  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Telegram Bot</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={config?.isActive ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-500/30 text-slate-400'}>
            {config?.isActive ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Activo</> : <><XCircle className="h-3 w-3 mr-1" /> Inactivo</>}
          </Badge>
          {config?.botUsername && (
            <Badge variant="outline" className="border-sky-500/30 text-sky-400">
              <Bot className="h-3 w-3 mr-1" /> @{config.botUsername}
            </Badge>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Estado', value: config?.isActive ? 'Conectado' : 'Desconectado', icon: Activity, color: config?.isActive ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Comandos Totales', value: commandStats.total, icon: Terminal, color: 'text-sky-400' },
          { label: 'Comandos Hoy', value: commandStats.today, icon: Send, color: 'text-amber-400' },
          { label: 'Sesiones Activas', value: sessions.filter(s => s.state !== 'idle').length, icon: Bot, color: 'text-violet-400' },
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

      <Tabs defaultValue="commands">
        <TabsList>
          <TabsTrigger value="commands">Comandos</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          {/* Command reference */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Referencia de Comandos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(COMMAND_DESCRIPTIONS).map(([cmd, desc]) => (
                  <div key={cmd} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <code className="text-xs font-mono text-sky-400">{cmd}</code>
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent commands */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Comandos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recentCommands.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay comandos registrados. Envía un mensaje al bot para empezar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comando</TableHead>
                      <TableHead>Argumentos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentCommands.map((cmd) => (
                      <TableRow key={cmd.id}>
                        <TableCell>
                          <code className="text-xs font-mono text-sky-400">{cmd.command}</code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {cmd.arguments || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cmd.status === 'processed' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}>
                            {cmd.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(cmd.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Sesiones Activas</CardTitle>
              <CardDescription>
                Sesiones de usuarios conectados al bot de Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay sesiones. El bot se activará cuando alguien envíe un mensaje.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chat ID</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Comando</TableHead>
                      <TableHead>Lead/Conversación</TableHead>
                      <TableHead>Última Actividad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-xs">{session.chatId}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATE_STYLES[session.state] || ''}>
                            {STATE_LABELS[session.state] || session.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-sky-400">
                          {session.lastCommand || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {session.currentLeadId ? `Lead: ...${session.currentLeadId.slice(-6)}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {session.lastCommandAt
                            ? new Date(session.lastCommandAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Toggle active */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Control del Bot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bot Activo</Label>
                  <p className="text-xs text-muted-foreground">
                    Cuando está activo, el bot recibe y procesa mensajes de Telegram
                  </p>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      navigator.clipboard.writeText(config.webhookUrl!)
                      toast.success('Webhook URL copiada')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {config?.lastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Última sincronización: {new Date(config.lastSyncAt).toLocaleString('es-MX')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Authorized Chat IDs */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm">Chat IDs Autorizados</CardTitle>
              <CardDescription>
                Solo estos chats pueden usar el bot. Si la lista está vacía, cualquier chat es aceptado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {allowedChatIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin restricción — cualquier chat puede usar el bot.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowedChatIds.map((chatId) => (
                    <Badge key={chatId} variant="outline" className="gap-1 border-sky-500/30 text-sky-400">
                      {chatId}
                      <button
                        onClick={() => removeChatIdMutation.mutate(chatId)}
                        className="ml-1 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder="Agregar Chat ID"
                  value={newChatId}
                  onChange={(e) => setNewChatId(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newChatId.trim()) addChatIdMutation.mutate(newChatId.trim())
                  }}
                  disabled={!newChatId.trim() || addChatIdMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 Para obtener tu Chat ID: envía un mensaje a <span className="font-mono">@userinfobot</span> en Telegram
              </p>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-red-400">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Eliminar configuración del bot</p>
                  <p className="text-xs text-muted-foreground">
                    Se eliminará el webhook y toda la configuración. Los comandos históricos se conservan.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('¿Eliminar la configuración del bot? Esta acción no se puede deshacer.')) {
                      deleteMutation.mutate()
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar Bot
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
