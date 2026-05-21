// app/dashboard/restaurant/page.tsx

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import {
  FiPackage,
  FiShoppingCart,
  FiBarChart2,
  FiBox,
  FiAlertTriangle,
  FiDollarSign,
  FiTruck,
} from 'react-icons/fi'
import { DailyRevenueTab } from '@/app/components/restaurant/tabs/DailyRevenueTab'
import { InventoryTab } from '@/app/components/restaurant/tabs/InventoryTab'
import { OrdersTab } from '@/app/components/restaurant/tabs/OrdersTab'
import { StatsTab } from '@/app/components/restaurant/tabs/StatsTab'

type TabType = 'dailyRevenue' | 'inventory' | 'orders' | 'stats'

// Mock summary stats
const summaryStats = {
  totalProducts: 156,
  lowStock: 12,
  pendingOrders: 5,
  monthlyExpenses: 8450.75,
}

function RestaurantContent() {
  const t = useTranslations('restaurant')
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabType) || 'dailyRevenue'

  const tabs: {
    id: TabType
    labelKey: 'dailyRevenue' | 'inventory' | 'orders' | 'stats'
    icon: React.ElementType
  }[] = [
    { id: 'dailyRevenue', labelKey: 'dailyRevenue', icon: FiDollarSign },
    { id: 'inventory', labelKey: 'inventory', icon: FiPackage },
    { id: 'orders', labelKey: 'orders', icon: FiShoppingCart },
    { id: 'stats', labelKey: 'stats', icon: FiBarChart2 },
  ]

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1600px] space-y-5">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-fg">{t('page.title')}</h1>
              <p className="text-xs sm:text-sm text-fg-muted mt-0.5">{t('page.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                  {t('stats.totalProducts')}
                </p>
                <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                  {summaryStats.totalProducts}
                </p>
              </div>
              <FiBox className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                  {t('stats.lowStock')}
                </p>
                <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                  {summaryStats.lowStock}
                </p>
              </div>
              <FiAlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 dark:text-orange-400" />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                  {t('stats.pendingOrders')}
                </p>
                <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                  {summaryStats.pendingOrders}
                </p>
              </div>
              <FiTruck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 dark:text-purple-400" />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 hover:bg-surface-hover transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                  {t('stats.monthlyExpenses')}
                </p>
                <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
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
        <div className="border-b border-border">
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
                      ? 'border-accent text-accent'
                      : 'border-transparent text-fg-muted hover:text-fg hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(`tabs.${tab.labelKey}`)}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {currentTab === 'dailyRevenue' && <DailyRevenueTab />}
          {currentTab === 'inventory' && <InventoryTab />}
          {currentTab === 'orders' && <OrdersTab />}
          {currentTab === 'stats' && <StatsTab />}
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  const t = useTranslations('restaurant')
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-fg-muted">{t('page.loading')}</p>
      </div>
    </div>
  )
}

export default function RestaurantPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RestaurantContent />
    </Suspense>
  )
}
