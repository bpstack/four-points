'use client'

import { FiTrendingUp, FiAlertCircle, FiCheckCircle, FiClock, FiDownload } from 'react-icons/fi'
import { useMonthlyReport } from '@/app/lib/cashier/queries'

interface MonthlyReportProps {
  year: number
  month: number
}

interface ParsedMethod {
  method_name: string
  total_amount: number
  percentage: number
}

interface ParsedDay {
  date: string
  status: 'open' | 'closed'
  total_cash: number
  grand_total: number
  has_discrepancy: boolean
}

// Raw types from API (values come as strings)
interface RawMethod {
  method_name: string
  total_amount: string | number
  percentage: string | number
}

interface RawDay {
  date: string
  status: 'open' | 'closed'
  total_cash: string | number
  grand_total: string | number
  has_discrepancia: boolean
}

interface RawReport {
  period: {
    year: number
    month: number
    start: string
    end: string
    total_days: number
    days_closed: number
    days_open: number
  }
  totals: {
    total_cash: string | number
    total_card: string | number
    total_bacs: string | number
    total_web_payment: string | number
    total_transfer: string | number
    total_other: string | number
    grand_total: string | number
  }
  payment_methods_breakdown: RawMethod[]
  daily_breakdown: RawDay[]
  validation_errors?: string[]
}

export default function MonthlyReport({ year, month }: MonthlyReportProps) {
  const { data: reportData, isLoading, error } = useMonthlyReport(year, month)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando reporte...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">
              Error al cargar reporte
            </h3>
            <p className="text-sm text-red-700 dark:text-red-400">{(error as Error).message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!reportData) return null

  const rawReport = reportData as RawReport

  // PARSEO SIMPLE - Backend ya envía valores correctos
  const report = {
    period: rawReport.period,
    totals: {
      grand_total: parseFloat(String(rawReport.totals.grand_total)) || 0,
      total_cash: parseFloat(String(rawReport.totals.total_cash)) || 0,
      total_card: parseFloat(String(rawReport.totals.total_card)) || 0,
      total_bacs: parseFloat(String(rawReport.totals.total_bacs)) || 0,
      total_web_payment: parseFloat(String(rawReport.totals.total_web_payment)) || 0,
      total_transfer: parseFloat(String(rawReport.totals.total_transfer)) || 0,
      total_other: parseFloat(String(rawReport.totals.total_other)) || 0,
    },
    payment_methods_breakdown: rawReport.payment_methods_breakdown.map(
      (method: RawMethod): ParsedMethod => ({
        method_name: method.method_name,
        total_amount: parseFloat(String(method.total_amount)) || 0,
        percentage: parseFloat(String(method.percentage)) || 0,
      })
    ),
    daily_breakdown: rawReport.daily_breakdown.map(
      (day: RawDay): ParsedDay => ({
        date: day.date,
        status: day.status,
        total_cash: parseFloat(String(day.total_cash)) || 0,
        grand_total: parseFloat(String(day.grand_total)) || 0,
        has_discrepancy: day.has_discrepancia,
      })
    ),
    validation_errors: rawReport.validation_errors || [],
  }

  const electronicPayments =
    report.totals.total_card +
    report.totals.total_bacs +
    report.totals.total_web_payment +
    report.totals.total_transfer +
    report.totals.total_other

  const averageDailyTotal = report.totals.grand_total / report.period.total_days
  const completionRate = (report.period.days_closed / report.period.total_days) * 100

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total General */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Gran Total</p>
            <FiTrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {report.totals.grand_total.toFixed(2)}€
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Promedio: {averageDailyTotal.toFixed(2)}€/día
          </p>
        </div>

        {/* Total Efectivo */}
        <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Efectivo Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report.totals.total_cash.toFixed(2)}€
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {((report.totals.total_cash / report.totals.grand_total) * 100).toFixed(1)}% del total
          </p>
        </div>

        {/* Total Pagos Electrónicos */}
        <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pagos Electrónicos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {electronicPayments.toFixed(2)}€
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {((electronicPayments / report.totals.grand_total) * 100).toFixed(1)}% del total
          </p>
        </div>

        {/* Días Cerrados */}
        <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Días Cerrados</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {report.period.days_closed}/{report.period.total_days}
          </p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {completionRate.toFixed(0)}% completado
            </p>
          </div>
        </div>
      </div>

      {/* Desglose por Método de Pago */}
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          💳 Desglose por Método de Pago
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {report.payment_methods_breakdown.map((method: ParsedMethod) => (
            <div
              key={method.method_name}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{method.method_name}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {method.total_amount.toFixed(2)}€
              </p>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${method.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {method.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de Días */}
      <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📅 Desglose Diario
          </h3>
          <button
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            onClick={() => {
              console.log('Exportar reporte')
            }}
          >
            <FiDownload className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Efectivo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Validación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {report.daily_breakdown.map((day: ParsedDay) => {
                const date = new Date(day.date)
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' })
                const dayNumber = date.getDate()

                return (
                  <tr
                    key={day.date}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 capitalize">
                          {dayName}
                        </span>
                        <span className="font-medium">{dayNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {day.status === 'closed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                          <FiCheckCircle className="w-3 h-3" />
                          Cerrado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">
                          <FiClock className="w-3 h-3" />
                          Abierto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {day.total_cash.toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {day.grand_total.toFixed(2)}€
                    </td>
                    <td className="px-4 py-3 text-center">
                      {day.has_discrepancy ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                          <FiAlertCircle className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                          <FiCheckCircle className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800/50 font-bold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  TOTAL DEL MES
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                  {report.totals.total_cash.toFixed(2)}€
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">
                  {report.totals.grand_total.toFixed(2)}€
                </td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Validaciones/Alertas */}
      {report.validation_errors && report.validation_errors.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                Advertencias del periodo
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                {report.validation_errors.map((error: string, idx: number) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
