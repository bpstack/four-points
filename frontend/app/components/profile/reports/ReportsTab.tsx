// app/components/profile/reports/ReportsTab.tsx

'use client'

import { useState, useCallback, lazy, Suspense } from 'react'
import { cn } from '@/app/lib/helpers/utils'
import {
  FiActivity,
  FiBook,
  FiTool,
  FiUsers,
  FiDollarSign,
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

// ═══════════════════════════════════════════════════════
// SECTION CONFIG
// ═══════════════════════════════════════════════════════

const SECTIONS: {
  id: ReportSection
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    id: 'overview',
    label: 'Actividad General',
    description: 'Vista unificada de toda la actividad',
    icon: <FiActivity className="w-5 h-5" />,
  },
  {
    id: 'logbooks',
    label: 'Logbooks',
    description: 'Historial de partes y comentarios',
    icon: <FiBook className="w-5 h-5" />,
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento',
    description: 'Reportes e historial de incidencias',
    icon: <FiTool className="w-5 h-5" />,
  },
  {
    id: 'groups',
    label: 'Grupos',
    description: 'Historial de grupos y pagos',
    icon: <FiUsers className="w-5 h-5" />,
  },
  {
    id: 'cashier',
    label: 'Caja',
    description: 'Turnos, vales y cierres diarios',
    icon: <FiDollarSign className="w-5 h-5" />,
  },
]

// ═══════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════

function SectionSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <FiLoader className="w-8 h-8 animate-spin" />
        <span className="text-sm">Cargando seccion...</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export function ReportsTab() {
  const [activeSection, setActiveSection] = useState<ReportSection>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

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
      default:
        return null
    }
  }

  return (
    <div className="h-[calc(100vh-280px)] min-h-[600px] flex bg-white dark:bg-[#0d1117] rounded-lg border border-gray-200 dark:border-[#30363d] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#161b22] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-[#30363d]">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiActivity className="w-4 h-4 text-blue-500" />
            System Reports
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Logs y actividad del sistema
          </p>
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
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#21262d] border border-transparent'
              )}
            >
              <span
                className={cn(
                  'flex-shrink-0',
                  activeSection === section.id
                    ? 'text-blue-500'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {section.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{section.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {section.description}
                </p>
              </div>
              {activeSection === section.id && (
                <FiChevronRight className="w-4 h-4 flex-shrink-0 text-blue-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FiAlertCircle className="w-3.5 h-3.5" />
            <span>Solo visible para admins</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#0d1117]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {activeSectionConfig?.icon}
              {activeSectionConfig?.label}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {activeSectionConfig?.description}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#21262d] border border-gray-300 dark:border-[#30363d] hover:bg-gray-50 dark:hover:bg-[#30363d] rounded-lg transition-colors"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </header>

        {/* Content Area - Suspense para lazy loading */}
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<SectionSkeleton />}>
            {renderSection()}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
