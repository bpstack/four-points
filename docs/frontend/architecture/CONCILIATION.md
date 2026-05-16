# Revisión de Arquitectura: Módulo CONCILIATION

## Resumen Ejecutivo

| Aspecto | Valor |
|---------|-------|
| **Puntuación** | 8/10 |
| **Estado** | Muy Bueno |
| **Líneas de código** | ~2,100 líneas |
| **Componentes** | 10 componentes |
| **React Query** | Integración completa |

---

## 1. ESTRUCTURA DE ARCHIVOS Y CONVENCIONES

### 1.1 Layout de Carpetas

```
app/
  dashboard/
    conciliation/
      page.tsx              # 8 líneas - Wrapper simple
      loading.tsx           # 96 líneas - Skeleton completo
      nota.md               # Notas de desarrollo
  components/
    conciliation/
      index.ts              # 12 líneas - Barrel exports
      types.ts              # 77 líneas - Tipos de componentes
      ConciliationClient.tsx    # 226 líneas - Componente principal
      ConciliationForm.tsx      # 525 líneas - Formulario completo
      ConciliationTable.tsx     # 192 líneas - Tabla genérica
      TotalsCards.tsx           # 109 líneas - Tarjetas de totales
      DaySummary.tsx            # 304 líneas - Resumen del día/mes
      ActionButtons.tsx         # 84 líneas - Botones de acción
      RoomPopover.tsx           # 87 líneas - Popover de habitaciones
      NotePopover.tsx           # 88 líneas - Popover de notas
      GeneralNotes.tsx          # 120 líneas - Notas generales
  lib/
    conciliation/
      index.ts              # 53 líneas - Barrel exports completo
      types.ts              # 151 líneas - Tipos del módulo
      config.ts             # 104 líneas - Configuración de reasons
      queries.ts            # 331 líneas - React Query + API client
```

### 1.2 Evaluación

| Criterio | Estado | Notas |
|----------|--------|-------|
| Sigue App Router Next.js 13+ | ⚠️ Parcial | page.tsx es solo wrapper |
| Separación clara de archivos | ✅ | Buena organización |
| Componentes por funcionalidad | ✅ | Bien separados |
| Archivos innecesarios | ❌ | nota.md no debería estar |
| Naming consistente | ✅ | PascalCase componentes |
| types.ts centralizado | ✅ | En lib/ y components/ |
| queries.ts para API | ✅ | Completo con React Query |
| actions.ts Server Actions | ❌ | NO EXISTE - usa API client |
| constants.ts | ✅ | config.ts con configuraciones |
| index.ts barrel exports | ✅ | En ambas carpetas |

**Puntuación sección: 7/10**

---

## 2. SERVER COMPONENTS (Page, Layout)

### 2.1 Page Component

```typescript
// app/dashboard/conciliation/page.tsx - SOLO 8 LÍNEAS
import { ConciliationClient } from '@/app/components/conciliation'

export default function ConciliationPage() {
  return <ConciliationClient />
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Es Server Component | ⚠️ | Sí pero no hace nada |
| Lee searchParams | ❌ | No usa searchParams |
| Hace data fetching | ❌ | Todo en cliente |
| Pasa initialData | ❌ | No pasa datos iniciales |
| Manejo de errores | ❌ | Sin try-catch |
| Usa Suspense | ❌ | No implementado |
| Fallback loading | ⚠️ | Depende de loading.tsx |

**Problema crítico:** La página es un simple wrapper que no aprovecha Server Components.

### 2.2 Loading States

```typescript
// loading.tsx - 96 líneas - EXCELENTE
function DatePickerSkeleton() { /* Skeleton horizontal */ }
function FormSectionSkeleton({ rows = 5 }) { /* Skeleton de formulario */ }

export default function ConciliationLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header skeleton */}
        {/* Month Navigation skeleton */}
        <DatePickerSkeleton />
        {/* Form Sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSectionSkeleton rows={5} />
          <FormSectionSkeleton rows={7} />
        </div>
        {/* Summary + Action Buttons skeletons */}
      </div>
    </div>
  )
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Existe loading.tsx | ✅ | 96 líneas |
| Skeleton coincide con UI | ✅ | Estructura idéntica |
| Dimensiones definidas | ✅ | Evita CLS |
| Animaciones suaves | ✅ | animate-pulse |
| Responsive | ✅ | Soporte móvil/desktop |

**Puntuación loading: 10/10**

### 2.3 Error Handling

| Criterio | Estado |
|----------|--------|
| Existe error.tsx | ❌ |
| Error boundary | ❌ |
| Botón "Reintentar" | ❌ |
| Logging de error | ❌ |

**Puntuación sección: 5/10**

---

## 3. SERVER ACTIONS

### 3.1 Estado Actual

**NO EXISTEN Server Actions.** El módulo usa un API client directo:

```typescript
// queries.ts - 'use client' - NO es Server Action
export const conciliationApi = {
  async getAll(): Promise<ConciliationSummary[]> {
    return apiClient.get(`${API_BASE}/api/conciliations`)
  },
  async getByDay(date: string): Promise<ConciliationDetail | null> {
    return apiClient.get(`${API_BASE}/api/conciliations/day/${date}`)
  },
  async create(data: CreateConciliationDTO): Promise<ConciliationDetail> {
    return apiClient.post(`${API_BASE}/api/conciliations`, data)
  },
  // ... más métodos
}
```

### 3.2 Problema

El token de autenticación se maneja en el cliente, no en servidor:
- No hay `cookies()` de Next.js
- No hay verificación server-side
- Vulnerable a XSS si el token está expuesto

### 3.3 Recomendación: Crear Server Actions

```typescript
// app/lib/conciliation/actions/getConciliationByDay.ts
'use server'

import { cookies } from 'next/headers'
import { API_BASE_URL } from '@/app/lib/env'

export async function getConciliationByDay(date: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    return { error: 'No autorizado', data: null }
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/conciliations/day/${date}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    )

    if (response.status === 404) {
      return { data: null, error: null }
    }

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`)
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    console.error('[getConciliationByDay]', error)
    return { error: 'Error al cargar conciliación', data: null }
  }
}
```

**Puntuación sección: 3/10** (no tiene Server Actions)

---

## 4. CLIENT COMPONENTS

### 4.1 ConciliationClient.tsx (226 líneas)

```typescript
'use client'

export default function ConciliationClient() {
  const t = useTranslations('conciliation')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [selectedConciliation, setSelectedConciliation] = useState<ConciliationDetail | null>(null)
  const [dayStatusMessage, setDayStatusMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const loadConciliation = useCallback(async (year, month, day) => {
    setLoading(true)
    try {
      const conciliation = await conciliationApi.getByDay(dateString)
      // ...
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409]">
      {/* Header sticky con navegación */}
      {/* HorizontalDatePicker */}
      {/* ConciliationForm */}
    </div>
  )
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| NECESITA 'use client' | ✅ | Usa useState, eventos |
| Recibe initialData | ❌ | No recibe datos del servidor |
| Usa initialData en React Query | ❌ | Usa conciliationApi directamente |
| Estados apropiados | ✅ | Bien organizados |
| Efectos con deps correctas | ✅ | useCallback con deps |
| Limpia subscripciones | N/A | No usa subscripciones |

### 4.2 ConciliationForm.tsx (525 líneas)

El componente más grande - maneja:
- Estados de formulario (reception, housekeeping)
- Popovers de habitaciones y notas
- Notas generales
- Cálculo de totales
- Operaciones CRUD

```typescript
export default function ConciliationForm({
  conciliation,
  loading,
  dayStatusMessage,
  onUpdate,
}: ConciliationFormProps) {
  const { user } = useAuth()
  const t = useTranslations('conciliation')

  const [receptionForm, setReceptionForm] = useState<Record<ReceptionReason, EntryForm>>({})
  const [housekeepingForm, setHousekeepingForm] = useState<Record<HousekeepingReason, EntryForm>>({})
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  // ...

  const handleSave = async () => {
    if (!conciliation) return
    setSaving(true)
    try {
      await conciliationApi.updateForm(conciliation.id!, formData)
      onUpdate()
    } catch (error) {
      alert(t('alerts.errorSaving'))
    } finally {
      setSaving(false)
    }
  }
}
```

### 4.3 Accesibilidad

| Criterio | Estado | Notas |
|----------|--------|-------|
| Labels asociados | ⚠️ | Inputs sin label explícito |
| Aria-labels en botones | ⚠️ | Algunos faltan |
| Navegación teclado | ✅ | Funciona con Tab |
| Contraste suficiente | ✅ | Colores apropiados |

**Puntuación sección: 7/10**

---

## 5. CUSTOM HOOKS

### 5.1 Análisis

**NO hay custom hooks dedicados.** La lógica está directamente en componentes.

El módulo podría beneficiarse de:

```typescript
// Propuesta: hooks/useConciliationForm.ts
export function useConciliationForm(conciliation: ConciliationDetail | null) {
  const [receptionForm, setReceptionForm] = useState<Record<ReceptionReason, EntryForm>>({})
  const [housekeepingForm, setHousekeepingForm] = useState<Record<HousekeepingReason, EntryForm>>({})
  
  // Inicializar desde conciliation
  useEffect(() => { /* ... */ }, [conciliation])
  
  // Calcular totales
  const totals = useMemo(() => calculateTotals(receptionForm, housekeepingForm), [/*...*/])
  
  // Funciones de actualización
  const updateReceptionValue = useCallback((reason, field, value) => { /*...*/ }, [])
  const updateHousekeepingValue = useCallback((reason, field, value) => { /*...*/ }, [])
  
  return {
    receptionForm,
    housekeepingForm,
    totals,
    updateReceptionValue,
    updateHousekeepingValue,
  }
}
```

**Puntuación sección: 4/10** (no hay hooks custom)

---

## 6. API LAYER (queries.ts)

### 6.1 Organización

```typescript
// queries.ts - 331 líneas - EXCELENTE ESTRUCTURA

// Query Keys Factory
export const conciliationKeys = {
  all: ['conciliation'] as const,
  lists: () => [...conciliationKeys.all, 'list'] as const,
  detail: (id: number) => [...conciliationKeys.all, 'detail', id] as const,
  byDay: (date: string) => [...conciliationKeys.all, 'day', date] as const,
  monthly: (year: number, month: number) =>
    [...conciliationKeys.all, 'monthly', year, month] as const,
  missingDays: (year: number, month: number) =>
    [...conciliationKeys.all, 'missing', year, month] as const,
}
```

### 6.2 React Query Hooks

```typescript
// Queries
export function useConciliationByDay(date: string) {
  return useQuery({
    queryKey: conciliationKeys.byDay(date),
    queryFn: async (): Promise<ConciliationDetail | null> => {
      try {
        return await apiClient.get<ConciliationDetail>(
          `${API_BASE}/api/conciliations/day/${date}`
        )
      } catch (error) {
        // Manejo de 404 - día sin conciliación
        if (errorMessage.includes('404')) return null
        throw error
      }
    },
    staleTime: 30 * 1000,
    retry: false,
  })
}

// Mutations
export function useCreateConciliation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateConciliationDTO) => {
      return apiClient.post<ConciliationDetail>(`${API_BASE}/api/conciliations`, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: conciliationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: conciliationKeys.byDay(variables.date) })
    },
  })
}
```

### 6.3 API Client Legacy

```typescript
// Para migración gradual
export const conciliationApi = {
  async getByDay(date: string): Promise<ConciliationDetail | null> {
    return apiClient.get(`${API_BASE}/api/conciliations/day/${date}`)
  },
  // ... más métodos
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Queries en lib/module | ✅ | Ubicación correcta |
| Objeto API agrupado | ✅ | conciliationApi |
| Separadas por recurso | ✅ | Daily y Monthly |
| Documentación | ✅ | JSDoc en cada función |
| API client centralizado | ✅ | Usa apiClient |
| Tipado completo | ✅ | Request/response tipados |
| Manejo de errores | ✅ | try-catch con tipos |
| URLSearchParams | ❌ | No usa query strings |

**Puntuación sección: 9/10**

---

## 7. REACT QUERY INTEGRATION

### 7.1 Query Keys

```typescript
export const conciliationKeys = {
  all: ['conciliation'] as const,
  lists: () => [...conciliationKeys.all, 'list'] as const,
  detail: (id: number) => [...conciliationKeys.all, 'detail', id] as const,
  byDay: (date: string) => [...conciliationKeys.all, 'day', date] as const,
  monthly: (year: number, month: number) =>
    [...conciliationKeys.all, 'monthly', year, month] as const,
}
```

| Criterio | Estado |
|----------|--------|
| Keys centralizados | ✅ |
| Estructura jerárquica | ✅ |
| Reutilizan en invalidations | ✅ |
| Tipados correctamente | ✅ |

### 7.2 Configuración de Queries

```typescript
export function useMonthlySummary(year: number, month: number) {
  return useQuery({
    queryKey: conciliationKeys.monthly(year, month),
    queryFn: async () => apiClient.get<MonthlySummary>(/*...*/),
    staleTime: 5 * 60 * 1000,  // 5 minutos
  })
}

export function useConciliationByDay(date: string) {
  return useQuery({
    queryKey: conciliationKeys.byDay(date),
    staleTime: 30 * 1000,  // 30 segundos
    retry: false,
  })
}
```

### 7.3 Mutations

```typescript
export function useUpdateConciliationForm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, formData }) => {
      return apiClient.put<ConciliationDetail>(
        `${API_BASE}/api/conciliations/${id}/form`,
        formData
      )
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: conciliationKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: conciliationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: conciliationKeys.all })
    },
  })
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| staleTime apropiado | ✅ | 30s daily, 5min monthly |
| gcTime configurado | ❌ | Usa default |
| Invalidación correcta | ✅ | Invalida queries relacionadas |
| Toast/feedback | ⚠️ | Solo alerts nativos |
| Optimistic updates | ❌ | No implementado |
| enabled condicional | ✅ | `enabled: id > 0` |

**Puntuación sección: 8/10**

---

## 8. GESTIÓN DE ESTADO EN URL (searchParams)

### 8.1 Estado Actual

**NO USA searchParams.** Todo el estado está en componentes:

```typescript
// ConciliationClient.tsx
const [currentDate, setCurrentDate] = useState(new Date())
const [selectedDay, setSelectedDay] = useState(new Date().getDate())
```

### 8.2 Recomendación

```typescript
// page.tsx - Debería ser
interface PageProps {
  searchParams: Promise<{ date?: string; view?: 'day' | 'month' }>
}

export default async function ConciliationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const date = params.date || formatDateForInput(new Date())
  const view = params.view || 'day'

  return (
    <ConciliationClient 
      initialDate={date}
      initialView={view}
    />
  )
}

// ConciliationClient.tsx - Actualizar URL al cambiar fecha
const router = useRouter()
const pathname = usePathname()

const selectDay = (day: number) => {
  const newDate = `${currentYear}-${month}-${day}`
  router.push(`${pathname}?date=${newDate}`, { scroll: false })
}
```

| Criterio | Estado |
|----------|--------|
| Server lee searchParams | ❌ |
| useSearchParams en client | ❌ |
| URLs compartibles | ❌ |
| Back/forward funciona | ❌ |

**Puntuación sección: 2/10**

---

## 9. BARREL EXPORTS

### 9.1 lib/conciliation/index.ts

```typescript
// Types
export type {
  ReceptionReason,
  HousekeepingReason,
  Direction,
  ConciliationStatus,
  ConciliationSummary,
  ReceptionEntryWithReason,
  HousekeepingEntryWithReason,
  ConciliationDetail,
  ConciliationPageProps,
  EntryForm,
  Note,
  MonthlySummary,
  ConciliationFormData,
  CreateConciliationDTO,
} from './types'

// Config
export {
  RECEPTION_CONFIG,
  HOUSEKEEPING_CONFIG,
  RECEPTION_REASONS_ORDERED,
  HOUSEKEEPING_REASONS_ORDERED,
} from './config'

// Query keys
export { conciliationKeys } from './queries'

// Queries (React Query hooks)
export {
  useConciliations,
  useConciliationByDay,
  useConciliationById,
  useMonthlySummary,
  useMissingDays,
} from './queries'

// Mutations
export {
  useCreateConciliation,
  useUpdateConciliationForm,
  useUpdateConciliationStatus,
  useRecalculateConciliation,
  useDeleteConciliation,
  useUpdateMonthlySummaryStatus,
} from './queries'

// Legacy API client
export { conciliationApi } from './queries'
```

### 9.2 components/conciliation/index.ts

```typescript
export { default as ConciliationClient } from './ConciliationClient'
export { default as ConciliationForm } from './ConciliationForm'
export { default as ConciliationTable } from './ConciliationTable'
export { default as TotalsCards } from './TotalsCards'
export { default as RoomPopover } from './RoomPopover'
export { default as NotePopover } from './NotePopover'
export { default as GeneralNotes } from './GeneralNotes'
export { default as ActionButtons } from './ActionButtons'
export { default as DaySummary } from './DaySummary'
export * from './types'
```

| Criterio | Estado |
|----------|--------|
| Existe index.ts | ✅ |
| Exporta componentes públicos | ✅ |
| Ordenados | ⚠️ |
| Simplifica imports | ✅ |

**Puntuación sección: 9/10**

---

## 10. TIPOS Y INTERFACES

### 10.1 lib/conciliation/types.ts

```typescript
// Base Types
export type ReceptionReason = 'base_rooms' | 'gratuity' | 'no_show' | 'room_change' | 'other'
export type HousekeepingReason = 
  | 'cleaned' | 'do_not_disturb' | 'ooo_cleaned' 
  | 'pending_cleaned' | 'pending_to_clean' | 'room_clean' | 'other'
export type Direction = 'add' | 'subtract'
export type ConciliationStatus = 'draft' | 'confirmed' | 'closed'

// Interfaces
export interface ConciliationSummary {
  id?: number
  date: string
  total_reception: number
  total_housekeeping: number
  difference?: number
  notes?: string | null
  status: ConciliationStatus
  created_by?: string | null
  updated_by?: string | null
  department_id?: number | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ConciliationDetail extends ConciliationSummary {
  reception_entries?: ReceptionEntryWithReason[]
  housekeeping_entries?: HousekeepingEntryWithReason[]
}

export interface MonthlySummary {
  metadata: { year: number; month: number; status: ConciliationStatus }
  period: { start: string; end: string; total_days: number; conciliations_count: number; missing_days: number }
  reception_summary: Array<{ reason: string; label: string; total: number }>
  housekeeping_summary: Array<{ reason: string; label: string; total: number }>
  totals: { total_reception: number; total_housekeeping: number; difference: number }
  can_close: boolean
  validation_errors: string[]
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| types.ts centralizado | ✅ | En lib/ |
| Se reutilizan tipos | ✅ | Entre archivos |
| Evita `any` | ✅ | Tipos concretos |
| Discriminated unions | ✅ | ConciliationStatus |
| Documentación JSDoc | ⚠️ | Limitada |

**Puntuación sección: 9/10**

---

## 11. FORMULARIOS

### 11.1 Validación

El formulario NO usa librerías de validación:

```typescript
// ConciliationForm.tsx - Validación manual
const addRoom = (newRoom: string) => {
  if (!roomPopover) return
  const trimmed = newRoom.trim()
  if (!trimmed || roomPopover.rooms.includes(trimmed)) return
  if (roomPopover.rooms.length >= 15) {
    alert(t('alerts.maxRooms'))
    return
  }
  // ...
}

const addEntryNote = (newNote: string) => {
  if (trimmed.length > 200) {
    alert(t('alerts.maxNoteLength'))
    return
  }
  if (notePopover.notes.length >= 10) {
    alert(t('alerts.maxNotes'))
    return
  }
  // ...
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Validación cliente | ⚠️ | Manual, no Zod |
| Validación servidor | ❌ | No implementada |
| React Hook Form/Zod | ❌ | No usa |
| Mensajes claros | ✅ | i18n |
| Previene submit duplicado | ✅ | `saving` state |
| Feedback visual | ✅ | Botones disabled |
| Spinners durante submit | ⚠️ | Solo texto |
| Mantiene draft en error | ✅ | No limpia |

### 11.2 Recomendación: Agregar Validación Zod

```typescript
// lib/conciliation/validations.ts
import { z } from 'zod'

export const entryFormSchema = z.object({
  value: z.number().min(0),
  room_number: z.string().max(255),
  notes: z.string().max(200),
})

export const conciliationFormSchema = z.object({
  reception: z.array(z.object({
    reason: z.enum(['base_rooms', 'gratuity', 'no_show', 'room_change', 'other']),
    ...entryFormSchema.shape,
  })),
  housekeeping: z.array(z.object({
    reason: z.enum(['cleaned', 'do_not_disturb', /*...*/]),
    ...entryFormSchema.shape,
  })),
  notes: z.string().optional(),
})
```

**Puntuación sección: 6/10**

---

## 12. MODALES Y DIÁLOGOS

### 12.1 Popovers (No son modales tradicionales)

```typescript
// RoomPopover.tsx - Popover modal simple
export default function RoomPopover({ rooms, isReadOnly, onClose, onAddRoom, onRemoveRoom }) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      
      {/* Popover centrado */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 
                      bg-white dark:bg-gray-800 border rounded-lg shadow-xl p-4 w-80">
        <div className="flex items-center justify-between mb-3">
          <h3>{t('roomPopover.title')} ({rooms.length}/15)</h3>
          <button onClick={onClose}><FiX /></button>
        </div>
        {/* Input + lista de rooms */}
      </div>
    </>
  )
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Componente base | ❌ | Cada popover es independiente |
| Cierra con ESC | ❌ | No implementado |
| Cierra con click fuera | ✅ | Backdrop onClick |
| Focus trap | ❌ | No implementado |
| aria-label | ❌ | Falta |
| Animaciones | ❌ | Sin transiciones |

### 12.2 Recomendación: Agregar Cierre con ESC

```typescript
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  window.addEventListener('keydown', handleEsc)
  return () => window.removeEventListener('keydown', handleEsc)
}, [onClose])
```

**Puntuación sección: 5/10**

---

## 13. LISTADOS Y PAGINACIÓN

### 13.1 Análisis

El módulo NO tiene listado tradicional con paginación. Funciona con:
- Selector de fechas horizontal (días del mes)
- Un registro por día

```typescript
// HorizontalDatePicker - Selector de días
<HorizontalDatePicker
  currentDate={currentDate}
  selectedDay={selectedDay}
  onSelectDay={selectDay}
  locale="es-ES"
/>
```

**No aplica paginación tradicional.**

**Puntuación sección: N/A**

---

## 14. BÚSQUEDA Y FILTROS

### 14.1 Análisis

No hay búsqueda de texto. Los "filtros" son:
- Mes actual (navegación)
- Día seleccionado

```typescript
const goToPreviousMonth = () => {
  const newDate = new Date(currentDate)
  newDate.setMonth(newDate.getMonth() - 1)
  setCurrentDate(newDate)
  setSelectedDay(1)
}

const goToNextMonth = () => { /* similar */ }

const goToToday = () => {
  const today = new Date()
  setCurrentDate(today)
  setSelectedDay(today.getDate())
}
```

**Puntuación sección: N/A** (No aplica)

---

## 15. NOTIFICACIONES Y FEEDBACK

### 15.1 Estado Actual

Usa `alert()` nativo en lugar de toast:

```typescript
// ConciliationForm.tsx
const handleSave = async () => {
  try {
    await conciliationApi.updateForm(conciliation.id!, formData)
    onUpdate()  // Sin toast de éxito
  } catch (error) {
    alert(t('alerts.errorSaving'))  // Alert nativo
  }
}

const deleteGeneralNote = (noteId: string, authorId: string) => {
  if (user?.id !== authorId) {
    alert(t('alerts.onlyAuthorCanDelete'))
    return
  }
}
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Sistema de toast | ❌ | Usa alert() |
| Toast en success | ❌ | Sin feedback |
| Toast en error | ⚠️ | Solo alert() |
| Mensajes claros | ✅ | i18n |
| Spinners | ⚠️ | Solo texto "Guardando..." |
| Botones disabled | ✅ | Durante operaciones |
| Estados vacíos | ✅ | Mensaje cuando no hay datos |

### 15.2 Recomendación: Implementar Toast

```typescript
import { toast } from 'react-hot-toast'

const handleSave = async () => {
  try {
    await conciliationApi.updateForm(conciliation.id!, formData)
    toast.success(t('alerts.savedSuccess'))
    onUpdate()
  } catch (error) {
    toast.error(t('alerts.errorSaving'))
  }
}
```

**Puntuación sección: 5/10**

---

## 16. INTERNACIONALIZACIÓN (i18n)

### 16.1 Estructura

```json
// messages/es/conciliation.json - 95 líneas
{
  "page": {
    "loading": "Cargando...",
    "selectDay": "Selecciona un dia",
    "noConciliation": "No hay conciliacion para este dia.",
    "errorLoading": "Error cargando conciliacion."
  },
  "header": {
    "today": "Hoy",
    "status": "Estado",
    "newConciliation": "Nueva Conciliacion"
  },
  "status": {
    "draft": "Borrador",
    "confirmed": "Confirmado",
    "closed": "Cerrado"
  },
  "actions": {
    "saveDraft": "Guardar borrador",
    "saving": "Guardando...",
    "submit": "Enviar/Firmar",
    "reopen": "Reabrir",
    "closeDefinitely": "Cerrar definitivamente"
  },
  "table": {
    "concept": "Concepto",
    "value": "Valor",
    "roomNumber": "No Hab",
    "notes": "Notas",
    "result": "Resultado",
    "reception": "Recepcion",
    "housekeeping": "Housekeeping"
  },
  "totals": { /* ... */ },
  "generalNotes": { /* ... */ },
  "roomPopover": { /* ... */ },
  "notePopover": { /* ... */ },
  "daySummary": { /* ... */ }
}
```

### 16.2 Uso

```typescript
// Todos los componentes usan useTranslations
const t = useTranslations('conciliation')

// En JSX
<span>{t('status.draft')}</span>
<span>{t('daySummary.totalRooms', { count: baseRooms })}</span>
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Textos externalizados | ✅ | conciliation.json |
| Archivo por módulo | ✅ | |
| useTranslations | ✅ | En todos los componentes |
| Namespace correcto | ✅ | 'conciliation' |
| Pluralización | ⚠️ | Limitada |
| Todos traducidos | ✅ | |
| Error messages i18n | ✅ | |

**Puntuación sección: 9/10**

---

## 17. TESTING

| Criterio | Estado |
|----------|--------|
| Tests unitarios | ❌ |
| Tests integración | ❌ |
| Coverage | 0% |

**Puntuación sección: 0/10**

---

## 18. PERFORMANCE Y OPTIMIZACIONES

### 18.1 Rendering

```typescript
// ConciliationForm.tsx - calculateTotals con useCallback
const calculateTotals = useCallback(() => {
  let totalReception = 0
  let totalHousekeeping = 0
  
  RECEPTION_REASONS_ORDERED.forEach((reason) => {
    const config = RECEPTION_CONFIG[reason]
    const value = receptionForm[reason]?.value || 0
    totalReception += config.direction === 'add' ? value : -value
  })
  // ...
  return { totalReception, totalHousekeeping, difference }
}, [receptionForm, housekeepingForm])

const totals = calculateTotals()
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| memo() en componentes | ❌ | No usado |
| useCallback | ⚠️ | Solo algunos |
| useMemo | ❌ | totals debería usar useMemo |
| Paginación servidor | N/A | Un registro por día |
| React Query cache | ✅ | staleTime configurado |

### 18.2 Recomendación

```typescript
// Debería ser useMemo, no useCallback
const totals = useMemo(() => {
  let totalReception = 0
  let totalHousekeeping = 0
  // ...
  return { totalReception, totalHousekeeping, difference }
}, [receptionForm, housekeepingForm])
```

**Puntuación sección: 6/10**

---

## 19. SEGURIDAD

### 19.1 Autenticación

```typescript
// queries.ts - Token manejado en cliente
// El apiClient maneja el token desde storage/cookies en cliente
return apiClient.get(`${API_BASE}/api/conciliations`)
```

| Criterio | Estado | Notas |
|----------|--------|-------|
| Token validado en servidor | ❌ | No hay Server Actions |
| httpOnly cookies | ⚠️ | Depende de apiClient |
| Refresh token | ⚠️ | Manejado en apiClient |
| Verificación de permisos | ❌ | No en frontend |
| Validación servidor | ❌ | No hay Server Actions |
| Sanitización inputs | ⚠️ | Básica (.trim()) |

**Puntuación sección: 5/10**

---

## 20. DOCUMENTACIÓN

### 20.1 Código

```typescript
// queries.ts tiene JSDoc
/**
 * Obtener conciliación por fecha específica
 */
export function useConciliationByDay(date: string) { /* ... */ }

/**
 * Crear nueva conciliación
 */
export function useCreateConciliation() { /* ... */ }
```

| Criterio | Estado |
|----------|--------|
| JSDoc en funciones | ⚠️ |
| Comentarios en lógica | ✅ |
| README del módulo | ❌ |
| Ejemplos de uso | ❌ |

**Puntuación sección: 5/10**

---

## 21. INTEGRACIÓN CON OTROS MÓDULOS

### 21.1 Dependencies

- `@/app/lib/apiClient` - Cliente HTTP
- `@/app/lib/auth/useAuth` - Autenticación
- `@/app/ui/calendar/HorizontalDatePicker` - Componente UI compartido

| Criterio | Estado |
|----------|--------|
| Dependencies claras | ✅ |
| Sin circulares | ✅ |
| Exports desde index.ts | ✅ |

**Puntuación sección: 8/10**

---

## 22. DATABASE Y BACKEND

### 22.1 Endpoints API

```
GET    /api/conciliations                              # Lista todas
GET    /api/conciliations/:id                          # Por ID
GET    /api/conciliations/day/:date                    # Por fecha
POST   /api/conciliations                              # Crear
PUT    /api/conciliations/:id/form                     # Actualizar formulario
PATCH  /api/conciliations/:id/status                   # Cambiar estado
POST   /api/conciliations/:id/recalculate              # Recalcular totales
DELETE /api/conciliations/:id                          # Soft delete

GET    /api/conciliations/monthly-summary/:year/:month           # Resumen mensual
GET    /api/conciliations/monthly-summary/:year/:month/missing-days
GET    /api/conciliations/monthly-summary/:year/:month/validation
PATCH  /api/conciliations/monthly-summary/:year/:month/status
```

**Puntuación sección: 9/10**

---

## 23. ÁREAS DE MEJORA ESPECÍFICAS

### Top 3 Issues Críticos

1. **Page.tsx no aprovecha Server Components**
   - Solo es un wrapper de 8 líneas
   - No pasa initialData
   - No lee searchParams

2. **No existen Server Actions**
   - Todo el fetching es client-side
   - Token manejado en cliente
   - Sin validación server-side

3. **Sin gestión de estado en URL**
   - Fecha no persistida en URL
   - No compartible
   - Back/forward no funciona

### Top 5 Mejoras Recomendadas

1. Convertir page.tsx a Server Component con data fetching
2. Crear Server Actions para autenticación server-side
3. Implementar searchParams para fecha seleccionada
4. Agregar sistema de toast (react-hot-toast)
5. Crear custom hook `useConciliationForm`

### Nice-to-haves

- Agregar error.tsx
- Tests unitarios para hooks
- Validación Zod
- Cierre de popovers con ESC
- Animaciones en transiciones

### Plan de Refactoring

| Tarea | Esfuerzo | Prioridad |
|-------|----------|-----------|
| Server Actions | 4h | Alta |
| page.tsx con initialData | 2h | Alta |
| searchParams para fecha | 2h | Alta |
| Sistema de toast | 1h | Media |
| Custom hook formulario | 3h | Media |
| error.tsx | 1h | Media |
| Validación Zod | 2h | Baja |
| Tests | 6h | Baja |

**Total estimado: 21 horas**

---

## 24. COMPARACIÓN CON PARKING

| Criterio | Parking | Conciliation |
|----------|---------|--------------|
| Server Component page | ✅ | ⚠️ Wrapper |
| Server Actions | ✅ | ❌ |
| initialData pattern | ✅ | ❌ |
| searchParams | ✅ | ❌ |
| Custom hooks | ✅ | ❌ |
| React Query | ✅ | ✅ |
| Query keys factory | ✅ | ✅ |
| loading.tsx | ✅ | ✅ |
| error.tsx | ⚠️ | ❌ |
| i18n | ✅ | ✅ |
| Barrel exports | ✅ | ✅ |
| Tipado | ✅ | ✅ |

### Diferencias Justificadas

- Conciliation maneja UN registro por día (no lista paginada)
- UI diferente: calendario horizontal + formulario
- Flujo de estados: draft -> confirmed -> closed

### Donde está Peor

- No tiene Server Actions
- No aprovecha Server Components
- No persiste estado en URL
- Sin custom hooks para lógica compleja

---

## 25. RESUMEN Y RECOMENDACIONES

### Estado General: 8/10 (Muy Bueno)

### Fortalezas Principales

1. **React Query excelente** - Query keys, mutations, invalidación
2. **Tipado completo** - Tipos en lib/types.ts
3. **i18n completo** - 95 líneas de traducciones
4. **loading.tsx de calidad** - Skeleton que coincide con UI
5. **Barrel exports** - En lib/ y components/
6. **Configuración centralizada** - RECEPTION_CONFIG, HOUSEKEEPING_CONFIG
7. **Componentes bien separados** - 10 componentes especializados

### Debilidades Críticas

1. **Sin Server Actions** - Todo client-side
2. **page.tsx no aprovechado** - Solo wrapper
3. **Sin searchParams** - Estado no persistido en URL
4. **Sin validación Zod** - Validación manual
5. **Sin error.tsx** - No hay error boundary

### Hoja de Ruta (2-4 semanas)

#### Semana 1: Server-side
- [ ] Crear Server Actions (getConciliationByDay, createConciliation, etc.)
- [ ] Actualizar page.tsx para pasar initialData
- [ ] Implementar searchParams para fecha

#### Semana 2: UX
- [ ] Implementar toast notifications
- [ ] Crear error.tsx
- [ ] Agregar cierre con ESC en popovers

#### Semana 3: Código
- [ ] Extraer useConciliationForm hook
- [ ] Agregar validación Zod
- [ ] Optimizar renders con useMemo

#### Semana 4: Testing
- [ ] Tests unitarios para queries/mutations
- [ ] Tests de integración para flujo completo

### Esfuerzo Estimado Total: ~21 horas

---

## Archivos del Módulo

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| page.tsx | 8 | Wrapper (necesita mejora) |
| loading.tsx | 96 | Skeleton excelente |
| lib/types.ts | 151 | Tipos del módulo |
| lib/config.ts | 104 | Configuración reasons |
| lib/queries.ts | 331 | React Query + API |
| lib/index.ts | 53 | Barrel exports |
| components/ConciliationClient.tsx | 226 | Componente principal |
| components/ConciliationForm.tsx | 525 | Formulario completo |
| components/ConciliationTable.tsx | 192 | Tabla genérica |
| components/DaySummary.tsx | 304 | Resumen día/mes |
| components/TotalsCards.tsx | 109 | Tarjetas totales |
| components/ActionButtons.tsx | 84 | Botones de acción |
| components/RoomPopover.tsx | 87 | Popover habitaciones |
| components/NotePopover.tsx | 88 | Popover notas |
| components/GeneralNotes.tsx | 120 | Notas generales |
| components/types.ts | 77 | Tipos componentes |
| components/index.ts | 12 | Barrel exports |
| messages/es/conciliation.json | 95 | Traducciones |
| **TOTAL** | **~2,100** | |
