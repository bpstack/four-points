// ============================================================
// 🔒 CÓDIGO ORIGINAL (COOKIES HTTPONLY) - PARA PRODUCCIÓN
// ============================================================

// Este es el archivo completo que no se debe eliminar bajo ningún concepto que usa los proxies de Next.js
// /**
//  * Cliente API con auto-refresh de tokens -- importante no borrar nunca comentarios de este archivo bajo ningún concepto
//  *
//  * 🔧 MODO DESARROLLO (actual):
//  * - Llama directamente al backend (localhost:4000)
//  * - Auto-refresh funciona llamando a backend/auth/refresh-token
//  *
//  * 🚀 PARA PRODUCCIÓN:
//  * - Cambiar URLs a '/api/*' (proxies de Next.js)
//  * - Implementar proxy /api/auth/refresh-token con lógica de refresh
//  * - Ver archivo: docs/PRODUCTION_AUTH_SETUP.md
//  *
//  * ✅ Características:
//  * - Detecta tokens expirados (401)
//  * - Previene race conditions en refresh concurrente
//  * - Reintenta peticiones automáticamente
//  * - Logging detallado para debug
//  */

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

// ✅ Configuración centralizada
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Variables para manejar refresh concurrente
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

// ✅ NUEVO: Helper para verificar si hay refresh token
function hasRefreshToken(): boolean {
  if (typeof document === 'undefined') return false

  const cookies = document.cookie.split(';')
  return cookies.some((cookie) => cookie.trim().startsWith('refresh_token='))
}

async function fetchWithRefresh(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipRefresh, ...fetchOptions } = options

  const finalOptions: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // ✅ Siempre enviar cookies
  }

  console.log(`[apiClient] Request: ${options.method || 'GET'} ${url}`)
  let response = await fetch(url, finalOptions)
  console.log(`[apiClient] Response: ${response.status} ${url}`)

  // ✅ Detectar si la ruta requiere autenticación
  const requiresAuth =
    !url.includes('/auth/login') &&
    !url.includes('/auth/logout') &&
    !url.includes('/auth/refresh-token') &&
    !url.includes('/auth/register')

  // ✅ CRÍTICO: Solo intentar refresh si:
  // 1. Recibimos 401
  // 2. No está skipRefresh activado
  // 3. La ruta requiere auth
  // 4. HAY un refresh token disponible
  if (response.status === 401 && !skipRefresh && requiresAuth && hasRefreshToken()) {
    console.log('[apiClient] 🔄 Token expirado (401), intentando refresh...')

    // Si ya hay un refresh en curso, encolar esta petición
    if (isRefreshing) {
      console.log('[apiClient] ⏳ Refresh ya en curso, encolando request...')
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then(() => {
          console.log('[apiClient] 🔄 Reintentando request después del refresh...')
          return fetchWithRefresh(url, { ...options, skipRefresh: true })
        })
        .catch((error) => {
          throw error
        })
    }

    isRefreshing = true
    console.log('[apiClient] 🚀 Iniciando proceso de refresh...')

    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        credentials: 'include',
      })

      console.log('[apiClient] Refresh response status:', refreshResponse.status)

      if (refreshResponse.ok) {
        console.log('[apiClient] ✅ Token refrescado exitosamente')
        isRefreshing = false
        processQueue() // Resolver todas las requests en cola

        // Reintentar la request original con el nuevo token
        console.log('[apiClient] 🔄 Reintentando request original...')
        response = await fetch(url, finalOptions)
        console.log(`[apiClient] Request reintento: ${response.status} ${url}`)
      } else {
        // Refresh falló - sesión expirada completamente
        console.log('[apiClient] ❌ Refresh falló, sesión expirada')
        isRefreshing = false
        const error = new Error('Session expired')
        processQueue(error)

        // Redirigir a login
        if (typeof window !== 'undefined') {
          console.log('[apiClient] 🔄 Redirigiendo a login...')
          setTimeout(() => {
            window.location.href = '/login'
          }, 100)
        }

        throw error
      }
    } catch (error) {
      console.error('[apiClient] ❌ Error durante refresh:', error)
      isRefreshing = false
      processQueue(error)

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }

      throw error
    }
  } else if (response.status === 401 && !skipRefresh && requiresAuth && !hasRefreshToken()) {
    // ✅ NUEVO: Si recibimos 401 pero NO hay refresh token, redirigir directamente
    console.log('[apiClient] ❌ 401 sin refresh token disponible, redirigiendo a login')
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
    }
    throw new Error('No authentication token available')
  }

  return response
}

// ========================================
// MÉTODOS PÚBLICOS DEL API CLIENT
// ========================================
export const apiClient = {
  /**
   * GET request con auto-refresh
   */
  get: async (url: string, options?: FetchOptions) => {
    console.log(`[apiClient.get] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'GET',
    })

    console.log(`[apiClient.get] Response final: ${response.status} ${url}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      console.error(`[apiClient.get] Error ${response.status}:`, errorData)
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[apiClient.get] ✅ Success: ${url}`)
    return data
  },

  /**
   * POST request con auto-refresh
   */
  post: async (url: string, data?: any, options?: FetchOptions) => {
    console.log(`[apiClient.post] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    console.log(`[apiClient.post] Response final: ${response.status} ${url}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      console.error(`[apiClient.post] Error ${response.status}:`, errorData)
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    const result = await response.json()
    console.log(`[apiClient.post] ✅ Success: ${url}`)
    return result
  },

  /**
   * PUT request con auto-refresh
   */
  put: async (url: string, data?: any, options?: FetchOptions) => {
    console.log(`[apiClient.put] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    console.log(`[apiClient.put] Response final: ${response.status} ${url}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      console.error(`[apiClient.put] Error ${response.status}:`, errorData)
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    const result = await response.json()
    console.log(`[apiClient.put] ✅ Success: ${url}`)
    return result
  },

  /**
   * DELETE request con auto-refresh
   */
  delete: async (url: string, options?: FetchOptions) => {
    console.log(`[apiClient.delete] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'DELETE',
    })

    console.log(`[apiClient.delete] Response final: ${response.status} ${url}`)

    if (!response.ok) {
      let errorData
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json()
        } catch {
          errorData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
          }
        }
      } else {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      console.error(`[apiClient.delete] Error ${response.status}:`, errorData)
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    // Success: siempre devolver un objeto con success y message
    const contentType = response.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      try {
        const result = await response.json()
        console.log(`[apiClient.delete] ✅ Success: ${url}`)
        return result
      } catch {
        console.log(`[apiClient.delete] ✅ Success: ${url}`)
        return { success: true, message: 'Deleted successfully' }
      }
    } else {
      console.log(`[apiClient.delete] ✅ Success: ${url}`)
      return { success: true, message: 'Deleted successfully' }
    }
  },
}

export default apiClient
