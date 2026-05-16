# Análisis de Módulos Frontend para Multi-Hotel

## 1. Estado Actual del Frontend

### 1.1 Stack de Estado y Data Fetching

| Tipo | Library | Uso Actual | Problema para Multi-Hotel |
|------|---------|------------|---------------------------|
| **UI State** | Zustand | `useCashierStore`, `useGroupStore` | OK - no necesita hotelId |
| **Data Fetching** | React Query | Todos los hooks de queries | ❌ NO incluye hotelId |
| **Auth** | Context + Cookies | `apiClient` con auto-refresh | ❌ NO envía `x-hotel-id` |

### 1.2 Archivos de Queries Identificados

```
app/lib/
├── cashier/queries.ts          ❌ Sin hotelId en keys
├── groups/queries.ts           ❌ Sin hotelId en keys
├── logbooks/
│   ├── queries.ts             ❌ Sin hotelId
│   └── hooks/useLogbooks.ts   ❌ Sin hotelId
├── parking/queries.ts          ⚠️ API functions, sin hooks
├── conciliation/queries.ts     ❌ Sin hotelId
├── notifications/queries.ts    ❌ Sin hotelId
├── departments/queries.ts      ⚠️ Datos globales (OK)
├── users/queries.ts            ⚠️ Users global (OK)
├── messaging/queries.ts        ❌ Sin hotelId
└── activity/queries.ts         ❌ Sin hotelId
```

---

## 2. Problemas Identificados

### 2.1 API Client (`app/lib/apiClient.ts`)

**Problema**: No envía header `x-hotel-id`

```typescript
// ACTUAL - NO ENVÍA HOTEL ID
const finalOptions: RequestInit = {
  ...fetchOptions,
  headers: {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...fetchOptions.headers,
  },
  credentials: 'include',
}
```

**Impacto**: Si el backend no filtra por sesión, datos de hotels pueden mezclarse.

### 2.2 Query Keys Sin HotelId

**Ejemplo en `logbooks/hooks/useLogbooks.ts`**:
```typescript
// ACTUAL - SIN HOTEL ID
export const logbookKeys = {
  all: ['logbooks'] as const,
  lists: () => [...logbookKeys.all, 'list'] as const,
  list: (date: string) => [...logbookKeys.lists(), date] as const,
}
```

**Impacto**: 
- Cache se comparte entre hotels
- Al cambiar de hotel, React Query puede devolver datos cacheados del hotel anterior
- No hay invalidación automática por cambio de hotel

### 2.3 Zustand Stores (OK)

Los stores existentes (`useCashierStore`, `useGroupStore`, etc.) son para **estado de UI**:
- Fechas seleccionadas
- Tabs activos
- Filtros de UI
- **NO necesitan hotelId**

---

## 3. Solución Propuesta

### 3.1 Arquitectura Recomendada

```
┌─────────────────────────────────────────────────────┐
│                 Zustand Hotel Store                 │
│  - hotel: { id, nombre, slug, settings }           │
│  - hotels: [{ id, nombre, slug }, ...]             │
│  - switchHotel(hotelId)                             │
│  - syncWithStorage()                                │
└────────────────────────┬────────────────────────────┘
                         │
                         │ useHotelStore.getState().hotel
                         ▼
┌─────────────────────────────────────────────────────┐
│              React Query Hooks                       │
│  - queryKey incluye: [hotelId, ...]                 │
│  - onHotelChange: invalidateQueries(['all'])        │
└────────────────────────┬────────────────────────────┘
                         │
                         │ apiClient con header
                         ▼
┌─────────────────────────────────────────────────────┐
│              API Client                              │
│  - Headers: { x-hotel-id: hotel.id }               │
└─────────────────────────────────────────────────────┘
```

### 3.2 Hotel Store (Zustand)

```typescript
// app/stores/useHotelStore.ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useQueryClient } from '@tanstack/react-query'

interface Hotel {
  id: number
  nombre: string
  slug: string
  settings?: Record<string, any>
}

interface HotelStore {
  hotel: Hotel | null
  hotels: Hotel[]
  isLoading: boolean
  
  // Actions
  setHotel: (hotel: Hotel) => void
  setHotels: (hotels: Hotel[]) => void
  switchHotel: (hotelId: number) => Promise<void>
  initialize: () => Promise<void>
  reset: () => void
}

export const useHotelStore = create<HotelStore>()(
  persist(
    (set, get) => ({
      hotel: null,
      hotels: [],
      isLoading: true,

      setHotel: (hotel) => {
        set({ hotel })
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeHotel', JSON.stringify(hotel))
        }
      },

      setHotels: (hotels) => {
        set({ hotels })
        if (typeof window !== 'undefined') {
          localStorage.setItem('userHotels', JSON.stringify(hotels))
        }
      },

      switchHotel: async (hotelId) => {
        const { hotels, setHotel } = get()
        const newHotel = hotels.find((h) => h.id === hotelId)
        
        if (newHotel) {
          setHotel(newHotel)
          
          // Invalidar todas las queries de React Query
          const queryClient = useQueryClient()
          queryClient.invalidateQueries({ queryKey: ['all'] })
        }
      },

      initialize: async () => {
        const storedHotel = typeof window !== 'undefined' 
          ? localStorage.getItem('activeHotel') 
          : null
        const storedHotels = typeof window !== 'undefined'
          ? localStorage.getItem('userHotels')
          : null

        if (storedHotel) {
          set({ hotel: JSON.parse(storedHotel), isLoading: false })
        }
        if (storedHotels) {
          set({ hotels: JSON.parse(storedHotels), isLoading: false })
        }
        set({ isLoading: false })
      },

      reset: () => set({ hotel: null, hotels: [] }),
    }),
    {
      name: 'hotel-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hotel: state.hotel,
        hotels: state.hotels,
      }),
    }
  )
)

// Selector optimizado
export const useHotel = () => useHotelStore((s) => s)
export const useActiveHotel = () => useHotelStore((s) => s.hotel)
export const useUserHotels = () => useHotelStore((s) => s.hotels)
```

### 3.3 API Client Actualizado

```typescript
// app/lib/apiClient.ts - AÑADIR

function getHotelHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  
  const hotel = localStorage.getItem('activeHotel')
  if (!hotel) return {}
  
  const { id } = JSON.parse(hotel)
  return { 'x-hotel-id': String(id) }
}

// En fetchWithRefresh:
const finalOptions: RequestInit = {
  ...fetchOptions,
  headers: {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...getHotelHeaders(),  // AÑADIR ESTO
    ...fetchOptions.headers,
  },
  credentials: 'include',
}
```

### 3.4 Ejemplo: Query Keys Actualizado

```typescript
// app/lib/logbooks/hooks/useLogbooks.ts

import { useActiveHotel } from '@/app/stores/useHotelStore'

export const logbookKeys = {
  all: (hotelId: number) => ['logbooks', { hotelId }] as const,
  lists: (hotelId: number) => [...logbookKeys.all(hotelId), 'list'] as const,
  list: (hotelId: number, date: string) => [...logbookKeys.lists(hotelId), date] as const,
  detail: (hotelId: number, id: number) => [...logbookKeys.all(hotelId), 'detail', id] as const,
}

export function useLogbooks({ date, enabled = true, messages }: UseLogbooksOptions) {
  const { hotel } = useHotel()
  const queryClient = useQueryClient()

  const {
    data: entries = [],
    isLoading,
  } = useQuery({
    queryKey: logbookKeys.list(hotel?.id || 0, date),
    queryFn: () => logbooksApi.getLogbooksByDay(date),
    enabled: enabled && !!hotel?.id,
  })

  const createLogbook = useMutation({
    mutationFn: (data: CreateLogbookDTO) => logbooksApi.createLogbook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: logbookKeys.list(hotel?.id || 0, date) 
      })
    },
  })

  return { entries, isLoading, createLogbook, /* ... */ }
}
```

---

## 4. Análisis por Módulo

### 4.1 Cashier (`app/lib/cashier/queries.ts`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Query Keys | ❌ `['cashier', 'daily', date]` | Añadir hotelId |
| API Calls | ✅ Usa apiClient | Añadir header x-hotel-id |
| Store | ✅ `useCashierStore` | Sin cambios |
| Hooks | ❌ Todos los hooks | Actualizar keys |

**Archivos a modificar**: `queries.ts`

### 4.2 Groups (`app/lib/groups/queries.ts`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Query Keys | ❌ `['groups', 'list', filters]` | Añadir hotelId |
| API Calls | ✅ Usa apiClient | Añadir header x-hotel-id |
| Store | ✅ `useGroupStore` | Sin cambios |
| Hooks | ❌ Todos los hooks | Actualizar keys |

**Archivos a modificar**: `queries.ts`

### 4.3 Logbooks (`app/lib/logbooks/`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Query Keys | ❌ `['logbooks']` | Añadir hotelId |
| API Calls | ✅ Usa apiClient | Añadir header x-hotel-id |
| Hooks | ❌ `useLogbooks.ts` | Actualizar keys |

**Archivos a modificar**: `hooks/useLogbooks.ts`, `queries.ts`

### 4.4 Parking (`app/lib/parking/queries.ts`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| API Functions | ⚠️ Sin hooks | Crear hooks con hotelId |
| API Calls | ✅ Usa apiClient | Añadir header x-hotel-id |

**Archivos a modificar**: `queries.ts` (añadir hooks)

### 4.5 Notifications (`app/lib/notifications/queries.ts`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Query Keys | ❌ Sin keys definidas | Crear con hotelId |
| API Calls | ✅ Usa apiClient | Añadir header x-hotel-id |

**Archivos a modificar**: `queries.ts`

### 4.6 Departments (`app/lib/departments/queries.ts`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Datos | ⚠️ Globales | OK - NO necesita hotelId |

**Sin cambios necesarios**

### 4.7 Users (`app/lib/users/queries.ts`)

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Datos | ⚠️ Globales | OK - NO necesita hotelId |

**Sin cambios necesarios**

---

## 5. Resumen de Cambios

### 5.1 Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `app/stores/useHotelStore.ts` | Zustand store para hotel activo |

### 5.2 Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `app/lib/apiClient.ts` | + getHotelHeaders() |
| `app/lib/cashier/queries.ts` | + hotelId en keys |
| `app/lib/groups/queries.ts` | + hotelId en keys |
| `app/lib/logbooks/hooks/useLogbooks.ts` | + hotelId en keys |
| `app/lib/parking/queries.ts` | + hotelId en keys, + hooks |
| `app/lib/notifications/queries.ts` | + hotelId en keys |
| `app/lib/conciliation/queries.ts` | + hotelId en keys |
| `app/lib/messaging/queries.ts` | + hotelId en keys |
| `app/lib/activity/queries.ts` | + hotelId en keys |

### 5.3 Archivos Sin Cambios

- `app/stores/useCashierStore.ts` (UI state)
- `app/stores/useGroupStore.ts` (UI state)
- `app/stores/useMaintenanceStore.ts` (UI state)
- `app/stores/useNotificationStore.ts` (UI state)
- `app/lib/departments/queries.ts` (datos globales)
- `app/lib/users/queries.ts` (datos globales)

---

## 6. Orden de Implementación Recomendado

1. **Fase 1**: Crear `useHotelStore.ts`
2. **Fase 2**: Modificar `apiClient.ts` para enviar header
3. **Fase 3**: Actualizar modules críticos (Cashier, Groups, Logbooks)
4. **Fase 4**: Actualizar modules secundarios (Parking, Notifications)
5. **Fase 5**: Testing y validación

---

## 7. Preguntas Pendientes

1. ¿El backend ya filtra por `hotel_id` en todos los endpoints?
2. ¿Hay endpoints que devuelven datos de múltiples hotels?
3. ¿Los usuarios pueden pertenecer a múltiples hotels?
4. ¿Necesitamos soporte para subdominios?
