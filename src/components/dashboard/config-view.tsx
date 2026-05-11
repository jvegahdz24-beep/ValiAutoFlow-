'use client'

import { useQuery } from '@tanstack/react-query'
import { Settings, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import ConfigWizard from '@/components/config/ConfigWizard'

interface BusinessConfig {
  id?: string
  workspaceId: string
  businessName: string
  businessType: string
  schedule: { timezone: string; days: string[]; hours: string[] }
  products: { name: string; price: number; duration_min: number; note?: string }[]
  leadFormula: { volume_keyword: string; conversion_metric: string; average_ticket: number; funnel_note: string }
  customQuestions: { id: string; text: string; purpose: string; stage: string }[]
  policies: { show_price_early: boolean; auto_schedule: boolean; max_questions_per_turn: number; auto_followup: boolean }
  channels: { whatsapp: boolean; telegram: boolean; email: boolean }
  isActive: boolean
}

const DEFAULT_CONFIG: BusinessConfig = {
  workspaceId: '',
  businessName: '',
  businessType: 'general',
  schedule: {
    timezone: 'America/Mexico_City',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    hours: ['09:00', '18:00'],
  },
  products: [],
  leadFormula: { volume_keyword: '', conversion_metric: '', average_ticket: 0, funnel_note: '' },
  customQuestions: [],
  policies: { show_price_early: false, auto_schedule: true, max_questions_per_turn: 2, auto_followup: true },
  channels: { whatsapp: true, telegram: false, email: false },
  isActive: true,
}

function parseConfig(c: Record<string, unknown>): BusinessConfig {
  const raw = c as unknown as BusinessConfig
  return {
    ...raw,
    schedule: typeof raw.schedule === 'string' ? JSON.parse(raw.schedule) : raw.schedule || DEFAULT_CONFIG.schedule,
    products: typeof raw.products === 'string' ? JSON.parse(raw.products) : raw.products || [],
    leadFormula: typeof raw.leadFormula === 'string' ? JSON.parse(raw.leadFormula) : raw.leadFormula || DEFAULT_CONFIG.leadFormula,
    customQuestions: typeof raw.customQuestions === 'string' ? JSON.parse(raw.customQuestions) : raw.customQuestions || [],
    policies: typeof raw.policies === 'string' ? JSON.parse(raw.policies) : raw.policies || DEFAULT_CONFIG.policies,
    channels: typeof raw.channels === 'string' ? JSON.parse(raw.channels) : raw.channels || DEFAULT_CONFIG.channels,
  }
}

export function ConfigView({ workspaceId }: { workspaceId: string }) {
  // Fetch existing config
  const { data: configData, isLoading, error } = useQuery({
    queryKey: ['config', workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/config`)
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorBody.error || `Config API error: ${res.status}`)
      }
      return res.json()
    },
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <div className="rounded-xl bg-emerald-500/20 p-3">
              <Settings className="h-6 w-6 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Cargando configuración</p>
            <p className="text-xs text-muted-foreground">Preparando el asistente...</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // If config fetch fails, still show wizard with defaults so user can save
  if (error) {
    console.warn('[ConfigView] Failed to load config, using defaults:', error.message)
  }

  const config = configData?.config
    ? parseConfig(configData.config)
    : { ...DEFAULT_CONFIG, workspaceId }

  return (
    <div className="py-2">
      <ConfigWizard defaultValues={config as unknown as Record<string, unknown>} workspaceId={workspaceId} />
    </div>
  )
}
