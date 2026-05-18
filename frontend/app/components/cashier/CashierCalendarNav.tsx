// app/components/cashier/CashierCalendarNav.tsx
'use client'

import { useTranslations } from 'next-intl'
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi'

interface CashierCalendarNavProps {
  currentMonth: string
  currentYear: number
  selectedDate: string
  username: string | undefined
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}

export default function CashierCalendarNav({
  currentMonth,
  currentYear,
  selectedDate,
  username,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CashierCalendarNavProps) {
  const t = useTranslations('cashier')

  return (
    <div className="sticky top-0 z-30 bg-bg shadow-sm">
      <div className="px-3 py-2 md:px-4 md:py-3 border-b border-border">
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-56 flex-shrink-0">
              <h1 className="text-base font-semibold text-fg capitalize truncate">
                {currentMonth} {currentYear}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onPreviousMonth}
                className="p-2 text-fg border border-border rounded-md hover:bg-surface-hover transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={onNextMonth}
                className="p-2 text-fg border border-border rounded-md hover:bg-surface-hover transition-colors"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onToday}
              className="ml-3 px-3 py-2 text-sm font-medium text-fg border border-border rounded-md hover:bg-surface-hover transition-colors flex items-center gap-1"
            >
              <FiCalendar className="w-4 h-4" /> {t('calendar.today')}
            </button>

            <div className="ml-4 text-sm text-fg-muted flex-shrink-0">
              {t('calendar.user')}: <span className="font-medium text-fg">{username || 'N/A'}</span>
            </div>
          </div>

          <div className="text-xs text-fg-subtle">
            {t('calendar.date')}: {selectedDate}
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <h1 className="text-base font-semibold text-fg capitalize whitespace-nowrap w-20">
              {currentMonth.slice(0, 3)} {currentYear}
            </h1>
            <button
              onClick={onPreviousMonth}
              className="p-2 text-fg-muted hover:bg-surface-hover rounded-md transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-2 text-fg-muted hover:bg-surface-hover rounded-md transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onToday}
            className="px-2 py-1 text-xs font-medium text-fg-muted hover:bg-surface-hover rounded-md transition-colors"
          >
            {t('calendar.today')}
          </button>
        </div>
      </div>
    </div>
  )
}
