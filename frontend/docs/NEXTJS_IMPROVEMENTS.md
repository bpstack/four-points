# Next.js Optimization Roadmap - Four Points Frontend

> Auditoría realizada: Diciembre 2024  
> Estado: Planificado para implementación futura

---

## Resumen Ejecutivo

| Métrica           | Estado Actual             | Potencial                |
| ----------------- | ------------------------- | ------------------------ |
| Server Components | **2 de 17 páginas** (12%) | 8+ páginas               |
| Client JS Bundle  | Alto (todo es client)     | Reducible ~40%           |
| Data Fetching     | 95% client-side useEffect | Server-first posible     |
| Caching           | Solo React Query (client) | Next.js cache + ISR      |
| SSG/ISR           | No utilizado              | Candidatos identificados |

---

## 1. Problema Actual: Anti-patrón Dominante

El 80% de las páginas siguen este patrón ineficiente:

```tsx
'use client' // ❌ Toda la página es cliente

export default function Page() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getData().then(setData) // ❌ Waterfall de red
  }, [])

  if (loading) return <Spinner /> // ❌ Flash de loading
  return <Content data={data} />
}
```

### Problemas de este enfoque:

- **TTFB alto**: El servidor envía HTML vacío, luego el cliente hace fetch
- **Bundle grande**: Todo el código de la página va al cliente
- **Waterfall**: HTML → JS → Fetch → Render (4 pasos secuenciales)
- **Sin SEO**: El contenido no está disponible para crawlers
- **Flash de loading**: El usuario siempre ve el spinner primero

---

## 2. Patrón Óptimo Next.js 14+

```tsx
// ✅ Server Component (sin 'use client')
export default async function Page() {
  const data = await api.getData() // ✅ Fetch en servidor
  return <ClientComponent initialData={data} /> // ✅ Hidratado con datos
}
```

### Beneficios:

- **TTFB bajo**: El servidor envía HTML con datos
- **Bundle reducido**: Solo el código interactivo va al cliente
- **Sin waterfall**: Datos pre-cargados en el HTML
- **SEO completo**: Contenido disponible para crawlers
- **Sin flash**: El usuario ve contenido inmediatamente

### Ya implementado correctamente en:

- `app/dashboard/maintenance/page.tsx`
- `app/dashboard/parking/status/page.tsx`

---

## 3. Páginas para Migrar a Server Components

### ALTA PRIORIDAD

| Página                             | Esfuerzo | Impacto | Notas                     |
| ---------------------------------- | -------- | ------- | ------------------------- |
| `groups/page.tsx`                  | 30 min   | Alto    | Lista principal de grupos |
| `groups/[id]/page.tsx`             | 30 min   | Alto    | Detalle de grupo          |
| `parking/rates/page.tsx`           | 15 min   | Medio   | Página simple, fácil      |
| `parking/bookings/[code]/page.tsx` | 20 min   | Medio   | Detalle de reserva        |
| `parking/bookings/new/page.tsx`    | 5 min    | Bajo    | Solo quitar 'use client'  |

### MEDIA PRIORIDAD

| Página                      | Esfuerzo | Impacto | Notas                       |
| --------------------------- | -------- | ------- | --------------------------- |
| `dashboard/layout.tsx`      | 45 min   | Alto    | Extraer shell estático      |
| `parking/bookings/page.tsx` | 30 min   | Medio   | Pre-fetch lista inicial     |
| `profile/page.tsx`          | 20 min   | Bajo    | Extraer estructura estática |

### MANTENER COMO CLIENT (no migrar)

| Página                   | Razón                              |
| ------------------------ | ---------------------------------- |
| `dashboard/page.tsx`     | Period selector, real-time refresh |
| `logbooks/page.tsx`      | Inline editing, comment system     |
| `conciliation/page.tsx`  | Complex forms, popovers            |
| `cashier/hotel/page.tsx` | Tabs, modals, heavy state          |
| `cashier/logs/page.tsx`  | Pagination, filtering              |

---

## 4. Ejemplo de Migración: groups/page.tsx

### ANTES (actual - 408 líneas client-side)

```tsx
// app/dashboard/groups/page.tsx
'use client'

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGroups()
  }, [statusFilter])

  const loadGroups = async () => {
    setLoading(true)
    const response = await groupsApi.getAll(filters)
    setGroups(response.data)
    setLoading(false)
  }

  if (loading) return <Spinner />

  return (
    // ... 350+ líneas de JSX
  )
}
```

### DESPUÉS (recomendado - separar en 2 archivos)

```tsx
// app/dashboard/groups/page.tsx (Server Component)
import { groupsApi } from '@/app/api/groups/route'
import { GroupsClient } from './GroupsClient'

export default async function GroupsPage() {
  const response = await groupsApi.getAll()
  return <GroupsClient initialGroups={response.data} />
}
```

```tsx
// app/dashboard/groups/GroupsClient.tsx (Client Component)
'use client'

import { useState } from 'react'

interface Props {
  initialGroups: Group[]
}

export function GroupsClient({ initialGroups }: Props) {
  const [groups, setGroups] = useState(initialGroups)  // ✅ Sin loading inicial
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<GroupStatus | 'all'>('all')

  // Refetch solo cuando cambian filtros que requieren API
  const loadGroups = async () => {
    const response = await groupsApi.getAll({ status: statusFilter })
    setGroups(response.data)
  }

  // Filtrado local (sin API call)
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    // ... JSX igual que antes, pero sin estado de loading inicial
  )
}
```

---

## 5. Oportunidades ISR (Incremental Static Regeneration)

### Candidatos para revalidación automática:

| Ruta             | Revalidación   | Razón                     |
| ---------------- | -------------- | ------------------------- |
| `parking/rates`  | 1 hora (3600s) | Tarifas cambian poco      |
| `departments`    | 1 día (86400s) | Datos maestros            |
| `groups` (lista) | 60 segundos    | Balance fresh/performance |

### Implementación:

```tsx
// app/dashboard/parking/rates/page.tsx
export const revalidate = 3600 // Revalidar cada hora

export default async function RatesPage() {
  const rates = await fetch(`${API_URL}/parking/rates`, {
    next: {
      revalidate: 3600,
      tags: ['parking-rates'], // Para invalidación manual
    },
  })

  return <RatesTable data={rates} />
}
```

---

## 6. Server Actions para Mutaciones

### Estructura propuesta:

```
app/
├── actions/                    # Server Actions
│   ├── groups.ts
│   ├── parking.ts
│   ├── logbooks.ts
│   ├── cashier.ts
│   └── auth.ts
```

### Ejemplo: actions/groups.ts

```tsx
'use server'

import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'

const API_URL = process.env.BACKEND_API_URL

export async function createGroup(formData: FormData) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  const data = {
    name: formData.get('name'),
    agency: formData.get('agency'),
    arrival_date: formData.get('arrival_date'),
    departure_date: formData.get('departure_date'),
    total_amount: formData.get('total_amount'),
  }

  const response = await fetch(`${API_URL}/groups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create group')
  }

  revalidateTag('groups') // Invalida cache de lista
  return response.json()
}

export async function updateGroupStatus(groupId: number, status: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  const response = await fetch(`${API_URL}/groups/${groupId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) throw new Error('Failed to update status')

  revalidateTag('groups')
  revalidateTag(`group-${groupId}`)
  return response.json()
}

export async function deleteGroup(groupId: number) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  const response = await fetch(`${API_URL}/groups/${groupId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) throw new Error('Failed to delete group')

  revalidateTag('groups')
  return { success: true }
}
```

### Uso en componentes:

```tsx
'use client'

import { createGroup } from '@/app/actions/groups'
import { useTransition } from 'react'

function CreateGroupForm() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createGroup(formData)
        // Éxito - el cache se invalida automáticamente
      } catch (error) {
        // Manejar error
      }
    })
  }

  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <input name="agency" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creando...' : 'Crear Grupo'}
      </button>
    </form>
  )
}
```

---

## 7. Estructura de Archivos Recomendada

```
app/
├── actions/                    # Server Actions (mutaciones)
│   ├── groups.ts
│   ├── parking.ts
│   ├── logbooks.ts
│   ├── cashier.ts
│   └── auth.ts
│
├── lib/
│   ├── server/                 # Data fetching server-only
│   │   ├── groups.ts           # getGroups(), getGroupById()
│   │   ├── parking.ts          # getParkingStatus(), getRates()
│   │   └── auth.ts             # validateSession()
│   │
│   ├── client/                 # Client-only utilities
│   │   └── apiClient.ts        # Fetch con auto-refresh
│   │
│   └── shared/                 # Compartido client/server
│       ├── types/
│       ├── schemas/
│       └── utils/
│
├── api/                        # Solo Route Handlers reales (BFF)
│   └── auth/
│       ├── login/route.ts      # POST - set cookies
│       ├── logout/route.ts     # POST - clear cookies
│       └── refresh/route.ts    # POST - refresh token
│
├── dashboard/
│   ├── groups/
│   │   ├── page.tsx            # Server Component
│   │   ├── GroupsClient.tsx    # Client Component
│   │   ├── loading.tsx         # Suspense fallback
│   │   └── [id]/
│   │       ├── page.tsx        # Server Component
│   │       └── GroupDetailClient.tsx
│   │
│   ├── parking/
│   │   ├── status/
│   │   │   └── page.tsx        # ✅ Ya es Server Component
│   │   ├── rates/
│   │   │   └── page.tsx        # Migrar a Server Component
│   │   └── bookings/
│   │       ├── page.tsx        # Server Component
│   │       └── BookingsClient.tsx
```

---

## 8. Componentes sin 'use client' Innecesario

Estos componentes pueden ser Server Components (solo renderizan JSX):

| Componente           | Ubicación                        |
| -------------------- | -------------------------------- |
| `skeletons.tsx`      | `app/ui/`                        |
| `LoadingSpinner.tsx` | `components/maintenance/shared/` |
| `EmptyState.tsx`     | `components/maintenance/shared/` |
| `LoadingSpinner.tsx` | `components/groups/shared/`      |
| `EmptyState.tsx`     | `components/groups/shared/`      |
| `StatusBadge.tsx`    | `components/groups/shared/`      |
| `Badge.tsx`          | `components/blacklist/ui/`       |
| `Card.tsx`           | `components/blacklist/ui/`       |

**Acción:** Remover `'use client'` de estos archivos o verificar que no lo tengan.

---

## 9. Cache Tags Strategy

### Tags por dominio:

| Dominio     | Tags                                                            | Usado en                  |
| ----------- | --------------------------------------------------------------- | ------------------------- |
| Groups      | `groups`, `group-{id}`, `groups-payments`                       | Lista, detalle, pagos     |
| Parking     | `parking`, `parking-stats`, `parking-rates`, `parking-bookings` | Status, tarifas, reservas |
| Logbooks    | `logbooks`, `logbooks-{date}`                                   | Lista por fecha           |
| Cashier     | `cashier`, `cashier-{date}`, `cashier-vouchers`                 | Diario, vouchers          |
| Maintenance | `maintenance`, `maintenance-{id}`                               | Lista, detalle            |

### Invalidación en Server Actions:

```tsx
// Después de crear un pago en un grupo
revalidateTag('groups')
revalidateTag(`group-${groupId}`)
revalidateTag('groups-payments')

// Después de check-in en parking
revalidateTag('parking')
revalidateTag('parking-stats')
revalidateTag('parking-bookings')
```

---

## 10. Plan de Implementación por Fases

### Fase 1: Quick Wins (1-2 días)

- [ ] Convertir `parking/rates/page.tsx` a RSC
- [ ] Convertir `parking/bookings/new/page.tsx` (quitar 'use client')
- [ ] Crear estructura `app/actions/`
- [ ] Crear estructura `app/lib/server/`
- [ ] Verificar componentes sin 'use client' innecesario

### Fase 2: Páginas Principales (3-5 días)

- [ ] Migrar `groups/page.tsx` a patrón RSC + Client
- [ ] Migrar `groups/[id]/page.tsx`
- [ ] Migrar `parking/bookings/[code]/page.tsx`
- [ ] Crear `app/actions/groups.ts` con Server Actions
- [ ] Crear `app/actions/parking.ts` con Server Actions

### Fase 3: Caching & ISR (2-3 días)

- [ ] Añadir cache tags a fetches del servidor
- [ ] Configurar ISR para `parking/rates` (1 hora)
- [ ] Configurar ISR para `departments` (1 día)
- [ ] Implementar `revalidateTag` en todas las mutaciones
- [ ] Añadir `loading.tsx` para Suspense boundaries

### Fase 4: Auth Migration (3-5 días)

- [ ] Migrar tokens de localStorage a HTTP-only cookies
- [ ] Actualizar Route Handlers en `/api/auth/`
- [ ] Actualizar `apiClient.ts` para usar cookies
- [ ] Actualizar middleware para validación server-side
- [ ] Testear flujo completo de auth

---

## 11. Impacto Esperado

| Métrica                        | Antes   | Después | Mejora   |
| ------------------------------ | ------- | ------- | -------- |
| Time to First Byte (TTFB)      | ~500ms  | ~100ms  | **5x**   |
| Largest Contentful Paint (LCP) | ~2s     | ~800ms  | **2.5x** |
| Client JS Bundle               | ~300KB  | ~180KB  | **40%**  |
| Waterfall requests             | 3-4     | 1       | **75%**  |
| Initial loading spinners       | Siempre | Raro    | **UX++** |

---

## 12. Recursos de Referencia

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Caching in Next.js](https://nextjs.org/docs/app/building-your-application/caching)
- [ISR - Incremental Static Regeneration](https://nextjs.org/docs/app/building-your-application/data-fetching/fetching-caching-and-revalidating#revalidating-data)

---

## Notas Adicionales

### Sobre useNotificationStore (Zustand)

Durante la auditoría se detectó que `useNotificationStore` es innecesario:

- Solo tiene 1 consumidor (`useNotifications.ts` hook)
- Podría reemplazarse con TanStack Query o useState simple
- Ver análisis completo en la conversación de auditoría

### Sobre la carpeta /api actual

Los archivos en `/app/api/` (excepto `/auth/register/route.ts`) **NO son Route Handlers reales**. Son módulos TypeScript que exportan funciones de API client. Considerar:

1. Renombrar a `/app/lib/api/` para evitar confusión
2. O convertir a verdaderos Route Handlers si se necesita BFF

---

> **Última actualización:** Diciembre 2024  
> **Próxima revisión:** Después de implementar Fase 1
