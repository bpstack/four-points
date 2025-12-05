// app/dashboard/blacklist/actions/deleteBlacklist.ts
'use server'

import { revalidatePath } from 'next/cache'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import { USE_MOCK_DATA } from '@/app/lib/blacklist/useMockData'

interface DeleteBlacklistResult {
  success: boolean
  message?: string
  error?: string
}

export async function deleteBlacklist(id: string): Promise<DeleteBlacklistResult> {
  try {
    console.log('[deleteBlacklist] Eliminando registro:', id)

    if (!id) {
      return { success: false, error: 'ID de registro no proporcionado' }
    }

    // ✅ MOCK MODE
    if (USE_MOCK_DATA) {
      console.log('[deleteBlacklist] 🎭 MODO MOCK activado')

      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      console.log('[deleteBlacklist] ✅ Registro eliminado (MOCK):', id)
      revalidatePath('/dashboard/blacklist')
      revalidatePath(`/dashboard/blacklist/${id}`)

      return { success: true, message: 'Registro eliminado correctamente (MOCK)' }
    }

    // MODO REAL
    const result = await blacklistApi.delete(id)
    console.log('[deleteBlacklist] ✅ Registro eliminado:', id)
    revalidatePath('/dashboard/blacklist')
    revalidatePath(`/dashboard/blacklist/${id}`)

    return { success: true, message: result.message || 'Registro eliminado correctamente' }
  } catch (error: any) {
    console.error('[deleteBlacklist] ❌ Error:', error.message)
    return { success: false, error: error.message || 'Error al eliminar el registro' }
  }
}
