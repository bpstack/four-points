# Revisión de Arquitectura: Módulo MAINTENANCE

## Puntuación: 8/10 (Muy Bueno)

**Fecha de revisión:** 27 de diciembre 2024  
**Criterios:** Pragmáticos (moduleTEST.md)

---

## Resumen Ejecutivo

El módulo MAINTENANCE tiene una arquitectura sólida con React Query bien implementado, TypeScript completo, y buena separación de concerns. **Sin embargo, tiene un problema de DUPLICACIÓN**: Server Actions (`actions/`) y `maintenanceApi.ts` hacen exactamente lo mismo. Los Server Actions solo se usan para SSR inicial, mientras que React Query usa `maintenanceApi.ts` para todo lo demás.

**Decisión pragmática:** Mantener la duplicación porque:
1. Server Actions se usan SOLO para SSR inicial (page.tsx)
2. React Query usa `maintenanceApi.ts` para client-side
3. El costo de refactorizar es mayor que el beneficio

---

## Evaluación con Criterios Pragmáticos

### Alta Prioridad (Críticos)

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 1 | ¿Duplicación de código? | ⚠️ | Server Actions + maintenanceApi.ts hacen lo mismo |
| 2 | ¿TypeScript completo? | ✅ | Tipos en `maintenance.ts`, sin `any` |
| 3 | ¿Queries/mutations separados? | ✅ | `useMaintenanceList.ts` + `maintenanceApi.ts` |
| 4 | ¿React Query bien usado? | ✅ | Query keys factory, staleTime, invalidación correcta |

### Media Prioridad

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 5 | ¿Componentes > 300 líneas? | ⚠️ | DetailTab.tsx (617 líneas), MaintenanceListClient (659 líneas) |
| 6 | ¿Loading states? | ✅ | `loading.tsx` con skeleton detallado |
| 7 | ¿Error boundaries? | ✅ | `error.tsx` usa `ModuleError` reutilizable |

### Baja Prioridad

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 8 | ¿URL state donde aporta? | ✅ | 5 searchParams (status, priority, location_type, search, page) |
| 9 | ¿Zustand optimizado? | ⚠️ | Store para detalle, sin selectores optimizados |

---

## Estructura de Archivos

```
dashboard/maintenance/
├── [id]/
│   └── page.tsx              # 69 líneas - Server Component
├── actions/                   # Server Actions (SSR only)
│   ├── getMaintenance.ts     # 73 líneas
│   ├── getMaintenanceById.ts
│   ├── createMaintenance.ts
│   ├── updateMaintenance.ts
│   ├── deleteMaintenance.ts
│   ├── updateMaintenanceStatus.ts
│   ├── updateMaintenancePriority.ts
│   └── index.ts              # Barrel exports
├── error.tsx                  # 14 líneas - Error boundary
├── loading.tsx                # 131 líneas - Skeleton
└── page.tsx                   # 61 líneas - Server Component

components/maintenance/
├── hooks/
│   └── useMaintenanceList.ts  # 176 líneas - React Query hook ✅
├── panels/
│   ├── CreateReportPanel.tsx  # 337 líneas
│   └── EditReportPanel.tsx    # 431 líneas
├── tabs/
│   ├── DetailTab.tsx          # 617 líneas ⚠️
│   └── HistoryTab.tsx         # 163 líneas
├── MaintenanceListClient.tsx  # 659 líneas ⚠️
└── ReportDetailClient.tsx     # 121 líneas

lib/maintenance/
├── maintenance.ts             # Tipos/interfaces
├── maintenanceApi.ts          # 211 líneas - Cliente API ✅
└── maintenance-schemas.ts     # Validación Zod

stores/
└── useMaintenanceStore.ts     # 144 líneas - Estado detalle
```

---

## Lo que hace BIEN

### 1. React Query con Query Keys Factory

```typescript
// hooks/useMaintenanceList.ts
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  lists: () => [...maintenanceKeys.all, 'list'] as const,
  list: (filters: ReportFilters & { page?: number; limit?: number }) =>
    [...maintenanceKeys.lists(), filters] as const,
  details: () => [...maintenanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...maintenanceKeys.details(), id] as const,
}

const { data, isLoading, isFetching } = useQuery({
  queryKey: maintenanceKeys.list(queryFilters),
  queryFn: () => maintenanceApi.getAll(queryFilters),
  initialData,
  staleTime: 2 * 60 * 1000,  // 2 minutos
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
})
```

### 2. Invalidación Específica (no global)

```typescript
// Invalidación correcta - solo lo necesario
const updateStatusMutation = useMutation({
  mutationFn: ({ id, status, notes }) => maintenanceApi.updateStatus(id, status, notes),
  onSuccess: (_, variables) => {
    toast.success(messages.statusUpdated)
    invalidateList()  // Lista
    queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(variables.id) })  // Detalle
  },
})
```

### 3. SSR con initialData

```typescript
// page.tsx - Server Component
export default async function MaintenancePage({ searchParams }: PageProps) {
  const data = await getMaintenance(filters)  // Server Action para SSR
  
  return (
    <MaintenanceListClient
      initialReports={data?.reports || []}
      initialPagination={data?.pagination}
    />
  )
}

// MaintenanceListClient.tsx - Usa initialData
const { reports } = useMaintenanceList({
  filters,
  page: currentPage,
  initialData: initialPagination  // ← No refetch innecesario
    ? { reports: initialReports, pagination: initialPagination }
    : undefined,
})
```

### 4. Loading y Error Boundaries

```typescript
// loading.tsx - Skeleton que coincide con UI real
function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-2">
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </td>
      {/* ... */}
    </tr>
  )
}

// error.tsx - Reutiliza componente global
export default function MaintenanceError({ error, reset }: ErrorProps) {
  return <ModuleError error={error} reset={reset} translationNamespace="maintenance" />
}
```

### 5. URL State para Filtros

```typescript
// page.tsx - Lee searchParams en servidor
const filters = {
  status: params.status as ReportFilters['status'],
  priority: params.priority as ReportFilters['priority'],
  search: params.search,
  page: params.page ? parseInt(params.page) : 1,
}

// MaintenanceListClient.tsx - Actualiza URL
const updateUrlWithFilters = useCallback((newFilters: ReportFilters) => {
  const params = new URLSearchParams()
  if (newFilters.status) params.set('status', newFilters.status)
  // ...
  router.push(`?${params.toString()}`, { scroll: false })
}, [router])
```

---

## Análisis de Duplicación

### Server Actions vs maintenanceApi.ts

| Función | Server Action | maintenanceApi.ts | ¿Duplicado? |
|---------|---------------|-------------------|-------------|
| getAll | `getMaintenance.ts` | `maintenanceApi.getAll()` | ✅ Sí |
| getById | `getMaintenanceById.ts` | `maintenanceApi.getById()` | ✅ Sí |
| create | `createMaintenance.ts` | `maintenanceApi.create()` | ✅ Sí |
| update | `updateMaintenance.ts` | `maintenanceApi.update()` | ✅ Sí |
| delete | `deleteMaintenance.ts` | `maintenanceApi.delete()` | ✅ Sí |
| updateStatus | `updateMaintenanceStatus.ts` | `maintenanceApi.updateStatus()` | ✅ Sí |
| updatePriority | `updateMaintenancePriority.ts` | `maintenanceApi.updatePriority()` | ✅ Sí |

### ¿Por qué existe la duplicación?

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUJO ACTUAL                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SSR (page.tsx)                                                │
│  └── getMaintenance() ──► Server Action ──► Backend            │
│                                                                 │
│  Client (mutations, refetch)                                   │
│  └── useMaintenanceList() ──► maintenanceApi ──► Backend       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Conclusión pragmática:** 
- Server Actions se usan SOLO para carga inicial SSR
- React Query + maintenanceApi.ts manejan TODO lo demás
- La duplicación es **aceptable** porque cada uno tiene su propósito claro
- **NO refactorizar** - el costo es mayor que el beneficio

---

## Mejoras Recomendadas

| Prioridad | Mejora | Esfuerzo | Beneficio |
|-----------|--------|----------|-----------|
| Media | Dividir `MaintenanceListClient.tsx` (659 líneas) | 2h | Mantenibilidad |
| Media | Dividir `DetailTab.tsx` (617 líneas) | 1.5h | Mantenibilidad |
| Baja | Añadir selectores a Zustand | 30min | Performance |

### 1. Dividir MaintenanceListClient (Opcional)

```typescript
// Extraer componentes
MaintenanceListClient.tsx (659 líneas)
├── MaintenanceFilters.tsx      // ~100 líneas
├── MaintenanceTable.tsx        // ~150 líneas
├── MaintenanceStats.tsx        // ~80 líneas
└── MaintenanceListClient.tsx   // ~330 líneas (orquestador)
```

### 2. Selectores en Zustand (Opcional)

```typescript
// Antes - devuelve todo
const { currentReport, images, history } = useMaintenanceStore()

// Después - selectores individuales
const currentReport = useMaintenanceStore((s) => s.currentReport)
const images = useMaintenanceStore((s) => s.images)
```

---

## NO Hacer

| Anti-patrón | Por qué evitarlo |
|-------------|------------------|
| ❌ Eliminar Server Actions | Se usan para SSR, son necesarios |
| ❌ Crear más Server Actions para mutations | React Query ya lo hace bien |
| ❌ Migrar a Server Components | Dashboard interactivo = Client Components |
| ❌ Forzar URL state para todo | Solo donde aporta valor (filtros ✅) |

---

## Checklist Rápido

- [x] React Query con query keys factory
- [x] staleTime configurado (2 min)
- [x] Invalidaciones específicas
- [x] initialData desde SSR
- [x] TypeScript completo
- [x] loading.tsx con skeleton
- [x] error.tsx con recovery
- [x] URL state para filtros
- [x] Validación Zod
- [ ] Componentes < 500 líneas (2 exceden)
- [ ] Selectores Zustand optimizados

---

## Comparación con Otros Módulos

| Criterio | MAINTENANCE | PARKING | CASHIER |
|----------|-------------|---------|---------|
| React Query | ✅ | ✅ | ✅ |
| Query Keys Factory | ✅ | ✅ | ✅ |
| Server Actions (SSR) | ✅ | ✅ | ✅ |
| loading.tsx | ✅ | ✅ | ✅ |
| error.tsx | ✅ | ✅ | ✅ |
| URL State | ✅ | ✅ | ⚠️ |
| Zustand | ✅ (detalle) | ❌ | ✅ |
| Duplicación | ⚠️ Aceptable | ⚠️ Similar | ⚠️ Similar |

**Puntuación Final: 8/10**

El módulo está bien implementado. Los componentes grandes son el único issue real, pero no es crítico.
