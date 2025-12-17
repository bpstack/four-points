// app/ui/calendar/HorizontalDatePicker.tsx
// Componente reutilizable para selección de días en formato horizontal
// Usado en: Logbooks, Conciliation, Parking Status

'use client'

import { useRef, useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export interface HorizontalDatePickerProps {
  /** Current viewing date (controls which month is displayed) */
  currentDate: Date
  /** Currently selected day number */
  selectedDay: number
  /** Callback when selecting a day */
  onSelectDay: (day: number) => void
  /** Locale for weekday formatting (default: 'es-ES') */
  locale?: string
  /** Custom class for the container */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md'
  /** Number of days to show on mobile (default: 5) */
  mobileDaysVisible?: number
}

export default function HorizontalDatePicker({
  currentDate,
  selectedDay,
  onSelectDay,
  locale = 'es-ES',
  className = '',
  size = 'md',
  mobileDaysVisible = 5,
}: HorizontalDatePickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const selectedDayRef = useRef<HTMLButtonElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Calculate days in month
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate visible days for mobile (7 days centered on selected)
  const getVisibleDays = () => {
    if (!isMobile) return allDays

    const halfVisible = Math.floor(mobileDaysVisible / 2) // 3 days each side
    let start = selectedDay - halfVisible
    let end = selectedDay + halfVisible

    // Adjust if we're near the beginning of the month
    if (start < 1) {
      start = 1
      end = Math.min(mobileDaysVisible, daysInMonth)
    }

    // Adjust if we're near the end of the month
    if (end > daysInMonth) {
      end = daysInMonth
      start = Math.max(1, daysInMonth - mobileDaysVisible + 1)
    }

    return allDays.slice(start - 1, end)
  }

  const visibleDays = getVisibleDays()

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  // Check if we can navigate (mobile only)
  const canGoBack = isMobile && visibleDays[0] > 1
  const canGoForward = isMobile && visibleDays[visibleDays.length - 1] < daysInMonth

  // Navigate days on mobile
  const navigateDays = (direction: 'back' | 'forward') => {
    const step = Math.floor(mobileDaysVisible / 2)
    if (direction === 'back') {
      const newDay = Math.max(1, selectedDay - step)
      onSelectDay(newDay)
    } else {
      const newDay = Math.min(daysInMonth, selectedDay + step)
      onSelectDay(newDay)
    }
  }

  // Auto-scroll to selected day (desktop only)
  useEffect(() => {
    if (!isMobile && selectedDayRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const button = selectedDayRef.current
      const containerWidth = container.offsetWidth
      const buttonLeft = button.offsetLeft
      const buttonWidth = button.offsetWidth

      const scrollPosition = buttonLeft - containerWidth / 2 + buttonWidth / 2

      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      })
    }
  }, [selectedDay, currentDate, isMobile])

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'gap-0.5 px-1 py-2 md:gap-1 md:px-3 md:py-2',
      button: 'w-9 h-10 md:w-9 md:h-10',
      weekday: 'text-[7px] md:text-[8px]',
      day: 'text-[11px] md:text-xs',
    },
    md: {
      container: 'gap-0.5 px-1 py-2 md:gap-1.5 md:px-3 md:py-2',
      button: 'w-10 h-11 md:w-10 md:h-11',
      weekday: 'text-[8px] md:text-[9px]',
      day: 'text-xs md:text-sm',
    },
  }

  const sizes = sizeClasses[size]

  return (
    <div
      className={`bg-white dark:bg-[#010409] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden ${className}`}
    >
      <div className={`flex items-center ${sizes.container}`}>
        {/* Mobile: Back arrow */}
        {isMobile && (
          <button
            onClick={() => navigateDays('back')}
            disabled={!canGoBack}
            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
            }`}
            aria-label="Días anteriores"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Days container */}
        <div
          ref={scrollContainerRef}
          className={`flex flex-1 justify-center md:justify-start md:overflow-x-auto scrollbar-none md:scrollbar-thin md:scrollbar-thumb-gray-300 md:dark:scrollbar-thumb-gray-700 scroll-smooth ${isMobile ? 'gap-1' : 'gap-1.5 md:gap-2'}`}
        >
          {visibleDays.map((day) => {
            const date = new Date(currentYear, currentMonth, day)
            const weekday = date.toLocaleDateString(locale, { weekday: 'short' })
            const isTodayDay = isToday(day)
            const isSelected = day === selectedDay

            return (
              <button
                key={`day-${currentYear}-${currentMonth}-${day}`}
                ref={isSelected ? selectedDayRef : null}
                onClick={() => onSelectDay(day)}
                className={`
                  flex-shrink-0 rounded-lg font-medium flex flex-col items-center justify-center transition-colors
                  ${sizes.button}
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : isTodayDay
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
                        : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span
                  className={`font-normal opacity-80 capitalize leading-tight ${sizes.weekday}`}
                >
                  {weekday.replace('.', '')}
                </span>
                <span className={`font-semibold leading-tight ${sizes.day}`}>{day}</span>
              </button>
            )
          })}
        </div>

        {/* Mobile: Forward arrow */}
        {isMobile && (
          <button
            onClick={() => navigateDays('forward')}
            disabled={!canGoForward}
            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
              canGoForward
                ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
            }`}
            aria-label="Días siguientes"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
