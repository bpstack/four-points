// app/api/auth/logout/route.ts
/**
 * API Route Proxy para logout
 * Notifica al backend y limpia cookies HttpOnly
 */

import { NextRequest, NextResponse } from 'next/server'

import { SERVER_API_BASE_URL } from '@/app/lib/env'

const BACKEND_URL = SERVER_API_BASE_URL

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
  }

  try {
    const accessToken = req.cookies.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Notificar al backend (opcional, puede fallar)
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch {
      // Ignorar errores del backend en logout
    }

    // Siempre limpiar cookies locales
    const response = NextResponse.json({
      success: true,
      message: 'Sesion cerrada',
    })

    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')

    return response
  } catch (error) {
    console.error('[/api/auth/logout] Error:', error)

    // Incluso con error, limpiar cookies
    const response = NextResponse.json(
      { success: true, message: 'Sesion cerrada' },
      { status: 200 }
    )
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')

    return response
  }
}
