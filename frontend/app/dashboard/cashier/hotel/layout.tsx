// app/dashboard/cashier/layout.tsx
'use client'

import { useState, useEffect, ReactNode, createContext, useContext } from 'react'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiDollarSign } from 'react-icons/fi'
import { useAuth } from '@/app/lib/auth/useAuth'
import { formatDateForInput } from '@/app/lib/helpers/date'
import { useQueryClient } from '@tanstack/react-query'

interface CashierContextType {
  selectedDate: string
  setSelectedDate: (date: string) => void
}

const CashierContext = createContext<CashierContextType | undefined>(undefined)

export function useCashierContext() {
  const context = useContext(CashierContext)
  if (!context) {
    throw new Error('useCashierContext debe usarse dentro de CashierLayout')
  }
  return context
}

export default function CashierLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()))

  const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' })
  const currentYear = currentDate.getFullYear()
  const daysInMonth = new Date(currentYear, currentDate.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
    setSelectedDay(1)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
    setSelectedDay(1)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today.getDate())
    const newDate = formatDateForInput(today)

    console.log('🔄 goToToday - invalidando cache para:', newDate)

    queryClient.removeQueries({ queryKey: ['cashier'] })

    setSelectedDate(newDate)
  }

  const handleDayClick = (day: number) => {
    setSelectedDay(day)
    const newDate = new Date(currentYear, currentDate.getMonth(), day)
    const formattedDate = formatDateForInput(newDate)

    console.log('🔄 handleDayClick - día:', day, '- fecha:', formattedDate)

    queryClient.removeQueries({ queryKey: ['cashier'] })

    setSelectedDate(formattedDate)
  }

  // ✅ CORREGIDO: Remover queryClient de dependencias
  useEffect(() => {
    const newDate = new Date(currentYear, currentDate.getMonth(), selectedDay)
    const formattedDate = formatDateForInput(newDate)

    console.log('🔄 useEffect - mes cambió, nueva fecha:', formattedDate)

    // ✅ Solo actualizar si la fecha cambió
    if (formattedDate !== selectedDate) {
      queryClient.removeQueries({ queryKey: ['cashier'] })
      setSelectedDate(formattedDate)
    }
  }, [currentDate, selectedDay, currentYear]) // ✅ SIN queryClient ni selectedDate

  return (
    <CashierContext.Provider value={{ selectedDate, setSelectedDate }}>
      <div className="space-y-6">
        {/* Header sticky principal */}
        <div className="sticky top-0 z-30 bg-white dark:bg-[#010409] shadow-sm">
          <div className="px-3 py-2 md:px-4 md:py-3 border-b border-gray-200 dark:border-gray-800">
            {/* Desktop */}
            <div className="hidden md:flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-56 flex-shrink-0">
                  <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize truncate">
                    {currentMonth} {currentYear}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={goToToday}
                  className="ml-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                  <FiCalendar className="w-4 h-4" /> Today
                </button>

                <div className="ml-4 text-sm text-gray-700 dark:text-gray-400 flex-shrink-0">
                  Usuario:{' '}
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    {user?.username || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">Fecha: {selectedDate}</div>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-gray-900 dark:text-white capitalize whitespace-nowrap w-20">
                  {currentMonth.slice(0, 3)} {currentYear}
                </h1>
                <button
                  onClick={goToPreviousMonth}
                  className="p-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2.5 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={goToToday}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <FiCalendar className="w-3.5 h-3.5" /> Today
              </button>
            </div>
          </div>
        </div>

        {/* Paginación de días sticky */}
        <div className="sticky top-[64px] z-30 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {days.map((day) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
              const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })

              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()

              const isSelected = day === selectedDay

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg font-medium flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : isToday
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-blue-600 dark:border-blue-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-[10px] font-normal">{weekday}</span>
                  <span className="text-sm font-medium">{day}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenido dinámico */}
        <div className="max-w-[1280px] mx-auto">{children}</div>
      </div>
    </CashierContext.Provider>
  )
}
