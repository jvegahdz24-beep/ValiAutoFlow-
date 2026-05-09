'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion } from 'framer-motion'
import {
  Settings, Store, Clock, Package, MessageCircle, Shield, Save, Plus, Trash2,
  Check, Sparkles,
} from 'lucide-react'

interface BusinessConfig {
  id?: string
  workspaceId: string
  businessName: string
  businessType: string
  schedule: { timezone: string; days: string[]; hours: string[] }
  products: { name: string; price: number; duration_min: number; note?: string }[]
  leadFormula: { volume_keyword: string; conversion_metric: string; average_ticket: number; funnel_note: string }
  customQuestions: { id: string; text: string; purpose: string; stage: string }[]
  policies: { show_price_early: boolean; auto_schedule: boolean; max_questions_per_turn: number; auto_followup: boolean }
  channels: { whatsapp: boolean; telegram: boolean; email: boolean }
  isActive: boolean
}

const DEFAULT_CONFIG: BusinessConfig = {
  workspaceId: '',
  businessName: '',
  businessType: 'general',
  schedule: { timezone: 'America/Mexico_City', days: ['mon', 'tue', 'wed', 'thu', 'fri'], hours: ['09:00-18:00'] },
  products: [],
  leadFormula: { volume_keyword: 'leads', conversion_metric: 'ventas', average_ticket: 1500, funnel_note: '' },
  customQuestions: [],
  policies: { show_price_early: false, auto_schedule: true, max_questions_per_turn: 2, auto_followup: true },
  channels: { whatsapp: true, telegram: false, email: false },
  isActive: true,
}

function parseConfig(c: Record<string, unknown>): BusinessConfig {
  const raw = c as BusinessConfig
  return {
    ...raw,
    schedule: typeof raw.schedule === 'string' ? JSON.parse(raw.schedule) : raw.schedule,
    products: typeof raw.products === 'string' ? JSON.parse(raw.products) : raw.products || [],
    leadFormula: typeof raw.leadFormula === 'string' ? JSON.parse(raw.leadFormula) : raw.leadFormula || DEFAULT_CONFIG.leadFormula,
    customQuestions: typeof raw.customQuestions === 'string' ? JSON.parse(raw.customQuestions) : raw.customQuestions || [],
    policies: typeof raw.policies === 'string' ? JSON.parse(raw.policies) : raw.policies || DEFAULT_CONFIG.policies,
    channels: typeof raw.channels === 'string' ? JSON.parse(raw.channels) : raw.channels || DEFAULT_CONFIG.channels,
  }
}

const BUSINESS_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'mecanica', label: 'Taller Mecánico' },
  { value: 'clinica', label: 'Clínica/Consultorio' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
  { value: 'servicios', label: 'Servicios Locales' },
  { value: 'tienda', label: 'Tienda/Retail' },
  { value: 'educacion', label: 'Educación' },
  { value: 'legal', label: 'Servicios Legales' },
]

const TIMEZONES = [
  'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Buenos_Aires',
  'America/Santiago', 'America/Guatemala', 'America/Monterrey',
]

export function ConfigView({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient()
  const [config, setConfig] = useState<BusinessConfig>({ ...DEFAULT_CONFIG, workspaceId })
  const [activeSection, setActiveSection] = useState<string>('basics')
  const [saved, setSaved] = useState(false)

  // Fetch existing config
  const { data: configData, isLoading } = useQuery({
    queryKey: ['config', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`)
      return res.json()
    },
  })

  // Adjust state during rendering when configData changes (React-recommended pattern)
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevConfigDataRef, setPrevConfigDataRef] = useState<unknown>(null)
  if (configData?.config && configData !== prevConfigDataRef) {
    setPrevConfigDataRef(configData)
    setConfig(parseConfig(configData.config))
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      return res.json()
    },
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['config', workspaceId] })
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const addProduct = () => {
    setConfig(prev => ({
      ...prev,
      products: [...prev.products, { name: '', price: 0, duration_min: 30 }],
    }))
  }

  const removeProduct = (index: number) => {
    setConfig(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }))
  }

  const addQuestion = () => {
    const id = `q_${Date.now()}`
    setConfig(prev => ({
      ...prev,
      customQuestions: [...prev.customQuestions, { id, text: '', purpose: '', stage: 'exploration' }],
    }))
  }

  const removeQuestion = (id: string) => {
    setConfig(prev => ({
      ...prev,
      customQuestions: prev.customQuestions.filter(q => q.id !== id),
    }))
  }

  const sections = [
    { id: 'basics', label: 'Datos del Negocio', icon: Store },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'products', label: 'Productos/Servicios', icon: Package },
    { id: 'questions', label: 'Preguntas de JHON', icon: MessageCircle },
    { id: 'formula', label: 'Fórmula de Pérdida', icon: Sparkles },
    { id: 'policies', label: 'Políticas', icon: Shield },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Settings className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Configuración del Negocio</h2>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {saved ? 'Guardado' : 'Guardar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Navigation */}
        <Card className="lg:col-span-1">
          <CardContent className="p-2">
            {sections.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Section Content */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6 space-y-6">
            {/* BASICS SECTION */}
            {activeSection === 'basics' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div>
                  <Label>Nombre del Negocio</Label>
                  <Input
                    value={config.businessName}
                    onChange={e => setConfig(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ej: Taller El Rápido"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Rubro</Label>
                  <Select value={config.businessType} onValueChange={v => setConfig(prev => ({ ...prev, businessType: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Zona Horaria</Label>
                  <Select value={config.schedule.timezone} onValueChange={v => setConfig(prev => ({ ...prev, schedule: { ...prev.schedule, timezone: v } }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {/* SCHEDULE SECTION */}
            {activeSection === 'schedule' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <Label className="text-base font-medium">Días de Atención</Label>
                <div className="flex flex-wrap gap-2">
                  {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                    const dayLabels: Record<string, string> = { mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom' }
                    const isActive = config.schedule.days.includes(day)
                    return (
                      <button
                        key={day}
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            days: isActive ? prev.schedule.days.filter(d => d !== day) : [...prev.schedule.days, day],
                          },
                        }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {dayLabels[day]}
                      </button>
                    )
                  })}
                </div>
                <div>
                  <Label>Horario (ej: 09:00-18:00)</Label>
                  <Input
                    value={config.schedule.hours[0] || ''}
                    onChange={e => setConfig(prev => ({ ...prev, schedule: { ...prev.schedule, hours: [e.target.value] } }))}
                    placeholder="09:00-18:00"
                    className="mt-1"
                  />
                </div>
              </motion.div>
            )}

            {/* PRODUCTS SECTION */}
            {activeSection === 'products' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Productos y Servicios</Label>
                  <Button variant="outline" size="sm" onClick={addProduct}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar
                  </Button>
                </div>
                {config.products.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay productos configurados. Agrega los servicios que ofreces.
                  </div>
                )}
                {config.products.map((product, index) => (
                  <div key={index} className="flex gap-3 items-start p-4 rounded-lg bg-muted/50">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        value={product.name}
                        onChange={e => {
                          const newProducts = [...config.products]
                          newProducts[index] = { ...product, name: e.target.value }
                          setConfig(prev => ({ ...prev, products: newProducts }))
                        }}
                        placeholder="Nombre del servicio"
                      />
                      <Input
                        type="number"
                        value={product.price || ''}
                        onChange={e => {
                          const newProducts = [...config.products]
                          newProducts[index] = { ...product, price: Number(e.target.value) }
                          setConfig(prev => ({ ...prev, products: newProducts }))
                        }}
                        placeholder="Precio ($)"
                      />
                      <Input
                        type="number"
                        value={product.duration_min || ''}
                        onChange={e => {
                          const newProducts = [...config.products]
                          newProducts[index] = { ...product, duration_min: Number(e.target.value) }
                          setConfig(prev => ({ ...prev, products: newProducts }))
                        }}
                        placeholder="Duración (min)"
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeProduct(index)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* CUSTOM QUESTIONS SECTION */}
            {activeSection === 'questions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Preguntas que JHON debe hacer</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Estas preguntas se insertan naturalmente en la conversación. El lead nunca sentirá que lo interrogan.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addQuestion} disabled={config.customQuestions.length >= 3}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar
                  </Button>
                </div>
                {config.customQuestions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                    Sin preguntas personalizadas. JHON usará las preguntas estándar de diagnóstico.
                  </div>
                )}
                {config.customQuestions.map((q, index) => (
                  <div key={q.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">Pregunta {index + 1}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-300 h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">Pregunta</Label>
                      <Input
                        value={q.text}
                        onChange={e => {
                          const newQ = [...config.customQuestions]
                          newQ[index] = { ...q, text: e.target.value }
                          setConfig(prev => ({ ...prev, customQuestions: newQ }))
                        }}
                        placeholder="Ej: ¿Qué coche tienes? (marca, modelo, año)"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Propósito (por qué se hace)</Label>
                      <Input
                        value={q.purpose}
                        onChange={e => {
                          const newQ = [...config.customQuestions]
                          newQ[index] = { ...q, purpose: e.target.value }
                          setConfig(prev => ({ ...prev, customQuestions: newQ }))
                        }}
                        placeholder="Ej: Para darte una cotización más exacta"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Etapa para hacerla</Label>
                      <Select value={q.stage} onValueChange={v => {
                        const newQ = [...config.customQuestions]
                        newQ[index] = { ...q, stage: v }
                        setConfig(prev => ({ ...prev, customQuestions: newQ }))
                      }}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exploration">Exploración</SelectItem>
                          <SelectItem value="interest">Interés</SelectItem>
                          <SelectItem value="intent">Intención</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* LOSS FORMULA SECTION */}
            {activeSection === 'formula' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div>
                  <Label>¿Cómo llamas a tus leads? (ej: consultas, mensajes, prospectos)</Label>
                  <Input
                    value={config.leadFormula.volume_keyword}
                    onChange={e => setConfig(prev => ({ ...prev, leadFormula: { ...prev.leadFormula, volume_keyword: e.target.value } }))}
                    placeholder="leads"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>¿Qué se considera una conversión? (ej: cita agendada, servicio realizado)</Label>
                  <Input
                    value={config.leadFormula.conversion_metric}
                    onChange={e => setConfig(prev => ({ ...prev, leadFormula: { ...prev.leadFormula, conversion_metric: e.target.value } }))}
                    placeholder="ventas"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Ticket promedio ($)</Label>
                  <Input
                    type="number"
                    value={config.leadFormula.average_ticket || ''}
                    onChange={e => setConfig(prev => ({ ...prev, leadFormula: { ...prev.leadFormula, average_ticket: Number(e.target.value) } }))}
                    placeholder="1500"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Resumen del funnel de pérdida (JHON narrará esto)</Label>
                  <Textarea
                    value={config.leadFormula.funnel_note}
                    onChange={e => setConfig(prev => ({ ...prev, leadFormula: { ...prev.leadFormula, funnel_note: e.target.value } }))}
                    placeholder="Ej: por cada 10 mensajes que llegan, 6 se pierden por falta de seguimiento"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </motion.div>
            )}

            {/* POLICIES SECTION */}
            {activeSection === 'policies' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label>¿Mostrar precio automáticamente?</Label>
                    <p className="text-xs text-muted-foreground">Si está desactivado, JHON no menciona precios hasta la etapa de intención.</p>
                  </div>
                  <Switch
                    checked={config.policies.show_price_early}
                    onCheckedChange={v => setConfig(prev => ({ ...prev, policies: { ...prev.policies, show_price_early: v } }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label>¿Agendar citas sin aprobación humana?</Label>
                    <p className="text-xs text-muted-foreground">JHON puede agendar directamente en Google Calendar.</p>
                  </div>
                  <Switch
                    checked={config.policies.auto_schedule}
                    onCheckedChange={v => setConfig(prev => ({ ...prev, policies: { ...prev.policies, auto_schedule: v } }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label>¿Seguimiento automático a los 3 días?</Label>
                    <p className="text-xs text-muted-foreground">MARK enviará mensaje de reactivación si el lead no responde.</p>
                  </div>
                  <Switch
                    checked={config.policies.auto_followup}
                    onCheckedChange={v => setConfig(prev => ({ ...prev, policies: { ...prev.policies, auto_followup: v } }))}
                  />
                </div>
                <Separator />
                <div>
                  <Label>Máximo de preguntas por mensaje</Label>
                  <Select value={String(config.policies.max_questions_per_turn)} onValueChange={v => setConfig(prev => ({ ...prev, policies: { ...prev.policies, max_questions_per_turn: Number(v) } }))}>
                    <SelectTrigger className="mt-1 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 pregunta</SelectItem>
                      <SelectItem value="2">2 preguntas</SelectItem>
                      <SelectItem value="3">3 preguntas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
