'use client'

import * as React from 'react'

type ResizeMode = 'none' | 'vertical' | 'horizontal' | 'both'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  mono?: boolean
  resize?: ResizeMode
}

const resizeMap: Record<ResizeMode, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      mono = false,
      resize = 'vertical',
      className = '',
      id,
      rows = 3,
      ...rest
    },
    ref
  ) => {
    const autoId = React.useId()
    const textareaId = id ?? autoId

    return (
      <div className="flex w-full flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-medium text-fg-muted">
            {label}
            {rest.required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={[
            'w-full rounded-fp border bg-surface-sunken text-fg',
            'px-2.5 py-2 text-[13px]',
            'placeholder:text-fg-subtle',
            'border-border focus:border-accent fp-focus-ring',
            'transition-colors',
            resizeMap[resize],
            mono ? 'font-mono fp-tnum' : '',
            error ? 'border-danger focus:border-danger' : '',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          ].join(' ')}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...rest}
        />

        {error ? (
          <p id={`${textareaId}-error`} className="text-[11px] text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${textareaId}-hint`} className="text-[11px] text-fg-subtle">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
