// app/dashboard/blacklist/actions/updateBlacklist.ts
'use server'

/**
 * Server Action: Actualizar registro existente
 * Puede actualizar imágenes (agregar/eliminar)
 */

import { revalidatePath } from 'next/cache'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import type { BlacklistFormData, BlacklistEntry } from '@/app/lib/blacklist/types'

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

    if (!id) {
      return {
        success: false,
        error: 'ID de registro no proporcionado',
      }
    }

    // Actualizar registro
    const updatedEntry = await blacklistApi.update(id, formData)

    console.log('[updateBlacklist] ✅ Registro actualizado:', updatedEntry.id)

    // Revalidar páginas
    revalidatePath('/blacklist')
    revalidatePath(`/blacklist/${id}`)

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
