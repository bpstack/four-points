// app/components/cashier/logs/HistoryFilters.tsx

'use client'

import { useTranslations } from 'next-intl'
import { FiSearch, FiDownload } from 'react-icons/fi'
import type { HistoryAction } from '@/app/lib/cashier/types'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

interface HistoryFiltersProps {
  actionFilter: HistoryAction | 'all'
  onActionFilterChange: (action: HistoryAction | 'all') => void
  userFilter: string
  onUserFilterChange: (user: string) => void
  onExport: () => void
}

export default function HistoryFilters({
  actionFilter,
  onActionFilterChange,
  userFilter,
  onUserFilterChange,
  onExport,
}: HistoryFiltersProps) {
  const t = useTranslations('cashier')

  const actions: Array<{ value: HistoryAction | 'all'; label: string }> = [
    { value: 'all', label: t('logs.action') },
    { value: 'created', label: t('actions.created') },
    { value: 'updated', label: t('actions.updated') },
    { value: 'deleted', label: t('actions.deleted') },
    { value: 'status_changed', label: t('actions.status_changed') },
    { value: 'adjustment', label: t('actions.adjustment') },
    { value: 'voucher_created', label: t('actions.voucher_created') },
    { value: 'voucher_repaid', label: t('actions.voucher_repaid') },
    { value: 'daily_closed', label: t('actions.daily_closed') },
    { value: 'daily_reopened', label: t('actions.daily_reopened') },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Filtro de usuario (búsqueda) */}
      <div className="relative flex-1">
        <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle" />
        <input
          type="text"
          placeholder={t('logs.searchByUser')}
          value={userFilter}
          onChange={(e) => onUserFilterChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-border bg-surface text-fg rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent"
        />
      </div>

      {/* Filtro de acción */}
      <SelectDropdown<HistoryAction | 'all'>
        value={actionFilter}
        onChange={onActionFilterChange}
        options={actions}
        className="w-full sm:w-auto sm:min-w-[140px]"
      />

      {/* Botón exportar */}
      <button
        onClick={onExport}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md bg-surface text-fg hover:bg-surface-hover transition-colors"
      >
        <FiDownload className="w-3.5 h-3.5" />
        {t('logs.export')}
      </button>
    </div>
  )
}
