// app/api/auth/me/route.ts
/**
 * API Route Proxy para obtener usuario actual
 * Lee el access_token de cookies y consulta al backend
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: backendRes.status })
    }

    const data = await backendRes.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
