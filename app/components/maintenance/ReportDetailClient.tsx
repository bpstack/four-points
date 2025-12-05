// app/components/maintenance/ReportDetailClient.tsx

'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMaintenanceStore } from '@/app/stores/useMaintenanceStore'
import type { ReportWithDetails } from '@/app/lib/maintenance/maintenance'
import { ReportHeader } from './layout/ReportHeader'
import { TabNavigation } from './layout/TabNavigation'
import { DetailTab } from './tabs/DetailTab'
import { HistoryTab } from './tabs/HistoryTab'
import { LoadingSpinner } from './shared/LoadingSpinner'

interface ReportDetailClientProps {
  initialReport: ReportWithDetails
}

export function ReportDetailClient({ initialReport }: ReportDetailClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'detail'

  const { currentReport, setCurrentReport, setActiveTab, isLoadingReport } = useMaintenanceStore()

  useEffect(() => {
    setCurrentReport(initialReport)
  }, [initialReport, setCurrentReport])

  useEffect(() => {
    setActiveTab(activeTab)
  }, [activeTab, setActiveTab])

  const handleEdit = () => {
    // TODO: Implementar edición
    console.log('Edit report:', currentReport?.id)
  }

  const handleDelete = () => {
    // TODO: Implementar borrado
    console.log('Delete report:', currentReport?.id)
  }

  if (!currentReport) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center">
        <LoadingSpinner size="lg" message="Cargando reporte..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010409]">
      <ReportHeader report={currentReport} onEdit={handleEdit} onDelete={handleDelete} />

      <TabNavigation reportId={currentReport.id} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'detail' && <DetailTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
