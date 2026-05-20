// app/components/profile/reports/sections/GroupsSection.tsx

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import {
  FiUsers,
  FiLoader,
  FiFilter,
  FiCalendar,
  FiChevronDown,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiSearch,
} from 'react-icons/fi'
import type { GroupHistoryEntry } from '../types'
import DateRangePicker, { getDefaultDateRange, type DateRange } from '../DateRangePicker'
import { ReportError, ReportListSkeleton, formatReportDate, formatReportDateTime } from '../utils'

const API_URL = API_BASE_URL
const DEFAULT_LIMIT = 50

interface Group {
  id: number
  name: string
  agency: string | null
  arrival_date: string
  departure_date: string
  status: string
  total_amount: string
  currency: string
  notes: string | null
  created_by_username?: string
  created_at: string
}

interface DashboardOverview {
  groups: {
    total_groups: number
    confirmed_groups: string
    active_groups: string
    pending_groups: string
    total_revenue: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  tentative: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-surface-hover text-fg-muted',
}

export default function GroupsSection() {
  const t = useTranslations('profile.reports.groups')

  const STATUS_LABELS = useMemo(
    () => ({
      confirmed: t('status.confirmed'),
      pending: t('status.pending'),
      tentative: t('status.tentative'),
      cancelled: t('status.cancelled'),
      completed: t('status.completed'),
    }),
    [t]
  )

  const [groups, setGroups] = useState<Group[]>([])
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchId, setSearchId] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [history, setHistory] = useState<GroupHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Overview is aggregate data that never changes with date filters — fetch once on mount
  useEffect(() => {
    apiClient
      .get(`${API_URL}/api/groups/dashboard/overview`)
      .then((res) => {
        const r = res as { data?: DashboardOverview } | DashboardOverview
        setOverview((r as { data?: DashboardOverview }).data || (r as DashboardOverview))
      })
      .catch(() => {})
  }, [])

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', DEFAULT_LIMIT.toString())
      params.set('arrival_from', dateRange.from)
      params.set('arrival_to', dateRange.to)
      params.set('order', 'DESC')

      const groupsResponse = (await apiClient.get(`${API_URL}/api/groups?${params.toString()}`)) as
        | { data?: Group[] }
        | Group[]
      const data = (groupsResponse as { data?: Group[] }).data || []
      setGroups(Array.isArray(data) ? data.slice(0, DEFAULT_LIMIT) : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to, t])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const fetchHistory = useCallback(
    async (groupId: number) => {
      if (expandedId === groupId) {
        setExpandedId(null)
        return
      }
      setHistoryLoading(true)
      setExpandedId(groupId)
      try {
        const response = (await apiClient.get(`${API_URL}/api/groups/${groupId}/history`)) as
          | { data?: GroupHistoryEntry[] }
          | GroupHistoryEntry[]
        const data = (response as { data?: GroupHistoryEntry[] }).data || response
        setHistory(Array.isArray(data) ? data : [])
      } catch {
        setHistory([])
      } finally {
        setHistoryLoading(false)
      }
    },
    [expandedId]
  )

  const searchGroupById = useCallback(async () => {
    if (!searchId.trim()) return
    setLoading(true)
    setError(null)
    try {
      const response = (await apiClient.get(`${API_URL}/api/groups/${searchId}`)) as
        | { data?: Group }
        | Group
      const group = (response as { data?: Group }).data || (response as Group)
      if (group) setGroups([group])
    } catch {
      setError(t('notFound', { id: searchId }))
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [searchId, t])

  const handleClearSearch = () => {
    setSearchId('')
    fetchGroups()
  }

  return (
    <div className="space-y-4">
      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-4 gap-3 pb-4 border-b border-border">
          <div className="bg-surface-sunken rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-fg">{overview.groups.total_groups}</p>
            <p className="text-xs text-fg-subtle">{t('stats.total')}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {overview.groups.confirmed_groups}
            </p>
            <p className="text-xs text-fg-subtle">{t('stats.confirmed')}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {overview.groups.pending_groups}
            </p>
            <p className="text-xs text-fg-subtle">{t('stats.pending')}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {groups.length}
            </p>
            <p className="text-xs text-fg-subtle">{t('stats.shown')}</p>
          </div>
        </div>
      )}

      {/* Search & filters */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-wrap">
        <FiFilter className="w-4 h-4 text-gray-400 flex-shrink-0" />

        <DateRangePicker value={dateRange} onChange={setDateRange} />

        <div className="flex items-center gap-1">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchGroupById()}
            placeholder={t('searchId')}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-surface text-fg w-24 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={searchGroupById}
            disabled={!searchId.trim()}
            className="p-1.5 text-gray-500 hover:text-accent disabled:opacity-50 transition-colors"
          >
            <FiSearch className="w-4 h-4" />
          </button>
          {searchId && (
            <button
              onClick={handleClearSearch}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {t('viewAll')}
            </button>
          )}
        </div>
      </div>

      {loading && <ReportListSkeleton />}
      {!loading && error && <ReportError message={error} />}

      {/* Groups list */}
      {!loading && !error && groups.length > 0 && (
        <div className="space-y-2">
          {groups.map((group) => {
            const statusLabel =
              STATUS_LABELS[group.status as keyof typeof STATUS_LABELS] || STATUS_LABELS.confirmed
            const statusColor = STATUS_COLORS[group.status] || STATUS_COLORS.confirmed
            const isExpanded = expandedId === group.id

            return (
              <div key={group.id} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColor)}>
                          {statusLabel}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">#{group.id}</span>
                      </div>

                      <h4 className="text-sm font-medium text-fg mb-1">{group.name}</h4>
                      {group.agency && (
                        <p className="text-xs text-fg-subtle mb-2">{group.agency}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-fg-subtle flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <FiCalendar className="w-3.5 h-3.5" />
                          {formatReportDate(group.arrival_date)} — {formatReportDate(group.departure_date)}
                        </span>
                        {group.total_amount && (
                          <span className="inline-flex items-center gap-1">
                            <FiDollarSign className="w-3.5 h-3.5" />
                            {group.currency} {parseFloat(group.total_amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => fetchHistory(group.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted hover:text-accent hover:bg-surface-hover rounded transition-colors flex-shrink-0"
                    >
                      <FiClock className="w-3.5 h-3.5" />
                      {t('history.title')}
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
                          {t('history.changes')}
                        </h4>
                        {history.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 text-xs bg-surface p-2 rounded border border-border"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-fg">{entry.action}</span>
                                {entry.table_affected && (
                                  <span className="text-gray-400">({entry.table_affected})</span>
                                )}
                                {entry.field_changed && (
                                  <span className="text-accent">{entry.field_changed}</span>
                                )}
                                <span className="text-gray-400">{t('history.by')}</span>
                                <span className="text-fg">
                                  {entry.changed_by_username || entry.changed_by}
                                </span>
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
                      <p className="text-sm text-gray-500 text-center py-4">
                        {t('history.noHistory')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiUsers className="w-10 h-10 mb-2" />
          <p>{t('noData')}</p>
        </div>
      )}

      {/* Count */}
      {!loading && groups.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: groups.length })}
        </div>
      )}
    </div>
  )
}
