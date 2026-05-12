// app/components/scheduling/SchedulingConfigClient.tsx

'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  FiArrowLeft,
  FiSettings,
  FiUsers,
  FiUserCheck,
  FiCalendar as FiCalendarOff,
  FiBarChart2,
  FiGrid,
  FiClock,
} from 'react-icons/fi'
import { EmployeesTab } from './config/EmployeesTab'
import { TotalsTab } from './config/TotalsTab'
import { GeneralConfigTab } from './config/GeneralConfigTab'
import { RulesTab } from './config/RulesTab'
import { RequestsTab } from './config/RequestsTab'
import { ShiftStatsTab } from './config/ShiftStatsTab'
import { PresenciasTab } from './config/PresenciasTab'

import 'react-day-picker/style.css'

type TabType =
  | 'employees'
  | 'totals'
  | 'general'
  | 'rules'
  | 'requests'
  | 'shift-stats'
  | 'presencias'

const VALID_TABS: TabType[] = [
  'employees',
  'totals',
  'general',
  'rules',
  'requests',
  'shift-stats',
  'presencias',
]

export function SchedulingConfigClient() {
  const t = useTranslations('scheduling')
  const tConfig = useTranslations('scheduling.config')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab')
  const activeTab: TabType = VALID_TABS.includes(tabParam as TabType)
    ? (tabParam as TabType)
    : 'employees'

  const setActiveTab = useCallback(
    (tab: TabType) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'employees') {
        params.delete('tab')
      } else {
        params.set('tab', tab)
      }
      const query = params.toString()
      router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const tabs = [
    { id: 'employees' as TabType, label: tConfig('tabs.employees'), icon: FiUserCheck },
    { id: 'totals' as TabType, label: tConfig('tabs.totals'), icon: FiBarChart2 },
    { id: 'general' as TabType, label: tConfig('tabs.general'), icon: FiSettings },
    { id: 'rules' as TabType, label: tConfig('tabs.rules'), icon: FiUsers },
    { id: 'requests' as TabType, label: tConfig('tabs.requests'), icon: FiCalendarOff },
    { id: 'shift-stats' as TabType, label: 'Contabilidad', icon: FiGrid },
    { id: 'presencias' as TabType, label: 'Presencias', icon: FiClock },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1400px] space-y-5">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/scheduling"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('page.configTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {t('page.configSubtitle')}
            </p>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <nav className="flex gap-1 sm:gap-4 min-w-max sm:min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800">
          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'totals' && <TotalsTab />}
          {activeTab === 'general' && <GeneralConfigTab />}
          {activeTab === 'rules' && <RulesTab />}
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'shift-stats' && <ShiftStatsTab />}
          {activeTab === 'presencias' && <PresenciasTab />}
        </div>
      </div>
    </div>
  )
}
