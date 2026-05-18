'use client'

import { useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface SimpleCalendarCompactProps {
  selectedDate?: Date | null
  onSelect?: (date: Date | null) => void
  onClose?: () => void
  minDate?: Date | null // Nueva prop para bloquear fechas anteriores
}

export default function SimpleCalendarCompact({
  selectedDate,
  onSelect,
  onClose,
  minDate,
}: SimpleCalendarCompactProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const firstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return day === 0 ? 6 : day - 1 // Ajustar para que lunes sea 0
  }

  const monthNames = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 15, 12, 0, 0))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 15, 12, 0, 0))
  }

  // ✅ CORREGIDO - Comparación robusta
  const isSameDay = (date1: Date, date2: Date) => {
    const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate(), 12, 0, 0)
    const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate(), 12, 0, 0)
    return d1.getTime() === d2.getTime()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return isSameDay(date, today)
  }

  // Verificar si una fecha es anterior a minDate
  const isBeforeMinDate = (date: Date) => {
    if (!minDate) return false
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
    const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate(), 0, 0, 0)
    return d < min
  }

  const renderDays = () => {
    const days = []
    const totalDays = daysInMonth(currentMonth)
    const firstDay = firstDayOfMonth(currentMonth)

    // Días vacíos al inicio
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-6" />)
    }

    // Días del mes
    for (let day = 1; day <= totalDays; day++) {
      // ✅ CORREGIDO - Usar mediodía
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
      const isSelected = selectedDate && isSameDay(date, selectedDate)
      const isTodayDate = isToday(date)
      const isDisabled = isBeforeMinDate(date)

      days.push(
        <button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => {
            if (!isDisabled) {
              onSelect?.(date)
              onClose?.()
            }
          }}
          className={`
            h-10 text-xs rounded transition-colors
            ${
              isDisabled
                ? 'text-fg-subtle cursor-not-allowed'
                : isSelected
                  ? 'bg-accent text-accent-fg font-semibold'
                  : isTodayDate
                    ? 'bg-info/10 text-blue-600 dark:text-blue-400 font-medium'
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
    <div className="bg-surface border border-border rounded-lg shadow-lg p-2 w-56">
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={previousMonth}
          className="p-0.5 hover:bg-surface-hover rounded"
        >
          <FiChevronLeft className="w-3.5 h-3.5 text-fg-muted" />
        </button>

        <span className="text-xs font-semibold text-fg">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>

        <button type="button" onClick={nextMonth} className="p-0.5 hover:bg-surface-hover rounded">
          <FiChevronRight className="w-3.5 h-3.5 text-fg-muted" />
        </button>
      </div>

      {/* Días de la semana compactos */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-5 flex items-center justify-center text-[10px] font-medium text-fg-subtle"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Días del mes compactos */}
      <div className="grid grid-cols-7 gap-0.5">{renderDays()}</div>
    </div>
  )
}
