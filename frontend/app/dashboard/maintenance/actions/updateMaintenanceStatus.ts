// app/dashboard/maintenance/actions/updateMaintenanceStatus.ts
'use server'

import { cookies } from 'next/headers'
import type { ReportStatus, ReportWithDetails } from '@/app/lib/maintenance/maintenance'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export interface UpdateStatusResponse {
  success: boolean
  data: ReportWithDetails
  message?: string
}

export async function updateMaintenanceStatus(
  id: string,
  status: ReportStatus,
  notes?: string
): Promise<UpdateStatusResponse> {
  try {
    console.log('[updateMaintenanceStatus] Actualizando estado:', id, status)

    // Obtener token de cookies (server-side)
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      throw new Error('No autorizado, falta token')
    }

    const url = `${API_BASE}/api/maintenance/${id}/status`

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status, notes }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 404) {
        throw new Error('Reporte no encontrado')
      }
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  } catch (error: any) {
    console.error('[updateMaintenanceStatus] Error:', error.message)
    throw new Error(error.message || 'Error al actualizar estado')
  }
}
