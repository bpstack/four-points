// app/dashboard/bo/page.tsx

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  FiFileText,
  FiCheckCircle,
  FiUsers,
  FiClock,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
} from 'react-icons/fi'
import { PendingInvoicesTab } from '@/app/components/bo/tabs/PendingInvoicesTab'
import { PaidInvoicesTab } from '@/app/components/bo/tabs/PaidInvoicesTab'
import { SuppliersTab } from '@/app/components/bo/tabs/SuppliersTab'

type TabType = 'pending' | 'paid' | 'suppliers'

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'pending', label: 'Pendientes', icon: FiClock },
  { id: 'paid', label: 'Pagadas', icon: FiCheckCircle },
  { id: 'suppliers', label: 'Proveedores', icon: FiUsers },
]

// Mock summary stats
const summaryStats = {
  pendingCount: 18,
  pendingTotal: 12450.85,
  paidThisMonth: 28,
  paidTotal: 34200.50,
  overdueCount: 3,
  suppliersCount: 52,
}

function BackOfficeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabType) || 'pending'

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1600px] space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Back Office
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Gestión de facturas y proveedores
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Facturas Pendientes
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {summaryStats.pendingCount}
                </p>
              </div>
              <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 dark:text-yellow-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Total Pendiente
                </p>
                <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                  {formatCurrency(summaryStats.pendingTotal)}
                </p>
              </div>
              <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 dark:text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Vencidas
                </p>
                <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">
                  {summaryStats.overdueCount}
                </p>
              </div>
              <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Pagadas (Mes)
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {summaryStats.paidThisMonth}
                </p>
              </div>
              <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Total Pagado
                </p>
                <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">
                  {formatCurrency(summaryStats.paidTotal)}
                </p>
              </div>
              <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Proveedores
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {summaryStats.suppliersCount}
                </p>
              </div>
              <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'pending' && summaryStats.pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                      {summaryStats.pendingCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {currentTab === 'pending' && <PendingInvoicesTab />}
          {currentTab === 'paid' && <PaidInvoicesTab />}
          {currentTab === 'suppliers' && <SuppliersTab />}
        </div>
      </div>
    </div>
  )
}

export default function BackOfficePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#010409] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
            <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando...</p>
          </div>
        </div>
      }
    >
      <BackOfficeContent />
    </Suspense>
  )
}
