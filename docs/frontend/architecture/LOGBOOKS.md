# Revisión de Arquitectura: Módulo LOGBOOKS

## Puntuación: 7.5/10 (Bueno)

**Fecha de revisión:** 27 de diciembre 2024  
**Criterios:** Pragmáticos (moduleTEST.md)

---

## Resumen Ejecutivo

El módulo LOGBOOKS tiene una arquitectura **sin duplicación** - usa únicamente React Query + `queries.ts` para data fetching. No tiene Server Actions, lo cual es **correcto** para este módulo ya que no necesita SSR inicial (la fecha cambia frecuentemente). El principal issue es el componente `LogbooksList.tsx` con 884 líneas.

**Decisión pragmática:** NO agregar Server Actions porque:
1. La fecha seleccionada cambia constantemente (cliente)
2. No hay beneficio de SEO (dashboard privado)
3. React Query ya maneja cache, refetch, y loading states
4. Agregar Server Actions duplicaría código sin beneficio

---

## Evaluación con Criterios Pragmáticos

### Alta Prioridad (Críticos)

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 1 | ¿Duplicación de código? | ✅ | NO hay duplicación - solo `queries.ts` |
| 2 | ¿TypeScript completo? | ✅ | `types.ts` + `validations.ts`, sin `any` |
| 3 | ¿Queries/mutations separados? | ✅ | `useLogbooks.ts` con todo bien organizado |
| 4 | ¿React Query bien usado? | ✅ | Query keys factory, staleTime, invalidación correcta |

### Media Prioridad

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 5 | ¿Componentes > 300 líneas? | ❌ | `LogbooksList.tsx` = 884 líneas |
| 6 | ¿Loading states? | ✅ | `loading.tsx` con skeleton detallado |
| 7 | ¿Error boundaries? | ✅ | `error.tsx` usa `ModuleError` |

### Baja Prioridad

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 8 | ¿URL state donde aporta? | ⚠️ | No usa searchParams (la fecha es estado local) |
| 9 | ¿Zustand optimizado? | N/A | No usa Zustand |

---

## Estructura de Archivos

```
dashboard/logbooks/
├── error.tsx              # 14 líneas - Error boundary ✅
├── loading.tsx            # 91 líneas - Skeleton ✅
└── page.tsx               # 7 líneas - Wrapper simple

lib/logbooks/
├── hooks/
│   ├── useLogbooks.ts     # 375 líneas - React Query hook ✅
│   └── useDepartments.ts  # 187 líneas - Departments hook
├── index.ts               # Barrel exports
├── queries.ts             # 160 líneas - API client ✅
├── types.ts               # 92 líneas - Interfaces
└── validations.ts         # 82 líneas - Zod schemas ✅

components/logbooks/
├── LogbooksContainer.tsx  # 268 líneas - Orquestador
├── LogbooksList.tsx       # 884 líneas ❌ MUY GRANDE
├── NewLogbookEntry.tsx    # 261 líneas
├── NewCommentEntry.tsx    # 162 líneas
├── EditLogbookModal.tsx   # 115 líneas
└── EditCommentModal.tsx   # 115 líneas
```

---

## Lo que hace BIEN

### 1. Sin Duplicación de Data Fetching

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO ACTUAL (CORRECTO)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  useLogbooks()                                                  │
│  └── React Query ──► queries.ts ──► apiClient ──► Backend      │
│                                                                 │
│  ❌ NO hay Server Actions (no se necesitan)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Query Keys Factory Pattern

```typescript
// hooks/useLogbooks.ts
export const logbookKeys = {
  all: ['logbooks'] as const,
  lists: () => [...logbookKeys.all, 'list'] as const,
  list: (date: string) => [...logbookKeys.lists(), date] as const,
  detail: (id: number) => [...logbookKeys.all, 'detail', id] as const,
  readers: (id: number) => [...logbookKeys.all, 'readers', id] as const,
  comments: (logbookId: number) => [...logbookKeys.all, 'comments', logbookId] as const,
}
```

### 3. React Query Bien Configurado

```typescript
const { data: entries = [], isLoading, error, refetch } = useQuery({
  queryKey: logbookKeys.list(date),
  queryFn: async (): Promise<LogEntry[]> => {
    const data = await logbooksApi.getLogbooksByDay(date)
    // Fetch comments en paralelo
    const entriesWithComments = await Promise.all(
      data.map(async (entry) => {
        const comments = await logbooksApi.comments.getComments(entry.id)
        return { ...entry, comments }
      })
    )
    return entriesWithComments
  },
  enabled,
  staleTime: 2 * 60 * 1000,  // 2 minutos
  gcTime: 5 * 60 * 1000,     // 5 minutos
  refetchOnWindowFocus: false,
})
```

### 4. Mutations con Invalidación Correcta

```typescript
const createLogbook = useMutation({
  mutationFn: (data) => logbooksApi.createLogbook(data),
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: logbookKeys.list(variables.date) })
    toast.success(messages.entryCreated)
  },
  onError: (error) => {
    toast.error(error.message || messages.entryCreateError)
  },
})
```

### 5. Validación con Zod

```typescript
// validations.ts
export const createLogbookSchema = z.object({
  message: z.string().min(3).max(5000).trim(),
  importance_level: z.enum(['baja', 'media', 'alta', 'urgente']),
  department_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const updateLogbookSchema = z.object({
  message: messageSchema.optional(),
  importance_level: importanceLevelEnum.optional(),
  department_id: z.number().int().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Debes proporcionar al menos un campo',
})
```

### 6. i18n con Mensajes Memoizados

```typescript
// En LogbooksContainer.tsx
const messages: LogbookMessages = useMemo(() => ({
  entryCreated: tLogbook('toast.entryCreated'),
  entryCreateError: tLogbook('toast.entryCreateError'),
  statusChangedTo: (status) => tLogbook('toast.statusChangedTo', { status }),
  // ... 15+ mensajes
}), [tLogbook])

const { entries, createLogbook } = useLogbooks({ date, messages })
```

---

## Mejoras Recomendadas

| Prioridad | Mejora | Esfuerzo | Beneficio |
|-----------|--------|----------|-----------|
| **Alta** | Dividir `LogbooksList.tsx` (884 líneas) | 3h | Mantenibilidad |
| Baja | URL state para fecha (`?date=`) | 1h | URLs compartibles |
| Baja | Migrar `useDepartments` a React Query | 1h | Consistencia |

### 1. Dividir LogbooksList.tsx (RECOMENDADO)

```
LogbooksList.tsx (884 líneas) →
├── LogbooksList.tsx          # ~200 líneas (orquestador)
├── LogbookEntry/
│   ├── LogbookEntry.tsx      # ~150 líneas (card principal)
│   ├── EntryActions.tsx      # ~100 líneas (botones)
│   └── EntryComments.tsx     # ~150 líneas (sección comentarios)
├── ReadStatus/
│   ├── ReadByAvatars.tsx     # ~50 líneas
│   └── ReadToggleButton.tsx  # ~50 líneas
└── shared/
    └── PriorityBadge.tsx     # ~30 líneas
```

### 2. URL State para Fecha (OPCIONAL)

Si quieres URLs compartibles como `/dashboard/logbooks?date=2024-12-27`:

```typescript
// page.tsx
interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function LogbooksPage({ searchParams }: PageProps) {
  const params = await searchParams
  const initialDate = params.date || new Date().toISOString().split('T')[0]
  return <LogbooksContainer initialDate={initialDate} />
}

// LogbooksContainer.tsx
const router = useRouter()

const handleSelectDay = (day: number) => {
  const newDate = `${year}-${month}-${day}`
  setSelectedDay(day)
  router.push(`?date=${newDate}`, { scroll: false })
}
```

**Nota:** Esto es **opcional** porque:
- La fecha cambia frecuentemente
- No hay beneficio de SEO
- El UX actual funciona bien

---

## NO Hacer

| Anti-patrón | Por qué evitarlo |
|-------------|------------------|
| ❌ Crear Server Actions | No hay duplicación que resolver, React Query es suficiente |
| ❌ Migrar page.tsx a Server Component con fetch | La fecha cambia constantemente, no aporta valor |
| ❌ Agregar Zustand | React Query ya maneja el estado del servidor |
| ❌ Forzar SSR para la lista | Dashboard privado, no SEO |

---

## Checklist Rápido

- [x] React Query con query keys factory
- [x] staleTime configurado (2 min)
- [x] Invalidaciones específicas por fecha
- [x] TypeScript completo (types.ts)
- [x] Validación Zod
- [x] loading.tsx con skeleton
- [x] error.tsx con recovery
- [x] i18n con mensajes memoizados
- [x] Toast notifications
- [ ] Componentes < 500 líneas (LogbooksList = 884)
- [ ] URL state para fecha (opcional)

---

## Comparación: LOGBOOKS vs MAINTENANCE

| Criterio | LOGBOOKS | MAINTENANCE |
|----------|----------|-------------|
| React Query | ✅ | ✅ |
| Query Keys Factory | ✅ | ✅ |
| Duplicación | ✅ Ninguna | ⚠️ Server Actions + API |
| loading.tsx | ✅ | ✅ |
| error.tsx | ✅ | ✅ |
| Validación Zod | ✅ | ✅ |
| Componentes grandes | ❌ 884 líneas | ⚠️ 617 líneas |
| URL State | ❌ No | ✅ Sí |

**LOGBOOKS es más limpio** porque no tiene duplicación de data fetching.

---

## Por qué NO Agregar Server Actions

El documento anterior recomendaba crear `data.ts` con Server Actions. Esto es **incorrecto** por:

1. **No hay SSR útil**: La fecha seleccionada cambia con cada click, hacer SSR no aporta
2. **Duplicaría código**: Tendríamos `queries.ts` + `data.ts` haciendo lo mismo
3. **React Query es suficiente**: Ya maneja cache, loading, error, refetch
4. **No es SEO**: Dashboard privado, Google no indexa

```
❌ EVITAR:
Server Component (page.tsx)
└── getLogbooksByDay() ──► Server Action ──► Backend
    ↓
Client Component (LogbooksContainer)
└── useLogbooks() ──► React Query ──► queries.ts ──► Backend

✅ MANTENER (actual):
Client Component (LogbooksContainer)
└── useLogbooks() ──► React Query ──► queries.ts ──► Backend
```

---

## Puntuación Final: 7.5/10

**Justificación:**
- ✅ Sin duplicación de código
- ✅ React Query excelente
- ✅ TypeScript completo
- ✅ Validación Zod
- ❌ LogbooksList.tsx demasiado grande (884 líneas)
- ⚠️ No URL state (pero es opcional)

El módulo está bien arquitecturado. La única mejora necesaria es dividir `LogbooksList.tsx`.
