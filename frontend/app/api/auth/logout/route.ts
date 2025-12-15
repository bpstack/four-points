// app/api/auth/logout/route.ts
/**
 * API Route Proxy para logout
 * Notifica al backend y limpia cookies HttpOnly
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value

    // Notificar al backend (opcional, puede fallar)
    if (accessToken) {
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
