'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Store } from 'lucide-react'
import TimeSlotPicker from '../shared/TimeSlotPicker'

const BUSINESS_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'mecanica', label: 'Taller Mecánico' },
  { value: 'clinica', label: 'Clínica / Consultorio' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
  { value: 'servicios', label: 'Servicios Locales' },
  { value: 'tienda', label: 'Tienda / Retail' },
  { value: 'educacion', label: 'Educación' },
  { value: 'legal', label: 'Servicios Legales' },
]

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'México (CDMX)' },
  { value: 'America/Monterrey', label: 'México (Monterrey)' },
  { value: 'America/Bogota', label: 'Colombia' },
  { value: 'America/Lima', label: 'Perú' },
  { value: 'America/Santiago', label: 'Chile' },
  { value: 'America/Buenos_Aires', label: 'Argentina' },
  { value: 'America/Guatemala', label: 'Guatemala' },
]

interface StepProps {
  onNext: () => void
  onPrev: () => void
  workspaceId: string
}

export default function BasicInfoStep({ onNext }: StepProps) {
  const { register, setValue, watch } = useFormContext()
  const businessType = watch('businessType')
  const timezone = watch('schedule.timezone')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <Store className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Información del Negocio</h3>
          <p className="text-sm text-muted-foreground">
            Cuéntale a JHON sobre tu negocio para que sepa cómo atender a tus clientes.
          </p>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Nombre del negocio</Label>
        <Input
          {...register('businessName')}
          placeholder="Ej: Taller El Rápido"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          JHON se presentará como parte de tu equipo.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">Rubro</Label>
        <Select value={businessType} onValueChange={(v) => setValue('businessType', v, { shouldDirty: true })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecciona tu rubro" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Esto determina el vocabulario y enfoque de JHON.
        </p>
      </div>

      <div>
        <Label className="text-sm font-medium">Zona horaria</Label>
        <Select
          value={timezone}
          onValueChange={(v) => setValue('schedule.timezone', v, { shouldDirty: true })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Selecciona tu zona horaria" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TimeSlotPicker name="schedule" />

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700">
          Siguiente
        </Button>
      </div>
    </div>
  )
}
