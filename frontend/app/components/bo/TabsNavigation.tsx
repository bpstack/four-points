// app/components/bo/TabsNavigation.tsx
/**
 * Client Component - Tab Navigation
 *
 * Handles interactive tab switching using URL search params.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FiClock, FiCheckCircle, FiUsers, FiSettings } from 'react-icons/fi'
import { Badge } from '@/app/ui/components'

export type TabType = 'pending' | 'paid' | 'suppliers' | 'settings'

interface TabsNavigationProps {
  pendingCount?: number
}

const tabIds: { id: TabType; icon: React.ElementType }[] = [
  { id: 'pending', icon: FiClock },
  { id: 'paid', icon: FiCheckCircle },
  { id: 'suppliers', icon: FiUsers },
  { id: 'settings', icon: FiSettings },
]

export function TabsNavigation({ pendingCount = 0 }: TabsNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get('tab') as TabType) || 'pending'
  const t = useTranslations('backoffice')

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="border-b border-border">
      <nav className="flex space-x-4 sm:space-x-6 overflow-x-auto" aria-label="Tabs">
        {tabIds.map((tab) => {
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
              {t(`tabs.${tab.id}`)}
              {tab.id === 'pending' && pendingCount > 0 && (
                <Badge tone="warning" className="ml-1">
                  {pendingCount}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
