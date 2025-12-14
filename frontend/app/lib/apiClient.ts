// app/lib/apiClient.ts
// ❌ SIN 'use client' - debe funcionar en cliente Y servidor

/**
 * Cliente API isomórfico con auto-refresh
 *
 * ✅ Funciona en:
 * - Client Components (con localStorage)
 * - Server Components (con cookies)
 * - Route Handlers (con cookies)
 *
 * DESARROLLO: localStorage + fetch directo
 * PRODUCCIÓN: Cookies HTTP-only + proxies Next.js
 */

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
const isDev = process.env.NODE_ENV === 'development'
const isClient = typeof window !== 'undefined'

// Cola para manejar refresh concurrente (solo cliente)
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve()
    }
  })
  failedQueue = []
}

// ========================================
// HELPERS DE AUTENTICACIÓN
// ========================================

/**
 * Obtiene headers de autenticación según el entorno
 */
function getAuthHeaders(): Record<string, string> {
  // En servidor: las cookies se envían automáticamente
  if (!isClient) return {}

  // En desarrollo cliente: usar localStorage
  if (isDev) {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // En producción cliente: cookies manejadas por el navegador
  return {}
}

/**
 * Verifica si hay refresh token disponible
 */
function hasRefreshToken(): boolean {
  if (!isClient) return false

  // En desarrollo: verificar localStorage
  if (isDev) {
    return !!localStorage.getItem('refresh_token')
  }

  // En producción: verificar cookies
  const cookies = document.cookie.split(';')
  return cookies.some((cookie) => cookie.trim().startsWith('refresh_token='))
}

// ========================================
// FETCH CON AUTO-REFRESH
// ========================================

async function fetchWithRefresh(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipRefresh, ...fetchOptions } = options

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...fetchOptions.headers,
    },
    // En producción: siempre incluir cookies
    credentials: isDev ? 'omit' : 'include',
  }

  console.log(`[apiClient] ${options.method || 'GET'} ${url}`)
  let response = await fetch(url, finalOptions)
  console.log(`[apiClient] Response: ${response.status}`)

  // Detectar si la ruta requiere autenticación
  const requiresAuth =
    !url.includes('/auth/login') &&
    !url.includes('/auth/logout') &&
    !url.includes('/auth/refresh') &&
    !url.includes('/auth/register')

  // Auto-refresh DESHABILITADO temporalmente - access token dura 8h
  // TODO: Arreglar lógica de refresh token (causa loops infinitos)
  // Ver: docs/PRODUCTION_AUTH_SETUP.md
  const REFRESH_DISABLED = true

  // Auto-refresh solo en cliente
  if (!REFRESH_DISABLED && isClient && response.status === 401 && !skipRefresh && requiresAuth && hasRefreshToken()) {
    console.log('[apiClient] 🔄 Token expirado, intentando refresh...')

    // Si ya hay refresh en curso, encolar
    if (isRefreshing) {
      console.log('[apiClient] ⏳ Refresh en curso, encolando...')
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        console.log('[apiClient] 🔄 Reintentando después de refresh...')
        return fetchWithRefresh(url, { ...options, skipRefresh: true })
      })
    }

    isRefreshing = true
    console.log('[apiClient] 🚀 Iniciando refresh...')

    try {
      let refreshResponse: Response

      if (isDev) {
        // DESARROLLO: Llamar a backend con refresh token de localStorage
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshToken}`,
          },
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          if (data.token) {
            localStorage.setItem('access_token', data.token)
          }
          if (data.refreshToken) {
            localStorage.setItem('refresh_token', data.refreshToken)
          }
        }
      } else {
        // PRODUCCIÓN: Usar proxy Next.js (cookies automáticas)
        refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
      }

      console.log('[apiClient] Refresh status:', refreshResponse.status)

      if (refreshResponse.ok) {
        console.log('[apiClient] ✅ Token refrescado')
        isRefreshing = false
        processQueue()

        // Reintentar request original
        response = await fetch(url, {
          ...finalOptions,
          headers: {
            ...finalOptions.headers,
            ...getAuthHeaders(), // Headers actualizados
          },
        })
        console.log(`[apiClient] Reintento: ${response.status}`)
      } else {
        throw new Error('Refresh failed')
      }
    } catch (error) {
      console.error('[apiClient] ❌ Error en refresh:', error)
      isRefreshing = false
      processQueue(error)

      // Limpiar tokens
      if (isDev) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      }

      // Redirigir a login
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)

      throw error
    }
  } else if (
    isClient &&
    response.status === 401 &&
    !skipRefresh &&
    requiresAuth &&
    !hasRefreshToken()
  ) {
    console.log('[apiClient] ❌ 401 sin refresh token, redirigiendo...')

    if (isDev) {
      localStorage.clear()
    }

    setTimeout(() => {
      window.location.href = '/login'
    }, 100)

    throw new Error('No authentication token')
  }

  return response
}

// ========================================
// API CLIENT PÚBLICO
// ========================================

export const apiClient = {
  get: async (url: string, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, { ...options, method: 'GET' })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    return response.json()
  },

  post: async (url: string, data?: any, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    return response.json()
  },

  patch: async (url: string, data?: any, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    return response.json()
  },

  put: async (url: string, data?: any, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    return response.json()
  },

  delete: async (url: string, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, { ...options, method: 'DELETE' })

    if (!response.ok) {
      const contentType = response.headers.get('content-type')
      let errorData

      if (contentType?.includes('application/json')) {
        errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }))
      } else {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }

      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      try {
        return await response.json()
      } catch {
        return { success: true, message: 'Deleted successfully' }
      }
    }

    return { success: true, message: 'Deleted successfully' }
  },
}

export default apiClient
