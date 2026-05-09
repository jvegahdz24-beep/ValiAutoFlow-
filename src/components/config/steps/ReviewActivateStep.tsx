'use client'

import { useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, Store, Package, Calculator, HelpCircle, Shield, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

const DAY_LABELS: Record<string, string> = {
  mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue',
  fri: 'Vie', sat: 'Sáb', sun: 'Dom',
}

const RUBRO_LABELS: Record<string, string> = {
  general: 'General', mecanica: 'Taller Mecánico', clinica: 'Clínica / Consultorio',
  restaurante: 'Restaurante', inmobiliaria: 'Inmobiliaria', servicios: 'Servicios Locales',
  tienda: 'Tienda / Retail', educacion: 'Educación', legal: 'Servicios Legales',
}

const STAGE_LABELS: Record<string, string> = {
  exploration: 'Exploración', interest: 'Interés', intention: 'Intención',
}

interface StepProps {
  onNext: () => void
  onPrev: () => void
  workspaceId: string
}

interface ReviewRowProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  color?: string
}

function ReviewRow({ icon, label, value, color = 'text-emerald-400' }: ReviewRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-medium ${color}`}>{value}</div>
    </div>
  )
}

export default function ReviewActivateStep({ onPrev, workspaceId }: StepProps) {
  const { handleSubmit, getValues } = useFormContext()
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  const values = getValues()

  const onSubmit = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setIsSaved(true)
      toast.success('Configuración guardada. JHON está listo para trabajar.', {
        description: 'Tu asistente comercial cognitivo está activo.',
      })
    } catch {
      toast.error('No se pudo guardar la configuración', {
        description: 'Intenta de nuevo en unos momentos.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const schedule = values.schedule || {}
  const products = values.products || []
  const leadFormula = values.leadFormula || {}
  const customQuestions = values.customQuestions || []
  const policies = values.policies || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Revisión y Activación</h3>
          <p className="text-sm text-muted-foreground">
            Revisa tu configuración antes de activar a JHON.
          </p>
        </div>
      </div>

      {/* Business Info */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold">Datos del Negocio</span>
          </div>
          <ReviewRow
            icon={<span className="w-3" />}
            label="Negocio"
            value={values.businessName || 'Sin nombre'}
          />
          <ReviewRow
            icon={<span className="w-3" />}
            label="Rubro"
            value={RUBRO_LABELS[values.businessType] || values.businessType || 'No definido'}
          />
          <ReviewRow
            icon={<span className="w-3" />}
            label="Horario"
            value={
              (schedule.days || []).map((d: string) => DAY_LABELS[d] || d).join(', ') || 'No definido'
            }
          />
          <ReviewRow
            icon={<span className="w-3" />}
            label="Horas"
            value={
              schedule.hours?.length === 2
                ? `${schedule.hours[0]} - ${schedule.hours[1]}`
                : schedule.hours?.[0] || 'No definido'
            }
          />
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold">Servicios ({products.length})</span>
          </div>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin servicios configurados</p>
          ) : (
            <div className="space-y-2">
              {products.map((p: { name: string; price: number; duration_min: number }, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{p.name || 'Sin nombre'}</span>
                  <span className="text-muted-foreground">
                    ${p.price || 0} · {p.duration_min || 30} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loss Formula */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold">Fórmula de Pérdida</span>
          </div>
          <ReviewRow
            icon={<span className="w-3" />}
            label="Leads"
            value={leadFormula.volume_keyword || 'No definido'}
            color="text-amber-400"
          />
          <ReviewRow
            icon={<span className="w-3" />}
            label="Conversión"
            value={leadFormula.conversion_metric || 'No definido'}
            color="text-amber-400"
          />
          <ReviewRow
            icon={<span className="w-3" />}
            label="Ticket promedio"
            value={`$${leadFormula.average_ticket || 0}`}
            color="text-amber-400"
          />
          {leadFormula.funnel_note && (
            <p className="text-xs text-muted-foreground mt-2 italic">&ldquo;{leadFormula.funnel_note}&rdquo;</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold">Preguntas Personalizadas ({customQuestions.length})</span>
          </div>
          {customQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin preguntas personalizadas</p>
          ) : (
            <div className="space-y-2">
              {customQuestions.map((q: { text: string; stage: string }, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{q.text || 'Sin texto'}</span>
                  <Badge variant="outline" className="text-xs">
                    {STAGE_LABELS[q.stage] || q.stage}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-red-400" />
            <span className="text-sm font-semibold">Políticas</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${policies.show_price_early ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
              <span>Precios al inicio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${policies.auto_schedule ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
              <span>Auto agendar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${policies.auto_followup ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
              <span>Follow-up MARK</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Max preguntas: {policies.max_questions_per_turn || 2}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {isSaved && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-400">JHON está activo y listo</p>
            <p className="text-xs text-muted-foreground">
              Tu asistente comercial cognitivo está atendiendo leads.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev} disabled={isSaving}>
          Atrás
        </Button>
        {isSaved ? (
          <Button
            onClick={onSubmit}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        ) : (
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Guardando...' : 'Activar JHON'}
          </Button>
        )}
      </div>
    </div>
  )
}
