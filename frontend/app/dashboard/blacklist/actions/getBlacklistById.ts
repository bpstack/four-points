// app/dashboard/blacklist/actions/getBlacklistById.ts
'use server'

import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import type { BlacklistDetailResponse } from '@/app/lib/blacklist/types'
import { USE_MOCK_DATA } from '@/app/lib/blacklist/useMockData'
import { mockBlacklistEntries, mockAuditTrail } from '@/app/lib/blacklist/mockData'

export async function getBlacklistById(id: string): Promise<BlacklistDetailResponse> {
  try {
    console.log('[getBlacklistById] Obteniendo registro:', id)

    // ✅ MOCK MODE
    if (USE_MOCK_DATA) {
      console.log('[getBlacklistById] 🎭 MODO MOCK activado')

      // Simular delay de red
      await new Promise((resolve) => setTimeout(resolve, 200))

      const entry = mockBlacklistEntries.find((e) => e.id === id)

      if (!entry) {
        throw new Error('Registro no encontrado')
      }

      const audit_trail = mockAuditTrail[id] || []

      return { entry, audit_trail }
    }

    // MODO REAL
    const response = await blacklistApi.getById(id)

    return response
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener el registro')
  }
}
