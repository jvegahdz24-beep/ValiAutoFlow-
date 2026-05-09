'use client'

import { useFormContext, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface DynamicListProps {
  name: string
  defaultItem: Record<string, unknown>
  renderItem: (props: { index: number; remove: (index: number) => void }) => React.ReactNode
  maxItems?: number
  addLabel?: string
}

export default function DynamicList({
  name,
  defaultItem,
  renderItem,
  maxItems,
  addLabel = 'Agregar',
}: DynamicListProps) {
  const { control } = useFormContext()
  const { fields, append, remove } = useFieldArray({ control, name })

  const canAdd = maxItems ? fields.length < maxItems : true

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex-1">{renderItem({ index, remove })}</div>
        </div>
      ))}
      {canAdd && (
        <Button
          type="button"
          variant="outline"
          onClick={() => append(defaultItem)}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" /> {addLabel}
        </Button>
      )}
      {maxItems && fields.length >= maxItems && (
        <p className="text-xs text-muted-foreground text-center">Máximo {maxItems} elementos alcanzado</p>
      )}
    </div>
  )
}
