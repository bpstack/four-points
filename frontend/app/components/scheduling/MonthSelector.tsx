// app/components/scheduling/MonthSelector.tsx

'use client'

import { useMemo } from 'react'
import type { SchedulingMonth } from '@/app/lib/scheduling'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

interface MonthSelectorProps {
  months: SchedulingMonth[]
  selectedMonthId: number | null
  selectedYear: number
  onSelectMonth: (id: number | null) => void
  onSelectYear: (year: number) => void
  onCreateMonth: (month: number) => void
  loading?: boolean
}

export function MonthSelector({
  months,
  selectedMonthId,
  selectedYear,
  onSelectMonth,
  onSelectYear,
  onCreateMonth,
  loading,
}: MonthSelectorProps) {
  const tCalendar = useTranslations('common.calendar')

  // Get month names from translations
  const monthNamesShort = tCalendar.raw('monthsShort') as string[]
  // Create a map of existing months
  const monthsMap = useMemo(() => {
    const map: Record<number, SchedulingMonth> = {}
    months.forEach((m) => {
      map[m.month] = m
    })
    return map
  }, [months])

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-warning'
      case 'published':
        return 'bg-success'
      default:
        return 'bg-border'
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Year Selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelectYear(selectedYear - 1)}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-hover rounded transition-colors"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-fg min-w-[60px] text-center">
          {selectedYear}
        </span>
        <button
          onClick={() => onSelectYear(selectedYear + 1)}
          className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-hover rounded transition-colors"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month Pills */}
      <div className="flex flex-wrap gap-1.5">
        {monthNamesShort.map((name, index) => {
          const monthNum = index + 1
          const existingMonth = monthsMap[monthNum]
          const isSelected = existingMonth?.id === selectedMonthId

          if (existingMonth) {
            return (
              <button
                key={monthNum}
                onClick={() => onSelectMonth(existingMonth.id)}
                disabled={loading}
                className={`
                  relative px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${
                    isSelected
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-hover text-fg-muted hover:text-fg hover:bg-surface-hover'
                  }
                  disabled:opacity-50
                `}
              >
                {name}
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusDot(existingMonth.status)}`}
                />
              </button>
            )
          }

          // Month doesn't exist - auto-create on click
          return (
            <button
              key={monthNum}
              onClick={() => onCreateMonth(monthNum)}
              disabled={loading}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-surface border border-dashed border-border text-fg-subtle hover:bg-surface-hover hover:text-fg-muted transition-colors disabled:opacity-50"
            >
              {name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
