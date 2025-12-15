// app/components/groups/layout/TabNavigation.tsx

'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/app/lib/helpers/utils'

type Tab = 'overview' | 'payments' | 'contacts' | 'rooms' | 'status' | 'history'

interface TabConfig {
  id: Tab
  label: string
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Resumen' },
  { id: 'payments', label: 'Pagos' },
  { id: 'contacts', label: 'Contactos' },
  { id: 'rooms', label: 'Habitaciones' },
  { id: 'status', label: 'Estado' },
  { id: 'history', label: 'Historial' },
]

interface TabNavigationProps {
  groupId: number
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TabNavigation(_props: TabNavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') || 'overview') as Tab

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    // Limpiar panel y highlight al cambiar tab
    params.delete('panel')
    params.delete('highlight')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <nav className="-mb-px flex space-x-4 px-4 sm:px-6 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
