'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Calculator, TrendingDown, DollarSign } from 'lucide-react'

interface StepProps {
  onNext: () => void
  onPrev: () => void
  workspaceId: string
}

export default function LeadFormulaStep({ onNext, onPrev }: StepProps) {
  const { register, watch } = useFormContext()
  const averageTicket: number = watch('leadFormula.average_ticket') || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <Calculator className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Fórmula de Pérdida</h3>
          <p className="text-sm text-muted-foreground">
            Ayuda a JHON a entender cuánto dinero se pierde cuando no se da seguimiento.
          </p>
        </div>
      </div>

      {/* Live preview card */}
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Vista previa del cálculo</span>
        </div>
        <p className="text-sm text-muted-foreground">
          JHON calculará: <span className="text-foreground font-medium">leads perdidos</span> ×{' '}
          <span className="text-foreground font-medium">${averageTicket || '___'}</span> ={' '}
          <span className="text-emerald-400 font-bold">pérdida mensual</span>
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">
          ¿Cómo llamas a un cliente potencial?
        </Label>
        <Input
          {...register('leadFormula.volume_keyword')}
          placeholder="Ej: consultas, leads, mensajes, prospectos"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          JHON usará este término para hablar tu idioma.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">
          ¿Qué es una conversión para ti?
        </Label>
        <Input
          {...register('leadFormula.conversion_metric')}
          placeholder="Ej: cita agendada, venta realizada, servicio contratado"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Define el objetivo final de cada conversación.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Ticket promedio por cliente ($)
        </Label>
        <Input
          type="number"
          {...register('leadFormula.average_ticket', { valueAsNumber: true })}
          placeholder="1500"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Valor promedio de una venta o servicio completado.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">
          Describe la pérdida actual
        </Label>
        <Textarea
          {...register('leadFormula.funnel_note')}
          placeholder="Ej: por cada 10 mensajes que llegan, 6 no reciben respuesta y se enfrían. Eso son $9,000 perdidos al mes."
          rows={3}
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          JHON narrará esta pérdida para motivar el cierre. Sé específico.
        </p>
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
