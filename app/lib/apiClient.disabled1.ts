// app/lib/apiClient.ts

// NUNCA DEBE USARSE USE CLIENT AQUÍ
// ESTE ARCHIVO DEBE SER SIEMPRE UN SERVER COMPONENT
// PARA QUE LOS PROXIES DE NEXT.JS FUNCIONEN CORRECTAMENTE
// 'use client'

// /**
//  * Cliente API con auto-refresh usando localStorage (DESARROLLO)
//  *
//  * ⚠️ TEMPORAL: Sistema simplificado para desarrollo
//  * 🔒 PRODUCCIÓN: Descomentar código inferior (cookies httpOnly)
//  */

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

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

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function hasRefreshToken(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('refresh_token')
}

async function fetchWithRefresh(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipRefresh, ...fetchOptions } = options

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...fetchOptions.headers,
    },
  }

  console.log(`[apiClient] Request: ${options.method || 'GET'} ${url}`)
  let response = await fetch(url, finalOptions)
  console.log(`[apiClient] Response: ${response.status} ${url}`)

  const requiresAuth =
    !url.includes('/auth/login') &&
    !url.includes('/auth/logout') &&
    !url.includes('/auth/refresh-token') &&
    !url.includes('/auth/register')

  if (response.status === 401 && !skipRefresh && requiresAuth && hasRefreshToken()) {
    console.log('[apiClient] 🔄 Token expirado (401), intentando refresh...')

    if (isRefreshing) {
      console.log('[apiClient] ⏳ Refresh ya en curso, encolando request...')
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(() => {
        console.log('[apiClient] 🔄 Reintentando request después del refresh...')
        return fetchWithRefresh(url, { ...options, skipRefresh: true })
      })
    }

    isRefreshing = true
    console.log('[apiClient] 🚀 Iniciando proceso de refresh...')

    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) throw new Error('No refresh token')

      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      })

      console.log('[apiClient] Refresh response status:', refreshResponse.status)

      if (refreshResponse.ok) {
        const data = await refreshResponse.json()

        if (data.token) {
          localStorage.setItem('access_token', data.token)
          console.log('[apiClient] ✅ Token refrescado')
        }

        if (data.refreshToken) {
          localStorage.setItem('refresh_token', data.refreshToken)
        }

        isRefreshing = false
        processQueue()

        console.log('[apiClient] 🔄 Reintentando request original...')
        response = await fetch(url, {
          ...finalOptions,
          headers: {
            ...finalOptions.headers,
            Authorization: `Bearer ${data.token}`,
          },
        })
        console.log(`[apiClient] Request reintento: ${response.status} ${url}`)
      } else {
        throw new Error('Refresh failed')
      }
    } catch (error) {
      console.error('[apiClient] ❌ Error durante refresh:', error)
      isRefreshing = false
      processQueue(error)

      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }

      throw error
    }
  } else if (response.status === 401 && !skipRefresh && requiresAuth && !hasRefreshToken()) {
    console.log('[apiClient] ❌ 401 sin refresh token, redirigiendo a login')
    localStorage.clear()
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
    }
    throw new Error('No authentication token available')
  }

  return response
}

export const apiClient = {
  get: async (url: string, options?: FetchOptions) => {
    console.log(`[apiClient.get] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, { ...options, method: 'GET' })
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

  post: async (url: string, data?: any, options?: FetchOptions) => {
    console.log(`[apiClient.post] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
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

  patch: async (url: string, data?: any, options?: FetchOptions) => {
    console.log(`[apiClient.patch] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: data ? JSON.stringify(data) : undefined,
    })
    console.log(`[apiClient.patch] Response final: ${response.status} ${url}`)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }))
      console.error(`[apiClient.patch] Error ${response.status}:`, errorData)
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

    const result = await response.json()
    console.log(`[apiClient.patch] ✅ Success: ${url}`)
    return result
  },

  put: async (url: string, data?: any, options?: FetchOptions) => {
    console.log(`[apiClient.put] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
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

  delete: async (url: string, options?: FetchOptions) => {
    console.log(`[apiClient.delete] Iniciando: ${url}`)
    const response = await fetchWithRefresh(url, { ...options, method: 'DELETE' })
    console.log(`[apiClient.delete] Response final: ${response.status} ${url}`)

    if (!response.ok) {
      let errorData
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
      } else {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }

      console.error(`[apiClient.delete] Error ${response.status}:`, errorData)
      throw new Error(errorData.error || errorData.message || `Request failed: ${response.status}`)
    }

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
