# Revisión de Arquitectura: Módulo GROUPS

**Fecha de revisión:** Diciembre 2024  
**Puntuación:** 8.5/10 (Muy Bueno)  
**Estado:** Producción - Funcional con mejoras menores posibles

---

## Resumen Ejecutivo

El módulo Groups tiene una **excelente arquitectura** con React Query muy completo (792 líneas), 25+ hooks personalizados, query keys factory, y tipos TypeScript robustos. Aplica correctamente el patrón de "Server Action para SSR inicial + React Query para cliente".

**Enfoque pragmático aplicado:**
- ✅ Dashboard privado = NO necesita SSR obligatorio
- ✅ `[id]/page.tsx` como 'use client' es ACEPTABLE (React Query maneja el fetch)
- ✅ Duplicación Server Action + queries.ts es ACEPTABLE (SSR + client)

---

## 1. Evaluación por Criterios Pragmáticos

### ALTA Prioridad (Críticos)

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿Duplicación de código? | 🟢 Aceptable | `getGroups.ts` (SSR) + `queries.ts` (client) = patrón correcto |
| ¿TypeScript completo? | 🟢 Excelente | `types.ts` 341 líneas, enums completos, sin `any` |
| ¿Queries/mutations separados? | 🟢 Excelente | Todo en `queries.ts`, bien organizado |
| ¿React Query bien usado? | 🟢 Excelente | Factory pattern, invalidación correcta, staleTime 5min |

### MEDIA Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿Componentes > 300 líneas? | 🟡 Mejorable | `GroupsListClient.tsx` = 480 líneas |
| ¿Loading states? | 🟢 Excelente | `loading.tsx` + `GroupsLoadingState` + `LoadingSpinner` |
| ¿Error boundaries? | 🟢 Excelente | `error.tsx` usa `ModuleError` reutilizable |

### BAJA Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿URL state donde aporta? | 🟡 Parcial | Filtros en estado local, podría usar searchParams |
| ¿Zustand optimizado? | 🟢 Bien | `useGroupStore.ts` 196 líneas, acciones claras |

---

## 2. Estructura de Archivos

```
dashboard/groups/
├── [id]/page.tsx          # 'use client' - React Query fetch (ACEPTABLE)
├── actions/getGroups.ts   # Server Action para SSR inicial
├── error.tsx              # ✅ Usa ModuleError reutilizable
├── loading.tsx            # ✅ Skeleton detallado
└── page.tsx               # Server Component con Suspense

lib/groups/
├── index.ts               # ✅ Barrel exports
├── queries.ts             # ✅ 792 líneas - groupsApi + 25+ hooks
└── types.ts               # ✅ 341 líneas - enums y tipos

components/groups/
├── GroupsListClient.tsx   # ⚠️ 480 líneas (mejorable)
├── GroupDetailClient.tsx  # ✅ 193 líneas
├── cards/                 # ContactCard, PaymentCard, RoomCard
├── panels/                # Create/Edit panels
├── tabs/                  # ContactsTab, HistoryTab, etc.
└── shared/                # EmptyState, LoadingSpinner, StatusBadge

stores/
└── useGroupStore.ts       # ✅ 196 líneas - estado UI
```

---

## 3. React Query - EXCELENTE

### 3.1 Query Keys Factory

```typescript
// lib/groups/queries.ts
export const groupsKeys = {
  list: (filters?: GroupFilters) => ['groups', 'list', filters ?? {}] as const,
  detail: (id: number) => ['groups', id] as const,
  payments: (id: number) => ['groups', id, 'payments'] as const,
  contacts: (id: number) => ['groups', id, 'contacts'] as const,
  rooms: (id: number) => ['groups', id, 'rooms'] as const,
  status: (id: number) => ['groups', id, 'status'] as const,
  dashboardOverview: () => ['groups', 'dashboard', 'overview'] as const,
  // ... más keys
}
```

### 3.2 Hooks Disponibles (25+)

**Queries:**
- `useGroups(filters?)` - Lista con filtros
- `useGroup(id)` - Detalle de grupo
- `useGroupPayments(id)` - Pagos del grupo
- `useGroupContacts(id)` - Contactos
- `useGroupRooms(id)` - Habitaciones
- `useGroupStatus(id)` - Estado
- `useGroupsDashboardOverview()` - Dashboard
- `useUpcomingPayments(days)` - Pagos próximos
- `useOverduePayments()` - Pagos vencidos

**Mutations (con invalidación correcta):**
- `useCreateGroup()` - Invalida list + dashboard
- `useUpdateGroup(id)` - Invalida detail + list + dashboard
- `useDeleteGroup()` - Invalida list + dashboard
- `useCreatePayment(groupId)` - Invalida payments + detail + status
- `useUpdatePayment(groupId, paymentId)`
- `useCreateContact(groupId)`
- `useCreateOrUpdateRoom(groupId)`
- `useUpdateBooking(groupId)` - Invalida status + detail
- ... y más

### 3.3 Configuración Default

```typescript
const defaultQueryOptions = {
  staleTime: 5 * 60 * 1000,    // 5 minutos
  gcTime: 10 * 60 * 1000,      // 10 minutos
  refetchOnWindowFocus: false,
  retry: 0,
}
```

---

## 4. Patrón SSR + Client (Correcto)

### 4.1 Lista - Server Component con SSR

```typescript
// page.tsx
export default async function GroupsPage() {
  let initialGroups = undefined
  try {
    const response = await getGroups()  // Server Action
    initialGroups = response.data
  } catch (error) {
    console.error('[GroupsPage] Error:', error)
  }

  return (
    <Suspense fallback={<GroupsLoadingState />}>
      <GroupsListClient initialGroups={initialGroups} />
    </Suspense>
  )
}
```

### 4.2 Detalle - Client Component (Aceptable)

```typescript
// [id]/page.tsx - 'use client'
export default function GroupDetailPage() {
  const params = useParams()
  const groupId = parseInt(params.id as string)
  const { data: group, isLoading, isError } = useGroup(groupId)
  
  if (isLoading) return <LoadingSpinner />
  if (isError || !group) return <ErrorState />
  
  return <GroupDetailClient initialGroup={group} />
}
```

**¿Por qué es aceptable?**
- Dashboard privado, NO necesita SEO
- React Query maneja cache y refetch
- Loading/error states bien implementados
- El código comentado muestra que SSR fue considerado

---

## 5. TypeScript - EXCELENTE

### 5.1 Enums Completos

```typescript
// types.ts
export enum GroupStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus { ... }
export enum RoomType { ... }
export enum RoomingStatus { ... }
export enum BalanceStatus { ... }
```

### 5.2 Interfaces Tipadas

- `Group`, `GroupWithDetails`
- `GroupPayment`, `GroupContact`, `GroupRoom`
- `GroupStatusRecord`, `GroupHistory`
- DTOs: `CreateGroupDTO`, `UpdateGroupDTO`, etc.
- API responses tipadas

---

## 6. Zustand Store - BIEN

```typescript
// useGroupStore.ts (196 líneas)
interface GroupStore {
  selectedGroupId: number | null
  activeTab: GroupTab
  isCreatePanelOpen: boolean
  isEditPanelOpen: boolean
  isContactPanelOpen: boolean
  isPaymentPanelOpen: boolean
  isRoomPanelOpen: boolean
  editingContact: GroupContact | null
  editingPayment: GroupPayment | null
  editingRoom: GroupRoom | null
  // acciones...
  resetStore: () => void
}
```

**Uso correcto:** Solo estado de UI (paneles, tabs, editing state), NO server state.

---

## 7. Loading/Error - EXCELENTE

### 7.1 Error Boundary Reutilizable

```typescript
// error.tsx
export default function GroupsError({ error, reset }: ErrorProps) {
  return <ModuleError error={error} reset={reset} translationNamespace="groups" />
}
```

### 7.2 Loading States

- `loading.tsx` - Skeleton completo para la página
- `GroupsLoadingState` - Loading específico del listado
- `LoadingSpinner` - Spinner reutilizable

---

## 8. Issue Menor: GroupsListClient.tsx (480 líneas)

**Estado:** 🟡 Mejorable pero no crítico

El componente es grande pero está bien estructurado. Se podría dividir en:

```
components/groups/
├── GroupsListClient.tsx       # ~150 líneas (orquestador)
├── GroupsHeader.tsx           # Stats + Search + Create button
├── GroupsFilters.tsx          # Status filter tabs
└── GroupsTable.tsx            # Tabla de grupos
```

**Esfuerzo estimado:** 2-3 horas
**Prioridad:** Baja (funciona correctamente)

---

## 9. Mejora Opcional: URL State para Filtros

Actualmente los filtros usan estado local:

```typescript
const [statusFilter, setStatusFilter] = useState<GroupStatus | 'all'>(initialStatus)
```

Podría usar searchParams para URLs compartibles:

```typescript
// page.tsx
export default async function GroupsPage({ searchParams }) {
  const params = await searchParams
  const status = params.status || 'all'
  // ...
}
```

**Prioridad:** Baja - Solo si se necesita compartir URLs con filtros

---

## 10. Comparación con Otros Módulos

| Criterio | Groups | Parking | Maintenance |
|----------|--------|---------|-------------|
| React Query | ✅ 792 líneas | ✅ Excelente | ✅ Bien |
| TypeScript | ✅ 341 líneas | ✅ Completo | ✅ Completo |
| Loading/Error | ✅ Ambos | ✅ Ambos | ✅ Ambos |
| Zustand | ✅ 196 líneas | N/A | N/A |
| Componente grande | ⚠️ 480 líneas | ✅ OK | ✅ OK |

---

## 11. Resumen

### Fortalezas

1. **React Query excepcional** - 25+ hooks, factory pattern, invalidación correcta
2. **TypeScript robusto** - Enums, interfaces, DTOs completos
3. **Error/Loading implementados** - Reutilizan componentes compartidos
4. **Zustand bien usado** - Solo estado UI
5. **API layer completo** - `groupsApi` con todos los endpoints

### Issues Menores (No Críticos)

| Issue | Prioridad | Esfuerzo |
|-------|-----------|----------|
| Split `GroupsListClient.tsx` | Baja | 2-3h |
| URL state para filtros | Baja | 1-2h |

### Puntuación Final: 8.5/10

El módulo está **listo para producción**. Las mejoras son opcionales y de baja prioridad.

---

## 12. Checklist Rápido

```
✅ React Query bien usado (query keys factory, staleTime, invalidación)
✅ TypeScript completo (sin any, enums, interfaces)
✅ Queries/mutations separados (queries.ts)
✅ Loading states (loading.tsx + skeletons)
✅ Error boundaries (error.tsx con ModuleError)
✅ Zustand solo para UI
🟡 Componente grande (480 líneas - mejorable)
🟡 URL state (opcional)
```
