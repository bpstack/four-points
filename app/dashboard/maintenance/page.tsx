// app/dashboard/maintenance/page.tsx

import { maintenanceApi } from '@/app/api/maintenance/route'
import { MaintenanceListClient } from '@/app/components/maintenance/MaintenanceListClient'

export default async function MaintenancePage() {
  const response = await maintenanceApi.getAll()

  return <MaintenanceListClient initialReports={response.data} />
}
