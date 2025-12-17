// app/dashboard/restaurant/page.tsx

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  FiPackage,
  FiShoppingCart,
  FiBarChart2,
  FiBox,
  FiAlertTriangle,
  FiDollarSign,
  FiTruck,
} from 'react-icons/fi'
import { InventoryTab } from '@/app/components/restaurant/tabs/InventoryTab'
import { OrdersTab } from '@/app/components/restaurant/tabs/OrdersTab'
import { StatsTab } from '@/app/components/restaurant/tabs/StatsTab'

type TabType = 'inventory' | 'orders' | 'stats'

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'inventory', label: 'Inventario', icon: FiPackage },
  { id: 'orders', label: 'Pedidos', icon: FiShoppingCart },
  { id: 'stats', label: 'Estadísticas', icon: FiBarChart2 },
]

// Mock summary stats
const summaryStats = {
  totalProducts: 156,
  lowStock: 12,
  pendingOrders: 5,
  monthlyExpenses: 8450.75,
}

function RestaurantContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabType) || 'inventory'

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1600px] space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Restaurante
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Gestión de inventario, pedidos y estadísticas
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Total Productos
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {summaryStats.totalProducts}
                </p>
              </div>
              <FiBox className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Stock Bajo
                </p>
                <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                  {summaryStats.lowStock}
                </p>
              </div>
              <FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 dark:text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Pedidos Pendientes
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {summaryStats.pendingOrders}
                </p>
              </div>
              <FiTruck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Gastos Mensuales
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(summaryStats.monthlyExpenses)}
                </p>
              </div>
              <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
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
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {currentTab === 'inventory' && <InventoryTab />}
          {currentTab === 'orders' && <OrdersTab />}
          {currentTab === 'stats' && <StatsTab />}
        </div>
      </div>
    </div>
  )
}

export default function RestaurantPage() {
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
      <RestaurantContent />
    </Suspense>
  )
}
