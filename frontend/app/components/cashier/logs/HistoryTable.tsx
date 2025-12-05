// app/components/cashier/logs/HistoryTable.tsx

'use client'

import { FiChevronLeft, FiChevronRight, FiAlertCircle } from 'react-icons/fi'
import type { HistoryWithDetails } from '@/app/lib/cashier/types'

interface HistoryTableProps {
  logs: HistoryWithDetails[]
  isLoading: boolean
  offset: number
  limit: number
  onNextPage: () => void
  onPreviousPage: () => void
}

export default function HistoryTable({
  logs,
  isLoading,
  offset,
  limit,
  onNextPage,
  onPreviousPage,
}: HistoryTableProps) {
  const getActionBadge = (action: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      created: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        label: 'Creado',
      },
      updated: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        label: 'Actualizado',
      },
      deleted: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        label: 'Eliminado',
      },
      status_changed: {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-700 dark:text-purple-400',
        label: 'Estado',
      },
      adjustment: {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        label: 'Ajuste',
      },
      voucher_created: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        label: 'Vale Creado',
      },
      voucher_repaid: {
        bg: 'bg-teal-100 dark:bg-teal-900/30',
        text: 'text-teal-700 dark:text-teal-400',
        label: 'Vale Justificado',
      },
      daily_closed: {
        bg: 'bg-indigo-100 dark:bg-indigo-900/30',
        text: 'text-indigo-700 dark:text-indigo-400',
        label: 'Día Cerrado',
      },
      daily_reopened: {
        bg: 'bg-pink-100 dark:bg-pink-900/30',
        text: 'text-pink-700 dark:text-pink-400',
        label: 'Día Reabierto',
      },
    }

    const badge = badges[action] || {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-700 dark:text-gray-400',
      label: action,
    }

    return (
      <span
        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    )
  }

  const formatShiftType = (type?: string) => {
    if (!type) return '-'
    const types: Record<string, string> = {
      night: 'Noche',
      morning: 'Mañana',
      afternoon: 'Tarde',
      closing: 'Cierre',
    }
    return types[type] || type
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-12">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargando historial...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-12">
        <div className="text-center">
          <FiAlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No se encontraron registros</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📋 Registro de Cambios
        </h3>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Fecha/Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Acción
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Turno
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Campo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Cambio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {logs.map((log) => (
              <tr
                key={log.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Fecha/Hora */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                  <div>
                    <div className="font-medium">
                      {new Date(log.changed_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.changed_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </td>

                {/* Acción */}
                <td className="px-4 py-3 text-sm">{getActionBadge(log.action)}</td>

                {/* Turno */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {log.shift_date && log.shift_type ? (
                    <div>
                      <div className="font-medium">
                        {new Date(log.shift_date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatShiftType(log.shift_type)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Usuario */}
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {log.username || <span className="text-gray-400 italic">Sistema</span>}
                </td>

                {/* Campo */}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {log.field_changed || <span className="text-gray-400">-</span>}
                </td>

                {/* Cambio */}
                <td className="px-4 py-3 text-sm">
                  {log.old_value || log.new_value ? (
                    <div className="max-w-xs">
                      {log.old_value && (
                        <div className="text-red-600 dark:text-red-400 text-xs mb-1">
                          <span className="font-medium">Antes:</span> {log.old_value}
                        </div>
                      )}
                      {log.new_value && (
                        <div className="text-green-600 dark:text-green-400 text-xs">
                          <span className="font-medium">Después:</span> {log.new_value}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                {/* Notas */}
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                  {log.notes ? (
                    <span className="truncate block" title={log.notes}>
                      {log.notes}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {offset + 1} - {offset + logs.length} de {offset + logs.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousPage}
            disabled={offset === 0}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <FiChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={onNextPage}
            disabled={logs.length < limit}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Siguiente
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
