/**
 * Kbd — Pequeña tecla / atajo de teclado.
 *
 * Uso:
 *   Pulsa <Kbd>⌘</Kbd> + <Kbd>K</Kbd> para buscar.
 */
import * as React from 'react'

export function Kbd({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <kbd className={`fp-kbd inline-flex items-center justify-center min-w-[18px] ${className}`}>
      {children}
    </kbd>
  )
}
