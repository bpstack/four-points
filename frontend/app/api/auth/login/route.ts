// app/api/auth/login/route.ts
/**
 * API Route Proxy para login
 * Recibe credenciales, las envía al backend y configura cookies HttpOnly
 */

import { NextRequest, NextResponse } from 'next/server'

import { SERVER_API_BASE_URL } from '@/app/lib/env'

const BACKEND_URL = SERVER_API_BASE_URL

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
  }

  try {
    const body = await req.json()

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      return NextResponse.json({ error: data.error ?? 'Error autenticando' }, { status: backendRes.status })
    }

    // Crear respuesta con cookies HttpOnly
    const response = NextResponse.json({
      success: true,
      user: data.user,
    })

    // Configurar cookies HttpOnly
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
    console.error('[/api/auth/login] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
