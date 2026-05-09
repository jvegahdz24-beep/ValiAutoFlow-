'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  EXPLORATION: { label: 'Exploración', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  INTEREST: { label: 'Interés', className: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
  INTENT: { label: 'Intención', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  OBJECTION: { label: 'Objeción', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  CLOSING: { label: 'Cierre', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  FOLLOW_UP: { label: 'Seguimiento', className: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
}

export function StageBadge({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage] || { label: stage, className: 'bg-muted text-muted-foreground border-border' }

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}
