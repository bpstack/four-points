/**
 * Button — Botón base de la app Four-Points.
 *
 * Variantes:
 *   default  — neutro, borde + surface
 *   primary  — invertido (fg sobre bg)
 *   accent   — color de acento (slate-blue)
 *   ghost    — sin fondo, sólo hover
 *   danger   — texto rojo, hover suave
 *
 * Tamaños: sm (28px), md (32px), lg (40px)
 *
 * Uso:
 *   <Button>Cancelar</Button>
 *   <Button variant="accent" size="lg">Guardar</Button>
 *   <Button variant="ghost" iconOnly aria-label="Cerrar"><X /></Button>
 *   <Button as="a" href="/dashboard">Ir al panel</Button>
 */
'use client'

import * as React from 'react'

type Variant = 'default' | 'primary' | 'accent' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = {
  variant?: Variant
  size?: Size
  iconOnly?: boolean
  loading?: boolean
  fullWidth?: boolean
  as?: 'button' | 'a'
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  Partial<Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'>>

const sizeMap: Record<Size, string> = {
  sm: 'h-7 text-xs px-2.5',
  md: 'h-8 text-[13px] px-3',
  lg: 'h-10 text-sm px-4',
}

const iconOnlyMap: Record<Size, string> = {
  sm: 'h-7 w-7 p-0',
  md: 'h-8 w-8 p-0',
  lg: 'h-10 w-10 p-0',
}

const variantMap: Record<Variant, string> = {
  default: 'bg-surface text-fg border border-border hover:bg-surface-hover',
  primary: 'bg-fg text-bg border border-fg hover:opacity-90',
  accent: 'bg-accent text-accent-fg border border-accent hover:bg-accent-hover',
  ghost:
    'bg-transparent text-fg-muted border border-transparent hover:bg-surface-hover hover:text-fg',
  danger: 'bg-transparent text-danger border border-border hover:bg-danger/10',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'md',
      iconOnly = false,
      loading = false,
      fullWidth = false,
      as = 'button',
      className = '',
      disabled,
      children,
      ...rest
    },
    ref
  ) => {
    const cls = [
      'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap',
      'rounded-fp transition-colors fp-focus-ring',
      'disabled:opacity-50 disabled:pointer-events-none',
      iconOnly ? iconOnlyMap[size] : sizeMap[size],
      variantMap[variant],
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ')

    if (as === 'a') {
      const { href, target, rel, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>
      return (
        <a className={cls} href={href} target={target} rel={rel} {...anchorRest}>
          {children}
        </a>
      )
    }

    return (
      <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
        {loading ? (
          <span
            className="inline-block w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin"
            aria-hidden
          />
        ) : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
