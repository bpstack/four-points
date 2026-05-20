// app/components/profile/reports/sections/MaintenanceSection.tsx

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import {
  FiTool,
  FiLoader,
  FiFilter,
  FiUser,
  FiCalendar,
  FiMapPin,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiTrash2,
} from 'react-icons/fi'
import type { MaintenanceReport, MaintenanceHistoryEntry } from '../types'
import DateRangePicker, { getDefaultDateRange, type DateRange } from '../DateRangePicker'
import { Checkbox } from '@/app/ui/components'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import { ReportError, ReportListSkeleton, formatReportDateTime } from '../utils'

const API_URL = API_BASE_URL
const DEFAULT_LIMIT = 50

const STATUS_COLORS: Record<string, string> = {
  reported: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-surface-hover text-fg-muted',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

export default function MaintenanceSection() {
  const t = useTranslations('profile.reports.maintenance')
  const [reports, setReports] = useState<MaintenanceReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)
  const [includeDeleted, setIncludeDeleted] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<MaintenanceHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const STATUS_LABELS = useMemo(
    () => ({
      reported: t('status.reported'),
      pending: t('status.pending'),
      in_progress: t('status.in_progress'),
      resolved: t('status.resolved'),
      closed: t('status.closed'),
    }),
    [t]
  )

  const PRIORITY_LABELS = useMemo(
    () => ({
      low: t('priority.low'),
      medium: t('priority.medium'),
      high: t('priority.high'),
      urgent: t('priority.urgent'),
    }),
    [t]
  )

  const fetchReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (includeDeleted) params.set('include_deleted', 'true')
      params.set('date_from', dateRange.from)
      params.set('date_to', dateRange.to)
      params.set('limit', DEFAULT_LIMIT.toString())

      const response = await apiClient.get<
        | { data?: { reports?: MaintenanceReport[] }; reports?: MaintenanceReport[] }
        | MaintenanceReport[]
      >(`${API_URL}/api/maintenance?${params.toString()}`)
      const data =
        (response as { data?: { reports?: MaintenanceReport[] } }).data?.reports ||
        (response as { reports?: MaintenanceReport[] }).reports ||
        response ||
        []
      setReports(Array.isArray(data) ? data.slice(0, DEFAULT_LIMIT) : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('noData'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, includeDeleted, dateRange.from, dateRange.to, t])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

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
          | { data?: { history?: MaintenanceHistoryEntry[] }; history?: MaintenanceHistoryEntry[] }
          | MaintenanceHistoryEntry[]
        >(`${API_URL}/api/maintenance/${reportId}/history`)
        const historyData =
          (response as { data?: { history?: MaintenanceHistoryEntry[] } }).data?.history ||
          (response as { history?: MaintenanceHistoryEntry[] }).history ||
          (Array.isArray(response) ? response : [])
        setHistory(historyData)
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    },
    [expandedId]
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-wrap">
        <FiFilter className="w-4 h-4 text-gray-400 flex-shrink-0" />

        <DateRangePicker value={dateRange} onChange={setDateRange} />

        <SelectDropdown<string>
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: t('status.all') },
            { value: 'reported', label: t('status.reported') },
            { value: 'pending', label: t('status.pending') },
            { value: 'in_progress', label: t('status.in_progress') },
            { value: 'resolved', label: t('status.resolved') },
            { value: 'closed', label: t('status.closed') },
          ]}
          className="w-40"
        />

        <SelectDropdown<string>
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'all', label: t('priority.all') },
            { value: 'low', label: t('priority.low') },
            { value: 'medium', label: t('priority.medium') },
            { value: 'high', label: t('priority.high') },
            { value: 'urgent', label: t('priority.urgent') },
          ]}
          className="w-36"
        />

        <Checkbox
          checked={includeDeleted}
          onCheckedChange={setIncludeDeleted}
          label={t('filters.deleted')}
          strikeOnCheck={false}
        />
      </div>

      {loading && <ReportListSkeleton />}
      {!loading && error && <ReportError message={error} />}

      {/* Reports list */}
      {!loading && !error && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((report) => {
            const statusColor = STATUS_COLORS[report.status] || STATUS_COLORS.pending
            const statusLabel =
              STATUS_LABELS[report.status as keyof typeof STATUS_LABELS] || STATUS_LABELS.pending
            const priorityColor = PRIORITY_COLORS[report.priority] || PRIORITY_COLORS.medium
            const priorityLabel =
              PRIORITY_LABELS[report.priority as keyof typeof PRIORITY_LABELS] ||
              PRIORITY_LABELS.medium
            const isExpanded = expandedId === report.id

            return (
              <div key={report.id} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor)}>
                          {statusLabel}
                        </span>
                        <span className={cn('text-xs font-medium', priorityColor)}>
                          {priorityLabel}
                        </span>
                        {report.deleted_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <FiTrash2 className="w-3 h-3" />
                            {t('filters.deleted')}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">
                          #{report.id.slice(0, 8)}
                        </span>
                      </div>

                      <h4 className="text-sm font-medium text-fg mb-1">{report.title}</h4>
                      {report.description && (
                        <p className="text-sm text-fg-muted mb-2 line-clamp-2">
                          {report.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-fg-subtle flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <FiUser className="w-3.5 h-3.5" />
                          {report.created_by_name || report.created_by}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiMapPin className="w-3.5 h-3.5" />
                          {report.location_type}
                          {report.room_number && ` - ${report.room_number}`}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="w-3.5 h-3.5" />
                          {formatReportDateTime(report.created_at)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => fetchHistory(report.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted hover:text-accent hover:bg-surface-hover rounded transition-colors flex-shrink-0"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      {t('table.date')}
                      {isExpanded ? (
                        <FiChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <FiChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* History panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-surface-sunken p-4">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <FiLoader className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : history.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-fg-subtle uppercase tracking-wide mb-3">
                          {t('table.date')}
                        </h4>
                        {history.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 text-xs bg-surface p-2 rounded border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-fg">{entry.action}</span>
                                {entry.field_changed && (
                                  <span className="text-accent">{entry.field_changed}</span>
                                )}
                                <span className="text-gray-400">—</span>
                                <span className="text-fg">{entry.user_name || entry.changed_by}</span>
                              </div>
                              {entry.old_value && (
                                <p className="text-gray-500 line-through truncate">{entry.old_value}</p>
                              )}
                              {entry.new_value && (
                                <p className="text-fg truncate">{entry.new_value}</p>
                              )}
                            </div>
                            <span className="text-gray-400 flex-shrink-0">
                              {formatReportDateTime(entry.changed_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">{t('noData')}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiTool className="w-10 h-10 mb-2" />
          <p>{t('noData')}</p>
        </div>
      )}

      {/* Count */}
      {!loading && reports.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: reports.length })}
        </div>
      )}
    </div>
  )
}
