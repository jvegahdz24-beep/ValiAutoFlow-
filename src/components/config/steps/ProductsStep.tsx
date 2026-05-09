'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Package, Trash2 } from 'lucide-react'
import DynamicList from '../shared/DynamicList'

const DEFAULT_PRODUCT = { name: '', price: 0, duration_min: 30, note: '' }

interface StepProps {
  onNext: () => void
  onPrev: () => void
  workspaceId: string
}

export default function ProductsStep({ onNext, onPrev }: StepProps) {
  const { register } = useFormContext()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <Package className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Productos y Servicios</h3>
          <p className="text-sm text-muted-foreground">
            Agrega los servicios que ofreces. JHON los usará para cotizar y agendar.
          </p>
        </div>
      </div>

      <DynamicList
        name="products"
        defaultItem={DEFAULT_PRODUCT}
        addLabel="Agregar servicio"
        renderItem={({ index, remove }) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Servicio {index + 1}
              </Label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              placeholder="Nombre del servicio"
              {...register(`products.${index}.name`)}
              className="font-medium"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Precio ($)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  {...register(`products.${index}.price`, { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Duración (min)</Label>
                <Input
                  type="number"
                  placeholder="30"
                  {...register(`products.${index}.duration_min`, { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
            </div>
            <Input
              placeholder="Nota opcional (ej: incluye diagnóstico)"
              {...register(`products.${index}.note`)}
              className="text-sm"
            />
          </div>
        )}
      />

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
