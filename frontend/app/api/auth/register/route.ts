// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { SERVER_API_BASE_URL } from '@/app/lib/env'

const BACKEND_URL = SERVER_API_BASE_URL
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXTAUTH_URL,
  'http://localhost:3000',
].filter(Boolean)

const isAllowedOrigin = (origin: string | null) => {
  if (!origin) return true
  return ALLOWED_ORIGINS.some((allowed) => allowed && origin.startsWith(allowed))
}

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
  }

  if (!isAllowedOrigin(req.headers.get('origin'))) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type debe ser application/json' }, { status: 400 })
    }

    const body = await req.json()
    if (!body?.username || !body?.password) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }
    console.log('[POST /api/auth/register] Usuario:', body.username)

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
    })

    const data = await backendRes.json().catch(() => null)

    if (!backendRes.ok) {
      const message = data?.error ?? data?.message ?? 'Error registrando'
      return NextResponse.json({ error: message }, { status: backendRes.status })
    }

    if (!data) {
      return NextResponse.json({ error: 'Respuesta inválida del backend' }, { status: 502 })
    }

    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('[POST /api/auth/register] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
