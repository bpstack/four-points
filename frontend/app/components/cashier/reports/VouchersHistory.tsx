'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FiSearch, FiFilter, FiDownload, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi'
import { useVouchersHistory } from '@/app/lib/cashier/queries'
import type { VoucherHistoryItem } from '@/app/lib/cashier/types'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

interface VouchersHistoryProps {
  year: number
  month: number
}

type VoucherStatus = 'all' | 'pending' | 'justified' | 'cancelled'

export default function VouchersHistory({ year, month }: VouchersHistoryProps) {
  const t = useTranslations('cashier')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VoucherStatus>('all')

  // Convertir año/mes a fechas from_date y to_date
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const toDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  // ✅ CORREGIDO: Renombrar data a responseData
  const {
    data: responseData,
    isLoading,
    error,
  } = useVouchersHistory({
    status: statusFilter === 'all' ? undefined : statusFilter,
    from_date: fromDate,
    to_date: toDate,
  })

  // ✅ CORREGIDO: Extraer vouchers del objeto de respuesta
  const vouchers = responseData?.vouchers || []

  // Filtrar por término de búsqueda
  const filteredVouchers = vouchers.filter((voucher: VoucherHistoryItem) => {
    const matchesSearch =
      searchTerm === '' ||
      voucher.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voucher.created_by_username &&
        voucher.created_by_username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (voucher.shift_type && voucher.shift_type.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  // ✅ CORREGIDO: Calcular totales con fallbacks
  const totals = {
    all: vouchers.length || 0,
    pending: vouchers.filter((v: VoucherHistoryItem) => v.status === 'pending').length || 0,
    justified: vouchers.filter((v: VoucherHistoryItem) => v.status === 'justified').length || 0,
    cancelled: vouchers.filter((v: VoucherHistoryItem) => v.status === 'cancelled').length || 0,
    totalAmount:
      vouchers.reduce((sum: number, v: VoucherHistoryItem) => sum + parseFloat(v.amount), 0) || 0,
    pendingAmount:
      vouchers
        .filter((v: VoucherHistoryItem) => v.status === 'pending')
        .reduce((sum: number, v: VoucherHistoryItem) => sum + parseFloat(v.amount), 0) || 0,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">
            <FiClock className="w-3 h-3" />
            {t('voucher.pending')}
          </span>
        )
      case 'justified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
            <FiCheckCircle className="w-3 h-3" />
            {t('voucher.justified')}
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded">
            <FiXCircle className="w-3 h-3" />
            {t('voucher.cancelled')}
          </span>
        )
      default:
        return null
    }
  }

  const formatShiftType = (type?: string) => {
    if (!type) return '-'
    const types: Record<string, string> = {
      night: t('shifts.night'),
      morning: t('shifts.morning'),
      afternoon: t('shifts.afternoon'),
      closing: t('shifts.closing'),
    }
    return types[type] || type
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-fg-subtle">{t('page.loadingVouchers')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-300">{t('error.loadingVouchers')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-fg-muted mb-1">{t('vouchersHistory.totalVouchers')}</p>
          <p className="text-2xl font-bold text-fg">{totals.all}</p>
          <p className="text-xs text-fg-subtle mt-1">{totals.totalAmount.toFixed(2)}€</p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-1">
            {t('vouchersHistory.pending')}
          </p>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
            {totals.pending}
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            {totals.pendingAmount.toFixed(2)}€
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-300 mb-1">
            {t('vouchersHistory.justified')}
          </p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {totals.justified}
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300 mb-1">
            {t('vouchersHistory.cancelled')}
          </p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{totals.cancelled}</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Buscador */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('vouchersHistory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface-hover text-fg placeholder-gray-400 focus:ring-2 focus:ring-accent/50 focus:border-transparent"
            />
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center gap-2">
            <FiFilter className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <SelectDropdown<VoucherStatus>
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: t('vouchersHistory.allStatuses') },
                { value: 'pending', label: t('vouchersHistory.pendingStatus') },
                { value: 'justified', label: t('vouchersHistory.justifiedStatus') },
                { value: 'cancelled', label: t('vouchersHistory.cancelledStatus') },
              ]}
              className="w-40"
            />
          </div>

          {/* Botón exportar */}
          <button
            onClick={() => console.log('Exportar vales')}
            className="px-4 py-2 border border-border rounded-lg bg-surface-hover text-fg hover:bg-surface-hover transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <FiDownload className="w-4 h-4" />
            {t('vouchersHistory.export')}
          </button>
        </div>
      </div>

      {/* Tabla de vales */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-hover/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg uppercase tracking-wider">
                  {t('vouchersHistory.dateCol')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg uppercase tracking-wider">
                  {t('vouchersHistory.shiftCol')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg uppercase tracking-wider">
                  {t('vouchersHistory.userCol')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg uppercase tracking-wider">
                  {t('vouchersHistory.reasonCol')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-fg uppercase tracking-wider">
                  {t('vouchersHistory.amountCol')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-fg uppercase tracking-wider">
                  {t('vouchersHistory.statusCol')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVouchers.length > 0 ? (
                filteredVouchers.map((voucher: VoucherHistoryItem) => (
                  <tr key={voucher.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-fg whitespace-nowrap">
                      {new Date(voucher.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg">
                      {formatShiftType(voucher.shift_type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg">
                      {voucher.created_by_username || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-fg-muted max-w-xs truncate">
                      {voucher.reason}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-fg">
                      {parseFloat(voucher.amount).toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(voucher.status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-fg-subtle">
                    {t('vouchersHistory.noVouchersFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
