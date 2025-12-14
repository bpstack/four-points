// app/dashboard/maintenance/page.tsx

import { getMaintenance } from './actions'
import { MaintenanceListClient } from '@/app/components/maintenance/MaintenanceListClient'

interface PageProps {
  searchParams: Promise<{
    status?: string
    priority?: string
    location_type?: string
    search?: string
    page?: string
  }>
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  const params = await searchParams

  // Construir filtros desde URL
  const filters = {
    status: params.status as any,
    priority: params.priority as any,
    location_type: params.location_type as any,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  }

  let data
  let error: string | null = null

  try {
    data = await getMaintenance(filters)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[MaintenancePage] Error:', message)
    error = message
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#010409] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <MaintenanceListClient
      initialReports={data?.reports || []}
      initialPagination={data?.pagination}
    />
  )
}
