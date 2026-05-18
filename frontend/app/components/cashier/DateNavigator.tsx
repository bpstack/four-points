// app/components/cashier/DateNavigator.tsx
'use client'

import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi'
import { useTranslations } from 'next-intl'

interface DateNavigatorProps {
  /** Display label (formatted date or month/year) */
  displayLabel: string
  /** Callback for previous navigation */
  onPrevious: () => void
  /** Callback for next navigation */
  onNext: () => void
  /** Callback for "today" button */
  onToday: () => void
  /** Label for today button (overrides translation) */
  todayLabel?: string
  /** Minimum width for the label container */
  labelMinWidth?: string
}

export default function DateNavigator({
  displayLabel,
  onPrevious,
  onNext,
  onToday,
  todayLabel,
  labelMinWidth = '120px',
}: DateNavigatorProps) {
  const t = useTranslations('cashier')
  const displayTodayLabel = todayLabel || t('calendar.today')
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrevious}
        className="p-2 border border-border rounded-lg bg-surface-hover text-fg hover:bg-surface-hover transition-colors"
      >
        <FiChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg bg-surface-hover">
        <FiCalendar className="w-5 h-5 text-fg-subtle" />
        <span className="font-medium text-fg text-center" style={{ minWidth: labelMinWidth }}>
          {displayLabel}
        </span>
      </div>

      <button
        onClick={onNext}
        className="p-2 border border-border rounded-lg bg-surface-hover text-fg hover:bg-surface-hover transition-colors"
      >
        <FiChevronRight className="w-5 h-5" />
      </button>

      <button
        onClick={onToday}
        className="px-4 py-2 border border-border rounded-lg bg-surface-hover text-fg hover:bg-surface-hover transition-colors font-medium"
      >
        {displayTodayLabel}
      </button>
    </div>
  )
}
