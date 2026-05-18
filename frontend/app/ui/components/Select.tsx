'use client'

import * as React from 'react'

export type SelectOption = { value: string; label: string }

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  inputSize?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const sizeMap = {
  sm: 'py-1 text-xs px-2',
  md: 'py-1.5 text-[13px] px-2.5',
  lg: 'py-2 text-sm px-3',
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      options,
      placeholder,
      inputSize = 'md',
      fullWidth = true,
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    const autoId = React.useId()
    const selectId = id ?? autoId

    return (
      <div className={`flex flex-col gap-1 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-fg-muted">
            {label}
            {rest.required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={[
            'w-full rounded-fp border bg-surface-sunken text-fg cursor-pointer',
            'border-border focus:border-accent fp-focus-ring',
            'transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeMap[inputSize],
            error ? 'border-danger focus:border-danger' : '',
            className,
          ].join(' ')}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {error ? (
          <p id={`${selectId}-error`} className="text-[11px] text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${selectId}-hint`} className="text-[11px] text-fg-subtle">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)
Select.displayName = 'Select'
