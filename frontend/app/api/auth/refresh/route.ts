// app/api/auth/refresh/route.ts
/**
 * API Route Proxy para refresh token
 * Lee el refresh_token de cookies, obtiene nuevos tokens del backend
 * y actualiza las cookies HttpOnly
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json({ error: 'No hay refresh token' }, { status: 401 })
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!backendRes.ok) {
      // Refresh fallo - limpiar cookies
      const response = NextResponse.json({ error: 'Sesion expirada' }, { status: 401 })
      response.cookies.delete('access_token')
      response.cookies.delete('refresh_token')
      return response
    }

    const data = await backendRes.json()

    const response = NextResponse.json({ success: true })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set('access_token', data.token, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutos
    })

    if (data.refreshToken) {
      response.cookies.set('refresh_token', data.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 días (debe coincidir con backend)
      })
    }

    return response
  } catch (error) {
    console.error('[/api/auth/refresh] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
