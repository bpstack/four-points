// app/dashboard/blacklist/actions/restoreBlacklist.ts
'use server'

/**
 * Server Action: Restaurar registro eliminado
 * Limpia el campo deleted_at
 */

import { revalidatePath } from 'next/cache'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import type { BlacklistEntry } from '@/app/lib/blacklist/types'

interface RestoreBlacklistResult {
  success: boolean
  data?: BlacklistEntry
  error?: string
}

export async function restoreBlacklist(id: string): Promise<RestoreBlacklistResult> {
  try {
    console.log('[restoreBlacklist] Restaurando registro:', id)

    if (!id) {
      return {
        success: false,
        error: 'ID de registro no proporcionado',
      }
    }

    // Restaurar registro
    const restoredEntry = await blacklistApi.restore(id)

    console.log('[restoreBlacklist] ✅ Registro restaurado:', restoredEntry.id)

    // Revalidar páginas
    revalidatePath('/blacklist')
    revalidatePath(`/blacklist/${id}`)

    return {
      success: true,
      data: restoredEntry,
    }
  } catch (error: any) {
    console.error('[restoreBlacklist] ❌ Error:', error.message)
    return {
      success: false,
      error: error.message || 'Error al restaurar el registro',
    }
  }
}
