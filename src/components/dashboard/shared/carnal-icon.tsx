'use client'

import { Sparkles, Cpu, Database, Route, Clock, Eye, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CarnalConfig {
  key: string
  name: string
  role: string
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
}

export const CARNALES: CarnalConfig[] = [
  { key: 'JHON', name: 'JHON', role: 'Ventas Consultivas', icon: Sparkles, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  { key: 'ORCHESTRATOR', name: 'ORCHESTRATOR', role: 'Cerebro Central', icon: Cpu, color: 'text-violet-400', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30' },
  { key: 'MEMORY', name: 'MEMORY', role: 'Memoria', icon: Database, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  { key: 'ROUTING', name: 'ROUTING', role: 'Clasificación', icon: Route, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  { key: 'FOLLOWUP', name: 'FOLLOWUP', role: 'Persistencia', icon: Clock, color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'OBSERVABILITY', name: 'OBSERVABILITY', role: 'Auditoría Cognitiva', icon: Eye, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30' },
  { key: 'TOOL_OS', name: 'TOOL_OS', role: 'Herramientas', icon: Wrench, color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30' },
]

export function CarnalIcon({ carnal, className }: { carnal: string; className?: string }) {
  const config = CARNALES.find(c => c.key === carnal)
  if (!config) return null
  const Icon = config.icon
  return <Icon className={`${config.color} ${className || 'h-4 w-4'}`} />
}

export function getCarnalConfig(carnal: string): CarnalConfig | undefined {
  return CARNALES.find(c => c.key === carnal)
}
