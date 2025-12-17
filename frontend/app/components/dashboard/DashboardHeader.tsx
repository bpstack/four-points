// app/components/dashboard/DashboardHeader.tsx
'use client'

import React from 'react'
import { FiZap } from 'react-icons/fi'

interface DashboardHeaderProps {
  selectedPeriod: 'today' | 'week' | 'month'
  onPeriodChange: (period: 'today' | 'week' | 'month') => void
}

export function DashboardHeader({ selectedPeriod, onPeriodChange }: DashboardHeaderProps) {
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
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
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
