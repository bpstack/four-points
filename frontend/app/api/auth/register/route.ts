// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { SERVER_API_BASE_URL } from '@/app/lib/env'

const BACKEND_URL = SERVER_API_BASE_URL

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
  }

  try {
    const body = await req.json()
    console.log('[POST /api/auth/register] Usuario:', body.username)

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json()

    if (!backendRes.ok) {
      console.error('[POST /api/auth/register] Error:', data)
    }

    return NextResponse.json(data, { status: backendRes.status })
  } catch (error) {
    console.error('[POST /api/auth/register] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
