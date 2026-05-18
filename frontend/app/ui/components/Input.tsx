/**
 * Input — Campo de texto base.
 * Compatible con react-hook-form, controlled e uncontrolled.
 *
 * Uso:
 *   <Input placeholder="Buscar..." />
 *   <Input label="Email" type="email" required />
 *   <Input label="Habitación" leftIcon={<Hash />} mono />
 *   <Input error="Campo obligatorio" />
 */
'use client'

import * as React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  /** Si true, usa fuente monoespaciada con tabular-nums (para IDs, importes, fechas). */
  mono?: boolean
  /** Tamaño visual del input. */
  inputSize?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-7 text-xs px-2',
  md: 'h-8 text-[13px] px-2.5',
  lg: 'h-10 text-sm px-3',
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      mono = false,
      inputSize = 'md',
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    const autoId = React.useId()
    const inputId = id ?? autoId

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-fg-muted">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-fg-subtle">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full rounded-fp border bg-surface-sunken text-fg',
              'placeholder:text-fg-subtle',
              'border-border focus:border-accent fp-focus-ring',
              'transition-colors',
              sizeMap[inputSize],
              leftIcon ? 'pl-7' : '',
              rightIcon ? 'pr-7' : '',
              mono ? 'font-mono fp-tnum' : '',
              error ? 'border-danger focus:border-danger' : '',
              className,
            ].join(' ')}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />

          {rightIcon && (
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-fg-subtle">
              {rightIcon}
            </span>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="text-[11px] text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-[11px] text-fg-subtle">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'
