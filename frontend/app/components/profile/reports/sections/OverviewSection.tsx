// app/components/profile/reports/sections/OverviewSection.tsx

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import {
  FiClock,
  FiUser,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiFilter,
  FiBook,
  FiTool,
  FiUsers,
  FiDollarSign,
} from 'react-icons/fi'
import DateFilter from '../DateFilter'
import type { UnifiedActivity, ActivitySource } from '../types'

const API_URL = API_BASE_URL
const DEFAULT_LIMIT = 50

// ═══════════════════════════════════════════════════════
// SOURCE CONFIG
// ═══════════════════════════════════════════════════════

const SOURCE_CONFIG: Record<
  ActivitySource,
  { label: string; color: string; icon: React.ReactNode }
> = {
  cashier: {
    label: 'Caja',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <FiDollarSign className="w-3.5 h-3.5" />,
  },
  groups: {
    label: 'Grupos',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <FiUsers className="w-3.5 h-3.5" />,
  },
  logbook: {
    label: 'Logbook',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: <FiBook className="w-3.5 h-3.5" />,
  },
  maintenance: {
    label: 'Mantenimiento',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    icon: <FiTool className="w-3.5 h-3.5" />,
  },
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  deleted: 'Eliminado',
  status_changed: 'Estado cambiado',
  payment_updated: 'Pago actualizado',
  read: 'Leido',
  unread: 'Marcado no leido',
  solve: 'Resuelto',
  reopen: 'Reabierto',
  adjustment: 'Ajuste',
  voucher_created: 'Vale creado',
  voucher_repaid: 'Vale devuelto',
  daily_closed: 'Cierre diario',
  daily_reopened: 'Reapertura diario',
  assigned: 'Asignado',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  restored: 'Restaurado',
  create: 'Creado',
  update: 'Actualizado',
  delete: 'Eliminado',
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function OverviewSection() {
  const [activity, setActivity] = useState<UnifiedActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<ActivitySource | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: DEFAULT_LIMIT.toString() })
      if (sourceFilter !== 'all') params.set('source', sourceFilter)
      if (dateFilter) params.set('date', dateFilter)

      const response = await apiClient.get(`${API_URL}/api/activity/recent?${params.toString()}`)
      const data = response.data || response || []
      // Ensure limit is applied
      setActivity(Array.isArray(data) ? data.slice(0, DEFAULT_LIMIT) : [])
      setLoaded(true)
    } catch (err: any) {
      setError(err.message || 'Error cargando actividad')
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, dateFilter])

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // Estado inicial - mostrar boton para cargar
  if (!loaded && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <FiClock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Actividad del Sistema
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Vista unificada de los últimos {DEFAULT_LIMIT} registros de actividad del sistema.
          </p>
        </div>
        <button
          onClick={fetchActivity}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Cargar Actividad
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-[#30363d]">
        <div className="flex items-center gap-2 flex-wrap">
          <FiFilter className="w-4 h-4 text-gray-400" />

          <DateFilter
            selectedDate={dateFilter}
            onDateChange={(date) => {
              setDateFilter(date)
              setLoaded(false)
            }}
            label="Fecha actividad"
          />

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as ActivitySource | 'all')
              setLoaded(false)
            }}
            className="text-sm border border-gray-300 dark:border-[#30363d] rounded-lg px-3 py-1.5 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las fuentes</option>
            <option value="logbook">Logbooks</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="groups">Grupos</option>
            <option value="cashier">Caja</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Activity List */}
      {!loading && !error && activity.length > 0 && (
        <div className="border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Fuente
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Accion
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Registro
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
              {activity.map((item) => {
                const sourceConfig = SOURCE_CONFIG[item.source]
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-[#161b22] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                          sourceConfig.color
                        )}
                      >
                        {sourceConfig.icon}
                        {sourceConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {ACTION_LABELS[item.action] || item.action}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FiUser className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">{item.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      #{item.record_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(item.timestamp)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && activity.length === 0 && loaded && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FiClock className="w-10 h-10 mb-2" />
          <p>No hay actividad registrada</p>
        </div>
      )}

      {/* Count */}
      {!loading && activity.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          Mostrando {activity.length} registros (máx. {DEFAULT_LIMIT})
        </div>
      )}
    </div>
  )
}
