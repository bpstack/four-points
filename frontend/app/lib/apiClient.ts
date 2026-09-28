// app/lib/apiClient.ts

/**
 * Cliente API con auto-refresh de JWT
 *
 * Estrategia de autenticación:
 * En desarrollo y producción: cookies HttpOnly; sin estado duplicado (no localStorage)
 */

import toast from 'react-hot-toast'

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

// URLs según entorno
const isClient = typeof window !== 'undefined'

import { API_BASE_URL } from '@/app/lib/env'

// URLs can carry personal data (e.g. document numbers in blacklist search): no logs in production
const debug: (...args: unknown[]) => void =
  process.env.NODE_ENV === 'production' ? () => undefined : console.log.bind(console)

// Cola para manejar refresh concurrente
let isRefreshing = false
let refreshAttempts = 0 // Circuit breaker para evitar loops infinitos
let lastRefreshTime = 0 // Timestamp del ultimo refresh exitoso
const MAX_REFRESH_ATTEMPTS = 3
const REFRESH_COOLDOWN_MS = 5000 // 5 segundos entre reseteos de intentos

type Deferred = {
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}

let failedQueue: Deferred[] = []

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else {
      promise.resolve()
    }
  })
  failedQueue = []
}

// Reset refresh attempts después de un refresh exitoso
const resetRefreshAttempts = () => {
  refreshAttempts = 0
  lastRefreshTime = Date.now()
}

// Verificar si debemos resetear el contador (ha pasado suficiente tiempo)
const shouldResetAttempts = () => {
  return Date.now() - lastRefreshTime > REFRESH_COOLDOWN_MS
}

// ========================================
// HELPERS DE AUTENTICACIÓN
// ========================================

/**
 * Obtiene headers de autenticación
 * Las cookies HttpOnly viajan con `credentials: 'include'`; no se añaden tokens manualmente
 */
function getAuthHeaders(): Record<string, string> {
  if (!isClient) return {}
  return {}
}

function clearAuthCookiesAndRedirect(): void {
  if (!isClient) return

  // Evitar multiples redirects simultaneos
  if ((window as unknown as { __redirectingToLogin?: boolean }).__redirectingToLogin) {
    return
  }
  ;(window as unknown as { __redirectingToLogin?: boolean }).__redirectingToLogin = true

  // HttpOnly cookies can only be cleared by the backend
  fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
  }).catch(() => undefined)

  // Reset estado del modulo
  isRefreshing = false
  refreshAttempts = 0
  failedQueue = []

  // Usar replace para no agregar al historial
  window.location.replace('/login')
}

async function refreshSession(): Promise<void> {
  const refreshUrl = `${API_BASE_URL}/api/auth/refresh-token`

  debug('[apiClient] 🔄 Intentando refresh token...')

  const refreshOptions: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  }

  const refreshResponse = await fetch(refreshUrl, refreshOptions)

  if (!refreshResponse.ok) {
    debug('[apiClient] ❌ Refresh falló:', refreshResponse.status)
    throw new Error(`Refresh failed: ${refreshResponse.status}`)
  }

  debug('[apiClient] ✅ Refresh exitoso')
  await refreshResponse.json().catch(() => null)
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

  debug(`[apiClient] ${finalOptions.method || 'GET'} ${url} → ${response.status}`)

  // Rutas que no deben intentar auto-refresh de token
  // NOTA: /auth/me SÍ debe hacer refresh ya que es usada para validar sesión
  const isAuthRoute =
    url.includes('/auth/login') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/refresh-token') ||
    url.includes('/auth/register')

  // Auto-refresh cuando recibimos 401
  // IMPORTANTE: Siempre intentamos refresh sin verificar hasRefreshToken()
  // porque las cookies HttpOnly NO son visibles desde JavaScript (document.cookie).
  // El backend/proxy tiene acceso a la cookie y determina si es válida.
  // Si el refresh falla, entonces sí redirigimos al login.
  if (isClient && response.status === 401 && !skipRefresh && !isAuthRoute) {
    // Resetear contador si ha pasado suficiente tiempo desde el ultimo refresh
    if (shouldResetAttempts()) {
      refreshAttempts = 0
    }

    debug(
      '[apiClient] 🔑 Recibido 401, intentando refresh... (intento',
      refreshAttempts + 1,
      'de',
      MAX_REFRESH_ATTEMPTS,
      ')'
    )

    // Circuit breaker: si ya intentamos demasiadas veces, redirigir al login
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      debug('[apiClient] ⛔ Máximo de intentos de refresh alcanzado, redirigiendo a login')
      clearAuthCookiesAndRedirect()
      throw new Error('Max refresh attempts reached')
    }

    refreshAttempts++
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
      await refreshSession()

      debug('[apiClient] ✅ Refresh exitoso')
      resetRefreshAttempts() // Reset counter on success
      isRefreshing = false
      processQueue()

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
      debug('[apiClient] ❌ Refresh falló, redirigiendo a login...', error)
      isRefreshing = false
      processQueue(error)
      clearAuthCookiesAndRedirect()

      throw error
    }
  }

  return response
}

// ========================================
// MANEJO DE ERRORES
// ========================================

/**
 * Error personalizado para respuestas de API
 * - demo: true indica restricción de modo demo (toast ya mostrado)
 * - code: código de error del backend para i18n (ej: 'AUTH_INVALID_CREDENTIALS')
 */
export class ApiError extends Error {
  demo: boolean
  status: number
  code?: string
  body?: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    demo: boolean = false,
    code?: string,
    body?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.demo = demo
    this.code = code
    this.body = body
  }
}

/**
 * Procesa errores de API.
 * - Para errores demo: muestra toast y hace throw con demo=true
 * - Para otros errores: hace throw normal
 * - Captura el código de error del backend para traducción i18n
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
  const errorCode = errorData.code // Capture error code for i18n

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

  throw new ApiError(message, response.status, isDemo, errorCode, errorData)
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
  get: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithRefresh(url, { ...options, method: 'GET' })

    if (!response.ok) {
      await handleApiError(response)
    }

    return response.json()
  },

  post: async <T = unknown>(url: string, data?: unknown, options?: FetchOptions): Promise<T> => {
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

  patch: async <T = unknown>(url: string, data?: unknown, options?: FetchOptions): Promise<T> => {
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

  put: async <T = unknown>(url: string, data?: unknown, options?: FetchOptions): Promise<T> => {
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

  delete: async <T = unknown>(url: string, options?: FetchOptions): Promise<T> => {
    const response = await fetchWithRefresh(url, { ...options, method: 'DELETE' })

    if (!response.ok) {
      await handleApiError(response)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      try {
        return await response.json()
      } catch {
        return { success: true, message: 'Deleted successfully' } as T
      }
    }

    return { success: true, message: 'Deleted successfully' } as T
  },

  /**
   * POST con FormData (para subir archivos)
   * Usa fetchWithRefresh para auto-refresh de tokens expirados
   */
  postFormData: async <T = unknown>(
    url: string,
    formData: FormData,
    options?: FetchOptions
  ): Promise<T> => {
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
    // IMPORTANTE: No verificamos hasRefreshToken() - las cookies HttpOnly no son visibles en JS
    if (isClient && response.status === 401 && !skipRefresh) {
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
        await refreshSession()

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
        clearAuthCookiesAndRedirect()

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
    // IMPORTANTE: No verificamos hasRefreshToken() - las cookies HttpOnly no son visibles en JS
    if (isClient && response.status === 401 && !skipRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          return apiClient.getBlob(url, { ...options, skipRefresh: true })
        })
      }

      isRefreshing = true

      try {
        await refreshSession()

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
        clearAuthCookiesAndRedirect()

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
