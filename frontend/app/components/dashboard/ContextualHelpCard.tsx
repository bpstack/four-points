// app/components/dashboard/ContextualHelpCard.tsx
'use client'

import React from 'react'
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'

interface ContextualHelpCardProps {
  selectedPeriod: 'today' | 'week' | 'month'
  hasEntries: boolean
}

const getPeriodLabel = (period: string) => {
  return period === 'today' ? 'Hoy' : period === 'week' ? 'Esta Semana' : 'Este Mes'
}

const getPeriodText = (period: string) => {
  return period === 'today'
    ? 'del día de hoy'
    : period === 'week'
      ? 'de los últimos 7 días'
      : 'de los últimos 30 días'
}

export function ContextualHelpCard({ selectedPeriod, hasEntries }: ContextualHelpCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#ddf4ff] to-[#b6e3ff] dark:from-[#051d30] dark:to-[#0a2540] border border-[#9cd7ff] dark:border-[#1f6feb] rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-[#0969da] dark:bg-[#1f6feb] rounded-lg shadow-lg">
          <FiAlertCircle className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">Ayuda Contextual</h3>
      </div>

      <div className="space-y-4 text-sm text-[#24292f] dark:text-[#c9d1d9] leading-relaxed">
        <div className="space-y-2 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
          <div className="flex items-center gap-2 font-bold text-[#0969da] dark:text-[#58a6ff]">
            <FiCheckCircle className="w-4 h-4" />
            ¡Importante para {getPeriodLabel(selectedPeriod)}!
          </div>
          <p>
            Entradas de logbooks con prioridad Alta {getPeriodText(selectedPeriod)}. Muestra tareas
            pendientes urgentes, solicitudes de mantenimiento prioritarias, quejas de clientes y
            otros elementos que requieren atención inmediata.
            {hasEntries && ' Desplázate para ver todas las entradas.'}
          </p>
        </div>

        <div className="space-y-2 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
          <div className="flex items-center gap-2 font-bold text-[#0969da] dark:text-[#58a6ff]">
            <FiCheckCircle className="w-4 h-4" />
            Cambio de Período
          </div>
          <p>
            Usa los botones en la parte superior (Hoy, Semana, Mes) para filtrar las entradas
            críticas según el período que necesites revisar.
          </p>
        </div>
      </div>
    </div>
  )
}
