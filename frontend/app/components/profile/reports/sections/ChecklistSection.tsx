'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'
import { cn } from '@/app/lib/helpers/utils'
import {
  FiCheckSquare,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiCalendar,
  FiUser,
  FiClock,
} from 'react-icons/fi'

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════

const CHECKLISTS = [
  { id: 'cl-morning-shift', labelKey: 'cl-morning-shift' },
  { id: 'cl-afternoon-shift', labelKey: 'cl-afternoon-shift' },
  { id: 'cl-night-audit', labelKey: 'cl-night-audit' },
] as const

const DEFAULT_LIMIT = 30

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function ChecklistSection() {
  const t = useTranslations('profile.reports.checklist')

  const [selectedId, setSelectedId] = useState<string>(CHECKLISTS[0].id)
  const [data, setData] = useState<ChecklistRunEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get(
        `${API_BASE_URL}/api/checklists/${selectedId}/history?limit=${DEFAULT_LIMIT}`
      )
      setData(response as ChecklistRunEntry[])
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [selectedId, t])

  const handleChecklistChange = useCallback((id: string) => {
    setSelectedId(id)
    setLoaded(false)
    setData([])
    setError(null)
  }, [])

  // Estado inicial
  if (!loaded && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <FiCheckSquare className="w-12 h-12 text-fg-subtle mx-auto mb-3" />
          <h3 className="text-lg font-medium text-fg mb-1">{t('title')}</h3>
          <p className="text-sm text-fg-subtle max-w-md">{t('description')}</p>
        </div>
        {/* Checklist selector */}
        <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-1">
          {CHECKLISTS.map((cl) => (
            <button
              key={cl.id}
              onClick={() => handleChecklistChange(cl.id)}
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
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          {t('loadHistory')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector + refresh */}
      <div className="flex items-center gap-4 pb-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-1">
          {CHECKLISTS.map((cl) => (
            <button
              key={cl.id}
              onClick={() => handleChecklistChange(cl.id)}
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
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg bg-surface border border-border hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-40"
        >
          <FiRefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          {t('reload')}
        </button>
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
            <tbody className="divide-y divide-gray-200 dark:divide-border">
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
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
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
      {!loading && !error && data.length === 0 && loaded && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
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
