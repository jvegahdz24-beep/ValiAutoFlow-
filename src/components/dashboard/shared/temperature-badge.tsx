'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TEMP_CONFIG: Record<string, { label: string; className: string }> = {
  COLD: { label: 'Frío', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  WARM: { label: 'Tibio', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  HOT: { label: 'Caliente', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
}

export function TemperatureBadge({ temperature }: { temperature: string }) {
  const config = TEMP_CONFIG[temperature] || { label: temperature, className: 'bg-muted text-muted-foreground border-border' }

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}
