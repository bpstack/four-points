// app/components/groups/GroupsListClient.tsx

'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Group, GroupStatus, groupsKeys, groupsApi } from '@/app/lib/groups'
import { CreateGroupPanel } from '@/app/components/groups/panels/CreateGroupPanel'
import {
  FiPlus,
  FiSearch,
  FiCalendar,
  FiDollarSign,
  FiEye,
  FiUsers,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi'
import { Card, Badge, Button } from '@/app/ui/components'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

interface GroupsListClientProps {
  initialGroups?: Group[]
  initialStatus?: GroupStatus | 'all'
}

export function GroupsListClient({ initialGroups, initialStatus = 'all' }: GroupsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get('panel')
  const queryClient = useQueryClient()
  const t = useTranslations('groups')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<GroupStatus | 'all'>(initialStatus)

  const filters = useMemo(
    () => (statusFilter !== 'all' ? { status: statusFilter } : undefined),
    [statusFilter]
  )

  const { data: groups = [], isLoading } = useQuery({
    queryKey: groupsKeys.list(filters),
    queryFn: () => groupsApi.getAll(filters),
    select: (res) => res.data,
    initialData: initialGroups
      ? { success: true, data: initialGroups, count: initialGroups.length }
      : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const handleCreateGroup = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'create-group')
    router.push(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const handleClosePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('panel')
    router.push(`?${params.toString()}`, { scroll: false })
    queryClient.invalidateQueries({ queryKey: groupsKeys.list(filters) })
  }, [router, searchParams, queryClient, filters])

  const handleViewGroup = useCallback(
    (groupId: number) => {
      router.push(`/dashboard/groups/${groupId}`)
    },
    [router]
  )

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) => {
        const matchesSearch =
          group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.agency?.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesSearch
      }),
    [groups, searchTerm]
  )

  // Stats calculations
  const totalGroups = groups.length
  const confirmedGroups = groups.filter((g) => g.status === 'confirmed').length
  const inProgressGroups = groups.filter((g) => g.status === 'in_progress').length
  const totalRevenue = groups
    .filter((g) => g.status !== 'cancelled')
    .reduce((sum, g) => {
      const amount =
        typeof g.total_amount === 'number'
          ? g.total_amount
          : parseFloat(String(g.total_amount || 0))
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)

  const getStatusConfig = (status: GroupStatus) => {
    const configs: Record<
      GroupStatus,
      { tone: 'warning' | 'success' | 'info' | 'accent' | 'danger'; label: string }
    > = {
      pending: { tone: 'warning', label: t('status.pending') },
      confirmed: { tone: 'success', label: t('status.confirmed') },
      in_progress: { tone: 'info', label: t('status.in_progress') },
      completed: { tone: 'accent', label: t('status.completed') },
      cancelled: { tone: 'danger', label: t('status.cancelled') },
    }
    return configs[status] ?? { tone: 'neutral' as const, label: status }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const loading = isLoading && !initialGroups

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
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
              <Button variant="accent" size="sm" onClick={handleCreateGroup}>
                <FiPlus className="w-3.5 h-3.5" />
                {t('newGroup')}
              </Button>
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
                        {t('stats.totalGroups')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{totalGroups}</p>
                    </div>
                    <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.confirmed')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {confirmedGroups}
                      </p>
                    </div>
                    <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.inProgress')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {inProgressGroups}
                      </p>
                    </div>
                    <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                  </div>
                </Card>
                <Card padding="sm" hover className="col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.totalRevenue')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {formatCurrency(totalRevenue)}
                      </p>
                    </div>
                    <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                </Card>
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
                <SelectDropdown<GroupStatus | 'all'>
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v)}
                  options={[
                    { value: 'all' as GroupStatus | 'all', label: t('filters.allStatuses') },
                    { value: 'pending' as GroupStatus | 'all', label: t('status.pending') },
                    { value: 'confirmed' as GroupStatus | 'all', label: t('status.confirmed') },
                    { value: 'in_progress' as GroupStatus | 'all', label: t('status.in_progress') },
                    { value: 'completed' as GroupStatus | 'all', label: t('status.completed') },
                    { value: 'cancelled' as GroupStatus | 'all', label: t('status.cancelled') },
                  ]}
                  className="w-full sm:w-auto sm:min-w-[180px]"
                />
              </div>

              {/* Table - Desktop */}
              <div className="hidden md:block bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-surface border-b border-border">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.name')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.agency')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.arrival')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.departure')}
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.status')}
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.amount')}
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-fg uppercase tracking-wider">
                          {t('table.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredGroups.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-xs text-fg-subtle">
                            {searchTerm ? t('table.noResults') : t('table.noGroups')}
                          </td>
                        </tr>
                      ) : (
                        filteredGroups.map((group) => {
                          const statusConfig = getStatusConfig(group.status)
                          return (
                            <tr
                              key={group.id}
                              onClick={() => handleViewGroup(group.id)}
                              className="hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2 text-xs font-medium text-fg">
                                {group.name}
                              </td>
                              <td className="px-3 py-2 text-xs text-fg-muted">
                                {group.agency || '-'}
                              </td>
                              <td className="px-3 py-2 text-xs text-fg-muted">
                                {formatDate(group.arrival_date)}
                              </td>
                              <td className="px-3 py-2 text-xs text-fg-muted">
                                {formatDate(group.departure_date)}
                              </td>
                              <td className="px-3 py-2">
                                <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs text-right font-medium text-fg">
                                {formatCurrency(group.total_amount)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  iconOnly
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewGroup(group.id)
                                  }}
                                >
                                  <FiEye className="w-3.5 h-3.5" />
                                </Button>
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
                {filteredGroups.length === 0 ? (
                  <div className="bg-surface rounded-md border border-border p-6 text-center">
                    <p className="text-xs text-fg-subtle">
                      {searchTerm ? t('table.noResults') : t('table.noGroups')}
                    </p>
                  </div>
                ) : (
                  filteredGroups.map((group) => {
                    const statusConfig = getStatusConfig(group.status)
                    return (
                      <Card
                        key={group.id}
                        padding="sm"
                        hover
                        as="div"
                        onClick={() => handleViewGroup(group.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-xs text-fg truncate">{group.name}</h3>
                            {group.agency && (
                              <p className="text-[10px] text-fg-muted mt-0.5">{group.agency}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewGroup(group.id)
                            }}
                            className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-fg-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-surface-hover rounded transition-colors"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex items-center text-fg-muted">
                            <FiCalendar className="w-3 h-3 mr-1.5 flex-shrink-0" />
                            <span>
                              {formatDate(group.arrival_date)} - {formatDate(group.departure_date)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
                            <span className="font-semibold text-xs text-fg">
                              {formatCurrency(group.total_amount)}
                            </span>
                          </div>
                        </div>
                      </Card>
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

                <Card padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.totalGroups')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{totalGroups}</p>
                    </div>
                    <div className="p-2 bg-info/10 rounded-lg">
                      <FiUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </Card>

                <Card padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.confirmed')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{confirmedGroups}</p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </Card>

                <Card padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.inProgress')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{inProgressGroups}</p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <FiClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </Card>

                <Card padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.totalRevenue')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">
                        {formatCurrency(totalRevenue)}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <FiDollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CreateGroupPanel */}
      <CreateGroupPanel isOpen={panel === 'create-group'} onClose={handleClosePanel} />
    </>
  )
}
