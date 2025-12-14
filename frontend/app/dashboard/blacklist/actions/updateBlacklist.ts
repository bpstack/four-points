// app/dashboard/blacklist/actions/updateBlacklist.ts
'use server'

/**
 * Server Action: Actualizar registro existente
 * Puede actualizar imágenes (agregar/eliminar)
 */

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { BlacklistFormData, BlacklistEntry } from '@/app/lib/blacklist/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface UpdateBlacklistResult {
  success: boolean
  data?: BlacklistEntry
  error?: string
}

export async function updateBlacklist(
  id: string,
  formData: Partial<BlacklistFormData>
): Promise<UpdateBlacklistResult> {
  try {
    console.log('[updateBlacklist] Actualizando registro:', id)

    // Obtener token de cookies (server-side)
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return { success: false, error: 'No autorizado, falta token' }
    }

    if (!id) {
      return {
        success: false,
        error: 'ID de registro no proporcionado',
      }
    }

    // Convertir fechas al formato YYYY-MM-DD que espera el backend
    const payload: any = { ...formData }
    if (payload.check_in_date) {
      const date =
        typeof payload.check_in_date === 'string'
          ? new Date(payload.check_in_date)
          : payload.check_in_date
      payload.check_in_date = date.toISOString().split('T')[0]
    }
    if (payload.check_out_date) {
      const date =
        typeof payload.check_out_date === 'string'
          ? new Date(payload.check_out_date)
          : payload.check_out_date
      payload.check_out_date = date.toISOString().split('T')[0]
    }

    const response = await fetch(`${API_BASE}/api/blacklist/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    const updatedEntry = await response.json()

    console.log('[updateBlacklist] ✅ Registro actualizado:', updatedEntry.id)

    // Revalidar páginas
    revalidatePath('/dashboard/blacklist')
    revalidatePath(`/dashboard/blacklist/${id}`)

    return {
      success: true,
      data: updatedEntry,
    }
  } catch (error: any) {
    console.error('[updateBlacklist] ❌ Error:', error.message)
    return {
      success: false,
      error: error.message || 'Error al actualizar el registro',
    }
  }
}
