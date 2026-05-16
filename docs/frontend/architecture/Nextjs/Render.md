# Estrategias de Renderizado en Four-Points

Este documento muestra cómo se aplican las diferentes estrategias de renderizado de Next.js en nuestro proyecto.

---

## Resumen del Proyecto

| Estrategia | Cantidad | Uso Principal |
|------------|----------|---------------|
| **ISR** | 1 página | Datos que cambian poco (blacklist detail) |
| **SSR** | 4+ páginas | Datos específicos de usuario, pre-fetch inicial |
| **SSG** | 5+ páginas | Páginas contenedoras que delegan a Client Components |
| **CSR** | 100+ componentes | Interactividad, React Query, formularios |

---

## 1. ISR (Incremental Static Regeneration)

### Concepto
La página se genera estáticamente pero se **regenera cada X segundos** en background.

### Ejemplo en Four-Points: `app/dashboard/blacklist/[id]/page.tsx`

```typescript
// Revalidar cada 30 segundos
export const revalidate = 30

export default async function BlacklistDetailPage({ params }: PageProps) {
  const { id } = await params
  
  let data
  try {
    data = await getBlacklistById(id)
  } catch {
    notFound()
  }
  
  const { entry, audit_trail } = data
  
  return <BlacklistDetailClient entry={entry} audit_trail={audit_trail} />
}
```

### Flujo ISR

```
BUILD TIME:
  → Genera /blacklist/1.html, /blacklist/2.html, etc.
  → Los guarda en disco

USUARIO PIDE /blacklist/1:
  → Servidor sirve HTML estático (RÁPIDO)

DESPUÉS DE 30 SEGUNDOS:
  → Siguiente request dispara regeneración en background
  → Mientras tanto, sirve HTML viejo
  → Una vez listo, siguiente usuario ve HTML nuevo
```

### Cuándo usar ISR
- Datos que cambian con poca frecuencia
- Contenido que puede estar "stale" por unos segundos
- Páginas de detalle con muchas visitas

---

## 2. SSR (Server-Side Rendering)

### Concepto
El servidor ejecuta la página en **cada request**, generando HTML fresco.

### Ejemplo 1: `app/dashboard/bo/page.tsx` (force-dynamic)

```typescript
// Force dynamic rendering - datos específicos de usuario
export const dynamic = 'force-dynamic'

export default async function BackOfficePage({ searchParams }: PageProps) {
  const params = await searchParams
  
  // Fetch todos los datos en paralelo en el servidor
  const [stats, categories, pendingData, paidData, suppliersData, assets] = await Promise.all([
    getStats(),
    getCategories(),
    getPendingInvoices(),
    getPaidInvoices(paidPage, 50),
    getSuppliers(suppliersPage, 100),
    getAssets(),
  ])

  return (
    <BackOfficeClient
      initialPendingInvoices={pendingData.invoices}
      initialPendingTotal={pendingData.total}
      initialStats={stats}
      // ... más props
    />
  )
}
```

### Ejemplo 2: `app/dashboard/groups/page.tsx` (async Server Component)

```typescript
export default async function GroupsPage() {
  let initialGroups = undefined
  
  try {
    const response = await getGroups()
    initialGroups = response.data
  } catch (error) {
    console.error('[GroupsPage] Error fetching initial groups:', error)
  }

  return (
    <Suspense fallback={<GroupsLoading />}>
      <GroupsListClient initialGroups={initialGroups} />
    </Suspense>
  )
}
```

### Ejemplo 3: `app/dashboard/parking/page.tsx`

```typescript
export default async function ParkingDashboard() {
  let initialStats = undefined
  let initialOccupancy = undefined
  
  try {
    const response = await getParkingDashboardStats('today')
    initialStats = response.dashboard?.stats
    initialOccupancy = response.dashboard?.occupancy
  } catch (error) {
    console.error('[ParkingDashboard] Error fetching initial stats:', error)
  }

  return (
    <Suspense fallback={<DashboardLoading />}>
      <ParkingDashboardClient 
        initialStats={initialStats} 
        initialOccupancy={initialOccupancy} 
      />
    </Suspense>
  )
}
```

### Flujo SSR

```
USUARIO PIDE /dashboard/bo:
  → Next.js (servidor) ejecuta BackOfficePage()
  → Hace 6 fetches en paralelo a la API
  → API responde con datos
  → Genera HTML con datos frescos
  → Envía HTML al navegador
  → Usuario ve contenido inmediatamente (sin esperar JS)
```

### Patrón SSR + Hydration en Four-Points

```
Server Component (page.tsx)
    ↓
    await fetch(datos)
    ↓
    Pasa datos como initialData a Client Component
    ↓
Client Component (usa React Query)
    ↓
    Muestra initialData inmediatamente (SSR)
    ↓
    React Query puede refetch en background si es necesario
```

### Cuándo usar SSR
- Datos que cambian frecuentemente
- Datos específicos por usuario
- SEO importante
- Primera carga rápida crítica

---

## 3. SSG (Static Site Generation)

### Concepto
La página se genera **una sola vez** en build time. No cambia hasta el siguiente deploy.

### Ejemplo 1: `app/dashboard/logbooks/page.tsx`

```typescript
import LogbooksContainer from '@/app/components/logbooks/LogbooksContainer'

export default function LogbooksPage() {
  return <LogbooksContainer />
}
```

### Ejemplo 2: `app/dashboard/conciliation/page.tsx`

```typescript
import { ConciliationClient } from '@/app/components/conciliation'

export default function ConciliationPage() {
  return <ConciliationClient />
}
```

### Ejemplo 3: `app/dashboard/scheduling/page.tsx`

```typescript
export default function SchedulingPage() {
  return (
    <Suspense fallback={<SchedulingSkeleton />}>
      <SchedulingClient />
    </Suspense>
  )
}
```

### Flujo SSG

```
npm run build:
  → LogbooksPage() se ejecuta UNA VEZ
  → Genera /logbooks.html (solo el shell, sin datos)
  → Guarda en disco

USUARIO PIDE /logbooks:
  → Servidor sirve HTML estático instantáneamente
  → JavaScript carga (LogbooksContainer es 'use client')
  → Client Component hace fetch de datos
```

### Por qué estas páginas son SSG

En nuestro proyecto, estas páginas **no hacen fetch en el servidor**. Son "shells" que:
1. Se renderizan estáticamente
2. Montan Client Components
3. Los Client Components cargan datos con React Query

### Cuándo usar SSG
- Páginas contenedoras sin datos propios
- Contenido que nunca cambia (about, landing)
- Cuando el Client Component maneja todo el data fetching

---

## 4. CSR (Client-Side Rendering)

### Concepto
Todo sucede en el **navegador**. El servidor envía HTML vacío + JavaScript.

### Ejemplo 1: `app/dashboard/page.tsx` (useEffect + useState)

```typescript
'use client'

import React, { useState, useEffect, useCallback } from 'react'

export default function DashboardHome() {
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntryDisplay[]>([])
  const [recentActivity, setRecentActivity] = useState<UnifiedActivity[]>([])
  const [loadingLogbooks, setLoadingLogbooks] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

  const fetchLogbooksByPeriod = useCallback(async (period) => {
    setLoadingLogbooks(true)
    try {
      const { logbooksApi } = await import('@/app/lib/logbooks')
      const data = await logbooksApi.getLogbooksByPeriod(period)
      // ... transformación
      setLogbookEntries(sortedEntries)
    } finally {
      setLoadingLogbooks(false)
    }
  }, [])

  useEffect(() => {
    fetchLogbooksByPeriod(selectedPeriod)
  }, [selectedPeriod, fetchLogbooksByPeriod])

  useEffect(() => {
    fetchRecentActivity()
  }, [fetchRecentActivity])

  if (loadingLogbooks) {
    return <div>Cargando...</div>
  }

  return (
    <div>
      {/* Render datos */}
    </div>
  )
}
```

### Ejemplo 2: React Query (Patrón preferido)

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export function GroupsListClient({ initialGroups }) {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: groupsKeys.list(filters),
    queryFn: () => groupsApi.getAll(filters),
    select: (res) => res.data,
    
    // Usa datos del servidor como inicial
    initialData: initialGroups 
      ? { success: true, data: initialGroups, count: initialGroups.length } 
      : undefined,
    
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 10 * 60 * 1000,    // 10 minutos garbage collection
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return <GroupsLoading />
  }

  return (
    <ul>
      {groups.map(group => (
        <li key={group.id}>{group.name}</li>
      ))}
    </ul>
  )
}
```

### Flujo CSR

```
USUARIO PIDE /dashboard:
  → Servidor envía HTML mínimo + bundle JS
  → Navegador descarga JavaScript
  → React monta el componente
  → Muestra "Cargando..."
  → useEffect/React Query dispara fetch
  → Espera respuesta de API
  → setLogbookEntries(data)
  → Re-render con datos
```

### Timeline Comparativo

```
SSR:     [Servidor fetch] → HTML completo → Usuario ve datos
CSR:     HTML vacío → [Descarga JS] → [Cliente fetch] → Usuario ve datos
Híbrido: [Servidor fetch] → HTML con initialData → [Hydration] → React Query ready

         SSR es más rápido para primera pintura
         CSR permite más interactividad después
         Híbrido combina lo mejor de ambos (nuestro patrón principal)
```

### Cuándo usar CSR
- Interactividad pesada (formularios, filtros)
- Datos que cambian con acciones del usuario
- Dashboards con actualizaciones en tiempo real
- Cuando SEO no es importante

---

## Patrón Híbrido de Four-Points

Nuestro proyecto usa un **patrón híbrido** que combina las estrategias:

```
┌─────────────────────────────────────────────────────────────┐
│                    Server Component (page.tsx)               │
│                                                              │
│   export default async function Page() {                     │
│     const data = await fetchInitialData()  // SSR           │
│     return <ClientComponent initialData={data} />           │
│   }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Client Component                           │
│                                                              │
│   'use client'                                               │
│                                                              │
│   function ClientComponent({ initialData }) {                │
│     const { data } = useQuery({                             │
│       queryKey: ['data'],                                   │
│       queryFn: fetchData,                                   │
│       initialData,  // Usa datos de SSR                     │
│     })                                                       │
│     // Interactividad con React Query                       │
│   }                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Beneficios del patrón híbrido
1. **Primera carga rápida** - Datos ya vienen en HTML (SSR)
2. **SEO optimizado** - Contenido visible para crawlers
3. **Interactividad completa** - React Query maneja cache y refetch
4. **UX fluida** - No hay "flash" de loading en primera carga
