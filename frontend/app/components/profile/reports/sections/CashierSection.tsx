// app/components/profile/reports/sections/CashierSection.tsx

'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import { API_BASE_URL } from '@/app/lib/env'
import DateRangePicker, { getDefaultDateRange, type DateRange } from '../DateRangePicker'
import DateFilter from '../DateFilter'
import {
  FiDollarSign,
  FiLoader,
  FiAlertCircle,
  FiUser,
  FiCalendar,
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'
import { ReportError, formatReportDate, formatReportDateTime } from '../utils'

interface CashierHistoryEntry {
  id: number
  shift_id: number
  action: string
  table_affected: string | null
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string
  username?: string
  changed_at: string
  shift_date?: string
  shift_type?: string
}

const API_URL = API_BASE_URL
const DEFAULT_LIMIT = 50

interface DashboardOverview {
  today: {
    date: string
    total_shifts: number
    open_shifts: number
    closed_shifts: number
    total_cash: number
    total_payments: number
    grand_total: number
  }
  vouchers: {
    active_count: number
    active_amount: number
    total_repaid: number
    oldest_active_date: string | null
  }
}

interface DailyReportShift {
  shift: { id: number; shift_type: string }
  total_income: number
  expected_in_box: number
  is_balanced: boolean
}

interface DailyReport {
  date: string
  shifts: DailyReportShift[]
  summary: {
    total_cash: number
    total_payments: number
    grand_total: number
    total_vouchers: number
    total_difference: number
    shifts_count: number
    shifts_closed: number
  }
}

interface Voucher {
  id: number
  shift_id: number
  voucher_number: string
  amount: number
  recipient: string
  concept: string
  status: 'pending' | 'justified' | 'cancelled'
  created_at: string
  justified_at: string | null
  justified_by: string | null
}

type ViewMode = 'dashboard' | 'vouchers' | 'history'

const VOUCHER_STATUS_COLORS: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <FiClock className="w-3 h-3" />,
  },
  justified: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: <FiCheckCircle className="w-3 h-3" />,
  },
  cancelled: {
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: <FiXCircle className="w-3 h-3" />,
  },
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface-hover rounded-lg h-20" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface-hover rounded-lg h-16" />
        ))}
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4">
          <div className="h-3 w-1/2 bg-surface-hover rounded mb-2" />
          <div className="h-3 w-1/3 bg-surface-hover rounded" />
        </div>
      ))}
    </div>
  )
}

export default function CashierSection() {
  const t = useTranslations('profile.reports.cashier')
  const locale = useLocale()

  const VOUCHER_STATUS_LABELS = useMemo(
    () => ({
      pending: t('voucherStatus.pending'),
      justified: t('voucherStatus.justified'),
      cancelled: t('voucherStatus.cancelled'),
    }),
    [t]
  )

  const SHIFT_TYPES = useMemo(
    () => ({
      morning: t('shiftTypes.morning'),
      afternoon: t('shiftTypes.afternoon'),
      night: t('shiftTypes.night'),
      audit: t('shiftTypes.audit'),
    }),
    [t]
  )

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [historyData, setHistoryData] = useState<CashierHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [voucherStatus, setVoucherStatus] = useState<string>('all')
  const [historyRange, setHistoryRange] = useState<DateRange>(getDefaultDateRange)
  const [dashboardDate, setDashboardDate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (viewMode === 'dashboard') {
        if (dashboardDate) {
          const response = await apiClient.get(
            `${API_URL}/api/cashier/reports/daily/${dashboardDate}`
          )
          const data = response as { data?: DailyReport } | DailyReport
          setDailyReport((data as { data?: DailyReport }).data || (data as DailyReport))
          setOverview(null)
        } else {
          const response = await apiClient.get(`${API_URL}/api/cashier/reports/dashboard`)
          const data = response as { data?: DashboardOverview } | DashboardOverview
          setOverview((data as { data?: DashboardOverview }).data || (data as DashboardOverview))
          setDailyReport(null)
        }
      } else if (viewMode === 'vouchers') {
        const params = new URLSearchParams({ limit: DEFAULT_LIMIT.toString() })
        if (voucherStatus !== 'all') params.set('status', voucherStatus)
        const response = await apiClient.get(
          `${API_URL}/api/cashier/reports/vouchers-history?${params.toString()}`
        )
        const data = response as
          | { data?: { vouchers?: Voucher[] }; vouchers?: Voucher[] }
          | Voucher[]
        if (Array.isArray(data)) {
          setVouchers(data)
        } else {
          setVouchers(data.data?.vouchers || data.vouchers || [])
        }
      } else if (viewMode === 'history') {
        const params = new URLSearchParams({ limit: DEFAULT_LIMIT.toString() })
        params.set('from_date', historyRange.from)
        params.set('to_date', historyRange.to)
        const response = await apiClient.get(`${API_URL}/api/cashier/history?${params.toString()}`)
        const data = response as
          | { data?: { data?: CashierHistoryEntry[] } | CashierHistoryEntry[] }
          | CashierHistoryEntry[]
        if (Array.isArray(data)) {
          setHistoryData(data)
        } else if (Array.isArray(data.data)) {
          setHistoryData(data.data)
        } else {
          setHistoryData((data.data as { data?: CashierHistoryEntry[] })?.data || [])
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errorLoading'))
    } finally {
      setLoading(false)
    }
  }, [viewMode, voucherStatus, historyRange.from, historyRange.to, dashboardDate, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)

  return (
    <div className="space-y-4">
      {/* View mode tabs + inline filters */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-wrap">
        <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-1">
          {(['dashboard', 'vouchers', 'history'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === mode
                  ? 'bg-surface text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              )}
            >
              {t(`views.${mode}`)}
            </button>
          ))}
        </div>

        {viewMode === 'dashboard' && (
          <DateFilter
            selectedDate={dashboardDate}
            onDateChange={setDashboardDate}
            label={t('dateFilter')}
          />
        )}

        {viewMode === 'vouchers' && (
          <SelectDropdown<string>
            value={voucherStatus}
            onChange={setVoucherStatus}
            options={[
              { value: 'all', label: t('voucherStatus.all') },
              { value: 'pending', label: t('voucherStatus.pending') },
              { value: 'justified', label: t('voucherStatus.justified') },
              { value: 'cancelled', label: t('voucherStatus.cancelled') },
            ]}
            className="w-40"
          />
        )}

        {viewMode === 'history' && (
          <DateRangePicker value={historyRange} onChange={setHistoryRange} />
        )}
      </div>

      {/* Loading */}
      {loading && (viewMode === 'dashboard' ? <DashboardSkeleton /> : <TableSkeleton />)}

      {!loading && error && <ReportError message={error} />}

      {/* Dashboard — today */}
      {!loading && !error && viewMode === 'dashboard' && overview && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-fg mb-3 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-accent" />
              {t('dashboard.today')} — {formatReportDate(overview.today.date)}
            </h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(overview.today.grand_total)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.totalIncome')}</p>
              </div>
              <div className="bg-info/10 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-accent">
                  {formatCurrency(overview.today.total_cash)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.cash')}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(overview.today.total_payments)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.otherPayments')}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {overview.today.open_shifts}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.openShifts')}</p>
              </div>
              <div className="bg-surface-sunken rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-fg">{overview.today.total_shifts}</p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.totalShifts')}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-fg mb-3 flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-purple-500" />
              {t('vouchersSummary.title')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {overview.vouchers.active_count}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('vouchersSummary.activeVouchers')}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(overview.vouchers.active_amount)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('vouchersSummary.pendingAmount')}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(overview.vouchers.total_repaid)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('vouchersSummary.totalJustified')}</p>
              </div>
            </div>
          </div>

          {overview.vouchers.active_count > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {t('vouchersSummary.pendingAlert', { count: overview.vouchers.active_count })}
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Total: {formatCurrency(overview.vouchers.active_amount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setViewMode('vouchers'); setVoucherStatus('pending') }}
                  className="text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:underline"
                >
                  {t('vouchersSummary.viewVouchers')} →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard — daily report for specific date */}
      {!loading && !error && viewMode === 'dashboard' && dailyReport && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-fg mb-3 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-accent" />
              {formatReportDate(dailyReport.date)}
            </h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(dailyReport.summary.grand_total)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.totalIncome')}</p>
              </div>
              <div className="bg-info/10 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-accent">
                  {formatCurrency(dailyReport.summary.total_cash)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.cash')}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(dailyReport.summary.total_payments)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.otherPayments')}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(dailyReport.summary.total_vouchers)}
                </p>
                <p className="text-xs text-fg-subtle mt-1">{t('dashboard.vouchers')}</p>
              </div>
              <div className="bg-surface-sunken rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-fg">{dailyReport.summary.shifts_count}</p>
                <p className="text-xs text-fg-subtle mt-1">
                  {t('dashboard.shifts')} ({t('dashboard.shiftsClosed', { count: dailyReport.summary.shifts_closed })})
                </p>
              </div>
            </div>
          </div>

          {Math.abs(dailyReport.summary.total_difference) > 0.5 && (
            <div
              className={cn(
                'p-4 border rounded-lg',
                dailyReport.summary.total_difference > 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-center gap-2">
                <FiAlertCircle
                  className={cn(
                    'w-5 h-5',
                    dailyReport.summary.total_difference > 0 ? 'text-green-500' : 'text-red-500'
                  )}
                />
                <p
                  className={cn(
                    'text-sm font-medium',
                    dailyReport.summary.total_difference > 0
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  )}
                >
                  {t('difference.title')}: {formatCurrency(dailyReport.summary.total_difference)}
                  {' '}— {dailyReport.summary.total_difference > 0 ? t('difference.surplus') : t('difference.shortage')}
                </p>
              </div>
            </div>
          )}

          {dailyReport.shifts.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-fg-subtle">{t('shiftDetail.shift')}</th>
                    <th className="px-4 py-3 text-right font-medium text-fg-subtle">{t('shiftDetail.income')}</th>
                    <th className="px-4 py-3 text-right font-medium text-fg-subtle">{t('shiftDetail.inBox')}</th>
                    <th className="px-4 py-3 text-center font-medium text-fg-subtle">{t('shiftDetail.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dailyReport.shifts.map((shiftData) => (
                    <tr key={shiftData.shift.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 text-fg font-medium">
                        {SHIFT_TYPES[shiftData.shift.shift_type as keyof typeof SHIFT_TYPES] || shiftData.shift.shift_type}
                      </td>
                      <td className="px-4 py-3 text-right text-fg">{formatCurrency(shiftData.total_income)}</td>
                      <td className="px-4 py-3 text-right text-fg-muted">{formatCurrency(shiftData.expected_in_box)}</td>
                      <td className="px-4 py-3 text-center">
                        {shiftData.is_balanced ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <FiCheckCircle className="w-3 h-3" />
                            {t('shiftDetail.balanced')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <FiAlertCircle className="w-3 h-3" />
                            {t('shiftDetail.unbalanced')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vouchers */}
      {!loading && !error && viewMode === 'vouchers' && vouchers.length > 0 && (
        <div className="space-y-2">
          {vouchers.map((voucher) => {
            const statusLabel =
              VOUCHER_STATUS_LABELS[voucher.status as keyof typeof VOUCHER_STATUS_LABELS] ||
              VOUCHER_STATUS_LABELS.pending
            const statusConfig =
              VOUCHER_STATUS_COLORS[voucher.status] || VOUCHER_STATUS_COLORS.pending

            return (
              <div key={voucher.id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          statusConfig.color
                        )}
                      >
                        {statusConfig.icon}
                        {statusLabel}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        #{voucher.voucher_number || voucher.id}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-fg mb-1">{voucher.concept}</p>
                    <p className="text-xs text-fg-subtle">{t('voucher.for')}: {voucher.recipient}</p>
                    <div className="flex items-center gap-4 text-xs text-fg-subtle mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <FiCalendar className="w-3.5 h-3.5" />
                        {formatReportDateTime(voucher.created_at)}
                      </span>
                      {voucher.justified_at && (
                        <span className="inline-flex items-center gap-1">
                          <FiCheckCircle className="w-3.5 h-3.5 text-green-500" />
                          {t('voucher.justified')}: {formatReportDate(voucher.justified_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-fg">{formatCurrency(voucher.amount)}</p>
                    <p className="text-xs text-gray-400">{t('voucher.shift')} #{voucher.shift_id}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History table */}
      {!loading && !error && viewMode === 'history' && historyData.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">{t('historyTable.action')}</th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">{t('historyTable.table')}</th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">{t('historyTable.field')}</th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">{t('historyTable.user')}</th>
                <th className="px-4 py-3 text-left font-medium text-fg-subtle">{t('historyTable.date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {historyData.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-fg font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-fg-muted">{entry.table_affected || '-'}</td>
                  <td className="px-4 py-3 text-fg-muted">{entry.field_changed || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-fg">{entry.username || entry.changed_by}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-subtle text-xs">{formatReportDateTime(entry.changed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty states */}
      {!loading && !error && viewMode === 'vouchers' && vouchers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiFileText className="w-10 h-10 mb-2" />
          <p>
            {voucherStatus !== 'all'
              ? t('empty.noVouchersWithStatus', {
                  status: VOUCHER_STATUS_LABELS[voucherStatus as keyof typeof VOUCHER_STATUS_LABELS],
                })
              : t('empty.noVouchers')}
          </p>
        </div>
      )}

      {!loading && !error && viewMode === 'history' && historyData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-fg-subtle">
          <FiClock className="w-10 h-10 mb-2" />
          <p>{t('empty.noHistory')}</p>
        </div>
      )}

      {/* Counts */}
      {!loading && viewMode === 'vouchers' && vouchers.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: vouchers.length, type: t('voucher_plural'), max: DEFAULT_LIMIT })}
        </div>
      )}
      {!loading && viewMode === 'history' && historyData.length > 0 && (
        <div className="text-xs text-fg-subtle text-right">
          {t('showing', { count: historyData.length, type: t('record_plural'), max: DEFAULT_LIMIT })}
        </div>
      )}
    </div>
  )
}
