// app/components/profile/reports/sections/LogbooksSection.tsx

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import {
  FiBook,
  FiLoader,
  FiFilter,
  FiUser,
  FiCalendar,
  FiCheckCircle,
  FiTrash2,
  FiChevronDown,
  FiChevronRight,
  FiClock,
} from 'react-icons/fi'
import type { LogbookEntry, LogbookHistoryEntry } from '../types'
import DateRangePicker, { getDefaultDateRange, type DateRange } from '../DateRangePicker'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import { ReportError, ReportListSkeleton, formatReportDateTime } from '../utils'

const API_URL = API_BASE_URL
const DEFAULT_LIMIT = 50

const PRIORITY_COLORS: Record<string, string> = {
  baja: 'bg-surface-hover text-fg-muted',
  media: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgente: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// Fields to omit from history diff (internal IDs, noise)
const IGNORED_DIFF_KEYS = new Set([
  'id',
  'logbook_id',
  'comment_id',
  'user_id',
  'author_id',
  'department_id',
  'updated_at',
  'created_at',
])

const FIELD_LABELS: Record<string, string> = {
  message: 'Mensaje',
  comment: 'Comentario',
  importance_level: 'Prioridad',
  is_solved: 'Estado',
  date: 'Fecha',
  solved_at: 'Resuelto el',
  solved_by: 'Resuelto por',
  deleted_at: 'Eliminado el',
}

function renderDiff(prev: unknown, next: unknown): React.ReactNode {
  if (prev == null && next == null) return null

  const toEntries = (val: unknown) => {
    if (val == null || typeof val !== 'object') return []
    return Object.entries(val as Record<string, unknown>).filter(([k]) => !IGNORED_DIFF_KEYS.has(k))
  }

  if (typeof prev === 'object' || typeof next === 'object') {
    const prevObj =
      prev != null && typeof prev === 'object' ? (prev as Record<string, unknown>) : {}
    const nextObj =
      next != null && typeof next === 'object' ? (next as Record<string, unknown>) : {}
    const allKeys = [
      ...new Set([...toEntries(prevObj).map(([k]) => k), ...toEntries(nextObj).map(([k]) => k)]),
    ]

    const changedKeys = allKeys.filter(
      (k) => JSON.stringify(prevObj[k]) !== JSON.stringify(nextObj[k])
    )

    if (changedKeys.length === 0) return null

    return (
      <div className="space-y-1 mt-1">
        {changedKeys.map((k) => (
          <div key={k} className="flex items-start gap-1.5 flex-wrap text-xs">
            <span className="text-fg-subtle font-medium shrink-0">{FIELD_LABELS[k] ?? k}:</span>
            {prevObj[k] != null && (
              <span className="line-through text-gray-400 break-all">{String(prevObj[k])}</span>
            )}
            {prevObj[k] != null && nextObj[k] != null && <span className="text-gray-400">→</span>}
            {nextObj[k] != null && <span className="text-fg break-all">{String(nextObj[k])}</span>}
          </div>
        ))}
      </div>
    )
  }

  // Plain strings
  return (
    <div className="space-y-0.5 mt-1 text-xs">
      {prev != null && <p className="line-through text-gray-400 break-all">{String(prev)}</p>}
      {next != null && <p className="text-fg break-all">{String(next)}</p>}
    </div>
  )
}

type ViewMode = 'all' | 'trashed'

export default function LogbooksSection() {
  const t = useTranslations('profile.reports.logbooks')
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [history, setHistory] = useState<LogbookHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const PRIORITY_LABELS = useMemo(
    () => ({
      baja: t('priority.low'),
      media: t('priority.medium'),
      alta: t('priority.high'),
      urgente: t('priority.urgent'),
    }),
    [t]
  )

  const fetchLogbooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', DEFAULT_LIMIT.toString())
      params.set('date_from', dateRange.from)
      params.set('date_to', dateRange.to)
      if (viewMode === 'trashed') params.set('include_trashed', 'true')
      if (priorityFilter !== 'all') params.set('importance_level', priorityFilter)

      const response = await apiClient.get<{ data?: LogbookEntry[] } | LogbookEntry[]>(
        `${API_URL}/api/logbooks/all?${params.toString()}`
      )
      const data = (response as { data?: LogbookEntry[] }).data || response || []
      setLogbooks(Array.isArray(data) ? data.slice(0, DEFAULT_LIMIT) : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('noData'))
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to, viewMode, priorityFilter, t])

  useEffect(() => {
    fetchLogbooks()
  }, [fetchLogbooks])

  const fetchHistory = useCallback(
    async (logbookId: number) => {
      if (expandedId === logbookId) {
        setExpandedId(null)
        return
      }
      setHistoryLoading(true)
      setExpandedId(logbookId)
      try {
        const response = await apiClient.get<{
          history?: LogbookHistoryEntry[]
          data?: { history?: LogbookHistoryEntry[] }
        }>(`${API_URL}/api/logbooks/${logbookId}/history`)
        setHistory(response.history || response.data?.history || [])
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
          value={viewMode}
          onChange={(v) => {
            setViewMode(v as ViewMode)
            if (v === 'trashed') setPriorityFilter('all')
          }}
          options={[
            { value: 'all', label: t('status.all') },
            { value: 'trashed', label: t('filters.deleted') },
          ]}
          className="w-32"
        />

        {viewMode === 'all' && (
          <SelectDropdown<string>
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'all', label: t('priority.all') },
              { value: 'baja', label: t('priority.low') },
              { value: 'media', label: t('priority.medium') },
              { value: 'alta', label: t('priority.high') },
              { value: 'urgente', label: t('priority.urgent') },
            ]}
            className="w-36"
          />
        )}
      </div>

      {loading && <ReportListSkeleton />}
      {!loading && error && <ReportError message={error} />}

      {/* Logbooks list */}
      {!loading && !error && logbooks.length > 0 && (
        <div className="space-y-2">
          {logbooks.map((logbook) => {
            const priorityColor = PRIORITY_COLORS[logbook.importance_level] || PRIORITY_COLORS.baja
            const priorityLabel =
              PRIORITY_LABELS[logbook.importance_level as keyof typeof PRIORITY_LABELS] ||
              PRIORITY_LABELS.baja
            const isExpanded = expandedId === logbook.id

            return (
              <div key={logbook.id} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            priorityColor
                          )}
                        >
                          {priorityLabel}
                        </span>
                        {!!logbook.is_solved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <FiCheckCircle className="w-3 h-3" />
                            {t('status.resolved')}
                          </span>
                        )}
                        {logbook.deleted_at && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            <FiTrash2 className="w-3 h-3" />
                            {t('status.deleted')}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">#{logbook.id}</span>
                      </div>

                      <p className="text-sm text-fg mb-2 line-clamp-2">{logbook.message}</p>

                      <div className="flex items-center gap-4 text-xs text-fg-subtle flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <FiUser className="w-3.5 h-3.5" />
                          {logbook.author_name || logbook.author_id}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="w-3.5 h-3.5" />
                          {formatReportDateTime(logbook.created_at)}
                        </span>
                        {logbook.department_name && (
                          <span className="text-gray-400">{logbook.department_name}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => fetchHistory(logbook.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted hover:text-accent hover:bg-surface-hover rounded transition-colors flex-shrink-0"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      {t('historyLabel') || 'Historial'}
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
                          {t('historyLabel') || 'Historial de cambios'}
                        </h4>
                        {history.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 text-xs bg-surface p-2 rounded border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="font-medium text-fg">{entry.action}</span>
                                <span className="text-gray-400">—</span>
                                <span className="text-fg">{entry.editor?.username || '-'}</span>
                              </div>
                              {renderDiff(entry.previousContent, entry.newContent)}
                            </div>
                            <span className="text-gray-400 flex-shrink-0 text-xs">
                              {formatReportDateTime(entry.createdAt)}
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
      {!loading && !error && logbooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiBook className="w-10 h-10 mb-2" />
          <p>{t('noData')}</p>
        </div>
      )}

      {/* Count */}
      {!loading && logbooks.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: logbooks.length })}
        </div>
      )}
    </div>
  )
}
