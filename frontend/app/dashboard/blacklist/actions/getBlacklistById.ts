// app/dashboard/blacklist/actions/getBlacklistById.ts
'use server'

import { cookies } from 'next/headers'
import type { BlacklistDetailResponse } from '@/app/lib/blacklist/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function getBlacklistById(id: string): Promise<BlacklistDetailResponse> {
  try {
    console.log('[getBlacklistById] Obteniendo registro:', id)

    // Obtener token de cookies (server-side)
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      throw new Error('No autorizado, falta token')
    }

    const url = `${API_BASE}/api/blacklist/${id}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  } catch (error: any) {
    console.error('[getBlacklistById] Error:', error.message)
    throw new Error(error.message || 'Error al obtener el registro')
  }
}
