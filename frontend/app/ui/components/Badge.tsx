/**
 * Badge — Pequeña etiqueta semántica (success, warning, danger, info, neutral, accent).
 *
 * Uso:
 *   <Badge tone="success">Limpia</Badge>
 *   <Badge tone="warning" dot>Pendiente</Badge>
 *   <Badge tone="danger">Bloqueada</Badge>
 *
 * Para tonos arbitrarios, usa `tone="neutral"` y pasa color con className.
 */
'use client'

import * as React from 'react'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral'

type BadgeProps = {
  tone?: Tone
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
  children: React.ReactNode
}

const toneMap: Record<Tone, { bg: string; text: string; dot: string }> = {
  success: {
    bg: 'bg-success/15',
    text: 'text-success',
    dot: 'bg-success',
  },
  warning: {
    bg: 'bg-warning/15',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  danger: {
    bg: 'bg-danger/15',
    text: 'text-danger',
    dot: 'bg-danger',
  },
  info: {
    bg: 'bg-info/15',
    text: 'text-info',
    dot: 'bg-info',
  },
  accent: {
    bg: 'bg-accent/15',
    text: 'text-accent',
    dot: 'bg-accent',
  },
  neutral: {
    bg: 'bg-surface-hover',
    text: 'text-fg-muted',
    dot: 'bg-neutral',
  },
}

export function Badge({
  tone = 'neutral',
  dot = false,
  size = 'sm',
  className = '',
  children,
}: BadgeProps) {
  const t = toneMap[tone]
  const sizeCls = size === 'sm' ? 'h-[22px] px-2 text-[11px]' : 'h-6 px-2.5 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeCls} ${t.bg} ${t.text} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.dot}`} aria-hidden />}
      {children}
    </span>
  )
}

/**
 * StatusPill — Variante del Badge con un punto siempre visible.
 * Útil para estados de habitación, reservas, etc.
 */
export function StatusPill({
  tone = 'neutral',
  size = 'sm',
  className = '',
  children,
}: BadgeProps) {
  return (
    <Badge tone={tone} dot size={size} className={className}>
      {children}
    </Badge>
  )
}
