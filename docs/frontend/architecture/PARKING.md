# Arquitectura: Módulo PARKING

> **Puntuación:** 9/10  
> **Estado:** Excelente - Referencia de arquitectura  
> **Líneas de código:** ~3,500

---

## Resumen Ejecutivo

El módulo Parking es uno de los mejor implementados del proyecto. Tiene:
- React Query bien estructurado con query keys factory
- Custom hooks que encapsulan lógica compleja
- Componentes organizados por funcionalidad
- TypeScript completo
- i18n completo

---

## Evaluación con Criterios Pragmáticos

### Alta Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿Duplicación de código? | ✅ | No hay Server Actions duplicando queries |
| ¿TypeScript completo? | ✅ | types.ts con interfaces completas |
| ¿Queries/mutations separados? | ✅ | queries.ts bien organizado |
| ¿React Query bien usado? | ✅ | Query keys factory, staleTime, invalidación |

### Media Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿Componentes > 300 líneas? | ✅ | Bien divididos |
| ¿Loading states? | ✅ | loading.tsx existe |
| ¿Error boundaries? | ⚠️ | Falta error.tsx |

### Baja Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿URL state donde aporta? | ✅ | fecha y nivel en URL |
| ¿Zustand optimizado? | N/A | No usa Zustand |

---

## Estructura de Archivos

```
app/dashboard/parking/
├── page.tsx                    # Dashboard principal
├── loading.tsx                 # Skeleton de ruta
├── layout.tsx                  # Layout wrapper
├── components/
│   └── ParkingDashboardClient.tsx
├── actions/
│   └── getParkingDashboardStats.ts  # Server Action (para SSR inicial)
│
├── bookings/
│   ├── page.tsx                # Lista de reservas
│   ├── new/page.tsx            # Crear reserva
│   └── [code]/page.tsx         # Detalle de reserva
│
└── status/
    ├── page.tsx                # Vista de estado
    ├── layout.tsx
    ├── components/
    │   ├── ParkingNavigator.tsx
    │   ├── ParkingStatusClient.tsx
    │   ├── ParkingTable.tsx
    │   ├── StatusPanels.tsx
    │   └── modals/
    │       ├── CheckInModal.tsx
    │       ├── CheckOutModal.tsx
    │       ├── CancelModal.tsx
    │       ├── OverdueModal.tsx
    │       └── index.ts        # Barrel exports
    ├── hooks/
    │   └── useParkingStatus.ts # Custom hook principal
    └── utils/
        └── statusBadges.tsx

app/lib/parking/
├── types.ts                    # TypeScript interfaces
├── queries.ts                  # parkingApi + React Query
└── index.ts                    # Barrel exports
```

---

## Lo que Hace BIEN

### 1. React Query - API Layer

```typescript
// lib/parking/queries.ts
export const parkingApi = {
  // SPOTS
  getAllSpots: async (): Promise<ParkingSpot[]> => {
    return apiClient.get(`${API_URL}/api/parking/spots`)
  },

  getAvailableSpotsByRange: async (params: {
    start_date: string
    end_date: string
    level?: string
  }): Promise<{ spots: AvailableSpot[] }> => {
    const query = new URLSearchParams(params)
    return apiClient.get(`${API_URL}/api/parking/spots/available?${query}`)
  },

  // BOOKINGS
  createBooking: async (data: CreateBookingDto): Promise<BookingResponse> => {
    return apiClient.post(`${API_URL}/api/parking/bookings`, data)
  },

  checkInBooking: async (code: string): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/api/parking/bookings/${code}/checkin`, {})
  },

  checkOutBooking: async (code: string): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/api/parking/bookings/${code}/checkout`, {})
  },

  cancelBooking: async (code: string, notes?: string): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/api/parking/bookings/${code}/cancel`, { notes })
  },

  // STATS
  getFullStats: async (date?: string): Promise<FullStatsResponse> => {
    const url = date 
      ? `${API_URL}/api/parking/stats?date=${date}` 
      : `${API_URL}/api/parking/stats`
    return apiClient.get(url)
  },
}
```

### 2. Query Keys Factory

```typescript
// Patrón usado en useParkingStatus.ts
const statsKey = (date: string) => ['parking', 'stats', date] as const
const bookingsKey = (date: string) => ['parking', 'bookings', date] as const
const spotsKey = (date: string) => ['parking', 'spots', date] as const
const overdueKey = () => ['parking', 'bookings', 'overdue'] as const
```

### 3. Custom Hook - useParkingStatus

```typescript
// status/hooks/useParkingStatus.ts
export function useParkingStatus(selectedDate: string, messages: ParkingStatusMessages) {
  const queryClient = useQueryClient()

  // ========================================
  // ESTADO DE MODALES
  // ========================================
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean
    booking: ParkingBooking | null
  }>({ isOpen: false, booking: null })

  const [checkinModal, setCheckinModal] = useState<{
    isOpen: boolean
    booking: ParkingBooking | null
  }>({ isOpen: false, booking: null })

  // ========================================
  // QUERIES
  // ========================================
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: statsKey(selectedDate),
    queryFn: async () => parkingApi.getFullStats(selectedDate),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: bookingsKey(selectedDate),
    queryFn: async () => parkingApi.getAllBookings({}),
    staleTime: 60 * 1000,
  })

  const { data: spotsData, isLoading: spotsLoading } = useQuery({
    queryKey: spotsKey(selectedDate),
    queryFn: async () => parkingApi.getAllSpots(),
    staleTime: 5 * 60 * 1000,
  })

  // ========================================
  // INVALIDACIÓN CENTRALIZADA
  // ========================================
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: statsKey(selectedDate) })
    queryClient.invalidateQueries({ queryKey: bookingsKey(selectedDate) })
    queryClient.invalidateQueries({ queryKey: spotsKey(selectedDate) })
    queryClient.invalidateQueries({ queryKey: overdueKey() })
  }

  // ========================================
  // MUTATIONS
  // ========================================
  const checkInMutation = useMutation({
    mutationFn: (code: string) => parkingApi.checkInBooking(code),
    onSuccess: () => {
      toast.success(messages.checkInSuccess)
      setCheckinModal({ isOpen: false, booking: null })
      invalidateAll()
    },
    onError: (err) => toast.error(err.message),
  })

  const checkOutMutation = useMutation({
    mutationFn: (code: string) => parkingApi.checkOutBooking(code),
    onSuccess: () => {
      toast.success(messages.checkOutSuccess)
      setCheckoutModal({ isOpen: false, booking: null })
      invalidateAll()
    },
    onError: (err) => toast.error(err.message),
  })

  // ========================================
  // RETURN
  // ========================================
  return {
    // Data
    spots,
    availabilityData: statsData?.dashboard.availability,
    bookings: activeBookings,
    loading: statsLoading || bookingsLoading || spotsLoading,

    // Modal state
    checkoutModal,
    checkinModal,
    setCheckoutModal,
    setCheckinModal,

    // Actions
    handleCheckIn,
    confirmCheckIn,
    handleCheckOut,
    confirmCheckOut,
  }
}
```

### 4. URL State para Filtros

```typescript
// status/components/ParkingNavigator.tsx
'use client'

export default function ParkingNavigator() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedLevel = searchParams?.get('level') || 'all'

  // Leer fecha de URL al montar
  useEffect(() => {
    const dateFromUrl = searchParams?.get('date')
    if (dateFromUrl) {
      const [year, month, day] = dateFromUrl.split('-').map(Number)
      setCurrentDate(new Date(year, month - 1, day))
      setSelectedDay(day)
    } else {
      const today = new Date()
      setCurrentDate(today)
      setSelectedDay(today.getDate())
    }
  }, [])

  // Actualizar URL al cambiar fecha
  useEffect(() => {
    if (!isClient || !currentDate || selectedDay === null) return
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const dateStr = formatDate(currentDate, selectedDay)
    const currentLevel = searchParams?.get('level') || 'all'
    router.push(`?date=${dateStr}&level=${currentLevel}`, { scroll: false })
  }, [currentDate, selectedDay])

  const selectLevel = (level: string) => {
    const dateStr = searchParams?.get('date') || getLocalDateString()
    router.push(`?date=${dateStr}&level=${level}`, { scroll: false })
  }
}
```

**Beneficios del URL state en Parking:**
- URLs compartibles (enviar link a fecha/nivel específico)
- Back/forward del navegador funciona
- Bookmarks con estado

### 5. Barrel Exports

```typescript
// status/components/modals/index.ts
export { default as CheckInModal } from './CheckInModal'
export { default as CheckOutModal } from './CheckOutModal'
export { default as CancelModal } from './CancelModal'
export { default as OverdueModal } from './OverdueModal'

// Uso limpio:
import { CheckInModal, CheckOutModal, CancelModal } from './modals'
```

### 6. Loading State (loading.tsx)

```typescript
// app/dashboard/parking/loading.tsx
export default function ParkingLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] px-4 pt-4 pb-4">
      <div className="max-w-[1600px] space-y-5">
        {/* Header skeleton */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-gray-200 dark:bg-[#21262d] rounded-lg animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="space-y-5">
            <div className="bg-white dark:bg-[#0D1117] border rounded-xl p-5 h-64 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Sobre Server Actions en Parking

El módulo tiene un Server Action (`getParkingDashboardStats.ts`) que se usa para:
- Obtener datos iniciales en el Server Component
- Pasar como `initialData` al Client Component

```typescript
// actions/getParkingDashboardStats.ts
'use server'

export async function getParkingDashboardStats(period: 'today' | 'week' | 'month') {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  
  const response = await fetch(`${API}/api/parking/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  
  return response.json()
}

// page.tsx
export default async function ParkingDashboard() {
  const response = await getParkingDashboardStats('today')
  return <ParkingDashboardClient initialStats={response.dashboard?.stats} />
}
```

### ¿Es necesario este Server Action?

**Análisis pragmático:**

| Aspecto | Con Server Action | Sin Server Action |
|---------|-------------------|-------------------|
| Primera carga | Datos en HTML (SSR) | Loading → Datos |
| SEO | No aplica (dashboard privado) | No aplica |
| UX | Ligeramente más rápido | Loading skeleton |
| Complejidad | Mayor (2 lugares de fetch) | Menor (solo queries.ts) |
| Duplicación | Parcial (solo stats) | Ninguna |

**Conclusión:** El Server Action de Parking **no es incorrecto**, pero tampoco es obligatorio. El beneficio es marginal para un dashboard privado. Si se elimina, el módulo seguiría funcionando correctamente con React Query.

**Lo que NO hay que hacer:** Crear Server Actions para TODAS las operaciones (checkIn, checkOut, etc.) - eso duplicaría `parkingApi` innecesariamente.

---

## Mejoras Recomendadas

### Alta Prioridad

| Mejora | Beneficio | Esfuerzo |
|--------|-----------|----------|
| Agregar `error.tsx` | Error boundary de ruta | 1h |

### Media Prioridad

| Mejora | Beneficio | Esfuerzo |
|--------|-----------|----------|
| Eliminar `'use client'` de layout.tsx | Layout innecesariamente client | 5min |

### Opcional (Nice-to-have)

| Mejora | Beneficio | Esfuerzo |
|--------|-----------|----------|
| Optimistic updates en mutations | UX más responsiva | 2h |
| Prefetch de día siguiente | Navegación más rápida | 1h |

### NO Hacer

| Cambio | Razón |
|--------|-------|
| Crear Server Actions para cada operación | Duplicaría parkingApi |
| Convertir todas las pages a Server Components | Sin beneficio real |
| Mover todo estado a URL | Complejidad innecesaria |

---

## Código para Mejoras

### error.tsx

```typescript
// app/dashboard/parking/error.tsx
'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi'

export default function ParkingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('parking')

  useEffect(() => {
    console.error('Parking error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">{t('error.title')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error.message || t('error.generic')}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
        >
          <FiRefreshCw className="w-4 h-4" />
          {t('error.retry')}
        </button>
      </div>
    </div>
  )
}
```

### Optimistic Updates (Opcional)

```typescript
const checkInMutation = useMutation({
  mutationFn: (code: string) => parkingApi.checkInBooking(code),
  
  // Actualizar cache inmediatamente
  onMutate: async (code) => {
    await queryClient.cancelQueries({ queryKey: bookingsKey(date) })
    
    const previousBookings = queryClient.getQueryData(bookingsKey(date))
    
    queryClient.setQueryData(bookingsKey(date), (old) => ({
      ...old,
      bookings: old.bookings.map(b => 
        b.booking_code === code 
          ? { ...b, status: 'checked_in' }
          : b
      )
    }))
    
    return { previousBookings }
  },
  
  // Rollback si falla
  onError: (err, code, context) => {
    queryClient.setQueryData(bookingsKey(date), context.previousBookings)
    toast.error(err.message)
  },
  
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: bookingsKey(date) })
  },
})
```

---

## Resumen de Evaluación

### Puntuación Final: 9/10

**Fortalezas:**
- React Query ejemplar (query keys factory, invalidación, staleTime)
- Custom hook bien estructurado (useParkingStatus)
- URL state para filtros que SÍ aporta valor
- Componentes bien organizados
- TypeScript completo
- i18n completo
- loading.tsx existe

**Áreas de Mejora:**
- Falta error.tsx (fácil de agregar)
- layout.tsx tiene 'use client' innecesario

**Por qué 9/10 y no 10/10:**
- Falta error boundary
- El Server Action existe pero su beneficio es marginal

---

## Comparación con Cashier

| Aspecto | Parking | Cashier |
|---------|---------|---------|
| React Query | ✅ Excelente | ✅ Excelente |
| Query Keys Factory | ✅ | ✅ |
| Custom Hooks | ✅ useParkingStatus | ✅ (en queries.ts) |
| Zustand | No usa | ✅ Excelente |
| URL State | ✅ fecha + nivel | ❌ (podría agregar) |
| loading.tsx | ✅ | ⚠️ Falta |
| error.tsx | ⚠️ Falta | ⚠️ Falta |
| TypeScript | ✅ | ✅ |
| i18n | ✅ | ✅ |
| Server Actions | 1 (para SSR inicial) | 0 (no necesarios) |

**Ambos módulos son referencias de buena arquitectura.** Parking tiene mejor URL state, Cashier tiene mejor Zustand store.
