'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'
import { cn } from '@/app/lib/helpers/utils'
import {
  FiCheckSquare,
  FiCalendar,
  FiUser,
  FiClock,
} from 'react-icons/fi'
import DateRangePicker, { getDefaultDateRange, type DateRange } from '../DateRangePicker'
import { ReportError } from '../utils'

interface ChecklistStep {
  step_id: string
  done: boolean
  done_by_username: string | null
  done_at: string | null
}

interface ChecklistRunEntry {
  run: {
    id: number
    hotel_date: string
    shift: 'morning' | 'afternoon' | 'night' | null
    reset_at: string
    reset_by_user_id: string | null
    reset_reason: 'cron' | 'manual' | null
  }
  steps: ChecklistStep[]
}

const CHECKLISTS = [
  { id: 'cl-morning-shift', labelKey: 'cl-morning-shift' },
  { id: 'cl-afternoon-shift', labelKey: 'cl-afternoon-shift' },
  { id: 'cl-night-audit', labelKey: 'cl-night-audit' },
] as const

const DEFAULT_LIMIT = 50

function formatHotelDate(isoString: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoString))
}

function getCompletedByNames(steps: ChecklistStep[]): string {
  const names = [
    ...new Set(steps.filter((s) => s.done && s.done_by_username).map((s) => s.done_by_username!)),
  ]
  return names.join(', ') || '—'
}

function TableSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden animate-pulse">
      <div className="bg-surface-sunken px-4 py-3 flex gap-8">
        {[80, 100, 120, 100].map((w, i) => (
          <div key={i} className="h-3 bg-border rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-t border-border flex gap-8 items-center">
          <div className="h-3 w-20 bg-surface-hover rounded" />
          <div className="h-5 w-16 bg-surface-hover rounded-full" />
          <div className="h-3 w-24 bg-surface-hover rounded" />
          <div className="h-5 w-20 bg-surface-hover rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function ChecklistSection() {
  const t = useTranslations('profile.reports.checklist')

  const [selectedId, setSelectedId] = useState<string>(CHECKLISTS[0].id)
  const [data, setData] = useState<ChecklistRunEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: DEFAULT_LIMIT.toString(),
        date_from: dateRange.from,
        date_to: dateRange.to,
      })
      const response = await apiClient.get(
        `${API_BASE_URL}/api/checklists/${selectedId}/history?${params.toString()}`
      )
      setData(response as ChecklistRunEntry[])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [selectedId, dateRange.from, dateRange.to, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4">
      {/* Checklist selector + date range */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-1">
          {CHECKLISTS.map((cl) => (
            <button
              key={cl.id}
              onClick={() => setSelectedId(cl.id)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                selectedId === cl.id
                  ? 'bg-surface text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              )}
            >
              {t(`checklists.${cl.labelKey}`)}
            </button>
          ))}
        </div>

        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Loading skeleton */}
      {loading && <TableSkeleton />}

      {!loading && error && <ReportError message={error} />}

      {/* Table */}
      {!loading && !error && data.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  <span className="flex items-center gap-1.5">
                    <FiCalendar className="w-3.5 h-3.5" />
                    {t('table.date')}
                  </span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-fg-subtle">
                  {t('table.stepsCompleted')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  <span className="flex items-center gap-1.5">
                    <FiUser className="w-3.5 h-3.5" />
                    {t('table.completedBy')}
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">
                  <span className="flex items-center gap-1.5">
                    <FiClock className="w-3.5 h-3.5" />
                    {t('table.closedBy')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map(({ run, steps }) => {
                const doneCount = steps.filter((s) => s.done).length
                const completedBy = getCompletedByNames(steps)
                const closedLabel =
                  run.reset_reason === 'cron' ? t('closedBySystem') : t('closedManually')

                return (
                  <tr key={run.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-fg font-medium">
                      {formatHotelDate(run.hotel_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          doneCount > 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-surface-hover text-fg-muted'
                        )}
                      >
                        {doneCount} {t('stepsUnit')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted text-xs">{completedBy}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          run.reset_reason === 'cron'
                            ? 'bg-surface-hover text-fg-muted'
                            : 'bg-accent/10 text-accent'
                        )}
                      >
                        {closedLabel}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiCheckSquare className="w-10 h-10 mb-2" />
          <p>{t('noHistory')}</p>
        </div>
      )}

      {/* Count */}
      {!loading && data.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: data.length, max: DEFAULT_LIMIT })}
        </div>
      )}
    </div>
  )
}
