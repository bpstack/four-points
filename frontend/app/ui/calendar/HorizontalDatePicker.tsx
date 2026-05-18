// app/ui/calendar/HorizontalDatePicker.tsx
// Componente reutilizable para selección de días en formato horizontal
// Usado en: Logbooks, Conciliation, Parking Status

'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
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
  mobileDaysVisible: _mobileDaysVisible = 5,
}: HorizontalDatePickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [clientWidth, setClientWidth] = useState(0)

  // Calculate days in month
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'gap-0.5 px-1 py-2 md:gap-1 md:px-2 md:py-2',
      button: 'w-9 h-10 md:w-9 md:h-10',
      weekday: 'text-[7px] md:text-[8px]',
      day: 'text-[11px] md:text-xs',
      gapClass: 'gap-1',
      buttonWidth: 36, // w-9 = 36px
      gap: 4, // gap-1 = 4px
    },
    md: {
      container: 'gap-0.5 px-1 py-2 md:gap-1.5 md:px-2 md:py-2',
      button: 'w-10 h-11 md:w-10 md:h-11',
      weekday: 'text-[8px] md:text-[9px]',
      day: 'text-xs md:text-sm',
      gapClass: 'gap-1.5',
      buttonWidth: 40, // w-10 = 40px
      gap: 6, // gap-1.5 = 6px
    },
  }

  const sizes = sizeClasses[size]
  const dayWidth = sizes.buttonWidth + sizes.gap

  // Track scroll container dimensions with ResizeObserver
  const updateDimensions = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setScrollWidth(el.scrollWidth)
    setClientWidth(el.clientWidth)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateDimensions()
    const ro = new ResizeObserver(updateDimensions)
    ro.observe(el)
    return () => ro.disconnect()
  }, [updateDimensions, daysInMonth])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    setScrollLeft(scrollRef.current.scrollLeft)
  }, [])

  // Scroll to keep selected day visible only when selectedDay prop changes
  const prevSelectedDayRef = useRef<number>(selectedDay)
  useEffect(() => {
    if (prevSelectedDayRef.current === selectedDay) return
    prevSelectedDayRef.current = selectedDay
    const el = scrollRef.current
    if (!el) return
    const itemStart = (selectedDay - 1) * dayWidth
    const itemEnd = itemStart + sizes.buttonWidth
    if (itemStart < el.scrollLeft || itemEnd > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: itemStart, behavior: 'smooth' })
    }
  }, [selectedDay, dayWidth, sizes.buttonWidth])

  // Reset scroll when month changes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = 0
    setScrollLeft(0)
  }, [currentMonth, currentYear])

  const needsNavigation = scrollWidth > clientWidth + 1
  const canGoBack = scrollLeft > 0
  const canGoForward = scrollLeft + clientWidth < scrollWidth - 1

  const navigateDays = (direction: 'back' | 'forward') => {
    const el = scrollRef.current
    if (!el) return
    const visibleCount = Math.max(1, Math.floor(el.clientWidth / dayWidth))
    const step = Math.max(1, Math.floor(visibleCount / 2)) * dayWidth
    el.scrollBy({ left: direction === 'back' ? -step : step, behavior: 'smooth' })
  }

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  return (
    <div className={`bg-bg border border-border rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div className={`flex items-center ${sizes.container}`}>
        {/* Back arrow - show only when needed */}
        {needsNavigation && (
          <button
            onClick={() => navigateDays('back')}
            disabled={!canGoBack}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              canGoBack
                ? 'text-fg-muted hover:bg-surface-hover'
                : 'text-fg-subtle cursor-not-allowed'
            }`}
            aria-label="Días anteriores"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Days container — all days rendered, native scroll on mobile and desktop */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`flex flex-1 overflow-x-auto touch-pan-x ${sizes.gapClass} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        >
          {allDays.map((day) => {
            const date = new Date(currentYear, currentMonth, day)
            const weekday = date.toLocaleDateString(locale, { weekday: 'short' })
            const isTodayDay = isToday(day)
            const isSelected = day === selectedDay

            return (
              <button
                key={`day-${currentYear}-${currentMonth}-${day}`}
                onClick={() => onSelectDay(day)}
                className={`
                  flex-shrink-0 rounded-lg font-medium flex flex-col items-center justify-center transition-colors
                  ${sizes.button}
                  ${
                    isSelected
                      ? 'bg-accent text-accent-fg shadow-md'
                      : isTodayDay
                        ? 'bg-accent/10 text-accent ring-2 ring-accent ring-inset'
                        : 'bg-surface-hover/50 text-fg hover:bg-surface-hover'
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

        {/* Forward arrow - show only when needed */}
        {needsNavigation && (
          <button
            onClick={() => navigateDays('forward')}
            disabled={!canGoForward}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
              canGoForward
                ? 'text-fg-muted hover:bg-surface-hover'
                : 'text-fg-subtle cursor-not-allowed'
            }`}
            aria-label="Días siguientes"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
