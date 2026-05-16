# Arquitectura: Modulo CASHIER

> **Puntuacion:** 8.5/10  
> **Estado:** Muy Bueno - Referencia de arquitectura pragmatica  
> **Lineas de codigo:** ~6,100

---

## Resumen Ejecutivo

El modulo Cashier es un **ejemplo de arquitectura correcta** para esta aplicacion. Utiliza React Query para server state, Zustand para client state, y Client Components donde tiene sentido (alta interactividad). No necesita Server Components ni Server Actions porque:

1. Es un dashboard privado (no hay SEO)
2. Tiene alta interactividad (formularios, modales, calendario)
3. React Query ya maneja cache, invalidacion y loading states
4. Crear Server Actions duplicaria el codigo de `queries.ts`

---

## Arquitectura Actual

### Stack de Estado

```
┌─────────────────────────────────────────────────────────┐
│                    COMPONENTES                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   React Query (357 lineas)  │  Zustand (363 lineas)     │
│   queries.ts                │  useCashierStore.ts       │
│                             │                           │
│   - Datos de API            │  - Fecha seleccionada     │
│   - Cache automatico        │  - Tab activo             │
│   - Invalidacion            │  - Modal abierto          │
│   - Loading/Error states    │  - Filtros de logs        │
│   - Retry automatico        │  - Estado de reports      │
│                             │                           │
└─────────────────────────────────────────────────────────┘
```

### Estructura de Archivos

```
dashboard/cashier/
├── hotel/
│   ├── layout.tsx          # 'use client' - calendario interactivo
│   └── page.tsx            # 'use client' - gestion diaria
├── logs/
│   └── page.tsx            # 'use client' - historial/auditoria
├── reports/
│   └── page.tsx            # 'use client' - reportes mensuales
├── error.tsx               # Error boundary (AGREGAR)
│
lib/cashier/
├── queries.ts              # React Query hooks (357 lineas)
└── types.ts                # TypeScript types (291 lineas)

stores/
└── useCashierStore.ts      # Zustand store (363 lineas)

components/cashier/
├── ShiftCard.tsx           # Componente principal (463 lineas)
├── CashierCalendarNav.tsx
├── DateNavigator.tsx
├── DaySummaryCard.tsx
├── ShiftTabs.tsx
├── DenominationForm.tsx    # Conteo de efectivo
├── PaymentForm.tsx         # Pagos electronicos
├── modals/
│   ├── InitializeDayModal.tsx
│   ├── CloseDayModal.tsx
│   ├── ReopenDayModal.tsx
│   ├── CloseShiftModal.tsx
│   └── CreateVoucherModal.tsx
├── states/
│   ├── LoadingState.tsx
│   ├── ErrorState.tsx
│   └── UninitializedDayState.tsx
├── layout/
│   ├── DaySummarySidebar.tsx
│   ├── LogsSummarySidebar.tsx
│   └── ReportsSummarySidebar.tsx
├── logs/
│   ├── HistoryTable.tsx
│   ├── HistoryStats.tsx
│   └── HistoryFilters.tsx
└── reports/
    ├── MonthlyReport.tsx
    ├── PaymentChart.tsx
    └── VouchersHistory.tsx
```

---

## Lo que Hace BIEN

### 1. React Query - Query Keys Factory

```typescript
// queries.ts - Patron recomendado
export const cashierKeys = {
  all: ['cashier'] as const,
  daily: (date: string) => ['cashier', 'daily', date] as const,
  shifts: (date: string) => ['cashier', 'shifts', date] as const,
  shift: (id: number) => ['cashier', 'shift', id] as const,
  vouchers: () => ['cashier', 'vouchers'] as const,
  voucherStats: () => ['cashier', 'vouchers', 'stats'] as const,
  monthly: (year: number, month: number) => ['cashier', 'monthly', year, month] as const,
  history: (filters: object) => ['cashier', 'history', filters] as const,
}
```

### 2. Queries Bien Configuradas

```typescript
export function useDailyDetails(date: string) {
  return useQuery<CashierDaily | null>({
    queryKey: cashierKeys.daily(date),
    queryFn: async () => {
      try {
        const response = await apiClient.get(`${API_BASE}/api/cashier/daily/${date}`)
        return response as CashierDaily
      } catch (error) {
        // Manejo especial de 404 como estado esperado
        if (errorMessage.includes('404')) {
          return null  // Dia no inicializado
        }
        throw error
      }
    },
    staleTime: 30 * 1000,    // 30 segundos
    gcTime: 5 * 60 * 1000,   // 5 minutos
    retry: false,
  })
}
```

### 3. Mutations con Invalidacion Correcta

```typescript
export function useInitializeDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, data }) =>
      apiClient.post(`${API_BASE}/api/cashier/daily/${date}/initialize`, data),
    onSuccess: (_, { date }) => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: cashierKeys.daily(date) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.shifts(date) })
    },
  })
}

export function useUpdatePayments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, payments }) =>
      apiClient.put(`${API_BASE}/api/cashier/shifts/${shiftId}/payments`, { payments }),
    onSuccess: (_, { shiftId }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
      queryClient.invalidateQueries({ queryKey: ['cashier', 'daily'] })
    },
  })
}
```

### 4. Zustand Store Optimizado

```typescript
// stores/useCashierStore.ts (363 lineas)

interface CashierStore {
  // HOTEL - DATE STATE
  selectedDate: string
  currentDate: Date
  selectedDay: number

  // HOTEL - UI STATE
  activeTab: ShiftType
  activeModal: ModalType
  modalData: Record<string, unknown> | null

  // LOGS - STATE
  logsDate: string
  logsActionFilter: HistoryAction | 'all'
  logsUserFilter: string
  logsLimit: number
  logsOffset: number

  // REPORTS - STATE
  reportsYear: number
  reportsMonth: number
  reportsTab: ReportsTab
  chartViewMode: ChartViewMode

  // COMPUTED
  getCurrentMonth: (locale?: string) => string
  getCurrentYear: () => number
  // ...
}
```

### 5. Selectores Individuales (Evita Re-renders)

```typescript
// Selectores para primitivos
export const useSelectedDate = () => useCashierStore((s) => s.selectedDate)
export const useActiveTab = () => useCashierStore((s) => s.activeTab)
export const useActiveModal = () => useCashierStore((s) => s.activeModal)

// Selectores con useShallow para objetos
export const useLogsFilters = () =>
  useCashierStore(
    useShallow((s) => ({
      actionFilter: s.logsActionFilter,
      userFilter: s.logsUserFilter,
      limit: s.logsLimit,
      offset: s.logsOffset,
    }))
  )

export const useReportsDate = () =>
  useCashierStore(
    useShallow((s) => ({
      year: s.reportsYear,
      month: s.reportsMonth,
    }))
  )
```

### 6. TypeScript Completo

```typescript
// types.ts (291 lineas)

export type ShiftType = 'night' | 'morning' | 'afternoon' | 'closing'
export type ShiftStatus = 'open' | 'in_progress' | 'closed' | 'audited'
export type VoucherStatus = 'pending' | 'justified' | 'cancelled'

export interface CashierShift {
  id: number
  shift_date: string
  shift_type: ShiftType
  status: ShiftStatus
  initial_fund: string
  income: string
  cash_counted: string
  cash_expected: string
  difference: string
  users?: CashierShiftUser[]
  denominations?: CashierDenomination[]
  payments?: CashierPayment[]
  vouchers?: CashierVoucher[]
}

export interface CashierDaily {
  id: number
  date: string
  total_cash: string
  total_card: string
  shifts?: CashierShift[]
  active_vouchers?: CashierVoucher[]
  can_close?: boolean
  validation_errors?: string[]
}
```

### 7. i18n Completo (313 lineas)

```
messages/es/cashier.json - Secciones:
- page, summary, shifts, shiftCard
- calendar, denomination, payment, voucher
- closeShift, closeDay, reopenDay, initializeDay
- uninitializedDay, error, logs, actions
- reports, vouchersHistory, common
```

### 8. Componentes de Estado Reutilizables

```typescript
// LoadingState.tsx
export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <FiLoader className="w-8 h-8 animate-spin" />
      <p>{message}</p>
    </div>
  )
}

// ErrorState.tsx
export default function ErrorState({ title, message }: ErrorStateProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <FiAlertCircle />
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
```

---

## Hooks Disponibles

### Queries

| Hook | Descripcion |
|------|-------------|
| `useDailyDetails(date)` | Datos del dia (turnos, vales, totales) |
| `useShiftDetails(shiftId)` | Datos de un turno especifico |
| `useVoucherStats()` | Estadisticas de vales |
| `useMonthlyReport(year, month)` | Reporte mensual completo |
| `useDashboardOverview()` | Vista general del dashboard |
| `useVouchersHistory(filters)` | Historial de vales con filtros |
| `useHistoryLogs(filters)` | Logs de auditoria |
| `useHistoryStats(filters)` | Estadisticas de logs |
| `useShiftHistory(shiftId)` | Historial de un turno |

### Mutations

| Hook | Descripcion |
|------|-------------|
| `useInitializeDay()` | Inicializar dia de caja |
| `useCloseDay()` | Cerrar dia |
| `useReopenDay()` | Reabrir dia cerrado |
| `useUpdateShift()` | Actualizar turno |
| `useCloseShift()` | Cerrar turno |
| `useUpdateDenominations()` | Actualizar conteo de efectivo |
| `useUpdatePayments()` | Actualizar pagos electronicos |
| `useCreateVoucher()` | Crear vale |
| `useJustifyVoucher()` | Justificar vale pendiente |

---

## Mejoras Recomendadas

### Alta Prioridad

| Mejora | Beneficio | Esfuerzo |
|--------|-----------|----------|
| Agregar `loading.tsx` | Mejor UX durante navegacion | 1h |
| Agregar `error.tsx` | Error boundary de ruta | 1h |
| Dividir `ShiftCard.tsx` (463 lineas) | Mantenibilidad | 3h |

### Media Prioridad

| Mejora | Beneficio | Esfuerzo |
|--------|-----------|----------|
| URL params para fecha | URLs compartibles | 2h |
| Zod schemas para validacion | Validacion consistente | 2h |
| Barrel exports (index.ts) | Imports mas limpios | 30min |

### NO Hacer

| Cambio | Razon |
|--------|-------|
| Convertir pages a Server Components | Rompe React Query + Zustand, sin beneficio |
| Crear Server Actions para fetch | Duplicaria queries.ts |
| Mover todo estado a URL | Complejidad innecesaria, interaccion frecuente |

---

## Codigo para Mejoras

### 1. loading.tsx

```typescript
// app/dashboard/cashier/hotel/loading.tsx
export default function CashierLoading() {
  return (
    <div className="space-y-6">
      {/* Calendar skeleton */}
      <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      
      {/* Date picker skeleton */}
      <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      
      {/* Main content */}
      <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-5">
        <div className="min-[1400px]:col-span-3 space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
          {/* Shift card */}
          <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        {/* Sidebar */}
        <div className="hidden min-[1400px]:block">
          <div className="h-[600px] bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
```

### 2. error.tsx

```typescript
// app/dashboard/cashier/error.tsx
'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi'

export default function CashierError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('cashier')

  useEffect(() => {
    console.error('Cashier error:', error)
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

### 3. Dividir ShiftCard.tsx

```
components/cashier/shift/
├── ShiftCard.tsx           # Orquestador (~150 lineas)
├── ShiftHeader.tsx         # Header con estado y usuarios (~80 lineas)
├── ShiftMetrics.tsx        # Cards de metricas (~100 lineas)
├── ShiftDenominations.tsx  # Seccion de conteo (~100 lineas)
└── ShiftPayments.tsx       # Seccion de pagos (~80 lineas)
```

---

## Resumen de Evaluacion

### Criterios Pragmaticos

| Criterio | Estado | Notas |
|----------|--------|-------|
| No duplicar codigo | ✅ | Una fuente para fetch (queries.ts) |
| TypeScript completo | ✅ | 291 lineas de tipos |
| Separacion de concerns | ✅ | queries.ts, store.ts, components/ |
| React Query bien usado | ✅ | Query keys factory, invalidacion |
| Zustand optimizado | ✅ | Selectores individuales, useShallow |
| Componentes < 300 lineas | ⚠️ | ShiftCard tiene 463 lineas |
| Loading states | ⚠️ | Componente manual, falta loading.tsx |
| Error boundaries | ⚠️ | Componente manual, falta error.tsx |
| i18n completo | ✅ | 313 lineas |

### Puntuacion Final: 8.5/10

**Fortalezas:**
- React Query ejemplar (query keys, invalidacion, staleTime)
- Zustand con selectores optimizados
- TypeScript completo
- i18n completo
- Componentes bien organizados

**Areas de Mejora:**
- Agregar loading.tsx y error.tsx
- Dividir ShiftCard.tsx (463 lineas)
- URL params para fecha (opcional)

---

## Por que NO Convertir a Server Components

### El Enfoque "Teorico"

```typescript
// Cambio propuesto que NO mejora nada:
export default async function CashierPage({ searchParams }: PageProps) {
  const date = searchParams.date || today
  const initialData = await getDailyDetails(date)  // Server Action
  
  return <CashierClient initialData={initialData} selectedDate={date} />
}
```

### Problemas de Este Enfoque

1. **Duplicacion de codigo**
   - `getDailyDetails` Server Action duplica `useDailyDetails` de queries.ts
   - Ahora hay 2 lugares para mantener la logica de fetch

2. **Perdida de funcionalidad**
   - React Query ya maneja cache inteligente
   - React Query tiene invalidacion automatica en mutations
   - React Query tiene retry y staleTime

3. **Sin beneficio real**
   - No hay SEO (es dashboard privado)
   - La carga inicial no es mas rapida (mismo fetch)
   - Mas complejidad sin ganancia

### La Arquitectura Actual es Correcta

```typescript
// Esto funciona perfectamente:
'use client'

export default function CashierPage() {
  const selectedDate = useSelectedDate()  // Zustand
  const { data, isLoading, error } = useDailyDetails(selectedDate)  // React Query
  
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState />
  
  return <CashierContent data={data} />
}
```

**React Query + Zustand + Client Components = Arquitectura correcta para dashboards interactivos.**
