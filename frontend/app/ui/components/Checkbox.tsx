'use client'

import * as React from 'react'

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'size'
> & {
  label?: React.ReactNode
  hideLabel?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  strikeOnCheck?: boolean
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      hideLabel = false,
      indeterminate = false,
      checked,
      defaultChecked,
      disabled,
      onCheckedChange,
      strikeOnCheck = true,
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    const innerRef = React.useRef<HTMLInputElement | null>(null)
    const [isChecked, setIsChecked] = React.useState(checked ?? defaultChecked ?? false)

    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate
    }, [indeterminate])

    // Keep local state in sync with controlled prop
    React.useEffect(() => {
      if (checked !== undefined) setIsChecked(checked)
    }, [checked])

    const active = indeterminate || isChecked

    return (
      <label
        htmlFor={inputId}
        className={[
          'group relative inline-flex items-center gap-2.5 px-2 py-1.5 rounded-md',
          'cursor-pointer transition-colors select-none',
          'hover:bg-surface-hover',
          disabled ? 'opacity-50 pointer-events-none' : '',
          className,
        ].join(' ')}
      >
        <input
          ref={innerRef}
          id={inputId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(e) => {
            const val = e.currentTarget.checked
            if (checked === undefined) setIsChecked(val)
            onCheckedChange?.(val)
          }}
          {...rest}
        />

        {/* Visual box — rendered via React state to avoid Tailwind JIT issues */}
        <span
          className="grid place-items-center w-[18px] h-[18px] rounded-[4px] shrink-0 transition-colors"
          style={{
            backgroundColor: active ? 'var(--fp-success)' : 'var(--fp-surface-sunken)',
            border: `1px solid ${active ? 'var(--fp-success)' : 'var(--fp-border-strong)'}`,
            color: active ? '#fff' : 'transparent',
          }}
          aria-hidden
        >
          {indeterminate ? (
            <svg viewBox="0 0 12 12" className="w-[10px] h-[10px]" fill="none">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" className="w-[11px] h-[11px]" fill="none">
              <path
                d="M2.5 6.2L5 8.7l4.5-5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        {label && (
          <span
            className={[
              hideLabel ? 'sr-only' : 'text-[13px] leading-snug text-fg',
              !hideLabel && strikeOnCheck && isChecked
                ? 'text-fg-muted line-through decoration-fg-subtle'
                : '',
            ].join(' ')}
          >
            {label}
          </span>
        )}
      </label>
    )
  }
)
Checkbox.displayName = 'Checkbox'
