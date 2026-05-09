'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, CalendarCheck, Clock, DollarSign, MessageSquare } from 'lucide-react'

interface PolicyToggleProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function PolicyToggle({ icon, title, description, checked, onCheckedChange }: PolicyToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <Label className="text-sm font-medium">{title}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

interface StepProps {
  onNext: () => void
  onPrev: () => void
  workspaceId: string
}

export default function PoliciesStep({ onNext, onPrev }: StepProps) {
  const { setValue, watch } = useFormContext()
  const policies = watch('policies') || {}

  const toggle = (key: string, value: boolean) => {
    setValue(`policies.${key}`, value, { shouldDirty: true })
  }

  return (
    <div data-tour="config-policies" className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <Shield className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Políticas Comerciales</h3>
          <p className="text-sm text-muted-foreground">
            Define las reglas que JHON debe seguir. Son interruptores: activa lo que quieras y desactiva lo que no.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <PolicyToggle
          icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
          title="Mostrar precio al inicio"
          description="Si se activa, JHON podrá dar precios sin diagnóstico previo. Si no, esperará a la etapa de intención."
          checked={policies.show_price_early || false}
          onCheckedChange={(v) => toggle('show_price_early', v)}
        />

        <Separator className="my-4" />

        <PolicyToggle
          icon={<CalendarCheck className="h-4 w-4 text-blue-400" />}
          title="Agendar citas automáticamente"
          description="Sin intervención humana, JHON reserva la cita si hay disponibilidad en tu calendario."
          checked={policies.auto_schedule || false}
          onCheckedChange={(v) => toggle('auto_schedule', v)}
        />

        <Separator className="my-4" />

        <PolicyToggle
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          title="Seguimiento automático (MARK)"
          description="Reactiva leads inactivos después de 3 días con un mensaje inteligente y contextual."
          checked={policies.auto_followup || false}
          onCheckedChange={(v) => toggle('auto_followup', v)}
        />

        <Separator className="my-4" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <MessageSquare className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <Label className="text-sm font-medium">Máximo de preguntas por mensaje</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evita que JHON parezca un interrogatorio. Menos preguntas = conversación más natural.
              </p>
            </div>
          </div>
          <Select
            value={String(policies.max_questions_per_turn || 2)}
            onValueChange={(v) => setValue('policies.max_questions_per_turn', Number(v), { shouldDirty: true })}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 pregunta</SelectItem>
              <SelectItem value="2">2 preguntas</SelectItem>
              <SelectItem value="3">3 preguntas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>
          Atrás
        </Button>
        <Button onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700">
          Siguiente
        </Button>
      </div>
    </div>
  )
}
