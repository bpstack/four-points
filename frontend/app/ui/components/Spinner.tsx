import * as React from 'react'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'
type SpinnerTone = 'accent' | 'fg' | 'current'

type SpinnerProps = {
  size?: SpinnerSize
  tone?: SpinnerTone
  className?: string
}

const sizeMap: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-7 h-7 border-[3px]',
}

const toneMap: Record<SpinnerTone, string> = {
  accent: 'border-accent  border-r-transparent',
  fg: 'border-fg      border-r-transparent',
  current: 'border-current border-r-transparent',
}

export function Spinner({ size = 'md', tone = 'accent', className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block shrink-0 animate-spin rounded-full ${sizeMap[size]} ${toneMap[tone]} ${className}`}
    />
  )
}
