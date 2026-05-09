'use client'

import { useFormContext } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const DAYS = [
  { key: 'mon', label: 'Lun' },
  { key: 'tue', label: 'Mar' },
  { key: 'wed', label: 'Mié' },
  { key: 'thu', label: 'Jue' },
  { key: 'fri', label: 'Vie' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' },
]

interface TimeSlotPickerProps {
  name: string
}

export default function TimeSlotPicker({ name }: TimeSlotPickerProps) {
  const { register, setValue, watch } = useFormContext()
  const daysField = `${name}.days`
  const selectedDays: string[] = watch(daysField) || []

  const toggleDay = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    setValue(daysField, newDays, { shouldDirty: true })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Días de atención</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {DAYS.map(({ key, label }) => {
            const isActive = selectedDays.includes(key)
            return (
              <button
                key={key}
                type="button"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                onClick={() => toggleDay(key)}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Hora inicio</Label>
          <Input
            type="time"
            {...register(`${name}.hours.0`)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Hora fin</Label>
          <Input
            type="time"
            {...register(`${name}.hours.1`)}
            className="mt-1.5"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Ej: 09:00 - 18:00. JHON solo responderá dentro de este horario.</p>
    </div>
  )
}
