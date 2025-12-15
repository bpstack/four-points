// app/lib/auth/authService.ts
'use client'

/**
 * Servicio de autenticación
 *
 * ARQUITECTURA:
 * - Frontend: four-points.stackbp.es
 * - Backend:  api.four-points.stackbp.es
 * - Cookies:  domain=.four-points.stackbp.es (compartidas)
 *
 * En desarrollo: localhost + localStorage
 * En producción: subdominios + HttpOnly cookies
 */

import { apiClient } from '@/app/lib/apiClient'

const isDev = process.env.NODE_ENV === 'development'

const API_BASE = isDev
  ? 'http://localhost:4000/api/auth'
  : `${process.env.NEXT_PUBLIC_API_URL || 'https://four-points.onrender.com'}/api/auth`

export const authLogin = {
  login: async (username: string, password: string) => {
    console.log(`[authLogin.login] Iniciando para: ${username} (${isDev ? 'DEV' : 'PROD'})`)

    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include', // Siempre enviar/recibir cookies
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const message = data?.error || data?.message || 'Login failed'
      throw new Error(message)
    }

    const data = await res.json()

    // En desarrollo, guardar también en localStorage para Bearer token
    if (isDev) {
      if (data.token) {
        localStorage.setItem('access_token', data.token)
      }
      if (data.refreshToken) {
        localStorage.setItem('refresh_token', data.refreshToken)
      }
    }
    // En producción, las cookies HttpOnly se configuran automáticamente por el backend

    console.log('[authLogin.login] Login exitoso:', data.user.username)
    return data
  },

  logout: async () => {
    console.log(`[authLogin.logout] Cerrando sesión... (${isDev ? 'DEV' : 'PROD'})`)

    // En desarrollo, limpiar localStorage
    if (isDev) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }

    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
      console.log('[authLogin.logout] Sesión cerrada')
    } catch (error) {
      console.error('[authLogin.logout] Error al notificar backend:', error)
    }
  },

  me: async () => {
    console.log(`[authLogin.me] Obteniendo usuario actual... (${isDev ? 'DEV' : 'PROD'})`)

    // Usar apiClient para tener auto-refresh
    const data = await apiClient.get(`${API_BASE}/me`)
    console.log('[authLogin.me] Usuario obtenido:', data.user.username)
    return data.user
  },
}
