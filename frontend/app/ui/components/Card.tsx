/**
 * Card — Contenedor base de la app Four-Points.
 *
 * Reemplaza el patrón repetido:
 *   <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
 *
 * Uso básico:
 *   <Card>contenido</Card>
 *   <Card padding="lg" hover>contenido con hover</Card>
 *   <Card variant="elevated">card con sombra modal</Card>
 *
 * Card con cabecera y cuerpo:
 *   <Card>
 *     <Card.Header title="Saldo" subtitle="Marzo 2026" actions={<Button>Ver</Button>} />
 *     <Card.Body>contenido</Card.Body>
 *   </Card>
 */
'use client'

import * as React from 'react'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'elevated' | 'sunken'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  as?: keyof React.JSX.IntrinsicElements
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}: CardProps) {
  const base = 'rounded-fp-md border border-border'

  const surface =
    variant === 'elevated'
      ? 'bg-surface-elevated shadow-fp-modal'
      : variant === 'sunken'
        ? 'bg-surface-sunken'
        : 'bg-surface shadow-fp-pop'

  const hoverClass = hover
    ? 'transition-colors hover:bg-surface-hover hover:border-border-strong cursor-pointer'
    : ''

  return (
    // @ts-expect-error — dynamic tag is fine here
    <Tag
      className={`${base} ${surface} ${paddingMap[padding]} ${hoverClass} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* ===== Subcomponentes (composición opcional) ===== */

type HeaderProps = {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

function CardHeader({ title, subtitle, actions, className = '' }: HeaderProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-border ${className}`}
    >
      <div className="min-w-0">
        {title && (
          <div className="text-[13px] font-semibold text-fg tracking-tight truncate">{title}</div>
        )}
        {subtitle && <div className="text-xs text-fg-muted mt-0.5 truncate">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

function CardBody({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-4 ${className}`} {...rest} />
}

function CardFooter({ className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 border-t border-border ${className}`}
      {...rest}
    />
  )
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter
