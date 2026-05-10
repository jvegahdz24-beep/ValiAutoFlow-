'use client'

interface CognitiveGaugeProps {
  value: number
  max?: number
  size?: number
  label?: string
  color?: string
}

export function CognitiveGauge({ value, max = 100, size = 80, label, color }: CognitiveGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (color) return color
    if (percentage >= 70) return '#34D399'
    if (percentage >= 40) return '#FBBF24'
    return '#EF4444'
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-sm font-bold">{Math.round(percentage)}%</span>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  )
}
