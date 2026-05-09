'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number
  format?: 'number' | 'currency' | 'percent'
  icon: LucideIcon
  trend?: number
  className?: string
  iconColor?: string
}

export function StatCard({ title, value, format = 'number', icon: Icon, trend, className, iconColor }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1200
    const steps = 60
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  const formattedValue = () => {
    if (format === 'currency') {
      return `$${displayValue.toLocaleString()}`
    }
    if (format === 'percent') {
      return `${displayValue.toFixed(1)}%`
    }
    return displayValue.toLocaleString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn('border-border/50 bg-card hover:border-emerald-500/30 transition-colors', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{formattedValue()}</p>
            </div>
            <div className={cn('rounded-xl p-3', iconColor || 'bg-emerald-500/10')}>
              <Icon className={cn('h-5 w-5', iconColor ? 'text-current' : 'text-emerald-400')} />
            </div>
          </div>
          {trend !== undefined && (
            <div className="mt-2 flex items-center text-xs">
              {trend >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-400" />
              )}
              <span className={trend >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
              <span className="ml-1 text-muted-foreground">vs last period</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
