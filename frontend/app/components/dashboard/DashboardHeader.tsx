// app/components/dashboard/DashboardHeader.tsx
'use client'

import React from 'react'
import { FiZap } from 'react-icons/fi'

interface DashboardHeaderProps {
  selectedPeriod: 'today' | 'week' | 'month'
  onPeriodChange: (period: 'today' | 'week' | 'month') => void
}

export function DashboardHeader({ selectedPeriod, onPeriodChange }: DashboardHeaderProps) {
  // Genera el texto de fecha según el período seleccionado
  const getDateRangeText = (): string => {
    const today = new Date()

    if (selectedPeriod === 'today') {
      return today.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    if (selectedPeriod === 'week') {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 6)

      const startDay = weekStart.getDate()
      const endDay = today.getDate()
      const startMonth = weekStart.toLocaleDateString('es-ES', { month: 'long' })
      const endMonth = today.toLocaleDateString('es-ES', { month: 'long' })
      const year = today.getFullYear()

      // Si es el mismo mes: "11 - 17 de diciembre de 2025"
      // Si son meses diferentes: "28 de noviembre - 4 de diciembre de 2025"
      if (startMonth === endMonth) {
        return `${startDay} - ${endDay} de ${endMonth} de ${year}`
      } else {
        return `${startDay} de ${startMonth} - ${endDay} de ${endMonth} de ${year}`
      }
    }

    // month - mes calendario actual (1 - último día del mes)
    const year = today.getFullYear()
    const month = today.getMonth()
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    const monthName = today.toLocaleDateString('es-ES', { month: 'long' })

    return `1 - ${lastDayOfMonth} de ${monthName} de ${year}`
  }

  return (
    <div className="mb-4">
      {/* Row: Title + Buttons (always same line) */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Icon + Title + Date (date only on desktop) */}
        <div className="flex items-center gap-2">
          <div className="p-1 sm:p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
            <FiZap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-[#24292f] to-[#57606a] dark:from-[#f0f6fc] dark:to-[#c9d1d9] bg-clip-text text-transparent">
            Dashboard
          </h1>
          <span className="text-xs text-[#57606a] dark:text-[#8b949e] font-medium hidden sm:inline">
            {getDateRangeText()}
          </span>
        </div>

        {/* Right: Period Selector */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#161b22] p-0.5 sm:p-1 rounded-lg border border-[#d0d7de] dark:border-[#30363d] shadow-sm">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => onPeriodChange(period)}
              className={`px-1.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-md transition-all duration-200 capitalize ${
                selectedPeriod === period
                  ? 'bg-gradient-to-r from-[#0969da] to-[#0550ae] dark:from-[#1f6feb] dark:to-[#1a5ecf] text-white shadow-md'
                  : 'text-[#24292f] dark:text-[#c9d1d9] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d]'
              }`}
            >
              {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Date on mobile (below title row) */}
      <p className="text-[11px] text-[#57606a] dark:text-[#8b949e] font-medium mt-1.5 sm:hidden">
        {getDateRangeText()}
      </p>
    </div>
  )
}
