// app/dashboard/blacklist/actions/createBlacklist.ts
'use server'

/**
 * Server Action: Crear nuevo registro en blacklist
 * 1. Valida datos con Zod
 * 2. Sube imágenes a Cloudinary
 * 3. Crea el registro en BD
 */

import { revalidatePath } from 'next/cache'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import type { BlacklistFormData, BlacklistEntry } from '@/app/lib/blacklist/types'
import { USE_MOCK_DATA } from '@/app/lib/blacklist/useMockData'

interface CreateBlacklistResult {
  success: boolean
  data?: BlacklistEntry
  error?: string
}

export async function createBlacklist(formData: BlacklistFormData): Promise<CreateBlacklistResult> {
  try {
    console.log('[createBlacklist] Iniciando creación de registro')

    if (!formData.guest_name || !formData.document_number) {
      return { success: false, error: 'Datos incompletos' }
    }

    // ✅ MOCK MODE
    if (USE_MOCK_DATA) {
      console.log('[createBlacklist] 🎭 MODO MOCK activado')

      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Crear registro mock
      const newEntry: BlacklistEntry = {
        id: Math.random().toString(36).substr(2, 9),
        guest_name: formData.guest_name,
        document_type: formData.document_type,
        document_number: formData.document_number,
        check_in_date: formData.check_in_date.toString(),
        check_out_date: formData.check_out_date.toString(),
        reason: formData.reason,
        severity: formData.severity,
        images: formData.images as string[], // En mock ya son URLs
        comments: formData.comments,
        status: 'ACTIVE',
        created_by: 'mock-user',
        created_by_username: 'Usuario Mock',
        created_at: new Date().toISOString(),
      }

      console.log('[createBlacklist] ✅ Registro creado (MOCK):', newEntry.id)
      revalidatePath('/dashboard/blacklist')

      return { success: true, data: newEntry }
    }

    // MODO REAL
    if (!Array.isArray(formData.images) || formData.images.length === 0) {
      return { success: false, error: 'Debes subir al menos una imagen' }
    }

    const newEntry = await blacklistApi.create(formData)
    console.log('[createBlacklist] ✅ Registro creado:', newEntry.id)
    revalidatePath('/dashboard/blacklist')

    return { success: true, data: newEntry }
  } catch (error: any) {
    console.error('[createBlacklist] ❌ Error:', error.message)
    return { success: false, error: error.message || 'Error al crear el registro' }
  }
}
