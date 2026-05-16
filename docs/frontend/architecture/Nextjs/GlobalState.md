# Estado Global en Four-Points

Este documento muestra cómo se maneja el estado global en nuestro proyecto.

---

## Resumen del Proyecto

| Tecnología | Uso | Archivos |
|------------|-----|----------|
| **Zustand** | Estado UI, filtros, datos locales | 4 stores en `app/stores/` |
| **React Context** | Autenticación | `app/lib/auth/useAuth.tsx` |
| **React Query** | Estado del servidor (data fetching) | Via `QueryClientProvider` |
| **Redux** | No utilizado | - |

### Filosofía del proyecto

```
Estado del CLIENTE (UI)     →  Zustand
Estado del SERVIDOR (API)   →  React Query
Estado de AUTENTICACIÓN     →  React Context
```

---

## 1. Zustand (Estado Global Principal)

### ¿Por qué Zustand?
- Más simple que Redux (sin boilerplate)
- Bundle más pequeño
- API intuitiva con hooks
- No necesita Provider

### Store 1: `useCashierStore.ts` (El más completo)

Maneja el estado del módulo de caja del hotel.

```typescript
// app/stores/useCashierStore.ts

import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// Tipos
interface CashierStore {
  // Estado
  selectedDate: string
  currentDate: Date
  activeTab: ShiftType
  logsActionFilter: string | null
  logsUserFilter: string | null
  
  // Acciones
  setSelectedDate: (date: string) => void
  setActiveTab: (tab: ShiftType) => void
  getCurrentMonth: () => string
  reset: () => void
}

// Estado inicial separado para reset
const initialState = {
  selectedDate: formatDateForInput(today),
  currentDate: today,
  activeTab: 'night' as ShiftType,
  logsActionFilter: null,
  logsUserFilter: null,
}

// Crear el store
export const useCashierStore = create<CashierStore>((set, get) => ({
  // Spread del estado inicial
  ...initialState,

  // ACCIONES con set()
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setLogsFilters: (action, user) => set({
    logsActionFilter: action,
    logsUserFilter: user,
  }),

  // MÉTODOS COMPUTADOS con get()
  getCurrentMonth: () => {
    return get().currentDate.toLocaleString('es-ES', { month: 'long' })
  },

  // RESET a estado inicial
  reset: () => set(initialState),
}))

// SELECTORES OPTIMIZADOS (evitan re-renders innecesarios)
export const useSelectedDate = () => useCashierStore((s) => s.selectedDate)
export const useActiveTab = () => useCashierStore((s) => s.activeTab)

// Selector con useShallow para objetos
export const useLogsFilters = () =>
  useCashierStore(
    useShallow((s) => ({
      actionFilter: s.logsActionFilter,
      userFilter: s.logsUserFilter,
    }))
  )
```

### Uso en componentes

```typescript
// app/components/cashier/CashierTabs.tsx

'use client'

import { useCashierStore, useActiveTab } from '@/app/stores/useCashierStore'

export function CashierTabs() {
  // Opción 1: Selector específico (RECOMENDADO - menos re-renders)
  const activeTab = useActiveTab()
  
  // Opción 2: Desestructurar del store
  const { setActiveTab } = useCashierStore()

  return (
    <div>
      <button 
        onClick={() => setActiveTab('morning')}
        className={activeTab === 'morning' ? 'active' : ''}
      >
        Mañana
      </button>
      <button 
        onClick={() => setActiveTab('night')}
        className={activeTab === 'night' ? 'active' : ''}
      >
        Noche
      </button>
    </div>
  )
}
```

### Store 2: `useGroupStore.ts` (Con acciones async)

Maneja grupos con llamadas a API.

```typescript
// app/stores/useGroupStore.ts

import { create } from 'zustand'
import { groupsApi } from '@/app/lib/groups'

interface GroupStore {
  currentGroup: Group | null
  payments: Payment[]
  isLoadingGroup: boolean
  
  // Acciones async
  refreshGroup: (groupId: number) => Promise<void>
  refreshPayments: (groupId: number) => Promise<void>
  deletePayment: (groupId: number, paymentId: number) => Promise<void>
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  currentGroup: null,
  payments: [],
  isLoadingGroup: false,

  // ACCIÓN ASYNC: Refresh con API
  refreshGroup: async (groupId: number) => {
    set({ isLoadingGroup: true })
    try {
      const response = await groupsApi.getById(groupId)
      set({ currentGroup: response.data })
    } finally {
      set({ isLoadingGroup: false })
    }
  },

  refreshPayments: async (groupId: number) => {
    const response = await groupsApi.getPayments(groupId)
    set({ payments: response.data })
  },

  // ACCIÓN COMPUESTA: Delete + Refresh
  deletePayment: async (groupId: number, paymentId: number) => {
    await groupsApi.deletePayment(groupId, paymentId)
    // Usar get() para llamar otra acción del store
    await get().refreshPayments(groupId)
  },
}))
```

### Store 3: `useNotificationStore.ts` (Store ligero para UI)

```typescript
// app/stores/useNotificationStore.ts

import { create } from 'zustand'

interface NotificationUIStore {
  isDropdownOpen: boolean
  selectedNotificationId: string | null
  
  setDropdownOpen: (open: boolean) => void
  setSelectedNotification: (id: string | null) => void
  reset: () => void
}

export const useNotificationStore = create<NotificationUIStore>((set) => ({
  isDropdownOpen: false,
  selectedNotificationId: null,

  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  setSelectedNotification: (id) => set({ selectedNotificationId: id }),
  reset: () => set({ isDropdownOpen: false, selectedNotificationId: null }),
}))
```

### Store 4: `useMaintenanceStore.ts` (Con arrays inmutables)

```typescript
// app/stores/useMaintenanceStore.ts

import { create } from 'zustand'

interface MaintenanceState {
  currentReport: MaintenanceReport | null
  images: ReportImage[]
  history: HistoryEntry[]
  
  setCurrentReport: (report: MaintenanceReport | null) => void
  addImage: (image: ReportImage) => void
  removeImage: (imageId: string) => void
  clearImages: () => void
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  currentReport: null,
  images: [],
  history: [],

  setCurrentReport: (report) => set({ currentReport: report }),

  // MODIFICACIÓN INMUTABLE de arrays
  addImage: (image) =>
    set((state) => ({
      images: [...state.images, image],  // Spread para nuevo array
    })),

  removeImage: (imageId) =>
    set((state) => ({
      images: state.images.filter((img) => img.id !== imageId),
    })),

  clearImages: () => set({ images: [] }),

  addHistoryEntry: (entry) =>
    set((state) => ({
      history: [entry, ...state.history],  // Nuevo al principio
    })),
}))
```

---

## 2. React Context (Autenticación)

### ¿Por qué Context para Auth?
- Necesita envolver toda la app
- Estado simple (user, loading, funciones)
- No necesita la complejidad de Zustand

### `useAuth.tsx` - Contexto de Autenticación

```typescript
// app/lib/auth/useAuth.tsx

'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { authLogin } from './authLogin'

// Tipos
interface User {
  id: number
  username: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

// 1. CREAR CONTEXTO
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 2. PROVIDER
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Verificar sesión al montar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authLogin.getCurrentUser()
        setUser(userData)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  // LOGIN
  const login = useCallback(async (username: string, password: string) => {
    setLoading(true)
    try {
      const data = await authLogin.login(username, password)
      setUser(data.user)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }, [router])

  // LOGOUT
  const logout = useCallback(async () => {
    await authLogin.logout()
    setUser(null)
    router.replace('/')
  }, [router])

  // REFRESH USER
  const refreshUser = useCallback(async () => {
    try {
      const userData = await authLogin.getCurrentUser()
      setUser(userData)
    } catch {
      setUser(null)
    }
  }, [])

  // VALUE del contexto
  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// 3. HOOK CONSUMIDOR
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  
  return context
}
```

### Uso en componentes

```typescript
// app/components/Header.tsx

'use client'

import { useAuth } from '@/app/lib/auth/useAuth'

export function Header() {
  const { user, loading, logout } = useAuth()

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <header>
      {user ? (
        <div>
          <span>Hola, {user.name}!</span>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      ) : (
        <a href="/login">Iniciar sesión</a>
      )}
    </header>
  )
}
```

```typescript
// app/components/LoginForm.tsx

'use client'

import { useState } from 'react'
import { useAuth } from '@/app/lib/auth/useAuth'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  
  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      await login(username, password)
      // Si llega aquí, login exitoso - router.push ya se hizo
    } catch (err) {
      setError('Credenciales inválidas')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Usuario"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Iniciar sesión'}
      </button>
    </form>
  )
}
```

---

## 3. Composición de Providers

### `ThemeProvider.tsx` - Todos los providers juntos

```typescript
// app/lib/theme/ThemeProvider.tsx

'use client'

import { useState } from 'react'
import { NextUIProvider } from '@nextui-org/react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '../auth/useAuth'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // QueryClient con configuración por defecto
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,           // 30 segundos
            gcTime: 5 * 60 * 1000,          // 5 minutos
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <NextUIProvider>
      <NextThemesProvider attribute="class" defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </QueryClientProvider>
      </NextThemesProvider>
    </NextUIProvider>
  )
}
```

### Orden de los Providers (importante)

```
NextUIProvider          → UI framework
  └─ NextThemesProvider → Tema claro/oscuro
      └─ QueryClientProvider → React Query (data fetching)
          └─ AuthProvider → Autenticación
              └─ {children} → Tu app
```

---

## 4. Cuándo usar cada uno

### Zustand
```
✅ Estado de UI (filtros, tabs activos, modales)
✅ Estado compartido entre componentes no relacionados
✅ Estado que persiste durante la sesión
✅ Acciones complejas con lógica de negocio

❌ Estado del servidor (usa React Query)
❌ Estado de formularios (usa useState local)
```

### React Context
```
✅ Autenticación
✅ Tema de la aplicación
✅ Configuración global simple
✅ Estado que necesita Provider

❌ Estado complejo con muchas acciones
❌ Estado que cambia frecuentemente (causa re-renders)
```

### React Query (ver StateLibrary.md)
```
✅ Datos de API
✅ Cache de datos del servidor
✅ Sincronización con backend
✅ Loading/error states automáticos

❌ Estado puramente de UI
❌ Estado que no viene del servidor
```

---

## 5. Flujo de datos completo

```
┌──────────────────────────────────────────────────────────────┐
│                        APLICACIÓN                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  AuthContext │  │   Zustand   │  │    React Query      │   │
│  │             │  │   Stores    │  │                     │   │
│  │  • user     │  │             │  │  • Server data      │   │
│  │  • login()  │  │  • UI state │  │  • Cache            │   │
│  │  • logout() │  │  • filters  │  │  • Mutations        │   │
│  │             │  │  • tabs     │  │  • Invalidation     │   │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘   │
│         │                │                     │              │
│         └────────────────┼─────────────────────┘              │
│                          │                                    │
│                          ▼                                    │
│                   ┌──────────────┐                            │
│                   │  Componentes │                            │
│                   │              │                            │
│                   │  useAuth()   │                            │
│                   │  useStore()  │                            │
│                   │  useQuery()  │                            │
│                   └──────────────┘                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### Ejemplo de componente usando los tres

```typescript
'use client'

import { useAuth } from '@/app/lib/auth/useAuth'
import { useCashierStore } from '@/app/stores/useCashierStore'
import { useDailyDetails } from '@/app/lib/cashier/queries'

export function CashierDashboard() {
  // Auth Context - ¿Quién está logueado?
  const { user } = useAuth()
  
  // Zustand - Estado de UI
  const { selectedDate, setSelectedDate } = useCashierStore()
  
  // React Query - Datos del servidor
  const { data, isLoading } = useDailyDetails(selectedDate)

  if (!user) return <div>No autorizado</div>
  if (isLoading) return <div>Cargando...</div>

  return (
    <div>
      <h1>Bienvenido, {user.name}</h1>
      <input 
        type="date" 
        value={selectedDate} 
        onChange={(e) => setSelectedDate(e.target.value)} 
      />
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
```
