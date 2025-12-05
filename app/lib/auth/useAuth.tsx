// app/lib/login/useAuth.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authLogin } from './authService'
import type { User } from '@/app/lib/logbooks/types'

const DEV_MODE = false

const DEV_USER: User = {
  id: 'dev-uuid-12345',
  username: 'Dev-user',
  email: 'dev@example.com',
  role: 'developer',
}

const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/forgot-password',
  '/login',
  '/register',
]

// ========================================
// FUNCIÓN HELPER PARA FORMATEAR USERNAME
// ========================================
function formatUsername(username: string): string {
  if (!username) return username
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()
}

// ========================================
// TIPOS
// ========================================
interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

// ========================================
// CONTEXTO
// ========================================
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ========================================
// PROVIDER
// ========================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // 🔍 Verificar sesión
  const checkSession = useCallback(async () => {
    // ✅ CRÍTICO: En rutas públicas, NO verificar sesión
    // Esto evita llamadas innecesarias a /api/auth/me que causan el loop
    if (PUBLIC_ROUTES.includes(pathname)) {
      console.log('[useAuth] Ruta pública, saltando verificación:', pathname)
      setLoading(false)
      return
    }

    console.log('[useAuth] Verificando sesión en:', pathname)

    if (DEV_MODE) {
      console.log('[useAuth] Modo DEV activado')
      setUser(DEV_USER)
      setLoading(false)
      return
    }

    try {
      const me = await authLogin.me()
      console.log('[useAuth] Sesión válida:', me.username)

      const formattedUser: User = {
        ...me,
        username: formatUsername(me.username),
      }

      setUser(formattedUser)
    } catch (error: any) {
      console.log('[useAuth] No hay sesión activa:', error?.message)
      setUser(null)

      // ✅ CRÍTICO: NO redirigir aquí, el middleware ya maneja esto
      // Solo limpiar el estado del usuario
    } finally {
      setLoading(false)
    }
  }, [pathname])

  // 🚀 Inicialización
  useEffect(() => {
    checkSession()
  }, [pathname, checkSession])

  // 🔐 Login
  const login = useCallback(
    async (username: string, password: string) => {
      console.log('[useAuth] Iniciando login para:', username)
      setLoading(true)

      try {
        if (DEV_MODE) {
          console.log('[useAuth] Login DEV exitoso')
          setUser(DEV_USER)
          setLoading(false)
          router.push('/dashboard')
          return
        }

        const data = await authLogin.login(username, password)
        console.log('[useAuth] Login exitoso:', data.user.username)

        const formattedUser: User = {
          ...data.user,
          username: formatUsername(data.user.username),
        }

        setUser(formattedUser)
        setLoading(false)

        const searchParams = new URLSearchParams(window.location.search)
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

        console.log('[useAuth] Redirigiendo a:', callbackUrl)
        router.push(callbackUrl)
      } catch (error) {
        console.error('[useAuth] Error en login:', error)
        setLoading(false)
        throw error
      }
    },
    [router]
  )

  // 🚪 Logout
  const logout = useCallback(async () => {
    console.log('[useAuth] Cerrando sesión...')
    setLoading(true)

    try {
      if (DEV_MODE) {
        console.log('[useAuth] Logout DEV')
        setUser(null)
      } else {
        await authLogin.logout()
        setUser(null)
      }

      console.log('[useAuth] Sesión cerrada, redirigiendo a /')
      setLoading(false)
      router.replace('/')
    } catch (error) {
      console.error('[useAuth] Error en logout:', error)
      setUser(null)
      setLoading(false)
      router.replace('/')
    }
  }, [router])

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ========================================
// HOOKS EXPORTADOS
// ========================================
export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext debe ser usado dentro de AuthProvider')
  }

  return context
}

export const useAuth = useAuthContext
