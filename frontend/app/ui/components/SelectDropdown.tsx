'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface DropdownOption<T extends string | number = string | number> {
  value: T
  label: string
}

interface SelectDropdownProps<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  label?: string
  className?: string
  size?: 'sm' | 'md'
  disabled?: boolean
}

const sizeMap = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1.5 text-xs',
}

export function SelectDropdown<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className = '',
  size = 'sm',
  disabled = false,
}: SelectDropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
    width: number
    openUp: boolean
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selected = options.find((o) => o.value === value)

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setPosition({
      top: spaceBelow < 220 ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      openUp: spaceBelow < 220,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEsc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEsc)
    }
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-fg-muted mb-1">{label}</label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={[
          'flex items-center justify-between gap-2 w-full rounded-fp',
          'border border-border bg-surface-sunken text-fg',
          'hover:border-accent/50 transition-colors',
          'focus:outline-none focus:border-accent fp-focus-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeMap[size],
        ].join(' ')}
      >
        <span className="truncate">{selected?.label ?? String(value)}</span>
        <svg
          className={`w-3 h-3 text-fg-subtle shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 10 6"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && position && (
        <div
          className="fixed z-50 overflow-y-auto max-h-60 rounded-fp border border-border bg-surface shadow-lg py-1"
          style={{
            left: position.left,
            width: Math.max(position.width, 120),
            ...(position.openUp
              ? { bottom: window.innerHeight - position.top }
              : { top: position.top }),
          }}
        >
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={[
                'w-full text-left px-3 py-1.5 text-xs transition-colors',
                opt.value === value
                  ? 'text-accent bg-accent/10 font-medium'
                  : 'text-fg hover:bg-surface-hover',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
