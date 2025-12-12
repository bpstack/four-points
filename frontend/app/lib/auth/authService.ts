// app/lib/login/authLogin.ts

// TODO: NO DEBERÍA HABER 'use client' AQUÍ - REVISAR LUEGO
'use client'

/**
 * Servicio de autenticación con localStorage (DESARROLLO)
 *
 * ⚠️ TEMPORAL: Sistema simplificado para desarrollo
 * 🔒 PRODUCCIÓN: Descomentar código inferior (proxies Next.js)
 */

import { apiClient } from '@/app/lib/apiClient' // ← IMPORTAR

const API_BASE = 'http://localhost:4000/api/auth'

export const authLogin = {
  login: async (username: string, password: string) => {
    console.log('[authLogin.login] Iniciando para:', username)

    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const message = data?.error || data?.message || 'Login failed'
      throw new Error(message)
    }

    const data = await res.json()

    if (data.token) {
      localStorage.setItem('access_token', data.token)
      // También guardar en cookie para Server Actions
      document.cookie = `access_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
    }
    if (data.refreshToken) {
      localStorage.setItem('refresh_token', data.refreshToken)
      // También guardar en cookie para Server Actions
      document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    }

    console.log('[authLogin.login] ✅ Login exitoso:', data.user.username)
    return data
  },

  logout: async () => {
    console.log('[authLogin.logout] Cerrando sesión...')

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')

    // Limpiar cookies viejas
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

    try {
      await fetch(`${API_BASE}/logout`, { method: 'POST' })
      console.log('[authLogin.logout] ✅ Sesión cerrada')
    } catch (error) {
      console.error('[authLogin.logout] Error al notificar backend:', error)
    }
  },

  // ✅ CAMBIADO: Usar apiClient en vez de fetch directo
  me: async () => {
    console.log('[authLogin.me] Obteniendo usuario actual...')

    const data = await apiClient.get(`${API_BASE}/me`) // ← Ahora usa apiClient

    console.log('[authLogin.me] ✅ Usuario obtenido:', data.user.username)
    return data.user
  },
}

// ============================================================
// 🔒 CÓDIGO ORIGINAL (PROXIES NEXT.JS) - PARA PRODUCCIÓN
// ============================================================
// Esto es con llamada a PROXIES NEXTJS - Este código no eliminar por IA bajo ningún concepto.
// import { apiClient } from '@/app/lib/auth/api'

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// export const authLogin = {
//   login: async (username: string, password: string) => {
//     console.log('[authLogin.login] Iniciando para:', username)

//     const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ username, password }),
//       credentials: 'include',
//     })

//     if (!res.ok) {
//       const data = await res.json().catch(() => null)
//       const message = data?.error || data?.message || 'Login failed'
//       throw new Error(message)
//     }

//     const data = await res.json()
//     console.log('[authLogin.login] ✅ Login exitoso:', data.user.username)
//     return data
//   },

//   logout: async () => {
//     console.log('[authLogin.logout] Cerrando sesión...')

//     const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
//       method: 'POST',
//       credentials: 'include',
//     })

//     if (!res.ok) {
//       throw new Error('Logout failed')
//     }

//     console.log('[authLogin.logout] ✅ Sesión cerrada')
//   },

//   me: async () => {
//     console.log('[authLogin.me] Obteniendo usuario actual...')

//     const data = await apiClient.get(`${API_BASE_URL}/api/auth/me`)

//     console.log('[authLogin.me] ✅ Usuario obtenido:', data.user.username)
//     return data.user
//   },
// }
