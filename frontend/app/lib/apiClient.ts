// app/lib/apiClient.ts

/**
 * Cliente API con auto-refresh de JWT
 *
 * ARQUITECTURA SIMPLIFICADA (subdominios):
 * - Frontend: four-points.stackbp.es (Vercel)
 * - Backend:  api.four-points.stackbp.es (Render)
 * - Cookies:  domain=.four-points.stackbp.es (compartidas)
 *
 * En desarrollo: localhost + localStorage
 * En producción: subdominios + HttpOnly cookies
 */

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

// URLs según entorno
const isDev = process.env.NODE_ENV === 'development'
const isClient = typeof window !== 'undefined'

const API_BASE_URL = isDev ? 'http://localhost:4000' : 'https://api.four-points.stackbp.es'

// Cola para manejar refresh concurrente
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
 * Obtiene headers de autenticación
 * - Desarrollo: Bearer token desde localStorage
 * - Producción: cookies se envían automáticamente (no necesita header)
 */
function getAuthHeaders(): Record<string, string> {
  if (!isClient) return {}

  if (isDev) {
    const token = localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Producción: cookies HttpOnly se envían con credentials: 'include'
  return {}
}

/**
 * Verifica si hay refresh token disponible
 */
function hasRefreshToken(): boolean {
  if (!isClient) return false

  if (isDev) {
    return !!localStorage.getItem('refresh_token')
  }

  // En producción las cookies HttpOnly no son visibles desde JS
  // pero el backend las recibirá si existen
  return true
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
    credentials: 'include', // Siempre enviar cookies
  }

  console.log(`[apiClient] ${options.method || 'GET'} ${url}`)
  let response = await fetch(url, finalOptions)
  console.log(`[apiClient] Response: ${response.status}`)

  // Rutas que no requieren autenticación
  const isAuthRoute =
    url.includes('/auth/login') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/register')

  // Auto-refresh cuando recibimos 401
  if (isClient && response.status === 401 && !skipRefresh && !isAuthRoute && hasRefreshToken()) {
    console.log('[apiClient] 🔄 Token expirado, intentando refresh...')

    // Si ya hay refresh en curso, encolar este request
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

    try {
      const refreshUrl = `${API_BASE_URL}/api/auth/refresh-token`
      console.log('[apiClient] Enviando refresh token...')

      const refreshOptions: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }

      // En desarrollo, añadir Bearer token
      if (isDev) {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')
        ;(refreshOptions.headers as Record<string, string>)['Authorization'] =
          `Bearer ${refreshToken}`
      }

      const refreshResponse = await fetch(refreshUrl, refreshOptions)
      console.log('[apiClient] Refresh response:', refreshResponse.status)

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed: ${refreshResponse.status}`)
      }

      const data = await refreshResponse.json()

      // En desarrollo, guardar tokens en localStorage
      if (isDev && data.token) {
        localStorage.setItem('access_token', data.token)
        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken)
        }
      }
      // En producción, las cookies se actualizan automáticamente por el backend

      console.log('[apiClient] ✅ Token refrescado')
      isRefreshing = false
      processQueue()

      // Reintentar request original
      const retryOptions: RequestInit = {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
          ...fetchOptions.headers,
        },
        credentials: 'include',
      }

      console.log('[apiClient] Reintentando request original...')
      response = await fetch(url, retryOptions)
      console.log(`[apiClient] Reintento: ${response.status}`)
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
      if (isClient) {
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }

      throw error
    }
  } else if (isClient && response.status === 401 && !skipRefresh && !isAuthRoute) {
    console.log('[apiClient] ❌ 401 sin posibilidad de refresh')

    if (isDev) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }

    setTimeout(() => {
      window.location.href = '/login'
    }, 100)

    throw new Error('No authentication')
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

  /**
   * POST con FormData (para subir archivos)
   */
  postFormData: async (url: string, formData: FormData, options?: FetchOptions) => {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    return response.json()
  },

  /**
   * GET que retorna Blob (para descargar archivos)
   */
  getBlob: async (url: string, options?: FetchOptions) => {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.blob()
  },
}

export default apiClient
