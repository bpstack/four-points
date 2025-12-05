// app/dashboard/blacklist/actions/getBlacklist.ts
'use server'

import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import type { BlacklistFilters, BlacklistResponse } from '@/app/lib/blacklist/types'
import { USE_MOCK_DATA } from '@/app/lib/blacklist/useMockData'
import {
  mockBlacklistEntries,
  filterMockData,
  paginateMockData,
} from '@/app/lib/blacklist/mockData'

export async function getBlacklist(filters?: BlacklistFilters): Promise<BlacklistResponse> {
  try {
    console.log('[getBlacklist] Obteniendo registros con filtros:', filters)

    // ✅ MOCK MODE
    if (USE_MOCK_DATA) {
      console.log('[getBlacklist] 🎭 MODO MOCK activado')

      // Simular delay de red
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Filtrar datos
      const filtered = filterMockData(mockBlacklistEntries, filters || {})

      // Paginar
      const response = paginateMockData(filtered, filters?.page || 1, filters?.limit || 50)

      return response
    }

    // MODO REAL
    const response = await blacklistApi.getAll(filters)

    return response
  } catch (error: any) {
    throw new Error(error.message || 'Error al obtener registros de blacklist')
  }
}
