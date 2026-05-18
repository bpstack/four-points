// app/components/dashboard/ImportantLogbooksCard.tsx
'use client'

import React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  FiAlertTriangle,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowRight,
  FiClock,
  FiCheckCircle,
} from 'react-icons/fi'
import { Card, Button, Badge } from '@/app/ui/components'

export interface LogbookEntryDisplay {
  id: number
  timestamp: string
  author_name: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'resolved'
  department_id: number
}

interface ImportantLogbooksCardProps {
  entries: LogbookEntryDisplay[]
  loading: boolean
  selectedPeriod: 'today' | 'week' | 'month'
  onRefresh: () => void
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'border-l-4 border-l-red-500 dark:border-l-red-400 bg-red-50 dark:bg-red-900/10'
    case 'high':
      return 'border-l-4 border-l-yellow-500 dark:border-l-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
    default:
      return 'border-l-4 border-l-[#d0d7de] dark:border-l-[#30363d]'
  }
}


export function ImportantLogbooksCard({
  entries,
  loading,
  selectedPeriod,
  onRefresh,
}: ImportantLogbooksCardProps) {
  const t = useTranslations('dashboard.importantLogbooks')
  const locale = useLocale()
  const localeCode = locale === 'es' ? 'es-ES' : 'en-US'

  const periodLabel = t(`emptyMessage.${selectedPeriod}`)

  const getPeriodTitle = () => {
    const labels: Record<string, string> = {
      today: locale === 'es' ? 'Hoy' : 'Today',
      week: locale === 'es' ? 'Esta Semana' : 'This Week',
      month: locale === 'es' ? 'Este Mes' : 'This Month',
    }
    return labels[selectedPeriod]
  }

  return (
    <Card padding="none" className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-danger/10 rounded-lg">
            <FiAlertTriangle className="w-4 h-4 text-danger" />
          </div>
          <h2 className="text-sm font-bold text-fg">{t('title', { period: getPeriodTitle() })}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            iconOnly
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title={t('refresh')}
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            as="a"
            href="/dashboard/logbooks"
            className="text-accent hover:text-accent"
          >
            {t('viewAll')} <FiArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Entry Counter */}
      {!loading && entries.length > 0 && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-info/10 rounded-lg border border-blue-200 dark:border-blue-800">
          <FiAlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            <strong className="font-bold">{entries.length}</strong>{' '}
            {entries.length !== 1
              ? t('entriesCountPlural', { count: '' }).trim()
              : t('entriesCount', { count: '' }).trim()}{' '}
            {periodLabel}
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse p-4 bg-surface-hover rounded-lg border border-border h-28"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-3">
            <FiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-fg-muted">
            {t('noItems', { period: periodLabel })}
          </p>
        </div>
      ) : (
        <div
          className={`space-y-3 ${entries.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#d0d7de] dark:scrollbar-thumb-[#30363d] scrollbar-track-transparent' : ''}`}
        >
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-lg ${getPriorityColor(entry.priority)} border border-border hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiClock className="w-3.5 h-3.5 text-fg-muted" />
                  <span className="text-xs font-bold text-fg">
                    {new Date(entry.timestamp).toLocaleDateString(localeCode, {
                      day: '2-digit',
                      month: '2-digit',
                    })}{' '}
                    {new Date(entry.timestamp).toLocaleTimeString(localeCode, {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={entry.status === 'resolved' ? 'success' : 'warning'}>
                    {t(`status.${entry.status}`)}
                  </Badge>
                  <Badge
                    tone={
                      entry.priority === 'critical'
                        ? 'danger'
                        : entry.priority === 'high'
                          ? 'warning'
                          : 'neutral'
                    }
                    dot
                  >
                    {t(`priority.${entry.priority}`)}
                  </Badge>
                </div>
              </div>
              <p className="text-[11px] text-fg-muted mb-2 font-medium">
                {t('by', { author: entry.author_name })}
              </p>
              <p className="text-xs text-fg leading-relaxed">
                {entry.description.length > 400
                  ? `${entry.description.substring(0, 400)}...`
                  : entry.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
