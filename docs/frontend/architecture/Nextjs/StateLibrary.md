# Librerías de Data Fetching en Four-Points

Este documento muestra cómo se usa React Query (TanStack Query) para data fetching en nuestro proyecto.

---

## Resumen del Proyecto

| Librería | Uso |
|----------|-----|
| **React Query** | Librería principal para todas las llamadas API |
| **SWR** | No utilizado |
| **Fetch nativo** | Solo en utilidades específicas (export PDF, etc.) |

---

## 1. Configuración del Provider

### `app/lib/theme/ThemeProvider.tsx`

```typescript
'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Crear QueryClient con useState para evitar recrearlo en cada render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,           // Datos frescos por 30 segundos
            gcTime: 5 * 60 * 1000,          // Garbage collection después de 5 min
            refetchOnWindowFocus: false,    // No refetch al volver a la ventana
            retry: 1,                       // Reintentar 1 vez si falla
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools solo en desarrollo */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  )
}
```

### Explicación de opciones

```typescript
staleTime: 30 * 1000
// Tiempo que los datos se consideran "frescos"
// Durante este tiempo, useQuery retorna datos del caché sin hacer fetch
// Después de 30s, los datos están "stale" y React Query puede refetch

gcTime: 5 * 60 * 1000  // (antes cacheTime)
// Tiempo que los datos permanecen en caché después de que ningún 
// componente los use. Después de 5 min, se eliminan.

refetchOnWindowFocus: false
// Por defecto React Query hace refetch cuando el usuario vuelve a la pestaña
// Lo desactivamos porque puede ser molesto en dashboards

retry: 1
// Si una query falla, reintenta 1 vez antes de mostrar error
```

---

## 2. Patrón de Query Keys

### ¿Por qué Query Keys?

Las query keys son la **identidad única** de cada query. React Query las usa para:
- Cachear datos
- Invalidar datos específicos
- Compartir datos entre componentes

### `app/lib/cashier/queries.ts` - Query Keys

```typescript
// Patrón de factory de keys
export const cashierKeys = {
  // Base key para todo el módulo
  all: ['cashier'] as const,
  
  // Keys específicas con parámetros
  daily: (date: string) => ['cashier', 'daily', date] as const,
  shifts: (date: string) => ['cashier', 'shifts', date] as const,
  shift: (id: number) => ['cashier', 'shift', id] as const,
  
  // Keys para recursos relacionados
  vouchers: () => ['cashier', 'vouchers'] as const,
  voucherStats: () => ['cashier', 'vouchers', 'stats'] as const,
}

// Uso:
// cashierKeys.daily('2024-01-15') → ['cashier', 'daily', '2024-01-15']
// cashierKeys.shift(123) → ['cashier', 'shift', 123]
```

### `app/lib/conciliation/queries.ts` - Keys con composición

```typescript
export const conciliationKeys = {
  all: ['conciliation'] as const,
  
  // Composición con spread
  lists: () => [...conciliationKeys.all, 'list'] as const,
  detail: (id: number) => [...conciliationKeys.all, 'detail', id] as const,
  byDay: (date: string) => [...conciliationKeys.all, 'day', date] as const,
  
  // Keys compuestas
  monthly: (year: number, month: number) =>
    [...conciliationKeys.all, 'monthly', year, month] as const,
}

// conciliationKeys.monthly(2024, 1) → ['conciliation', 'monthly', 2024, 1]
```

### Beneficio de este patrón

```typescript
// Invalidar TODO el módulo cashier
queryClient.invalidateQueries({ queryKey: cashierKeys.all })

// Invalidar solo un día específico
queryClient.invalidateQueries({ queryKey: cashierKeys.daily('2024-01-15') })

// Invalidar todos los shifts (sin importar la fecha)
queryClient.invalidateQueries({ queryKey: ['cashier', 'shifts'] })
```

---

## 3. Queries (GET)

### Query básica con tipado

```typescript
// app/lib/cashier/queries.ts

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/app/lib/apiClient'

export function useDailyDetails(date: string) {
  return useQuery<CashierDaily | null>({
    // Key única para esta query
    queryKey: cashierKeys.daily(date),
    
    // Función que trae los datos
    queryFn: async () => {
      try {
        const response = await apiClient.get(`${API_BASE}/api/cashier/daily/${date}`)
        return response as CashierDaily
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        // 404 es un estado válido (no hay datos para ese día)
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          return null
        }
        throw error  // Re-lanzar otros errores
      }
    },
    
    // Opciones específicas de esta query
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,  // No reintentar si falla
  })
}
```

### Query con condición `enabled`

```typescript
// app/lib/conciliation/queries.ts

export function useConciliationById(id: number) {
  return useQuery({
    queryKey: conciliationKeys.detail(id),
    
    queryFn: async (): Promise<ConciliationDetail> => {
      return apiClient.get<ConciliationDetail>(`${API_BASE}/api/conciliations/${id}`)
    },
    
    staleTime: 30 * 1000,
    
    // Solo ejecutar si id > 0
    // Útil cuando id viene de un select y puede ser 0 inicialmente
    enabled: id > 0,
  })
}
```

### Query con filtros dinámicos

```typescript
// app/lib/cashier/queries.ts

export function useVouchersHistory(filters?: {
  status?: string
  from_date?: string
  to_date?: string
  limit?: number
}) {
  return useQuery<VouchersHistoryResponse>({
    // Los filtros son parte de la key (cache separado por filtro)
    queryKey: ['cashier', 'reports', 'vouchers-history', filters],
    
    queryFn: async () => {
      // Construir query params
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.from_date) params.append('from_date', filters.from_date)
      if (filters?.to_date) params.append('to_date', filters.to_date)
      if (filters?.limit) params.append('limit', String(filters.limit))

      const url = `${API_BASE}/api/cashier/reports/vouchers-history?${params}`
      const response = await apiClient.get(url)
      return response as VouchersHistoryResponse
    },
    
    staleTime: 2 * 60 * 1000,
  })
}

// Uso:
// useVouchersHistory({ status: 'pending', limit: 10 })
// → key: ['cashier', 'reports', 'vouchers-history', { status: 'pending', limit: 10 }]
```

### Query con `select` para transformar datos

```typescript
// app/lib/groups/queries.ts

import { useQuery } from '@tanstack/react-query'

export function useGroups(filters: GroupFilters) {
  return useQuery({
    queryKey: groupsKeys.list(filters),
    
    queryFn: () => groupsApi.getAll(filters),
    
    // select transforma los datos ANTES de retornarlos
    // Solo se re-ejecuta si los datos cambian
    select: (response) => response.data,
    
    staleTime: 5 * 60 * 1000,
  })
}

// Sin select: data = { success: true, data: [...], count: 10 }
// Con select: data = [...]  (solo el array)
```

### Query con `initialData` (SSR hydration)

```typescript
// app/components/groups/GroupsListClient.tsx

'use client'

import { useQuery } from '@tanstack/react-query'

interface Props {
  initialGroups?: Group[]  // Viene del Server Component
}

export function GroupsListClient({ initialGroups }: Props) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: groupsKeys.list(filters),
    queryFn: () => groupsApi.getAll(filters),
    select: (res) => res.data,
    
    // Usar datos del servidor como inicial
    // React Query no hará fetch hasta que los datos estén stale
    initialData: initialGroups 
      ? { success: true, data: initialGroups, count: initialGroups.length } 
      : undefined,
    
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // isLoading será false si hay initialData
  // porque ya tenemos datos para mostrar

  return (
    <ul>
      {groups.map(group => (
        <li key={group.id}>{group.name}</li>
      ))}
    </ul>
  )
}
```

---

## 4. Mutations (POST, PUT, PATCH, DELETE)

### Mutation POST con invalidación

```typescript
// app/lib/conciliation/queries.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateConciliation() {
  const queryClient = useQueryClient()

  return useMutation({
    // Función que hace el POST
    mutationFn: async (data: CreateConciliationDTO): Promise<ConciliationDetail> => {
      return apiClient.post<ConciliationDetail>(`${API_BASE}/api/conciliations`, data)
    },
    
    // Después de crear exitosamente
    onSuccess: (newConciliation, variables) => {
      // Invalidar la lista (forzar refetch)
      queryClient.invalidateQueries({ queryKey: conciliationKeys.lists() })
      
      // Invalidar el día específico
      queryClient.invalidateQueries({ queryKey: conciliationKeys.byDay(variables.date) })
    },
    
    onError: (error) => {
      console.error('Error creando conciliación:', error)
    },
  })
}

// Uso en componente:
const createMutation = useCreateConciliation()

const handleCreate = () => {
  createMutation.mutate({
    date: '2024-01-15',
    amount: 1000,
  })
}
```

### Mutation PATCH

```typescript
// app/lib/cashier/queries.ts

export function useCloseDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, notes }: { date: string; notes?: string }) =>
      apiClient.patch(`${API_BASE}/api/cashier/daily/${date}/close`, { notes }),
    
    onSuccess: (_, { date }) => {
      // Invalidar ese día específico
      queryClient.invalidateQueries({ queryKey: cashierKeys.daily(date) })
    },
  })
}
```

### Mutation PUT

```typescript
// app/lib/cashier/queries.ts

export function useUpdateDenominations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      shiftId,
      denominations,
    }: {
      shiftId: number
      denominations: DenominationInput[]
    }) =>
      apiClient.put(
        `${API_BASE}/api/cashier/shifts/${shiftId}/denominations`, 
        { denominations }
      ),
    
    onSuccess: (_, { shiftId }) => {
      // Invalidar el shift actualizado
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
    },
  })
}
```

### Mutation DELETE

```typescript
// app/lib/conciliation/queries.ts

export function useDeleteConciliation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`${API_BASE}/api/conciliations/${id}`)
    },
    
    onSuccess: () => {
      // Invalidar la lista
      queryClient.invalidateQueries({ queryKey: conciliationKeys.lists() })
    },
  })
}
```

### Mutation con invalidación múltiple

```typescript
// app/lib/cashier/queries.ts

export function useUpdatePayments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, payments }: { shiftId: number; payments: PaymentInput[] }) => {
      return apiClient.put(`${API_BASE}/api/cashier/shifts/${shiftId}/payments`, { payments })
    },
    
    onSuccess: (response, { shiftId }) => {
      // Invalidar el shift específico
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
      
      // También invalidar el daily porque los totales cambian
      queryClient.invalidateQueries({ queryKey: ['cashier', 'daily'] })
    },
    
    onError: (error) => {
      console.error('❌ [Mutation] Error:', error)
    },
  })
}
```

---

## 5. Patrones Avanzados

### Custom Hook completo

```typescript
// app/lib/logbooks/hooks/useLogbooks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logbooksApi } from '../api'
import { logbookKeys } from '../keys'
import toast from 'react-hot-toast'

interface UseLogbooksOptions {
  date: string
  enabled?: boolean
}

export function useLogbooks({ date, enabled = true }: UseLogbooksOptions) {
  const queryClient = useQueryClient()

  // ============ QUERY ============
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: logbookKeys.list(date),
    queryFn: async (): Promise<LogEntry[]> => {
      const data = await logbooksApi.getLogbooksByDay(date)
      
      // Transformar datos si es necesario
      const entriesWithComments = data.map(entry => ({
        ...entry,
        comments: entry.comments || [],
      }))
      
      return entriesWithComments
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // ============ CREATE ============
  const createLogbook = useMutation({
    mutationFn: async (data: CreateLogbookDTO) => logbooksApi.createLogbook(data),
    
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.list(variables.date) })
      toast.success('Entrada creada correctamente')
    },
    
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear la entrada')
    },
  })

  // ============ UPDATE ============
  const updateLogbook = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateLogbookDTO }) =>
      logbooksApi.updateLogbook(id, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.list(date) })
      toast.success('Entrada actualizada')
    },
    
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar')
    },
  })

  // ============ DELETE ============
  const deleteLogbook = useMutation({
    mutationFn: async (id: number) => logbooksApi.deleteLogbook(id),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.list(date) })
      toast.success('Entrada eliminada')
    },
    
    onError: (error: Error) => {
      toast.error(error.message || 'Error al eliminar')
    },
  })

  // ============ TOGGLE STATUS ============
  const toggleStatus = useMutation({
    mutationFn: async ({ id, resolved }: { id: number; resolved: boolean }) =>
      logbooksApi.toggleStatus(id, resolved),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.list(date) })
    },
  })

  // ============ COMMENTS ============
  const createComment = useMutation({
    mutationFn: async ({ logbookId, content }: { logbookId: number; content: string }) =>
      logbooksApi.createComment(logbookId, content),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logbookKeys.list(date) })
      toast.success('Comentario añadido')
    },
  })

  // Retornar todo lo necesario
  return {
    // Query
    entries,
    isLoading,
    error,
    refetch,
    
    // Mutations
    createLogbook,
    updateLogbook,
    deleteLogbook,
    toggleStatus,
    createComment,
  }
}
```

### Uso del custom hook

```typescript
// app/components/logbooks/LogbooksContainer.tsx

'use client'

import { useLogbooks } from '@/app/lib/logbooks/hooks/useLogbooks'

export default function LogbooksContainer() {
  const dateString = '2024-01-15'
  
  const {
    entries,
    isLoading,
    createLogbook,
    updateLogbook,
    deleteLogbook,
    toggleStatus,
  } = useLogbooks({ date: dateString })

  const handleCreate = () => {
    createLogbook.mutate({
      date: dateString,
      title: 'Nueva entrada',
      content: 'Contenido...',
    })
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar entrada?')) {
      deleteLogbook.mutate(id)
    }
  }

  const handleToggle = (id: number, currentStatus: boolean) => {
    toggleStatus.mutate({ id, resolved: !currentStatus })
  }

  if (isLoading) return <div>Cargando...</div>

  return (
    <div>
      <button onClick={handleCreate} disabled={createLogbook.isPending}>
        {createLogbook.isPending ? 'Creando...' : 'Nueva entrada'}
      </button>
      
      <ul>
        {entries.map(entry => (
          <li key={entry.id}>
            <span>{entry.title}</span>
            <button onClick={() => handleToggle(entry.id, entry.resolved)}>
              {entry.resolved ? 'Reabrir' : 'Resolver'}
            </button>
            <button 
              onClick={() => handleDelete(entry.id)}
              disabled={deleteLogbook.isPending}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### Invalidación centralizada

```typescript
// app/dashboard/parking/status/hooks/useParkingStatus.ts

export function useParkingStatus(selectedDate: string) {
  const queryClient = useQueryClient()

  // Keys
  const statsKey = (date: string) => ['parking', 'stats', date]
  const bookingsKey = (date: string) => ['parking', 'bookings', date]
  const spotsKey = (date: string) => ['parking', 'spots', date]
  const overdueKey = () => ['parking', 'overdue']

  // Helper para invalidar todo
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: statsKey(selectedDate) })
    queryClient.invalidateQueries({ queryKey: bookingsKey(selectedDate) })
    queryClient.invalidateQueries({ queryKey: spotsKey(selectedDate) })
    queryClient.invalidateQueries({ queryKey: overdueKey() })
  }

  // Mutations usan invalidateAll
  const checkIn = useMutation({
    mutationFn: (data) => parkingApi.checkIn(data),
    onSuccess: invalidateAll,
  })

  const checkOut = useMutation({
    mutationFn: (bookingId) => parkingApi.checkOut(bookingId),
    onSuccess: invalidateAll,
  })

  return {
    // queries...
    checkIn,
    checkOut,
    invalidateAll,  // Exponer para uso manual
  }
}
```

---

## 6. Manejo de Estados

### Loading states

```typescript
const { data, isLoading, isFetching, isPending } = useQuery({...})

// isLoading: true en el primer fetch (sin datos en caché)
// isFetching: true cuando está haciendo fetch (incluye refetch)
// isPending: similar a isLoading

// Para mutations:
const mutation = useMutation({...})
mutation.isPending  // true mientras se ejecuta
mutation.isSuccess  // true si terminó bien
mutation.isError    // true si hubo error
```

### Error states

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['data'],
  queryFn: async () => {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(`Error ${response.status}`)
    }
    return response.json()
  },
})

if (isError) {
  return <div>Error: {error.message}</div>
}
```

### En componentes UI

```typescript
// app/components/scheduling/SchedulingClient.tsx

export function SchedulingClient() {
  const generateMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.generateSchedule(monthId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      toast.success('Horarios generados')
    },
    onError: () => {
      toast.error('Error al generar horarios')
    },
  })

  return (
    <button
      onClick={() => generateMutation.mutate(monthId)}
      disabled={generateMutation.isPending}
      className="btn-primary"
    >
      {generateMutation.isPending ? (
        <>
          <Spinner className="w-4 h-4" />
          Generando...
        </>
      ) : (
        <>
          <PlayIcon className="w-4 h-4" />
          Generar Horarios
        </>
      )}
    </button>
  )
}
```

---

## 7. API Client

### `app/lib/apiClient.ts`

El proyecto usa un wrapper sobre `fetch` que maneja:
- Auto-refresh de JWT tokens
- Manejo de errores centralizado
- Soporte para FormData (uploads)
- Soporte para Blob (downloads)

```typescript
// app/lib/apiClient.ts

class ApiClient {
  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const token = getToken()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    })

    // Si 401, intentar refresh token
    if (response.status === 401) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        return this.request(url, options)  // Reintentar
      }
      throw new Error('Session expired')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Error ${response.status}`)
    }

    return response.json()
  }

  get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' })
  }

  post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  put<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' })
  }

  // Para uploads de archivos
  postFormData<T>(url: string, formData: FormData): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: formData,
      headers: {}, // Sin Content-Type, fetch lo pone automático
    })
  }

  // Para descargar archivos
  async getBlob(url: string): Promise<Blob> {
    const token = getToken()
    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
    return response.blob()
  }
}

export const apiClient = new ApiClient()
```

---

## 8. Comparación con Alternativas

### React Query vs SWR vs Fetch puro

```typescript
// ❌ FETCH PURO (no usar)
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  fetch('/api/data')
    .then(r => r.json())
    .then(d => setData(d))
    .catch(e => setError(e))
    .finally(() => setLoading(false))
}, [])

// Problemas:
// - Mucho código repetido
// - Sin caché
// - Sin retry automático
// - Sin deduplicación

// ✅ REACT QUERY (lo que usamos)
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: () => apiClient.get('/api/data'),
  staleTime: 5 * 60 * 1000,
})

// Beneficios:
// - Una línea para todo
// - Caché inteligente
// - Retry automático
// - Deduplicación
// - Invalidación fácil
// - DevTools incluidos
```

---

## Archivos de referencia

| Archivo | Descripción |
|---------|-------------|
| `app/lib/theme/ThemeProvider.tsx` | Configuración QueryClient |
| `app/lib/apiClient.ts` | Cliente HTTP |
| `app/lib/cashier/queries.ts` | Queries/mutations de caja |
| `app/lib/conciliation/queries.ts` | Queries/mutations de conciliación |
| `app/lib/logbooks/hooks/useLogbooks.ts` | Custom hook completo |
| `app/lib/scheduling/queries.ts` | Queries/mutations de scheduling |
