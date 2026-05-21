'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FiChevronUp, FiChevronDown } from 'react-icons/fi'

interface CurrencySpinnerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  step?: number
  fastStep?: number
}

export function CurrencySpinner({
  value,
  onChange,
  label,
  step = 1,
  fastStep = 10,
}: CurrencySpinnerProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const numVal = parseFloat(value.replace(',', '.')) || 0

  const commit = useCallback((n: number) => {
    const clamped = Math.max(0, Math.round(n * 100) / 100)
    onChange(String(clamped))
  }, [onChange])

  const startHold = useCallback((delta: number) => {
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => commit(numVal + delta * fastStep), 80)
    }, 400)
  }, [numVal, fastStep, commit])

  const stopHold = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current)
    if (holdInterval.current) clearInterval(holdInterval.current)
  }, [])

  useEffect(() => () => stopHold(), [stopHold])

  const displayVal = numVal === 0 ? '0,00' :
    numVal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <span className="text-[10px] font-medium text-fg-muted truncate">{label}</span>
      )}
      <div className="flex items-stretch rounded-fp-sm border border-border bg-surface overflow-hidden focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-colors group">
        {/* Value display / edit */}
        <div className="flex-1 relative min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              step={step}
              min={0}
              defaultValue={numVal}
              onBlur={e => {
                commit(parseFloat(e.target.value) || 0)
                setEditing(false)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  if (e.key === 'Enter') commit(parseFloat((e.target as HTMLInputElement).value) || 0)
                  setEditing(false)
                }
              }}
              className="w-full h-full px-2 py-2 text-right text-sm text-fg bg-transparent outline-none tabular-nums
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full h-full px-2 py-2 text-right text-sm tabular-nums transition-colors
                text-fg group-hover:bg-surface-hover"
              title="Clic para editar"
            >
              {displayVal}
            </button>
          )}
        </div>

        {/* Up / Down buttons */}
        <div className="flex flex-col border-l border-border divide-y divide-border">
          <button
            type="button"
            className="flex items-center justify-center w-7 flex-1 text-fg-muted hover:text-fg hover:bg-surface-hover active:bg-border transition-colors"
            onMouseDown={() => { commit(numVal + step); startHold(step) }}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => { commit(numVal + step); startHold(step) }}
            onTouchEnd={stopHold}
          >
            <FiChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center w-7 flex-1 text-fg-muted hover:text-fg hover:bg-surface-hover active:bg-border transition-colors"
            onMouseDown={() => { commit(numVal - step); startHold(-step) }}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={() => { commit(numVal - step); startHold(-step) }}
            onTouchEnd={stopHold}
          >
            <FiChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
