//app/ui/calendar/simplecalendar.tsx
'use client'

import { useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useTranslations } from 'next-intl'

interface SimpleCalendarProps {
  selectedDate?: Date | null | undefined
  onSelect?: (date: Date | null | undefined) => void
  onClose?: () => void
}

export default function SimpleCalendar({ selectedDate, onSelect, onClose }: SimpleCalendarProps) {
  const t = useTranslations('common')
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const firstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  // Get month names from translations - returns array
  const monthNames = t.raw('calendar.months') as string[]
  const dayNames = t.raw('calendar.weekdaysShort') as string[]

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const isToday = (date: Date) => {
    return isSameDay(date, new Date())
  }

  const renderDays = () => {
    const days = []
    const totalDays = daysInMonth(currentMonth)
    const startDay = firstDayOfMonth(currentMonth)

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />)
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const isSelected = selectedDate && isSameDay(date, selectedDate)
      const isCurrentDay = isToday(date)

      days.push(
        <button
          key={day}
          onClick={() => onSelect?.(date)}
          className={`
            h-9 w-9 rounded-lg text-sm font-medium transition-all
            ${
              isSelected
                ? 'bg-accent text-accent-fg hover:bg-accent-hover dark:bg-blue-500 dark:hover:bg-accent-hover'
                : isCurrentDay
                  ? 'border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                  : 'text-fg hover:bg-surface-hover'
            }
          `}
        >
          {day}
        </button>
      )
    }

    return days
  }

  return (
    <div className="bg-surface rounded-lg shadow-xl p-5 border border-gray-200 w-[290px]">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 rounded-lg hover:bg-surface-hover text-fg transition-colors"
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-fg">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-surface-hover text-fg transition-colors"
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-3">
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="h-9 w-9 flex items-center justify-center text-xs font-semibold text-fg-subtle"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">{renderDays()}</div>

      {onClose && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-fg hover:bg-surface-hover rounded-lg transition-colors"
          >
            {t('calendar.close')}
          </button>
        </div>
      )}
    </div>
  )
}

/* Usage example in another component/page

<SimpleCalendar
  selectedDate={dateFilter}
  onSelect={(date) => {
    setDateFilter(date ?? undefined)
    setShowCalendar(false) // ✅ Cierra automáticamente
  }}
  onClose={() => setShowCalendar(false)}
/> */
