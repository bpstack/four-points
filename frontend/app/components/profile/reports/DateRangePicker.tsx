// app/components/profile/reports/DateRangePicker.tsx

'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { FiCalendar, FiX, FiArrowRight } from 'react-icons/fi'
import SimpleCalendar from '@/app/ui/calendar/simplecalendar'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  defaultRange?: DateRange
}

function toLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDefaultDateRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return { from: toLocalYMD(from), to: toLocalYMD(to) }
}

type ActivePicker = 'from' | 'to' | null

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const t = useTranslations('profile.reports.common')
  const locale = useLocale()
  const [activePicker, setActivePicker] = useState<ActivePicker>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePicker(null)
      }
    }
    if (activePicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activePicker])

  const fmt = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d)
  }

  const handleFromSelect = (d: Date | null | undefined) => {
    if (!d) return
    const from = toLocalYMD(d)
    const to = from > value.to ? from : value.to
    onChange({ from, to })
    setActivePicker(null)
  }

  const handleToSelect = (d: Date | null | undefined) => {
    if (!d) return
    const to = toLocalYMD(d)
    const from = to < value.from ? to : value.from
    onChange({ from, to })
    setActivePicker(null)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    const def = getDefaultDateRange()
    onChange(def)
    setActivePicker(null)
  }

  const defaultRange = useMemo(() => getDefaultDateRange(), [])
  const isDefault = value.from === defaultRange.from && value.to === defaultRange.to

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1">
      {/* FROM button */}
      <button
        onClick={() => setActivePicker(activePicker === 'from' ? null : 'from')}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-l-lg border transition-colors
          ${activePicker === 'from'
            ? 'bg-accent/10 border-accent text-accent'
            : 'bg-surface border-border text-fg hover:bg-surface-hover'
          }
        `}
      >
        <FiCalendar className="w-3.5 h-3.5" />
        <span>{fmt(value.from)}</span>
      </button>

      {/* Arrow separator */}
      <span className="text-fg-subtle border-y border-border bg-surface px-1 py-1.5 text-xs">
        <FiArrowRight className="w-3 h-3" />
      </span>

      {/* TO button */}
      <button
        onClick={() => setActivePicker(activePicker === 'to' ? null : 'to')}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium border transition-colors
          ${!isDefault ? 'rounded-r-none border-r-0' : 'rounded-r-lg'}
          ${activePicker === 'to'
            ? 'bg-accent/10 border-accent text-accent'
            : 'bg-surface border-border text-fg hover:bg-surface-hover'
          }
        `}
      >
        <span>{fmt(value.to)}</span>
      </button>

      {/* Clear button (only when not default) */}
      {!isDefault && (
        <button
          onClick={handleClear}
          className="p-1.5 bg-surface border border-l-0 border-border rounded-r-lg text-fg-subtle hover:text-fg hover:bg-surface-hover transition-colors"
          title={t('clearDate')}
        >
          <FiX className="w-3.5 h-3.5" />
        </button>
      )}

      {/* FROM calendar */}
      {activePicker === 'from' && (
        <div className="absolute z-50 top-full mt-2 left-0">
          <SimpleCalendar
            selectedDate={new Date(value.from + 'T00:00:00')}
            onSelect={handleFromSelect}
            onClose={() => setActivePicker(null)}
          />
        </div>
      )}

      {/* TO calendar */}
      {activePicker === 'to' && (
        <div className="absolute z-50 top-full mt-2 left-0">
          <SimpleCalendar
            selectedDate={new Date(value.to + 'T00:00:00')}
            onSelect={handleToSelect}
            onClose={() => setActivePicker(null)}
          />
        </div>
      )}
    </div>
  )
}
