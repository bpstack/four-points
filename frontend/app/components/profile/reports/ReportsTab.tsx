// app/components/profile/reports/ReportsTab.tsx

'use client'

import { useState, useCallback, lazy, Suspense, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/app/lib/helpers/utils'
import {
  FiActivity,
  FiBook,
  FiTool,
  FiUsers,
  FiDollarSign,
  FiCheckSquare,
  FiChevronRight,
  FiRefreshCw,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi'
import type { ReportSection } from './types'

// ═══════════════════════════════════════════════════════
// LAZY LOADED SECTIONS - Solo se cargan cuando se necesitan
// ═══════════════════════════════════════════════════════

const OverviewSection = lazy(() => import('./sections/OverviewSection'))
const LogbooksSection = lazy(() => import('./sections/LogbooksSection'))
const MaintenanceSection = lazy(() => import('./sections/MaintenanceSection'))
const GroupsSection = lazy(() => import('./sections/GroupsSection'))
const CashierSection = lazy(() => import('./sections/CashierSection'))
const ChecklistSection = lazy(() => import('./sections/ChecklistSection'))

// ═══════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════

function SectionSkeleton() {
  const t = useTranslations('profile.reports')

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <FiLoader className="w-8 h-8 animate-spin" />
        <span className="text-sm">{t('loadingSection')}</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export function ReportsTab() {
  const t = useTranslations('profile.reports')
  const [activeSection, setActiveSection] = useState<ReportSection>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  // Section config with translations (inside component to access t())
  const SECTIONS: {
    id: ReportSection
    label: string
    description: string
    icon: React.ReactNode
  }[] = useMemo(
    () => [
      {
        id: 'overview',
        label: t('sections.overview'),
        description: t('sections.overviewDesc'),
        icon: <FiActivity className="w-5 h-5" />,
      },
      {
        id: 'logbooks',
        label: t('sections.logbooks'),
        description: t('sections.logbooksDesc'),
        icon: <FiBook className="w-5 h-5" />,
      },
      {
        id: 'maintenance',
        label: t('sections.maintenance'),
        description: t('sections.maintenanceDesc'),
        icon: <FiTool className="w-5 h-5" />,
      },
      {
        id: 'groups',
        label: t('sections.groups'),
        description: t('sections.groupsDesc'),
        icon: <FiUsers className="w-5 h-5" />,
      },
      {
        id: 'cashier',
        label: t('sections.cashier'),
        description: t('sections.cashierDesc'),
        icon: <FiDollarSign className="w-5 h-5" />,
      },
      {
        id: 'checklist',
        label: t('sections.checklist'),
        description: t('sections.checklistDesc'),
        icon: <FiCheckSquare className="w-5 h-5" />,
      },
    ],
    [t]
  )

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const activeSectionConfig = SECTIONS.find((s) => s.id === activeSection)

  // Renderizar la seccion activa
  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection key={refreshKey} />
      case 'logbooks':
        return <LogbooksSection key={refreshKey} />
      case 'maintenance':
        return <MaintenanceSection key={refreshKey} />
      case 'groups':
        return <GroupsSection key={refreshKey} />
      case 'cashier':
        return <CashierSection key={refreshKey} />
      case 'checklist':
        return <ChecklistSection key={refreshKey} />
      default:
        return null
    }
  }

  return (
    <div className="h-[calc(100vh-280px)] min-h-[600px] flex bg-surface rounded-lg border border-border overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-surface-hover flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
            <FiActivity className="w-4 h-4 text-accent" />
            {t('title')}
          </h3>
          <p className="text-xs text-fg-subtle mt-1">{t('subtitle')}</p>
        </div>

        {/* Section List */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-1',
                activeSection === section.id
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-fg hover:bg-surface-hover border border-transparent'
              )}
            >
              <span
                className={cn(
                  'flex-shrink-0',
                  activeSection === section.id ? 'text-accent' : 'text-fg-subtle'
                )}
              >
                {section.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{section.label}</p>
                <p className="text-xs text-fg-subtle truncate">{section.description}</p>
              </div>
              {activeSection === section.id && (
                <FiChevronRight className="w-4 h-4 flex-shrink-0 text-accent" />
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-fg-subtle">
            <FiAlertCircle className="w-3.5 h-3.5" />
            <span>{t('adminOnly')}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface">
          <div>
            <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
              {activeSectionConfig?.icon}
              {activeSectionConfig?.label}
            </h2>
            <p className="text-sm text-fg-subtle mt-0.5">{activeSectionConfig?.description}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg bg-surface border border-border hover:bg-surface-hover rounded-lg transition-colors"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            {t('refresh')}
          </button>
        </header>

        {/* Content Area - Suspense para lazy loading */}
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<SectionSkeleton />}>{renderSection()}</Suspense>
        </main>
      </div>
    </div>
  )
}
