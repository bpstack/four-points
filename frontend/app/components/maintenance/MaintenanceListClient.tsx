// app/components/maintenance/MaintenanceListClient.tsx

'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { MaintenanceReport, ReportFilters } from '@/app/lib/maintenance/maintenance'
import type { MaintenanceListResponse } from '@/app/lib/maintenance/maintenanceApi'
import { useMaintenanceList, type MaintenanceMessages } from './hooks/useMaintenanceList'
import { CreateReportPanel } from './panels/CreateReportPanel'
import DatePickerInput from '@/app/ui/calendar/DatePickerInput'
import {
  FiPlus,
  FiSearch,
  FiAlertCircle,
  FiTool,
  FiCheckCircle,
  FiClock,
  FiX,
  FiRefreshCw,
} from 'react-icons/fi'
import { Card, Badge, Button } from '@/app/ui/components'

interface MaintenanceListClientProps {
  initialReports: MaintenanceReport[]
  initialPagination?: MaintenanceListResponse['pagination']
}

export function MaintenanceListClient({
  initialReports = [],
  initialPagination,
}: MaintenanceListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get('panel')
  const t = useTranslations('maintenance')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // Memoize messages for the hook
  const messages: MaintenanceMessages = useMemo(
    () => ({
      operationError: tCommon('errors.operationError'),
      reportCreated: t('panels.create.toast.reportCreated'),
      reportUpdated: t('panels.edit.toast.reportUpdated'),
      statusUpdated: t('detail.toast.statusUpdated'),
      priorityUpdated: t('detail.toast.priorityUpdated'),
      reportDeleted: t('detail.toast.reportDeleted'),
      reportRestored: t('panels.edit.toast.reportUpdated'), // Using same as updated for restore
    }),
    [t, tCommon]
  )

  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<ReportFilters>({
    status: (searchParams.get('status') as ReportFilters['status']) || undefined,
    priority: (searchParams.get('priority') as ReportFilters['priority']) || undefined,
    location_type:
      (searchParams.get('location_type') as ReportFilters['location_type']) || undefined,
    search: searchParams.get('search') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  })

  // Ref para siempre tener los filtros actuales (evita stale closures)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  // Actualizar URL y estado con filtros (fuente única de verdad)
  const updateFiltersAndUrl = useCallback(
    (newFilters: ReportFilters) => {
      setFilters(newFilters)
      filtersRef.current = newFilters
      setCurrentPage(1)

      // Build URL params from filters
      const params = new URLSearchParams()
      if (newFilters.status) params.set('status', newFilters.status)
      if (newFilters.priority) params.set('priority', newFilters.priority)
      if (newFilters.location_type) params.set('location_type', newFilters.location_type)
      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.date_from) params.set('date_from', newFilters.date_from)
      if (newFilters.date_to) params.set('date_to', newFilters.date_to)

      const queryString = params.toString()
      router.push(queryString ? `?${queryString}` : '/dashboard/maintenance', { scroll: false })
    },
    [router]
  )

  // Search input controlado manualmente (Enter o botón)
  const [searchInput, setSearchInput] = useState(filters.search || '')

  const executeSearch = useCallback(() => {
    const currentFilters = filtersRef.current
    const cleanValue = searchInput.trim() !== '' ? searchInput.trim() : undefined
    updateFiltersAndUrl({ ...currentFilters, search: cleanValue })
  }, [searchInput, updateFiltersAndUrl])

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        executeSearch()
      }
    },
    [executeSearch]
  )

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    const currentFilters = filtersRef.current
    updateFiltersAndUrl({ ...currentFilters, search: undefined })
  }, [updateFiltersAndUrl])

  // React Query hook - clean filters to only include defined values
  const cleanFilters = useMemo(() => {
    const cleaned: ReportFilters = {}
    if (filters.status) cleaned.status = filters.status
    if (filters.priority) cleaned.priority = filters.priority
    if (filters.location_type) cleaned.location_type = filters.location_type
    if (filters.search) cleaned.search = filters.search
    if (filters.date_from) cleaned.date_from = filters.date_from
    if (filters.date_to) cleaned.date_to = filters.date_to
    return cleaned
  }, [filters])

  const { reports, pagination, isLoading, isFetching, refetch } = useMaintenanceList({
    filters: cleanFilters,
    page: currentPage,
    limit: 100,
    initialData: initialPagination
      ? { reports: initialReports, pagination: initialPagination }
      : undefined,
    messages,
  })

  const loading = isLoading || isFetching

  // Cambiar un filtro individual - usa filtersRef para evitar stale closures
  const handleFilterChange = useCallback(
    (key: keyof ReportFilters, value: string | undefined) => {
      const currentFilters = filtersRef.current
      const newFilters = { ...currentFilters, [key]: value }
      updateFiltersAndUrl(newFilters)
    },
    [updateFiltersAndUrl]
  )

  // Cambiar rango de fechas
  const handleDateRangeChange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      const currentFilters = filtersRef.current
      updateFiltersAndUrl({
        ...currentFilters,
        date_from: from || undefined,
        date_to: to || undefined,
      })
    },
    [updateFiltersAndUrl]
  )

  // Limpiar todos los filtros y recargar datos
  const handleRefresh = useCallback(() => {
    setSearchInput('')
    setFilters({})
    filtersRef.current = {}
    setCurrentPage(1)
    router.push('/dashboard/maintenance', { scroll: false })
  }, [router])

  const handleCreateReport = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'create-report')
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const handleClosePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('panel')
    router.push(`?${params.toString()}`, { scroll: false })
    refetch() // Refetch via React Query
  }, [router, searchParams, refetch])

  const handleViewReport = useCallback(
    (reportId: string) => {
      router.push(`/dashboard/maintenance/${reportId}`)
    },
    [router]
  )

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage)
  }, [])

  const getStatusConfig = (status: MaintenanceReport['status']) => {
    const configs: Record<
      string,
      { tone: 'warning' | 'info' | 'accent' | 'success' | 'neutral' | 'danger'; label: string }
    > = {
      reported: { tone: 'warning', label: t('status.reported') },
      assigned: { tone: 'info', label: t('status.assigned') },
      in_progress: { tone: 'accent', label: t('status.inProgress') },
      waiting: { tone: 'warning', label: t('status.waiting') },
      completed: { tone: 'success', label: t('status.completed') },
      closed: { tone: 'neutral', label: t('status.closed') },
      canceled: { tone: 'danger', label: t('status.canceled') },
    }
    return configs[status] ?? { tone: 'neutral' as const, label: status }
  }

  const getPriorityConfig = (priority: MaintenanceReport['priority']) => {
    const configs: Record<
      string,
      { tone: 'neutral' | 'info' | 'warning' | 'danger'; label: string }
    > = {
      low: { tone: 'neutral', label: t('priority.low') },
      medium: { tone: 'info', label: t('priority.medium') },
      high: { tone: 'warning', label: t('priority.high') },
      urgent: { tone: 'danger', label: t('priority.urgent') },
    }
    return configs[priority] ?? { tone: 'neutral' as const, label: priority }
  }

  const getLocationTypeLabel = (type: MaintenanceReport['location_type']) => {
    const labels = {
      room: t('locationType.room'),
      common_area: t('locationType.commonArea'),
      exterior: t('locationType.exterior'),
      facilities: t('locationType.facilities'),
      other: t('locationType.other'),
    }
    return labels[type]
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Stats
  const totalReports = pagination?.total || reports.length
  const urgentReports = reports.filter((r) => r.priority === 'urgent').length
  const inProgressReports = reports.filter((r) => r.status === 'in_progress').length
  const roomsOutOfService = reports.filter((r) => r.room_out_of_service === true).length

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-fg-muted">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-bg p-4 md:p-6">
        <div className="max-w-[1400px] space-y-5">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-fg">{t('title')}</h1>
                <p className="text-xs sm:text-sm text-fg-muted mt-0.5">{t('subtitle')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  iconOnly
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  title={tCommon('actions.refresh') || 'Actualizar'}
                >
                  <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="accent" size="sm" onClick={handleCreateReport}>
                  <FiPlus className="w-3.5 h-3.5" />
                  {t('newReport')}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-5">
            {/* Left Column - Main Content */}
            <div className="min-[1400px]:col-span-3 space-y-4">
              {/* Stats - Mobile/Tablet (hidden on >= 1400px) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-[1400px]:hidden">
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.totalReports')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{totalReports}</p>
                    </div>
                    <FiTool className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.urgent')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{urgentReports}</p>
                    </div>
                    <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-danger" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.inProgress')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {inProgressReports}
                      </p>
                    </div>
                    <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.roomsOutOfService')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {roomsOutOfService}
                      </p>
                    </div>
                    <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div className="mb-4 space-y-3">
                {/* Search Bar */}
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
                    <input
                      type="text"
                      placeholder={t('filters.searchPlaceholder')}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full pl-9 pr-9 py-2 text-sm border border-border bg-surface text-fg rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
                    />
                    {searchInput && (
                      <button
                        onClick={handleClearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg transition-colors"
                        title={t('filters.clearSearch') || 'Limpiar búsqueda'}
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button variant="accent" iconOnly onClick={executeSearch} disabled={loading}>
                    <FiSearch className="w-4 h-4" />
                  </Button>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1.3fr_1fr_1fr_auto] gap-2 items-end">
                  {/* Status Filter */}
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent bg-surface dark:text-fg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <option value="">{t('filters.allStatuses')}</option>
                    <option value="reported">{t('status.reported')}</option>
                    <option value="assigned">{t('status.assigned')}</option>
                    <option value="in_progress">{t('status.inProgress')}</option>
                    <option value="waiting">{t('status.waiting')}</option>
                    <option value="completed">{t('status.completed')}</option>
                    <option value="closed">{t('status.closed')}</option>
                    <option value="canceled">{t('status.canceled')}</option>
                  </select>

                  {/* Priority Filter */}
                  <select
                    value={filters.priority || ''}
                    onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent bg-surface dark:text-fg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <option value="">{t('filters.allPriorities')}</option>
                    <option value="low">{t('priority.low')}</option>
                    <option value="medium">{t('priority.medium')}</option>
                    <option value="high">{t('priority.high')}</option>
                    <option value="urgent">{t('priority.urgent')}</option>
                  </select>

                  {/* Location Type Filter */}
                  <select
                    value={filters.location_type || ''}
                    onChange={(e) =>
                      handleFilterChange('location_type', e.target.value || undefined)
                    }
                    className="w-full px-3 py-1.5 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent bg-surface dark:text-fg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                  >
                    <option value="">{t('filters.allLocations')}</option>
                    <option value="room">{t('locationType.room')}</option>
                    <option value="common_area">{t('locationType.commonArea')}</option>
                    <option value="exterior">{t('locationType.exterior')}</option>
                    <option value="facilities">{t('locationType.facilities')}</option>
                    <option value="other">{t('locationType.other')}</option>
                  </select>

                  {/* Date From Filter */}
                  <DatePickerInput
                    value={filters.date_from || undefined}
                    onChange={(value) => handleDateRangeChange(value, filters.date_to || undefined)}
                    placeholder={t('filters.fromDate')}
                    size="sm"
                    clearable
                    className="w-full"
                  />

                  {/* Date To Filter */}
                  <DatePickerInput
                    value={filters.date_to || undefined}
                    onChange={(value) =>
                      handleDateRangeChange(filters.date_from || undefined, value)
                    }
                    placeholder={t('filters.toDate')}
                    size="sm"
                    clearable
                    className="w-full"
                  />

                  {/* Clear All Filters Button */}
                  {filters.status ||
                  filters.priority ||
                  filters.location_type ||
                  filters.search ||
                  filters.date_from ||
                  filters.date_to ? (
                    <button
                      onClick={handleRefresh}
                      className="w-full px-3 py-1.5 text-xs font-medium text-fg bg-surface-hover border border-border rounded-lg hover:bg-surface-hover transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FiX className="w-3.5 h-3.5" />
                      {t('filters.clearFilters')}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>

              {/* Table - Desktop */}
              <div className="hidden md:block bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.date')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.title')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.location')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.priority')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.status')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.assigned')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-border">
                      {reports.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-xs text-fg-subtle">
                            {Object.keys(filters).some((k) => filters[k as keyof ReportFilters])
                              ? t('table.noReportsFound')
                              : t('table.noReports')}
                          </td>
                        </tr>
                      ) : (
                        reports.map((report) => {
                          const statusConfig = getStatusConfig(report.status)
                          const priorityConfig = getPriorityConfig(report.priority)
                          return (
                            <tr
                              key={report.id}
                              onClick={() => handleViewReport(report.id)}
                              className="hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2 text-xs text-fg-muted whitespace-nowrap">
                                {formatDate(report.report_date)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs font-medium text-fg">{report.title}</div>
                                {report.room_out_of_service && (
                                  <Badge tone="danger" className="mt-1">
                                    {t('table.roomOutOfService')}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs text-fg">
                                  {getLocationTypeLabel(report.location_type)}
                                  {report.room_number && ` - ${report.room_number}`}
                                </div>
                                <div className="text-[10px] text-fg-muted mt-0.5">
                                  {report.location_description}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <Badge tone={priorityConfig.tone} dot>
                                  {priorityConfig.label}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-fg-muted">
                                {report.assigned_type === 'external'
                                  ? report.external_company_name
                                  : report.assigned_to
                                    ? t('table.assignedUser')
                                    : '-'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.total_pages > 1 && (
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-fg-subtle">
                      {t('pagination.showing', {
                        from: (pagination.page - 1) * pagination.limit + 1,
                        to: Math.min(pagination.page * pagination.limit, pagination.total),
                        total: pagination.total,
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.has_prev || loading}
                      >
                        {t('pagination.previous')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.has_next || loading}
                      >
                        {t('pagination.next')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cards - Mobile */}
              <div className="md:hidden space-y-2">
                {reports.length === 0 ? (
                  <div className="bg-surface rounded-md border border-border p-6 text-center">
                    <p className="text-xs text-fg-subtle">
                      {Object.keys(filters).some((k) => filters[k as keyof ReportFilters])
                        ? t('table.noReportsFound')
                        : t('table.noReports')}
                    </p>
                  </div>
                ) : (
                  reports.map((report) => {
                    const statusConfig = getStatusConfig(report.status)
                    const priorityConfig = getPriorityConfig(report.priority)
                    return (
                      <div
                        key={report.id}
                        onClick={() => handleViewReport(report.id)}
                        className="bg-surface rounded-md border border-border p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-xs text-fg">{report.title}</h3>
                            <p className="text-[10px] text-fg-muted mt-0.5">
                              {getLocationTypeLabel(report.location_type)}
                              {report.room_number && ` - ${report.room_number}`}
                            </p>
                          </div>
                          <Badge tone={priorityConfig.tone} dot className="ml-2">
                            {priorityConfig.label}
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] text-fg-muted line-clamp-2">
                            {report.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
                            <span className="text-[10px] text-fg-muted">
                              {formatDate(report.report_date)}
                            </span>
                          </div>

                          {report.room_out_of_service && (
                            <Badge tone="danger" className="pt-1">
                              {t('table.roomOutOfService')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Mobile Pagination */}
                {pagination && pagination.total_pages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.has_prev || loading}
                      className="px-4 py-2 text-xs font-medium text-fg bg-surface border border-border rounded-md disabled:opacity-50"
                    >
                      {t('pagination.previous')}
                    </button>
                    <span className="px-4 py-2 text-xs text-fg-muted">
                      {pagination.page} / {pagination.total_pages}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.has_next || loading}
                      className="px-4 py-2 text-xs font-medium text-fg bg-surface border border-border rounded-md disabled:opacity-50"
                    >
                      {t('pagination.next')}
                    </button>
                  </div>
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
                      <p className="text-xs text-fg-muted font-medium">{t('stats.totalReports')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{totalReports}</p>
                    </div>
                    <div className="p-2 bg-info/10 rounded-lg">
                      <FiTool className="w-5 h-5 text-info" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.urgent')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{urgentReports}</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <FiAlertCircle className="w-5 h-5 text-danger" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.inProgress')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{inProgressReports}</p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <FiClock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">
                        {t('stats.roomsOutOfService')}
                      </p>
                      <p className="text-xl font-bold text-fg mt-0.5">{roomsOutOfService}</p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CreateReportPanel */}
      <CreateReportPanel isOpen={panel === 'create-report'} onClose={handleClosePanel} />
    </>
  )
}
