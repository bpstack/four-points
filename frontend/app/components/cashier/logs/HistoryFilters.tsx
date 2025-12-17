// app/components/cashier/logs/HistoryFilters.tsx

'use client'

import { FiSearch, FiDownload } from 'react-icons/fi'
import type { HistoryAction } from '@/app/lib/cashier/types'

interface HistoryFiltersProps {
  actionFilter: HistoryAction | 'all'
  onActionFilterChange: (action: HistoryAction | 'all') => void
  userFilter: string
  onUserFilterChange: (user: string) => void
  onExport: () => void
}

export default function HistoryFilters({
  actionFilter,
  onActionFilterChange,
  userFilter,
  onUserFilterChange,
  onExport,
}: HistoryFiltersProps) {
  const actions: Array<{ value: HistoryAction | 'all'; label: string }> = [
    { value: 'all', label: 'Acción' },
    { value: 'created', label: 'Creado' },
    { value: 'updated', label: 'Actualizado' },
    { value: 'deleted', label: 'Eliminado' },
    { value: 'status_changed', label: 'Cambio Estado' },
    { value: 'adjustment', label: 'Ajuste' },
    { value: 'voucher_created', label: 'Vale Creado' },
    { value: 'voucher_repaid', label: 'Vale Justificado' },
    { value: 'daily_closed', label: 'Día Cerrado' },
    { value: 'daily_reopened', label: 'Día Reabierto' },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Filtro de usuario (búsqueda) */}
      <div className="relative flex-1">
        <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por usuario..."
          value={userFilter}
          onChange={(e) => onUserFilterChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
        />
      </div>

      {/* Filtro de acción */}
      <select
        value={actionFilter}
        onChange={(e) => onActionFilterChange(e.target.value as HistoryAction | 'all')}
        className="w-full sm:w-auto sm:min-w-[140px] px-3 py-1.5 pr-8 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
      >
        {actions.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
      </select>

      {/* Botón exportar */}
      <button
        onClick={onExport}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#151b23] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <FiDownload className="w-3.5 h-3.5" />
        Exportar
      </button>
    </div>
  )
}
