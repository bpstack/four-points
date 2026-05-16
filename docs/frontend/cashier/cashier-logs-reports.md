# Cashier Module - Arquitectura con Zustand

## Resumen

El módulo de Cashier utiliza Zustand como gestor de estado global, centralizando el estado de las tres secciones principales:

- **Hotel** (`/dashboard/cashier/hotel`) - Gestión diaria de caja
- **Logs** (`/dashboard/cashier/logs`) - Historial y auditoría
- **Reports** (`/dashboard/cashier/reports`) - Reportes y estadísticas

---

## Estructura de Archivos

```
frontend/
├── app/
│   ├── stores/
│   │   └── useCashierStore.ts       # Store centralizado de Zustand
│   │
│   ├── dashboard/cashier/
│   │   ├── hotel/
│   │   │   ├── layout.tsx           # Layout con navegación de calendario
│   │   │   └── page.tsx             # Página principal de caja
│   │   ├── logs/
│   │   │   └── page.tsx             # Historial y auditoría
│   │   └── reports/
│   │       └── page.tsx             # Reportes mensuales
│   │
│   ├── components/cashier/
│   │   ├── CashierCalendarNav.tsx   # Navegación mes/año
│   │   ├── DateNavigator.tsx        # Navegación prev/next/today
│   │   ├── DaySummaryCard.tsx       # Resumen del día
│   │   ├── ShiftTabs.tsx            # Tabs de turnos
│   │   ├── ShiftCard.tsx            # Detalle de turno
│   │   ├── LoadingState.tsx         # Estado de carga
│   │   ├── ErrorState.tsx           # Estado de error
│   │   ├── UninitializedDayState.tsx
│   │   ├── InitializeDayModal.tsx
│   │   ├── CloseDayModal.tsx
│   │   ├── ReopenDayModal.tsx
│   │   ├── logs/
│   │   │   ├── HistoryTable.tsx
│   │   │   ├── HistoryStats.tsx
│   │   │   └── HistoryFilters.tsx
│   │   └── reports/
│   │       ├── MonthlyReport.tsx
│   │       ├── PaymentChart.tsx
│   │       └── VouchersHistory.tsx
│   │
│   └── lib/cashier/
│       ├── queries.ts               # React Query hooks
│       └── types.ts                 # TypeScript types
```

---

## useCashierStore - Estado Global

### Ubicación

`frontend/app/stores/useCashierStore.ts`

### Estado

```typescript
interface CashierStore {
  // ═══════════════════════════════════════
  // HOTEL - Gestión diaria
  // ═══════════════════════════════════════
  selectedDate: string // Fecha seleccionada (YYYY-MM-DD)
  currentDate: Date // Mes/año actual para navegación
  selectedDay: number // Día seleccionado (1-31)
  activeTab: ShiftType // Turno activo: 'night' | 'morning' | 'afternoon' | 'closing'
  activeModal: ModalType // Modal abierto: 'initializeDay' | 'closeDay' | 'reopenDay' | null
  modalData: Record<string, unknown> | null

  // ═══════════════════════════════════════
  // LOGS - Historial y auditoría
  // ═══════════════════════════════════════
  logsDate: string // Fecha para filtrar logs
  logsActionFilter: HistoryAction | 'all' // Filtro por tipo de acción
  logsUserFilter: string // Filtro por usuario
  logsLimit: number // Items por página (default: 50)
  logsOffset: number // Offset para paginación

  // ═══════════════════════════════════════
  // REPORTS - Reportes mensuales
  // ═══════════════════════════════════════
  reportsYear: number // Año seleccionado
  reportsMonth: number // Mes seleccionado (1-12)
  reportsTab: ReportsTab // Tab activo: 'summary' | 'payments' | 'vouchers'
  chartViewMode: ChartViewMode // Modo de gráfico: 'pie' | 'bar'
}
```

### Acciones

#### Hotel

```typescript
// Navegación de fecha
setSelectedDate(date: string)
goToPreviousMonth()
goToNextMonth()
goToToday()
selectDay(day: number)

// UI
setActiveTab(tab: ShiftType)
openModal(modal: ModalType, data?: Record<string, unknown>)
closeModal()

// Computed
getCurrentMonth(): string    // "diciembre", "enero", etc.
getCurrentYear(): number     // 2024
```

#### Logs

```typescript
// Navegación de fecha
setLogsDate(date: string)
logsGoToPreviousDay()
logsGoToNextDay()
logsGoToToday()

// Filtros
setLogsActionFilter(action: HistoryAction | 'all')
setLogsUserFilter(user: string)

// Paginación
logsNextPage()
logsPreviousPage()
logsResetOffset()

// Computed
getLogsFormattedDate(): string  // "14 de diciembre de 2024"
```

#### Reports

```typescript
// Navegación de periodo
reportsGoToPreviousMonth()
reportsGoToNextMonth()
reportsGoToCurrentMonth()

// UI
setReportsTab(tab: ReportsTab)
setChartViewMode(mode: ChartViewMode)

// Computed
getReportsDisplayLabel(): string  // "Diciembre 2024"
```

---

## Selectores Optimizados

Los selectores evitan re-renders innecesarios al suscribirse solo a partes específicas del estado.

### Selectores Simples (valores primitivos)

```typescript
// No necesitan useShallow - retornan primitivos
export const useSelectedDate = () => useCashierStore((s) => s.selectedDate)
export const useActiveTab = () => useCashierStore((s) => s.activeTab)
export const useActiveModal = () => useCashierStore((s) => s.activeModal)
export const useLogsDate = () => useCashierStore((s) => s.logsDate)
export const useReportsTab = () => useCashierStore((s) => s.reportsTab)
export const useChartViewMode = () => useCashierStore((s) => s.chartViewMode)
```

### Selectores de Objeto (requieren useShallow)

```typescript
import { useShallow } from 'zustand/react/shallow'

// Necesitan useShallow para evitar re-renders infinitos
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

### ¿Por qué useShallow?

Sin `useShallow`, un selector que retorna un objeto crea una **nueva referencia** en cada render:

```typescript
// ❌ PROBLEMA - crea nuevo objeto cada vez
useCashierStore((s) => ({ year: s.reportsYear, month: s.reportsMonth }))
// Cada render: { year: 2024, month: 12 } !== { year: 2024, month: 12 }
// Resultado: loop infinito de re-renders

// ✅ SOLUCIÓN - useShallow compara valores, no referencias
useCashierStore(useShallow((s) => ({ year: s.reportsYear, month: s.reportsMonth })))
// Compara: 2024 === 2024 && 12 === 12
// Resultado: no re-render si valores iguales
```

---

## Uso en Componentes

### Patrón Recomendado

```typescript
export default function LogsPage() {
  // 1. Acciones - del store completo (son estables, no causan re-renders)
  const {
    logsDate,
    getLogsFormattedDate,
    logsGoToPreviousDay,
    logsGoToNextDay,
    logsGoToToday,
    setLogsActionFilter,
    setLogsUserFilter,
    logsNextPage,
    logsPreviousPage,
  } = useCashierStore()

  // 2. Estado reactivo - con selectores optimizados
  const { actionFilter, userFilter, limit, offset } = useLogsFilters()

  // 3. Queries - usan valores del store
  const { data } = useHistoryLogs({
    from_date: logsDate,
    to_date: logsDate,
    action: actionFilter === 'all' ? undefined : actionFilter,
    changed_by: userFilter || undefined,
    limit,
    offset,
  })

  // 4. Render - pasa acciones directamente
  return (
    <DateNavigator
      displayLabel={getLogsFormattedDate()}
      onPrevious={logsGoToPreviousDay}
      onNext={logsGoToNextDay}
      onToday={logsGoToToday}
    />
  )
}
```

### ¿Por qué separar acciones y estado?

| Tipo         | Cómo obtener        | Comportamiento                     |
| ------------ | ------------------- | ---------------------------------- |
| **Acciones** | `useCashierStore()` | Estables, misma referencia siempre |
| **Estado**   | `useLogsFilters()`  | Reactivo, re-render cuando cambia  |

```typescript
// Las acciones NUNCA cambian de referencia
logsGoToPreviousDay === logsGoToPreviousDay // siempre true

// El estado SÍ puede cambiar
actionFilter // 'all' → 'created' → re-render
```

---

## Flujo de Datos

### Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                      useCashierStore                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   HOTEL     │  │    LOGS     │  │  REPORTS    │              │
│  │             │  │             │  │             │              │
│  │ selectedDate│  │ logsDate    │  │ reportsYear │              │
│  │ activeTab   │  │ actionFilter│  │ reportsMonth│              │
│  │ activeModal │  │ userFilter  │  │ reportsTab  │              │
│  │             │  │ offset      │  │ chartMode   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │hotel/page │    │logs/page  │    │reports/   │
    │           │    │           │    │page       │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │React Query│    │React Query│    │React Query│
    │useDailyDe │    │useHistory │    │useMonthly │
    │tails()    │    │Logs()     │    │Report()   │
    └───────────┘    └───────────┘    └───────────┘
```

### Ejemplo: Cambiar Filtro en Logs

```
Usuario clickea "Creaciones"
         │
         ▼
setLogsActionFilter('created')
         │
         ▼
Store actualiza:
  logsActionFilter: 'all' → 'created'
  logsOffset: 5 → 0  (reset automático)
         │
         ▼
useLogsFilters() detecta cambio
         │
         ▼
Componente re-renderiza
         │
         ▼
useHistoryLogs() recibe nuevos params
         │
         ▼
React Query hace nueva petición
         │
         ▼
UI muestra logs filtrados
```

---

## Manejo de Modales

### Sistema Centralizado

En lugar de múltiples `useState` para cada modal:

```typescript
// ❌ ANTES - múltiples estados
const [showInitModal, setShowInitModal] = useState(false)
const [showCloseDayModal, setShowCloseDayModal] = useState(false)
const [showReopenModal, setShowReopenModal] = useState(false)
```

Usamos un único estado con tipo:

```typescript
// ✅ DESPUÉS - estado centralizado
type ModalType = 'initializeDay' | 'closeDay' | 'reopenDay' | 'closeShift' | null

// En el store
activeModal: ModalType
openModal: (modal: ModalType) => void
closeModal: () => void
```

### Uso en Componentes

```typescript
// Abrir modal
<button onClick={() => openModal('initializeDay')}>
  Inicializar Día
</button>

// Verificar si está abierto
<InitializeDayModal
  isOpen={activeModal === 'initializeDay'}
  onClose={closeModal}
/>

// O con helper
const isOpen = useIsModalOpen('initializeDay')
```

---

## Integración con React Query

El store de Zustand maneja **estado de UI**, mientras que React Query maneja **estado del servidor**.

```typescript
// Zustand - UI state
const { selectedDate } = useCashierStore() // Qué fecha mostrar

// React Query - Server state
const { data, isLoading } = useDailyDetails(selectedDate) // Datos de esa fecha
```

### Invalidación de Queries

Cuando el usuario cambia de fecha en el layout:

```typescript
// hotel/layout.tsx
const handleDayClick = (day: number) => {
  // 1. Limpiar cache de queries anteriores
  queryClient.removeQueries({ queryKey: ['cashier'] })

  // 2. Actualizar estado de UI
  selectDay(day)
}
```

---

## Beneficios de esta Arquitectura

### 1. Persistencia de Estado

El estado se mantiene al navegar entre páginas:

- Usuario está en Logs con filtro "Creaciones"
- Navega a Reports
- Vuelve a Logs → filtro sigue en "Creaciones"

### 2. Lógica Centralizada

Toda la lógica de navegación de fechas está en el store:

```typescript
// No hay que duplicar esto en cada componente
logsGoToPreviousDay: () => {
  const { logsDate } = get()
  const date = new Date(logsDate)
  date.setDate(date.getDate() - 1)
  set({
    logsDate: date.toISOString().split('T')[0],
    logsOffset: 0, // Reset automático
  })
}
```

### 3. Reset Automático

Cambiar filtros resetea la paginación automáticamente:

```typescript
setLogsActionFilter: (action) =>
  set({
    logsActionFilter: action,
    logsOffset: 0, // ← Automático
  })
```

### 4. Optimización de Renders

Con selectores, solo re-renderiza lo necesario:

```typescript
// Solo re-renderiza cuando cambia actionFilter, no cuando cambia logsDate
const { actionFilter } = useLogsFilters()
```

### 5. Código Más Limpio

```typescript
// ❌ ANTES: 137 líneas con useState y handlers
// ✅ DESPUÉS: 90 líneas, lógica en el store
```

---

## Tipos de Referencia

### ShiftType

```typescript
type ShiftType = 'night' | 'morning' | 'afternoon' | 'closing'
```

### HistoryAction

```typescript
type HistoryAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'adjustment'
  | 'voucher_created'
  | 'voucher_repaid'
  | 'daily_closed'
  | 'daily_reopened'
```

### ModalType

```typescript
type ModalType = 'initializeDay' | 'closeDay' | 'reopenDay' | 'closeShift' | null
```

### ReportsTab

```typescript
type ReportsTab = 'summary' | 'payments' | 'vouchers'
```

### ChartViewMode

```typescript
type ChartViewMode = 'pie' | 'bar'
```

---

## Troubleshooting

### Error: "Maximum update depth exceeded"

**Causa:** Selector retornando objeto sin `useShallow`

```typescript
// ❌ Causa loop infinito
useCashierStore((s) => ({ year: s.year, month: s.month }))

// ✅ Solución
useCashierStore(useShallow((s) => ({ year: s.year, month: s.month })))
```

### Error: "getSnapshot should be cached"

**Causa:** Mismo problema que arriba - selector crea nueva referencia
**Solución:** Usar `useShallow` o selectores primitivos individuales

### Estado no persiste entre páginas

**Causa:** Usando `useState` local en lugar del store
**Solución:** Mover estado a `useCashierStore`

---

## Migración desde useState

### Antes

```typescript
export default function Page() {
  const [date, setDate] = useState(new Date())
  const [filter, setFilter] = useState('all')

  const handlePrevious = () => {
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() - 1)
    setDate(newDate)
  }

  return <Button onClick={handlePrevious}>Anterior</Button>
}
```

### Después

```typescript
export default function Page() {
  const { logsDate, logsGoToPreviousDay } = useCashierStore()
  const { actionFilter } = useLogsFilters()

  return <Button onClick={logsGoToPreviousDay}>Anterior</Button>
}
```

---

## Referencias

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [useShallow API](https://zustand-demo.pmnd.rs/docs/guides/prevent-rerenders-with-use-shallow)
- [React Query + Zustand](https://tkdodo.eu/blog/working-with-zustand)
