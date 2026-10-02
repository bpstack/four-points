// app/dashboard/blacklist/page.tsx
'use client'

/**
 * Página principal del módulo Blacklist
 * - Client Component para panel lateral
 * - Layout 2 columnas (tabla + stats sidebar)
 * - Tabla con paginación
 * - Búsqueda y filtros
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  FiPlus,
  FiSearch,
  FiAlertTriangle,
  FiEye,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi'
import { IoWarning } from 'react-icons/io5'
import { Badge } from '@/app/ui/components'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import { CreateBlacklistPanel } from '@/app/components/blacklist/panels/CreateBlacklistPanel'
import type { BlacklistEntry, BlacklistFilters } from '@/app/lib/blacklist/types'
import { formatDate, truncateText } from '@/app/lib/blacklist/blacklistUtils'
import { Highlight } from '@/app/components/blacklist/ui/Highlight'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'

type SeverityFilter = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'all'
type StatusFilter = 'ACTIVE' | 'DELETED' | 'all'

export default function BlacklistPage() {
  const t = useTranslations('blacklist')
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get('panel')

  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE')
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_entries: 0,
    per_page: 50,
    has_next: false,
    has_prev: false,
  })

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true)
      const filters: BlacklistFilters = {
        page: 1,
        limit: 50,
        q: searchTerm || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }
      const response = await blacklistApi.getAll(filters)
      setEntries(response.entries)
      setPagination(response.pagination)
    } catch (error) {
      console.error('Error loading blacklist entries:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, severityFilter, statusFilter])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const handleCreateEntry = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'create-blacklist')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('panel')
    router.push(`?${params.toString()}`, { scroll: false })
    loadEntries()
  }

  const handleViewEntry = (id: string) => {
    router.push(`/dashboard/blacklist/${id}`)
  }

  // Stats calculations
  const _totalEntries = entries.length
  const criticalCount = entries.filter((e) => e.severity === 'CRITICAL').length
  const highCount = entries.filter((e) => e.severity === 'HIGH').length
  const activeCount = entries.filter((e) => e.status === 'ACTIVE').length

  const getSeverityConfig = (severity: BlacklistEntry['severity']) => {
    const configs = {
      LOW: {
        color: 'bg-surface-sunken text-fg-muted border border-border',
        label: t('severity.low'),
      },
      MEDIUM: {
        color:
          'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        label: t('severity.medium'),
      },
      HIGH: {
        color:
          'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        label: t('severity.high'),
      },
      CRITICAL: {
        color:
          'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        label: t('severity.critical'),
      },
    }
    return configs[severity]
  }

  return (
    <>
      <div className="min-h-screen bg-bg p-4 md:p-6">
        <div className="max-w-[1400px] space-y-5">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-fg">{t('page.title')}</h1>
                <p className="text-xs sm:text-sm text-fg-muted mt-0.5">{t('page.subtitle')}</p>
              </div>
              <button
                onClick={handleCreateEntry}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                <FiPlus className="w-3.5 h-3.5" />
                {t('page.newEntry')}
              </button>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-5">
            {/* Left Column - Main Content */}
            <div className="min-[1400px]:col-span-3 space-y-4">
              {/* Stats - Mobile/Tablet (hidden on >= 1400px) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-[1400px]:hidden">
                <div className="bg-surface rounded-md border border-border p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.totalEntries')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {pagination.total_entries}
                      </p>
                    </div>
                    <FiShield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>

                <div className="bg-surface rounded-md border border-border p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.critical')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{criticalCount}</p>
                    </div>
                    <FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
                  </div>
                </div>

                <div className="bg-surface rounded-md border border-border p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.highRisk')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{highCount}</p>
                    </div>
                    <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 dark:text-orange-400" />
                  </div>
                </div>

                <div className="bg-surface rounded-md border border-border p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.active')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{activeCount}</p>
                    </div>
                    <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle" />
                  <input
                    type="text"
                    placeholder={t('filters.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-border bg-surface text-fg rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent"
                  />
                </div>
                <SelectDropdown<SeverityFilter>
                  value={severityFilter}
                  onChange={setSeverityFilter}
                  options={[
                    { value: 'all', label: t('filters.severity') },
                    { value: 'CRITICAL', label: t('severity.critical') },
                    { value: 'HIGH', label: t('severity.high') },
                    { value: 'MEDIUM', label: t('severity.medium') },
                    { value: 'LOW', label: t('severity.low') },
                  ]}
                  className="w-full sm:w-auto sm:min-w-[140px]"
                />
                <SelectDropdown<StatusFilter>
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'ACTIVE', label: t('filters.active') },
                    { value: 'DELETED', label: t('filters.deleted') },
                    { value: 'all', label: t('filters.allStatuses') },
                  ]}
                  className="w-full sm:w-auto sm:min-w-[120px]"
                />
              </div>

              {/* Table - Desktop */}
              <div className="hidden md:block bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.guest')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.document')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.dates')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.severity')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.status')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.registeredBy')}
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        Array.from({ length: 7 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-3 py-2.5">
                              <div className="h-3 bg-surface-hover rounded w-36 mb-1.5" />
                              <div className="h-2.5 bg-surface-hover rounded w-24" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="h-3 bg-surface-hover rounded w-28 mb-1.5" />
                              <div className="h-2.5 bg-surface-hover rounded w-16" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="h-3 bg-surface-hover rounded w-20 mb-1.5" />
                              <div className="h-2.5 bg-surface-hover rounded w-20" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="h-5 bg-surface-hover rounded-full w-16" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="h-5 bg-surface-hover rounded-full w-14" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="h-3 bg-surface-hover rounded w-20 mb-1.5" />
                              <div className="h-2.5 bg-surface-hover rounded w-16" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="h-7 bg-surface-hover rounded w-7 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : entries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-xs text-fg-subtle">
                            {searchTerm ? t('table.noResultsSearch') : t('table.noEntries')}
                          </td>
                        </tr>
                      ) : (
                        entries.map((entry) => {
                          const severityConfig = getSeverityConfig(entry.severity)
                          return (
                            <tr
                              key={entry.id}
                              onClick={() => handleViewEntry(entry.id)}
                              className="hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {entry.severity === 'CRITICAL' && (
                                    <IoWarning className="text-red-500 flex-shrink-0" size={14} />
                                  )}
                                  <div>
                                    <div className="text-xs font-medium text-fg">
                                      <Highlight text={entry.guest_name} search={searchTerm} />
                                    </div>
                                    <div className="text-[10px] text-fg-subtle mt-0.5">
                                      {truncateText(entry.reason, 40)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div>
                                  <div className="text-xs text-fg font-mono">
                                    <Highlight text={entry.document_number} search={searchTerm} />
                                  </div>
                                  <div className="text-[10px] text-fg-subtle mt-0.5">
                                    {entry.document_type}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-fg whitespace-nowrap">
                                <div className="text-xs">{formatDate(entry.check_in_date)}</div>
                                <div className="text-[10px] text-fg-subtle">
                                  → {formatDate(entry.check_out_date)}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${severityConfig.color}`}
                                >
                                  {severityConfig.label}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <Badge
                                  tone={entry.status === 'ACTIVE' ? 'success' : 'neutral'}
                                  size="sm"
                                >
                                  {entry.status === 'ACTIVE'
                                    ? t('status.active')
                                    : t('status.deleted')}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-fg">
                                <div className="text-xs">
                                  {entry.created_by_username || t('detail.unknown')}
                                </div>
                                <div className="text-[10px] text-fg-subtle">
                                  {formatDate(entry.created_at)}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewEntry(entry.id)
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-accent hover:bg-surface-hover rounded transition-colors"
                                >
                                  <FiEye className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards - Mobile */}
              <div className="md:hidden space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-surface rounded-md border border-border p-3 animate-pulse space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 bg-surface-hover rounded w-40" />
                          <div className="h-2.5 bg-surface-hover rounded w-28" />
                        </div>
                        <div className="h-6 w-6 bg-surface-hover rounded ml-2 flex-shrink-0" />
                      </div>
                      <div className="h-2.5 bg-surface-hover rounded w-full" />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <div className="h-5 bg-surface-hover rounded-full w-16" />
                          <div className="h-5 bg-surface-hover rounded-full w-14" />
                        </div>
                        <div className="h-2.5 bg-surface-hover rounded w-20" />
                      </div>
                    </div>
                  ))
                ) : entries.length === 0 ? (
                  <div className="bg-surface rounded-md border border-border p-6 text-center">
                    <p className="text-xs text-fg-subtle">
                      {searchTerm ? t('table.noResultsSearch') : t('table.noEntries')}
                    </p>
                  </div>
                ) : (
                  entries.map((entry) => {
                    const severityConfig = getSeverityConfig(entry.severity)
                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleViewEntry(entry.id)}
                        className="bg-surface rounded-md border border-border p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {entry.severity === 'CRITICAL' && (
                                <IoWarning className="text-red-500 flex-shrink-0" size={14} />
                              )}
                              <h3 className="font-semibold text-xs text-fg truncate">
                                <Highlight text={entry.guest_name} search={searchTerm} />
                              </h3>
                            </div>
                            <p className="text-[10px] text-fg-muted mt-0.5 font-mono">
                              <Highlight text={entry.document_number} search={searchTerm} />
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewEntry(entry.id)
                            }}
                            className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-fg-muted hover:text-accent hover:bg-surface-hover rounded transition-colors"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[10px] text-fg line-clamp-2 mb-2">{entry.reason}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${severityConfig.color}`}
                            >
                              {severityConfig.label}
                            </span>
                            <Badge
                              tone={entry.status === 'ACTIVE' ? 'success' : 'neutral'}
                              size="sm"
                            >
                              {entry.status === 'ACTIVE' ? t('status.active') : t('status.deleted')}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-fg-subtle">
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            {/* End Main Content */}

            {/* Right Column - Stats Sidebar (visible on >= 1400px) */}
            <div className="hidden min-[1400px]:block space-y-4">
              <div className="sticky top-4 space-y-3">
                <h3 className="text-sm font-semibold text-fg mb-3">{t('stats.summary')}</h3>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.totalEntries')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{pagination.total_entries}</p>
                    </div>
                    <div className="p-2 bg-info/10 rounded-lg">
                      <FiShield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.critical')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{criticalCount}</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.highRisk')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{highCount}</p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <FiAlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.active')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{activeCount}</p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CreateBlacklistPanel */}
      <CreateBlacklistPanel isOpen={panel === 'create-blacklist'} onClose={handleClosePanel} />
    </>
  )
}
