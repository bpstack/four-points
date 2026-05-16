# Arquitectura Frontend - Four Points

## Contexto de la Aplicación

| Característica | Realidad |
|----------------|----------|
| **Tipo de app** | Dashboard interno de gestión hotelera |
| **Usuarios** | Staff del hotel (siempre autenticados) |
| **SEO necesario** | NO - aplicación privada |
| **Interactividad** | ALTA - formularios, modales, tabs, calendarios, edición inline |
| **Datos** | Cambian frecuentemente, requieren sincronización en tiempo real |
| **Acceso público** | NO - requiere login |

---

## Filosofía de Arquitectura

### Lo que NO aplica a esta app

Los patrones "recomendados" de Next.js están diseñados para apps públicas con necesidades de SEO. **Esta es una app privada de dashboard**, por lo tanto:

| Patrón de Next.js | ¿Aplica aquí? | Razón |
|-------------------|---------------|-------|
| Server Components por defecto | **NO** | No hay beneficio de SEO, alta interactividad requiere hooks |
| Server Actions para fetch | **NO** | React Query ya maneja cache, invalidación, retry |
| SSR para datos iniciales | **NO** | No hay SEO, usuarios siempre autenticados |
| searchParams para todo | **PARCIAL** | Solo donde URLs compartibles importen |

### Lo que SÍ aplica

| Patrón | Aplica | Razón |
|--------|--------|-------|
| React Query para server state | **SÍ** | Cache inteligente, invalidación, loading states |
| Zustand para client state | **SÍ** | UI state: modales, tabs, filtros locales |
| TypeScript estricto | **SÍ** | Mantenibilidad, autocompletado, menos bugs |
| Componentes modulares | **SÍ** | Archivos < 300 líneas, fácil de mantener |
| Loading/Error states | **SÍ** | Mejor UX |

---

## Arquitectura Recomendada

### Stack de Estado

```
┌─────────────────────────────────────────────────────────┐
│                    COMPONENTES                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   React Query          │          Zustand               │
│   (Server State)       │          (Client State)        │
│                        │                                │
│   - Datos de API       │   - Modales abiertos/cerrados  │
│   - Cache automático   │   - Tab activo                 │
│   - Invalidación       │   - Filtros de UI              │
│   - Loading/Error      │   - Fecha seleccionada         │
│   - Retry automático   │   - Estado de formularios      │
│                        │                                │
└─────────────────────────────────────────────────────────┘
```

### Estructura de Módulo Recomendada

```
module/
├── page.tsx              # Puede ser 'use client' - está bien
├── layout.tsx            # Opcional
├── loading.tsx           # Skeleton durante carga inicial
├── error.tsx             # Error boundary
│
├── components/           # Componentes del módulo
│   ├── ModuleClient.tsx  # Componente principal
│   ├── ModuleTable.tsx
│   └── modals/
│       └── index.ts      # Barrel exports
│
└── lib/                  # O en app/lib/module/
    ├── queries.ts        # React Query hooks
    └── types.ts          # TypeScript types
```

**Nota:** La carpeta `actions/` con Server Actions **NO es necesaria** si ya tienes `queries.ts` con React Query. Crear ambos = duplicación.

---

## Criterios de Evaluación (Pragmáticos)

### Criterios de Alta Prioridad

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **No duplicar código** | 🔴 Crítico | Una sola fuente de verdad para data fetching |
| **TypeScript completo** | 🔴 Alto | Tipos para props, responses, state |
| **Separación de concerns** | 🔴 Alto | queries.ts, store.ts, components/ separados |
| **React Query bien usado** | 🔴 Alto | Query keys factory, invalidación correcta, staleTime |

### Criterios de Media Prioridad

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Componentes < 300 líneas** | 🟡 Medio | Archivos grandes = difícil mantener |
| **Loading states** | 🟡 Medio | loading.tsx o skeletons en componentes |
| **Error boundaries** | 🟡 Medio | error.tsx para recuperación |
| **Zustand optimizado** | 🟡 Medio | Selectores individuales para evitar re-renders |

### Criterios de Baja Prioridad (para esta app)

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Server Components | 🟢 Bajo | No hay beneficio de SEO |
| Server Actions | 🟢 Bajo | React Query ya maneja fetch |
| URL state (searchParams) | 🟢 Opcional | Solo si URLs compartibles importan |

---

## Anti-patrones a Evitar

### 1. Duplicar React Query con Server Actions

```typescript
// ❌ MAL: Duplicación
// queries.ts
export function useDailyDetails(date: string) {
  return useQuery({
    queryKey: ['cashier', 'daily', date],
    queryFn: () => apiClient.get(`/api/cashier/daily/${date}`)
  })
}

// actions/getCashierDaily.ts - DUPLICADO INNECESARIO
'use server'
export async function getCashierDaily(date: string) {
  const response = await fetch(`/api/cashier/daily/${date}`)
  return response.json()
}
```

```typescript
// ✅ BIEN: Una sola fuente
// queries.ts - TODO el data fetching aquí
export function useDailyDetails(date: string) {
  return useQuery({
    queryKey: cashierKeys.daily(date),
    queryFn: () => apiClient.get(`/api/cashier/daily/${date}`),
    staleTime: 30 * 1000,
  })
}
```

### 2. Forzar Server Components donde no aportan

```typescript
// ❌ MAL: Server Component forzado que complica todo
export default async function CashierPage({ searchParams }: PageProps) {
  const date = searchParams.date || today
  const initialData = await getCashierDaily(date)  // Server Action
  
  return (
    <CashierClient 
      initialData={initialData}  // Prop drilling
      selectedDate={date}        // Más props
      // ¿Y el resto del estado de Zustand?
    />
  )
}

// ✅ BIEN: Client Component que usa React Query + Zustand
'use client'
export default function CashierPage() {
  const selectedDate = useSelectedDate()  // Zustand
  const { data, isLoading } = useDailyDetails(selectedDate)  // React Query
  
  // Todo el estado accesible, sin prop drilling
}
```

### 3. Componentes gigantes

```typescript
// ❌ MAL: 463 líneas en un solo archivo
// ShiftCard.tsx - hace demasiadas cosas

// ✅ BIEN: Dividir en componentes más pequeños
// ShiftCard.tsx (~150 líneas) - orquestador
// ShiftMetrics.tsx (~80 líneas) - métricas
// ShiftDenominations.tsx (~100 líneas) - conteo de efectivo
// ShiftPayments.tsx (~80 líneas) - pagos electrónicos
```

---

## Ranking de Módulos (Criterios Pragmáticos)

| Pos | Módulo | Puntuación | Estado | Notas |
|-----|--------|------------|--------|-------|
| 1 | Parking | 9/10 | Excelente | Bien organizado, React Query + custom hooks |
| 2 | Backoffice | 9/10 | Excelente | Parallel fetching, error boundaries |
| 3 | **Cashier** | **8.5/10** | **Muy Bueno** | Excelente React Query + Zustand |
| 4 | Profile | 8.5/10 | Muy Bueno | URL state para tabs, buen i18n |
| 5 | Maintenance | 8/10 | Muy Bueno | Server Actions útiles aquí |
| 6 | Conciliation | 8/10 | Muy Bueno | React Query bien estructurado |
| 7 | Groups | 7.5/10 | Bueno | Funcional, algunos componentes grandes |
| 8 | Blacklist | 7.5/10 | Bueno | Mixto Server/Client bien balanceado |
| 9 | Logbooks | 7/10 | Bueno | Funciona, extraer componentes grandes |
| 10 | Restaurant | 5/10 | Prototipo | Sin backend, solo mock data |

---

## Mejoras Recomendadas por Módulo

### Mejoras de Alto Impacto

| Módulo | Mejora | Beneficio | Esfuerzo |
|--------|--------|-----------|----------|
| Restaurant | Implementar backend | Funcionalidad real | Alto |
| Profile | Dividir SettingsPanel.tsx (1,209 líneas) | Mantenibilidad | Medio |
| Cashier | Dividir ShiftCard.tsx (463 líneas) | Mantenibilidad | Medio |

### Mejoras de Medio Impacto

| Módulo | Mejora | Beneficio | Esfuerzo |
|--------|--------|-----------|----------|
| Logbooks | Agregar loading.tsx | UX | Bajo |
| Conciliation | Agregar error.tsx | Resiliencia | Bajo |
| Groups | URL params para filtros | URLs compartibles | Medio |

### NO Hacer (Esfuerzo sin beneficio)

| Cambio | Por qué NO |
|--------|------------|
| Convertir pages a Server Components | Rompe React Query + Zustand |
| Crear Server Actions duplicados | Duplicación de código |
| Migrar todo a searchParams | Complejidad innecesaria |

---

## Patrones de Código Recomendados

### React Query: Query Keys Factory

```typescript
// ✅ Patrón recomendado
export const cashierKeys = {
  all: ['cashier'] as const,
  daily: (date: string) => ['cashier', 'daily', date] as const,
  shift: (id: number) => ['cashier', 'shift', id] as const,
  reports: {
    monthly: (year: number, month: number) => 
      ['cashier', 'reports', 'monthly', year, month] as const,
  },
}

// Uso en queries
useQuery({ queryKey: cashierKeys.daily(date), ... })

// Invalidación precisa
queryClient.invalidateQueries({ queryKey: cashierKeys.daily(date) })
```

### Zustand: Selectores Optimizados

```typescript
// ✅ Selectores individuales para evitar re-renders
export const useSelectedDate = () => useCashierStore((s) => s.selectedDate)
export const useActiveTab = () => useCashierStore((s) => s.activeTab)
export const useActiveModal = () => useCashierStore((s) => s.activeModal)

// Para múltiples valores relacionados
export const useLogsFilters = () =>
  useCashierStore(
    useShallow((s) => ({
      actionFilter: s.logsActionFilter,
      userFilter: s.logsUserFilter,
      limit: s.logsLimit,
    }))
  )
```

### Componentes: Barrel Exports

```typescript
// components/modals/index.ts
export { default as InitializeDayModal } from './InitializeDayModal'
export { default as CloseDayModal } from './CloseDayModal'
export { default as CloseShiftModal } from './CloseShiftModal'

// Uso limpio
import { InitializeDayModal, CloseDayModal } from './modals'
```

---

## Cuándo SÍ Usar Server Components

Aunque no son prioritarios, hay casos donde sí aportan valor:

| Caso de Uso | Ejemplo | Beneficio |
|-------------|---------|-----------|
| Páginas estáticas | /dashboard/help | Menos JS al cliente |
| Layouts simples | layout.tsx sin estado | Renderizado más rápido |
| Páginas de error | error.tsx, not-found.tsx | Ya son server por defecto |
| Fetch paralelo sin interactividad | Backoffice con Promise.all | Datos listos antes de hidratar |

---

## Cuándo SÍ Usar URL State (searchParams)

| Caso | Usar searchParams | Ejemplo |
|------|-------------------|---------|
| Filtros que el usuario compartiría | ✅ Sí | `/blacklist?severity=high` |
| Fecha de un reporte específico | ✅ Sí | `/reports?date=2025-01-15` |
| Tab activo importante | ⚠️ Depende | `/profile?panel=settings&tab=security` |
| Modal abierto | ❌ No | Estado efímero |
| Día seleccionado en calendario | ❌ No | Interacción muy frecuente |

---

## Documentación por Módulo

| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| Parking | [PARKING.md](./PARKING.md) | Referencia de buenas prácticas |
| Backoffice | [BACKOFFICE.md](./BACKOFFICE.md) | Parallel fetching, Suspense |
| Cashier | [CASHIER.md](./CASHIER.md) | React Query + Zustand ejemplar |
| Profile | [PROFILE.md](./PROFILE.md) | URL state multi-nivel |
| Maintenance | [MAINTENANCE.md](./MAINTENANCE.md) | Server Actions bien usados |
| Conciliation | [CONCILIATION.md](./CONCILIATION.md) | React Query avanzado |
| Groups | [GROUPS.md](./GROUPS.md) | CRUD completo |
| Blacklist | [BLACKLIST.md](./BLACKLIST.md) | Mixto Server/Client |
| Logbooks | [LOGBOOKS.md](./LOGBOOKS.md) | Custom hooks |
| Restaurant | [RESTAURANT.md](./RESTAURANT.md) | Prototipo (sin backend) |

---

## Resumen Ejecutivo

### La arquitectura de Four Points es CORRECTA para su contexto

Esta es una **aplicación de dashboard privada** con **alta interactividad**. Los patrones de Next.js para apps públicas con SEO **no aplican aquí**.

### Stack Recomendado (ya implementado)

```
React Query  →  Server state (datos de API)
Zustand      →  Client state (UI)
TypeScript   →  Type safety
'use client' →  Está bien para páginas interactivas
```

### Enfoque de Mejoras

1. **NO duplicar código** - Una fuente de verdad para fetch
2. **Dividir componentes grandes** - < 300 líneas por archivo
3. **Agregar loading/error states** - Donde falten
4. **URL state solo donde aporte valor** - No dogmáticamente

### Módulo de Referencia

**Cashier** es ahora el mejor ejemplo de arquitectura pragmática:
- React Query con query keys factory
- Zustand con selectores optimizados
- Separación clara: queries.ts, store.ts, components/
- TypeScript completo
- Sin duplicación de código
