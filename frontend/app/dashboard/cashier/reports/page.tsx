// app/dashboard/cashier/reports/page.tsx
'use client'

import {
  useCashierStore,
  useReportsDate,
  useReportsTab,
  useChartViewMode,
} from '@/app/stores/useCashierStore'
import DateNavigator from '@/app/components/cashier/DateNavigator'
import MonthlyReport from '@/app/components/cashier/reports/MonthlyReport'
import PaymentChart from '@/app/components/cashier/reports/PaymentChart'
import VouchersHistory from '@/app/components/cashier/reports/VouchersHistory'
import { useMonthlyReport } from '@/app/lib/cashier/queries'

const TAB_CONFIG: { id: 'summary' | 'payments' | 'vouchers'; label: string }[] = [
  { id: 'summary', label: 'Resumen Mensual' },
  { id: 'payments', label: 'Métodos de Pago' },
  { id: 'vouchers', label: 'Histórico de Vales' },
]

export default function ReportsPage() {
  // Zustand store
  const {
    getReportsDisplayLabel,
    reportsGoToPreviousMonth,
    reportsGoToNextMonth,
    reportsGoToCurrentMonth,
    setReportsTab,
    setChartViewMode,
  } = useCashierStore()

  const { year, month } = useReportsDate()
  const activeTab = useReportsTab()
  const chartViewMode = useChartViewMode()

  // Query
  const { data: reportData } = useMonthlyReport(year, month)

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reportes y Estadísticas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Análisis detallado de caja por periodo
            </p>
          </div>

          <DateNavigator
            displayLabel={getReportsDisplayLabel()}
            onPrevious={reportsGoToPreviousMonth}
            onNext={reportsGoToNextMonth}
            onToday={reportsGoToCurrentMonth}
            labelMinWidth="140px"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          <div className="flex gap-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportsTab(tab.id)}
                className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'summary' && <MonthlyReport year={year} month={month} />}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {/* Toggle view mode */}
              <div className="flex justify-end">
                <div className="inline-flex bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setChartViewMode('pie')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      chartViewMode === 'pie'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Pastel
                  </button>
                  <button
                    onClick={() => setChartViewMode('bar')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      chartViewMode === 'bar'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Barras
                  </button>
                </div>
              </div>

              {reportData && <PaymentChart report={reportData} viewMode={chartViewMode} />}
            </div>
          )}

          {activeTab === 'vouchers' && <VouchersHistory year={year} month={month} />}
        </div>
      </div>
    </div>
  )
}
