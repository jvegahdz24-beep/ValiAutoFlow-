'use client'

import { MessageSquare, Instagram, Globe, Phone } from 'lucide-react'

const CHANNEL_CONFIG: Record<string, { icon: typeof MessageSquare; label: string; color: string }> = {
  WHATSAPP: { icon: Phone, label: 'WhatsApp', color: 'text-emerald-400' },
  MESSENGER: { icon: MessageSquare, label: 'Messenger', color: 'text-sky-400' },
  INSTAGRAM: { icon: Instagram, label: 'Instagram', color: 'text-pink-400' },
  WEB: { icon: Globe, label: 'Web', color: 'text-violet-400' },
}

export function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  const config = CHANNEL_CONFIG[channel] || { icon: Globe, label: channel, color: 'text-muted-foreground' }
  const Icon = config.icon

  return <Icon className={`${config.color} ${className || 'h-4 w-4'}`} />
}

export function ChannelLabel({ channel }: { channel: string }) {
  const config = CHANNEL_CONFIG[channel] || { icon: Globe, label: channel, color: 'text-muted-foreground' }
  return <span className={`text-xs ${config.color}`}>{config.label}</span>
}
