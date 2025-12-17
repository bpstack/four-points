// app/components/profile/reports/sections/CashierSection.tsx

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/app/lib/apiClient'
import { cn } from '@/app/lib/helpers/utils'
import DateFilter from '../DateFilter'
import {
  FiDollarSign,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiUser,
  FiCalendar,
  FiClock,
  FiFileText,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi'
interface CashierHistoryEntry {
  id: number
  shift_id: number
  action: string
  table_affected: string | null
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string
  username?: string  // Backend returns this from JOIN
  changed_at: string
  shift_date?: string
  shift_type?: string
  shift_status?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const DEFAULT_LIMIT = 50

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

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

interface DailyReport {
  date: string
  shifts: any[]
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

interface Shift {
  id: number
  daily_id: number
  shift_type: string
  shift_date: string
  is_closed: boolean
  total_cash: number
  total_card: number
  total_income: number
  notes: string | null
}

type ViewMode = 'dashboard' | 'vouchers' | 'history'

// ═══════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════

const VOUCHER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <FiClock className="w-3 h-3" /> },
  justified: { label: 'Justificado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <FiCheckCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <FiXCircle className="w-3 h-3" /> },
}

const SHIFT_TYPES: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
  audit: 'Auditoría',
}

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function CashierSection() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [historyData, setHistoryData] = useState<CashierHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  
  // Voucher filters
  const [voucherStatus, setVoucherStatus] = useState<string>('all')
  
  // Date filter for history view
  const [historyDate, setHistoryDate] = useState<string | null>(null)
  
  // Date filter for dashboard view
  const [dashboardDate, setDashboardDate] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (viewMode === 'dashboard') {
        // If a specific date is selected, use the daily report endpoint
        if (dashboardDate) {
          const response = await apiClient.get(`${API_URL}/api/cashier/reports/daily/${dashboardDate}`)
          setDailyReport(response.data || response)
          setOverview(null)
        } else {
          const response = await apiClient.get(`${API_URL}/api/cashier/reports/dashboard`)
          setOverview(response.data || response)
          setDailyReport(null)
        }
      } else if (viewMode === 'vouchers') {
        const params = new URLSearchParams({ limit: DEFAULT_LIMIT.toString() })
        if (voucherStatus !== 'all') params.set('status', voucherStatus)
        const response = await apiClient.get(`${API_URL}/api/cashier/reports/vouchers-history?${params.toString()}`)
        setVouchers(response.data?.vouchers || response.vouchers || response || [])
      } else if (viewMode === 'history') {
        const params = new URLSearchParams({ limit: DEFAULT_LIMIT.toString() })
        if (historyDate) {
          params.set('from_date', historyDate)
          params.set('to_date', historyDate)
        }
        const response = await apiClient.get(`${API_URL}/api/cashier/history?${params.toString()}`)
        setHistoryData(response.data?.data || response.data || response || [])
      }
      setLoaded(true)
    } catch (err: any) {
      setError(err.message || 'Error cargando datos de caja')
    } finally {
      setLoading(false)
    }
  }, [viewMode, voucherStatus, historyDate, dashboardDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  }

  const formatDateTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  }

  // Estado inicial
  if (!loaded && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-center">
          <FiDollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            Reportes de Caja
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Consulta el dashboard de caja, historial de vales y actividad del sistema.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Cargar Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-[#30363d] flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#161b22] rounded-lg p-1">
          <button
            onClick={() => {
              setViewMode('dashboard')
              setLoaded(false)
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'dashboard'
                ? 'bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              setViewMode('vouchers')
              setLoaded(false)
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'vouchers'
                ? 'bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Vales
          </button>
          <button
            onClick={() => {
              setViewMode('history')
              setLoaded(false)
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              viewMode === 'history'
                ? 'bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Historial
          </button>
        </div>
        
        {/* Filters - inline with tabs */}
        {viewMode === 'dashboard' && (
          <DateFilter
            selectedDate={dashboardDate}
            onDateChange={(date) => {
              setDashboardDate(date)
              setLoaded(false)
            }}
            label="Fecha reporte"
          />
        )}
        
        {viewMode === 'vouchers' && (
          <select
            value={voucherStatus}
            onChange={(e) => {
              setVoucherStatus(e.target.value)
              setLoaded(false)
            }}
            className="text-sm border border-gray-300 dark:border-[#30363d] rounded-lg px-3 py-1.5 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-white"
          >
            <option value="all">Todos los vales</option>
            <option value="pending">Pendientes</option>
            <option value="justified">Justificados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        )}
        
        {viewMode === 'history' && (
          <DateFilter
            selectedDate={historyDate}
            onDateChange={(date) => {
              setHistoryDate(date)
              setLoaded(false)
            }}
            label="Filtrar por fecha"
          />
        )}
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

      {/* Dashboard View */}
      {!loading && !error && viewMode === 'dashboard' && overview && (
        <div className="space-y-6">
          {/* Today's Summary */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-blue-500" />
              Hoy - {formatDate(overview.today.date)}
              {overview.today.closed_shifts === overview.today.total_shifts && overview.today.total_shifts > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Cerrado
                </span>
              )}
            </h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(overview.today.grand_total)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Ingresos</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(overview.today.total_cash)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Efectivo</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(overview.today.total_payments)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Otros Pagos</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {overview.today.open_shifts}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Turnos Abiertos</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#161b22] rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {overview.today.total_shifts}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Turnos</p>
              </div>
            </div>
          </div>

          {/* Vouchers Summary */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FiFileText className="w-4 h-4 text-purple-500" />
              Resumen de Vales
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {overview.vouchers.active_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vales Activos</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(overview.vouchers.active_amount)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Monto Pendiente</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(overview.vouchers.total_repaid)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Justificado</p>
              </div>
            </div>
          </div>

          {/* Pending Vouchers Alert */}
          {overview.vouchers.active_count > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {overview.vouchers.active_count} vales pendientes
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      Total: {formatCurrency(overview.vouchers.active_amount)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewMode('vouchers')
                    setVoucherStatus('pending')
                    setLoaded(false)
                  }}
                  className="text-xs font-medium text-yellow-700 dark:text-yellow-300 hover:underline"
                >
                  Ver vales →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Daily Report View (when specific date is selected) */}
      {!loading && !error && viewMode === 'dashboard' && dailyReport && (
        <div className="space-y-6">
          {/* Date Summary */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-blue-500" />
              {formatDate(dailyReport.date)}
              {dailyReport.summary.shifts_closed === dailyReport.summary.shifts_count && dailyReport.summary.shifts_count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  Cerrado
                </span>
              )}
            </h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(dailyReport.summary.grand_total)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Ingresos</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(dailyReport.summary.total_cash)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Efectivo</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(dailyReport.summary.total_payments)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Otros Pagos</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(dailyReport.summary.total_vouchers)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vales</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#161b22] rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {dailyReport.summary.shifts_count}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Turnos ({dailyReport.summary.shifts_closed} cerrados)</p>
              </div>
            </div>
          </div>

          {/* Difference Alert */}
          {Math.abs(dailyReport.summary.total_difference) > 0.5 && (
            <div className={cn(
              "p-4 border rounded-lg",
              dailyReport.summary.total_difference > 0 
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            )}>
              <div className="flex items-center gap-2">
                <FiAlertCircle className={cn("w-5 h-5", dailyReport.summary.total_difference > 0 ? "text-green-500" : "text-red-500")} />
                <div>
                  <p className={cn("text-sm font-medium", dailyReport.summary.total_difference > 0 ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200")}>
                    Diferencia: {formatCurrency(dailyReport.summary.total_difference)}
                  </p>
                  <p className={cn("text-xs", dailyReport.summary.total_difference > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                    {dailyReport.summary.total_difference > 0 ? 'Sobrante' : 'Faltante'} en caja
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shifts Details */}
          {dailyReport.shifts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FiClock className="w-4 h-4 text-blue-500" />
                Detalle por Turno
              </h4>
              <div className="border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#161b22]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Turno</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Ingresos</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">En Caja</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
                    {dailyReport.shifts.map((shiftData) => (
                      <tr key={shiftData.shift.id} className="hover:bg-gray-50 dark:hover:bg-[#161b22]">
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                          {SHIFT_TYPES[shiftData.shift.shift_type] || shiftData.shift.shift_type}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                          {formatCurrency(shiftData.total_income)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                          {formatCurrency(shiftData.expected_in_box)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {shiftData.is_balanced ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <FiCheckCircle className="w-3 h-3" />
                              Cuadrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <FiAlertCircle className="w-3 h-3" />
                              Descuadre
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vouchers View */}
      {!loading && !error && viewMode === 'vouchers' && vouchers.length > 0 && (
        <div className="space-y-2">
          {vouchers.map((voucher) => {
            const statusConfig = VOUCHER_STATUS_CONFIG[voucher.status] || VOUCHER_STATUS_CONFIG.pending
            
            return (
              <div
                key={voucher.id}
                className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        #{voucher.voucher_number || voucher.id}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {voucher.concept}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Para: {voucher.recipient}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span className="inline-flex items-center gap-1">
                        <FiCalendar className="w-3.5 h-3.5" />
                        {formatDateTime(voucher.created_at)}
                      </span>
                      {voucher.justified_at && (
                        <span className="inline-flex items-center gap-1">
                          <FiCheckCircle className="w-3.5 h-3.5 text-green-500" />
                          Justificado: {formatDate(voucher.justified_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(voucher.amount)}
                    </p>
                    <p className="text-xs text-gray-400">Turno #{voucher.shift_id}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History View */}
      {!loading && !error && viewMode === 'history' && historyData.length > 0 && (
        <div className="border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#161b22]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Accion</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Tabla</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Campo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Usuario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#30363d]">
              {historyData.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-[#161b22] transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {entry.action}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {entry.table_affected || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {entry.field_changed || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {entry.username || entry.changed_by}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {formatDateTime(entry.changed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && viewMode === 'vouchers' && vouchers.length === 0 && loaded && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FiFileText className="w-10 h-10 mb-2" />
          <p>No hay vales {voucherStatus !== 'all' ? `con estado "${voucherStatus}"` : ''}</p>
        </div>
      )}

      {!loading && !error && viewMode === 'history' && historyData.length === 0 && loaded && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FiClock className="w-10 h-10 mb-2" />
          <p>No hay historial disponible</p>
        </div>
      )}

      {/* Count */}
      {!loading && viewMode === 'vouchers' && vouchers.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          Mostrando {vouchers.length} vales (máx. {DEFAULT_LIMIT})
        </div>
      )}

      {!loading && viewMode === 'history' && historyData.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          Mostrando {historyData.length} registros (máx. {DEFAULT_LIMIT})
        </div>
      )}
    </div>
  )
}
