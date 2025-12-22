// app/components/profile/reports/sections/MaintenanceSection.tsx

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import {
  FiTool,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiFilter,
  FiUser,
  FiCalendar,
  FiMapPin,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiTrash2,
  FiAlertTriangle,
} from 'react-icons/fi'
import type { MaintenanceReport, MaintenanceHistoryEntry } from '../types'
import DateFilter from '../DateFilter'

const API_URL = API_BASE_URL

// Límite de registros por defecto
const DEFAULT_LIMIT = 50

// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  reported: {
    label: 'Reportado',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  in_progress: {
    label: 'En Progreso',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  resolved: {
    label: 'Resuelto',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  closed: {
    label: 'Cerrado',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  low: { label: 'Baja', color: 'text-gray-500', icon: null },
  medium: { label: 'Media', color: 'text-blue-500', icon: null },
  high: {
    label: 'Alta',
    color: 'text-orange-500',
    icon: <FiAlertTriangle className="w-3.5 h-3.5" />,
  },
  urgent: {
    label: 'Urgente',
    color: 'text-red-500',
    icon: <FiAlertCircle className="w-3.5 h-3.5" />,
  },
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function MaintenanceSection() {
  const [reports, setReports] = useState<MaintenanceReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // History expansion
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<MaintenanceHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (includeDeleted) params.set('include_deleted', 'true')
      if (dateFilter) params.set('date', dateFilter)
      params.set('limit', DEFAULT_LIMIT.toString())

      const response = await apiClient.get<
        | {
            data?: { reports?: MaintenanceReport[] }
            reports?: MaintenanceReport[]
          }
        | MaintenanceReport[]
      >(`${API_URL}/api/maintenance?${params.toString()}`)
      const data =
        (response as { data?: { reports?: MaintenanceReport[] } }).data?.reports ||
        (response as { reports?: MaintenanceReport[] }).reports ||
        response ||
        []
      // Limit to DEFAULT_LIMIT
      setReports(Array.isArray(data) ? data.slice(0, DEFAULT_LIMIT) : [])
      setLoaded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error cargando reportes de mantenimiento')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, includeDeleted, dateFilter])

  const fetchHistory = useCallback(
    async (reportId: string) => {
      if (expandedId === reportId) {
        setExpandedId(null)
        return
      }

      setHistoryLoading(true)
      setExpandedId(reportId)
      try {
        const response = await apiClient.get<
          | {
              data?: { history?: MaintenanceHistoryEntry[] }
              history?: MaintenanceHistoryEntry[]
            }
          | MaintenanceHistoryEntry[]
        >(`${API_URL}/api/maintenance/${reportId}/history`)
        const historyData =
          (response as { data?: { history?: MaintenanceHistoryEntry[] } }).data?.history ||
          (response as { history?: MaintenanceHistoryEntry[] }).history ||
          (Array.isArray(response) ? response : [])
        setHistory(historyData)
      } catch (err: unknown) {
        console.error('Error fetching history:', err)
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    },
    [expandedId]
  )

  const handleDateChange = (date: string | null) => {
    setDateFilter(date)
    setLoaded(false)
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  // Estado inicial
  if (!loaded && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <FiTool className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Reportes de Mantenimiento
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Consulta los últimos {DEFAULT_LIMIT} reportes o filtra por fecha.
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Cargar Reportes
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#30363d]">
        <div className="flex items-center gap-2 flex-wrap">
          <FiFilter className="w-4 h-4 text-gray-400" />

          {/* Date Filter */}
          <DateFilter
            selectedDate={dateFilter}
            onDateChange={handleDateChange}
            label="Fecha reporte"
          />

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setLoaded(false)
            }}
            className="text-sm border border-gray-300 dark:border-[#30363d] rounded-lg px-3 py-1.5 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
          >
            <option value="all">Todos estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_progress">En Progreso</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setLoaded(false)
            }}
            className="text-sm border border-gray-300 dark:border-[#30363d] rounded-lg px-3 py-1.5 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
          >
            <option value="all">Todas prioridades</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>

          {/* Include Deleted */}
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => {
                setIncludeDeleted(e.target.checked)
                setLoaded(false)
              }}
              className="rounded border-gray-300 dark:border-[#30363d]"
            />
            Eliminados
          </label>
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

      {/* Reports List */}
      {!loading && !error && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((report) => {
            const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending
            const priorityConfig = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.medium
            const isExpanded = expandedId === report.id

            return (
              <div
                key={report.id}
                className="border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden"
              >
                {/* Report Row */}
                <div className="bg-white dark:bg-[#0d1117] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            statusConfig.color
                          )}
                        >
                          {statusConfig.label}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-xs font-medium',
                            priorityConfig.color
                          )}
                        >
                          {priorityConfig.icon}
                          {priorityConfig.label}
                        </span>
                        {report.deleted_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <FiTrash2 className="w-3 h-3" />
                            Eliminado
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">
                          #{report.id.slice(0, 8)}
                        </span>
                      </div>

                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {report.title}
                      </h4>
                      {report.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {report.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <FiUser className="w-3.5 h-3.5" />
                          {report.created_by_name || report.created_by}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiMapPin className="w-3.5 h-3.5" />
                          {report.location_type}
                          {report.room_number && ` - Hab. ${report.room_number}`}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="w-3.5 h-3.5" />
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Expand History Button */}
                    <button
                      onClick={() => fetchHistory(report.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded transition-colors"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      Historial
                      {isExpanded ? (
                        <FiChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <FiChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* History Panel */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#161b22] p-4">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <FiLoader className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : history.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Historial de cambios
                        </h4>
                        {history.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 text-xs bg-white dark:bg-[#0d1117] p-2 rounded border border-gray-200 dark:border-[#30363d]"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {entry.action}
                                </span>
                                {entry.field_changed && (
                                  <span className="text-gray-400">({entry.field_changed})</span>
                                )}
                                <span className="text-gray-400">por</span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {entry.user_name || entry.changed_by}
                                </span>
                              </div>
                              {entry.old_value && (
                                <p className="text-gray-500 line-through truncate">
                                  {entry.old_value}
                                </p>
                              )}
                              {entry.new_value && (
                                <p className="text-gray-700 dark:text-gray-300 truncate">
                                  {entry.new_value}
                                </p>
                              )}
                            </div>
                            <span className="text-gray-400 flex-shrink-0">
                              {formatDate(entry.changed_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No hay historial disponible
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && reports.length === 0 && loaded && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FiTool className="w-10 h-10 mb-2" />
          <p>No hay reportes {dateFilter ? `para ${dateFilter}` : ''}</p>
        </div>
      )}

      {/* Count */}
      {!loading && reports.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          Mostrando {reports.length} reportes{' '}
          {dateFilter ? `del ${dateFilter}` : `(máx. ${DEFAULT_LIMIT})`}
        </div>
      )}
    </div>
  )
}
