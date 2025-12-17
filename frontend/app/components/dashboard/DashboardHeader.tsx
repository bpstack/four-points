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

    // month
    const monthStart = new Date(today)
    monthStart.setDate(today.getDate() - 29)

    const startDay = monthStart.getDate()
    const endDay = today.getDate()
    const startMonth = monthStart.toLocaleDateString('es-ES', { month: 'long' })
    const endMonth = today.toLocaleDateString('es-ES', { month: 'long' })
    const startYear = monthStart.getFullYear()
    const endYear = today.getFullYear()

    // Si es el mismo año
    if (startYear === endYear) {
      if (startMonth === endMonth) {
        return `${startDay} - ${endDay} de ${endMonth} de ${endYear}`
      } else {
        return `${startDay} de ${startMonth} - ${endDay} de ${endMonth} de ${endYear}`
      }
    } else {
      // Años diferentes (ej: diciembre 2024 - enero 2025)
      return `${startDay} de ${startMonth} de ${startYear} - ${endDay} de ${endMonth} de ${endYear}`
    }
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20">
              <FiZap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#24292f] to-[#57606a] dark:from-[#f0f6fc] dark:to-[#c9d1d9] bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
          <p className="text-sm text-[#57606a] dark:text-[#8b949e] ml-14 font-medium">
            {getDateRangeText()}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#161b22] p-1.5 rounded-lg border border-[#d0d7de] dark:border-[#30363d] shadow-sm">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => onPeriodChange(period)}
              className={`px-5 py-2 text-sm font-semibold rounded-md transition-all duration-200 capitalize ${
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
    </div>
  )
}
