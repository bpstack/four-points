// app/components/parking/bookings/InfoCard.tsx
'use client'

import { ReactNode } from 'react'
import { Card } from '@/app/ui/components'

interface InfoCardProps {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'default' | 'highlighted'
}

export function InfoCard({
  title,
  icon,
  children,
  className = '',
  variant = 'default',
}: InfoCardProps) {
  return (
    <Card
      padding="none"
      variant={variant === 'highlighted' ? 'sunken' : 'default'}
      className={className}
    >
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
          {icon && <span className="text-fg-muted">{icon}</span>}
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  )
}

interface InfoRowProps {
  label: string
  value: ReactNode
  highlight?: boolean
  mono?: boolean
}

export function InfoRow({ label, value, highlight = false, mono = false }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50/50 last:border-0">
      <span className="text-xs text-fg-muted">{label}</span>
      <span
        className={`text-sm font-medium ${
          highlight ? 'text-accent' : 'text-fg'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

export default InfoCard
