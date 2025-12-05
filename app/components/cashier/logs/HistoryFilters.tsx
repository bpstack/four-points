// app/components/cashier/logs/HistoryFilters.tsx

'use client'

import { FiFilter, FiDownload } from 'react-icons/fi'
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
    { value: 'all', label: 'Todas las acciones' },
    { value: 'created', label: 'Creado' },
    { value: 'updated', label: 'Actualizado' },
    { value: 'deleted', label: 'Eliminado' },
    { value: 'status_changed', label: 'Cambio de Estado' },
    { value: 'adjustment', label: 'Ajuste' },
    { value: 'voucher_created', label: 'Vale Creado' },
    { value: 'voucher_repaid', label: 'Vale Justificado' },
    { value: 'daily_closed', label: 'Día Cerrado' },
    { value: 'daily_reopened', label: 'Día Reabierto' },
  ]

  return (
    <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Filtro de acción */}
        <div className="flex items-center gap-2 flex-1">
          <FiFilter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => onActionFilterChange(e.target.value as HistoryAction | 'all')}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {actions.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de usuario */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filtrar por usuario..."
            value={userFilter}
            onChange={(e) => onUserFilterChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Botón exportar */}
        <button
          onClick={onExport}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <FiDownload className="w-4 h-4" />
          Exportar
        </button>
      </div>
    </div>
  )
}
