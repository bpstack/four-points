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

import toast from 'react-hot-toast'

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

// URLs según entorno
const isDev = process.env.NODE_ENV === 'development'
const isClient = typeof window !== 'undefined'

import { API_BASE_URL } from '@/app/lib/env'

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

  // Siempre confiar en cookies HttpOnly; no usar localStorage
  return {}
}

/**
 * Verifica si hay refresh token disponible
 */
function hasRefreshToken(): boolean {
  if (!isClient) return false
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

  let response = await fetch(url, finalOptions)

  // Rutas que no requieren autenticación
  const isAuthRoute =
    url.includes('/auth/login') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/register')

  // Auto-refresh cuando recibimos 401
  if (isClient && response.status === 401 && !skipRefresh && !isAuthRoute && hasRefreshToken()) {
    // Si ya hay refresh en curso, encolar este request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        return fetchWithRefresh(url, { ...options, skipRefresh: true })
      })
    }

    isRefreshing = true

    try {
      const refreshUrl = `${API_BASE_URL}/api/auth/refresh-token`

      const refreshOptions: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }

      const refreshResponse = await fetch(refreshUrl, refreshOptions)

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed: ${refreshResponse.status}`)
      }

      const data = await refreshResponse.json()

      // Las cookies se actualizan vía backend; no usar localStorage
      if (isClient && data.token) {
        document.cookie = `access_token=${data.token}; path=/; max-age=900; samesite=lax`
        if (data.refreshToken) {
          document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=604800; samesite=lax`
        }
      }

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

      response = await fetch(url, retryOptions)
    } catch (error) {
      isRefreshing = false
      processQueue(error)

      // Limpiar cookies
      if (isClient) {
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
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
    if (isClient) {
      document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    setTimeout(() => {
      window.location.href = '/login'
    }, 100)

    throw new Error('No authentication')
  }

  return response
}

// ========================================
// MANEJO DE ERRORES
// ========================================

/**
 * Error personalizado para respuestas de API
 * - demo: true indica restricción de modo demo (toast ya mostrado)
 */
export class ApiError extends Error {
  demo: boolean
  status: number

  constructor(message: string, status: number, demo: boolean = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.demo = demo
  }
}

/**
 * Procesa errores de API.
 * - Para errores demo: muestra toast y hace throw con demo=true
 * - Para otros errores: hace throw normal
 * 
 * Nota: En desarrollo, Next.js muestra estos errores en el overlay.
 * Esto es solo informativo y no afecta producción.
 */
async function handleApiError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({
    error: `HTTP ${response.status}: ${response.statusText}`,
  }))

  const message = errorData.error || errorData.message || `Request failed: ${response.status}`
  const isDemo = errorData.demo === true

  // Para errores demo: mostrar toast especial
  if (isDemo && isClient) {
    toast('Modo Demo: Esta acción no está disponible', {
      duration: 4000,
      icon: '🔒',
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #F59E0B',
      },
    })
  }

  throw new ApiError(message, response.status, isDemo)
}

/**
 * Helper para verificar si un error es de tipo demo.
 * Útil en catch blocks para evitar mostrar doble toast.
 */
export function isDemoError(error: unknown): boolean {
  return error instanceof ApiError && error.demo === true
}

// ========================================
// API CLIENT PÚBLICO
// ========================================

export const apiClient = {
  get: async (url: string, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, { ...options, method: 'GET' })

    if (!response.ok) {
      await handleApiError(response)
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
      await handleApiError(response)
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
      await handleApiError(response)
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
      await handleApiError(response)
    }

    return response.json()
  },

  delete: async (url: string, options?: FetchOptions) => {
    const response = await fetchWithRefresh(url, { ...options, method: 'DELETE' })

    if (!response.ok) {
      await handleApiError(response)
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
   * Usa fetchWithRefresh para auto-refresh de tokens expirados
   */
  postFormData: async (url: string, formData: FormData, options?: FetchOptions): Promise<any> => {
    // No incluir Content-Type - el browser lo añade automáticamente con boundary para FormData
    const { skipRefresh, ...fetchOptions } = options || {}
    
    const finalOptions: RequestInit = {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        ...fetchOptions.headers,
      },
    }

    let response = await fetch(url, finalOptions)

    // Auto-refresh cuando recibimos 401 (mismo patrón que fetchWithRefresh)
    if (isClient && response.status === 401 && !skipRefresh && hasRefreshToken()) {
      // Si ya hay refresh en curso, encolar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return apiClient.postFormData(url, formData, { ...options, skipRefresh: true })
        })
      }

      isRefreshing = true

      try {
        const refreshUrl = `${API_BASE_URL}/api/auth/refresh-token`
        const refreshOptions: RequestInit = {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }

        if (isDev) {
          const refreshToken = localStorage.getItem('refresh_token')
          if (!refreshToken) throw new Error('No refresh token')
          ;(refreshOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshToken}`
        }

        const refreshResponse = await fetch(refreshUrl, refreshOptions)
        if (!refreshResponse.ok) {
          throw new Error(`Refresh failed: ${refreshResponse.status}`)
        }

        const data = await refreshResponse.json()

        if (isDev && data.token) {
          localStorage.setItem('access_token', data.token)
          document.cookie = `access_token=${data.token}; path=/; max-age=900; samesite=lax`
          if (data.refreshToken) {
            localStorage.setItem('refresh_token', data.refreshToken)
            document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=604800; samesite=lax`
          }
        }

        isRefreshing = false
        processQueue()

        // Reintentar con nuevo token
        const retryOptions: RequestInit = {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: {
            ...getAuthHeaders(),
            ...fetchOptions.headers,
          },
        }

        response = await fetch(url, retryOptions)
      } catch (error) {
        isRefreshing = false
        processQueue(error)

        if (isDev) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }

        if (isClient) {
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }

        throw error
      }
    }

    if (!response.ok) {
      await handleApiError(response)
    }

    return response.json()
  },

  /**
   * GET que retorna Blob (para descargar archivos)
   * Usa auto-refresh para tokens expirados
   */
  getBlob: async (url: string, options?: FetchOptions): Promise<Blob> => {
    const { skipRefresh, ...fetchOptions } = options || {}
    
    const finalOptions: RequestInit = {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        ...fetchOptions.headers,
      },
    }

    let response = await fetch(url, finalOptions)

    // Auto-refresh cuando recibimos 401
    if (isClient && response.status === 401 && !skipRefresh && hasRefreshToken()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return apiClient.getBlob(url, { ...options, skipRefresh: true })
        })
      }

      isRefreshing = true

      try {
        const refreshUrl = `${API_BASE_URL}/api/auth/refresh-token`
        const refreshOptions: RequestInit = {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }

        if (isDev) {
          const refreshToken = localStorage.getItem('refresh_token')
          if (!refreshToken) throw new Error('No refresh token')
          ;(refreshOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshToken}`
        }

        const refreshResponse = await fetch(refreshUrl, refreshOptions)
        if (!refreshResponse.ok) {
          throw new Error(`Refresh failed: ${refreshResponse.status}`)
        }

        const data = await refreshResponse.json()

        if (isDev && data.token) {
          localStorage.setItem('access_token', data.token)
          document.cookie = `access_token=${data.token}; path=/; max-age=900; samesite=lax`
          if (data.refreshToken) {
            localStorage.setItem('refresh_token', data.refreshToken)
            document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=604800; samesite=lax`
          }
        }

        isRefreshing = false
        processQueue()

        const retryOptions: RequestInit = {
          method: 'GET',
          credentials: 'include',
          headers: {
            ...getAuthHeaders(),
            ...fetchOptions.headers,
          },
        }

        response = await fetch(url, retryOptions)
      } catch (error) {
        isRefreshing = false
        processQueue(error)

        if (isDev) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        }

        if (isClient) {
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }

        throw error
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.blob()
  },
}

export default apiClient
