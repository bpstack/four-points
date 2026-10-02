// app/components/profile/reports/sections/OverviewSection.tsx

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import { FiClock, FiUser, FiFilter, FiBook, FiTool, FiUsers, FiDollarSign } from 'react-icons/fi'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import DateRangePicker, { getDefaultDateRange, type DateRange } from '../DateRangePicker'
import { ReportError, ReportTableSkeleton, formatReportDateTime } from '../utils'
import type { UnifiedActivity, ActivitySource } from '../types'

const API_URL = API_BASE_URL
const DEFAULT_LIMIT = 50

const SOURCE_COLORS: Record<ActivitySource, string> = {
  cashier: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  groups: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  logbook: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const SOURCE_ICONS: Record<ActivitySource, React.ReactNode> = {
  cashier: <FiDollarSign className="w-3.5 h-3.5" />,
  groups: <FiUsers className="w-3.5 h-3.5" />,
  logbook: <FiBook className="w-3.5 h-3.5" />,
  maintenance: <FiTool className="w-3.5 h-3.5" />,
}

export default function OverviewSection() {
  const t = useTranslations('profile.reports.overview')
  const [activity, setActivity] = useState<UnifiedActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<ActivitySource | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const SOURCE_LABELS = useMemo(
    () => ({
      cashier: t('sources.cashier'),
      groups: t('sources.groups'),
      logbook: t('sources.logbook'),
      maintenance: t('sources.maintenance'),
    }),
    [t]
  )

  const ACTION_LABELS = useMemo(
    () => ({
      created: t('actions.created'),
      updated: t('actions.updated'),
      deleted: t('actions.deleted'),
      status_changed: t('actions.statusChanged'),
      payment_updated: t('actions.paymentUpdated'),
      read: t('actions.read'),
      unread: t('actions.unread'),
      solve: t('actions.solve'),
      reopen: t('actions.reopen'),
      adjustment: t('actions.adjustment'),
      voucher_created: t('actions.voucherCreated'),
      voucher_repaid: t('actions.voucherRepaid'),
      daily_closed: t('actions.dailyClosed'),
      daily_reopened: t('actions.dailyReopened'),
      assigned: t('actions.assigned'),
      resolved: t('actions.resolved'),
      closed: t('actions.closed'),
      restored: t('actions.restored'),
      create: t('actions.create'),
      update: t('actions.update'),
      delete: t('actions.delete'),
    }),
    [t]
  )

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: DEFAULT_LIMIT.toString() })
      params.set('date_from', dateRange.from)
      params.set('date_to', dateRange.to)
      if (sourceFilter !== 'all') params.set('source', sourceFilter)

      const response = await apiClient.get<{ data?: UnifiedActivity[] } | UnifiedActivity[]>(
        `${API_URL}/api/activity/recent?${params.toString()}`
      )
      const data = (response as { data?: UnifiedActivity[] }).data || response || []
      setActivity(Array.isArray(data) ? data.slice(0, DEFAULT_LIMIT) : [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [dateRange.from, dateRange.to, sourceFilter, t])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-wrap">
        <FiFilter className="w-4 h-4 text-gray-400 flex-shrink-0" />

        <DateRangePicker value={dateRange} onChange={setDateRange} />

        <SelectDropdown<ActivitySource | 'all'>
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[
            { value: 'all', label: t('sources.all') },
            { value: 'logbook', label: SOURCE_LABELS.logbook },
            { value: 'maintenance', label: SOURCE_LABELS.maintenance },
            { value: 'groups', label: SOURCE_LABELS.groups },
            { value: 'cashier', label: SOURCE_LABELS.cashier },
          ]}
          className="w-44"
        />
      </div>

      {loading && <ReportTableSkeleton cols={5} rows={8} />}
      {!loading && error && <ReportError message={error} />}

      {/* Activity table */}
      {!loading && !error && activity.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  {t('table.source')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  {t('table.action')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  {t('table.user')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  {t('table.record')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  {t('table.date')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activity.map((item) => (
                <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                        SOURCE_COLORS[item.source]
                      )}
                    >
                      {SOURCE_ICONS[item.source]}
                      {SOURCE_LABELS[item.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-fg">
                    {ACTION_LABELS[item.action as keyof typeof ACTION_LABELS] || item.action}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-fg">{item.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-subtle font-mono text-xs">
                    {item.record_id ? `#${item.record_id}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-fg-subtle text-xs">
                    {formatReportDateTime(item.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && activity.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiClock className="w-10 h-10 mb-2" />
          <p>{t('noActivity')}</p>
        </div>
      )}

      {/* Count */}
      {!loading && activity.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: activity.length, max: DEFAULT_LIMIT })}
        </div>
      )}
    </div>
  )
}
