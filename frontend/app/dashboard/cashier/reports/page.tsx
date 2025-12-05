'use client'

import { useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi'
import MonthlyReport from '@/app/components/cashier/reports/MonthlyReport'
import PaymentChart from '@/app/components/cashier/reports/PaymentChart'
import VouchersHistory from '@/app/components/cashier/reports/VouchersHistory'
import { useMonthlyReport } from '@/app/lib/cashier/queries'

type TabType = 'summary' | 'payments' | 'vouchers'

export default function ReportsPage() {
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1) // 1-12
  const [activeTab, setActiveTab] = useState<TabType>('summary')
  const [chartViewMode, setChartViewMode] = useState<'pie' | 'bar'>('pie')

  const { data: reportData } = useMonthlyReport(selectedYear, selectedMonth)

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const handleToday = () => {
    const now = new Date()
    setSelectedYear(now.getFullYear())
    setSelectedMonth(now.getMonth() + 1)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📊 Reportes y Estadísticas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Análisis detallado de caja por periodo
            </p>
          </div>

          {/* Selector de mes/año */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousMonth}
              className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <FiCalendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg p-1">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              📈 Resumen Mensual
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              💳 Métodos de Pago
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${
                activeTab === 'vouchers'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              🎫 Histórico de Vales
            </button>
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'summary' && <MonthlyReport year={selectedYear} month={selectedMonth} />}

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
                    🥧 Pastel
                  </button>
                  <button
                    onClick={() => setChartViewMode('bar')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      chartViewMode === 'bar'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    📊 Barras
                  </button>
                </div>
              </div>

              {reportData && <PaymentChart report={reportData} viewMode={chartViewMode} />}
            </div>
          )}

          {activeTab === 'vouchers' && (
            <VouchersHistory year={selectedYear} month={selectedMonth} />
          )}
        </div>
      </div>
    </div>
  )
}
