Cosas para hacer:

- Implementar: C:\Users\dz\projects\Four-Points\frontend\docs\hotels




# Four Points - Plan de Optimización de Rendimiento

> Basado en React Best Practices de Vercel Engineering
> Fecha: Enero 2026

---

## Resumen de Reglas por Impacto

| Impacto | Reglas | Esfuerzo |
|---------|--------|----------|
| **CRITICAL** | Promise.all(), Dynamic imports, Defer third-party | Bajo-Medio |
| **HIGH** | React.cache(), LRU Cache, Parallel fetch, Defer await, Suspense | Medio |

---

# 🔴 CRITICAL - waterfalls y bundle size

## 1. Promise.all() para operaciones paralelas

**Impacto:** CRITICAL - 2-10× improvement

**Problema:** Cada await secuencial añade latencia de red completa.

```typescript
// ❌ Secuencial - 3 round trips (3× latency)
async function getDashboardData(userId: string) {
	const user = await fetchUser(userId)           // +200ms
	const posts = await fetchPosts(userId)         // +200ms
	const comments = await fetchComments(userId)   // +200ms
	return { user, posts, comments }
}

// ✅ Paralelo - 1 round trip (1× latency)
async function getDashboardData(userId: string) {
	const [user, posts, comments] = await Promise.all([
		fetchUser(userId),
		fetchPosts(userId),
		fetchComments(userId)
	])
	return { user, posts, comments }
}
```

### Aplicación en Four Points (Backend)

**Auth Controller:**
```typescript
// ❌ ACTUAL: await secuenciales
export async function getUserData(userId: string) {
	const user = await getUserById(userId)           // +50ms
	const permissions = await getPermissions(userId) // +30ms
	const preferences = await getPreferences(userId) // +20ms
	return { user, permissions, preferences }
}

// ✅ OPTIMIZADO: parallel
export async function getUserData(userId: string) {
	const [user, permissions, preferences] = await Promise.all([
		getUserById(userId),
		getPermissions(userId),
		getPreferences(userId)
	])
	return { user, permissions, preferences }
}
```

**Parking Controller:**
```typescript
// ❌ ACTUAL: consultas secuenciales
export async function getParkingStats(zoneId: string) {
	const spaces = await getSpaces(zoneId)           // +40ms
	const bookings = await getBookings(zoneId)       // +60ms
	const rates = await getRates(zoneId)             // +20ms
	return { spaces, bookings, rates }
}

// ✅ OPTIMIZADO
export async function getParkingStats(zoneId: string) {
	const [spaces, bookings, rates] = await Promise.all([
		getSpaces(zoneId),
		getBookings(zoneId),
		getRates(zoneId)
	])
	return { spaces, bookings, rates }
}
```

---

## 2. Dynamic imports para componentes pesados

**Impacto:** CRITICAL - directamente afecta TTI y LCP

**Problema:** Componentes grandes bloquean el initial bundle.

```tsx
// ❌ bundled con main chunk (~300KB)
import { MonacoEditor } from './MonacoEditor'
import { HeavyChart } from './HeavyChart'
import { PDFViewer } from './PDFViewer'

function Dashboard() {
	return (
		<div>
			<MonacoEditor />
			<HeavyChart />
			<PDFViewer />
		</div>
	)
}

// ✅ OPTIMIZADO: carga bajo demanda
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
	() => import('./MonacoEditor').then(m => m.MonacoEditor),
	{ ssr: false, loading: () => <p>Loading editor...</p> }
)

const HeavyChart = dynamic(
	() => import('./HeavyChart').then(m => m.HeavyChart),
	{ ssr: false }
)

const PDFViewer = dynamic(
	() => import('./PDFViewer').then(m => m.PDFViewer),
	{ ssr: false }
)

function Dashboard() {
	return (
		<div>
			<MonacoEditor />
			<HeavyChart />
			<PDFViewer />
		</div>
	)
}
```

### Aplicación en Four Points (Frontend)

```tsx
// app/dashboard/layout.tsx

import dynamic from 'next/dynamic'

// ❌ ACTUAL: imports estáticos
import { ParkingDashboardClient } from './parking/components/ParkingDashboardClient'
import { ActivityFeed } from './components/ActivityFeed'

// ✅ OPTIMIZADO: dynamic imports
const ParkingDashboardClient = dynamic(
	() => import('./parking/components/ParkingDashboardClient'),
	{ ssr: false, loading: () => <Skeleton height={300} /> }
)

const ActivityFeed = dynamic(
	() => import('./components/ActivityFeed'),
	{ ssr: false }
)

// Si hay componentes de reportes pesados
const ReportsExporter = dynamic(
	() => import('./components/ReportsExporter'),
	{ ssr: false }
)
```

---

## 3. Defer third-party libraries (analytics)

**Impacto:** CRITICAL - carga después de hydration

**Problema:** Analytics bloquea el critical path.

```tsx
// ❌ ACTUAL: bloquea el bundle
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
	return (
		<html>
			<body>
				{children}
				<Analytics />
			</body>
		</html>
	)
}

// ✅ OPTIMIZADO: carga después de hydration
import dynamic from 'next/dynamic'

const Analytics = dynamic(
	() => import('@vercel/analytics/react').then(m => m.Analytics),
	{ ssr: false }
)

export default function RootLayout({ children }) {
	return (
		<html>
			<body>
				{children}
				<Analytics />
			</body>
		</html>
	)
}
```

### Aplicación en Four Points (Frontend)

```tsx
// app/layout.tsx

import dynamic from 'next/dynamic'

// ❌ ACTUAL
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
	return (
		<html lang="es">
			<body>
				{children}
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	)
}

// ✅ OPTIMIZADO
const Analytics = dynamic(
	() => import('@vercel/analytics/react').then(m => m.Analytics),
	{ ssr: false }
)

const SpeedInsights = dynamic(
	() => import('@vercel/speed-insights/next').then(m => m.SpeedInsights),
	{ ssr: false }
)

export default function RootLayout({ children }) {
	return (
		<html lang="es">
			<body>
				{children}
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	)
}
```

---

## 4. Avoid barrel imports

**Impacto:** CRITICAL - 200-800ms import cost

**✅ YA IMPLEMENTADO** en `frontend/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
	experimental: {
		optimizePackageImports: ['react-icons'],
	},
	// ... resto de config
}
```

Librerías afectadas: `react-icons`, `@mui/*`, `lucide-react`, `@headlessui/react`, `@radix-ui/react-*`, `lodash`, `date-fns`.

---

# 🟠 HIGH - server performance

## 5. React.cache() - deduplicación por request

**Impacto:** HIGH - deduplica dentro de un mismo request

**Problema:** Múltiples llamadas a BD para el mismo dato en un request.

```typescript
import { cache } from 'react'

// ❌ ACTUAL: cada llamada = 1 query a BD
export async function getCurrentUser(userId: string) {
	return await db.user.findUnique({ where: { id: userId } })
}

// Múltiples llamadas en el mismo request = múltiples queries
const user = await getCurrentUser(id)
const userPosts = await getCurrentUser(id)  // Otra query!
const userSettings = await getCurrentUser(id)  // Y otra!

// ✅ OPTIMIZADO: React.cache deduplica
export const getCurrentUser = cache(async (userId: string) => {
	return await db.user.findUnique({ where: { id: userId } })
})

// Ahora: múltiples llamadas = 1 sola query
const user = await getCurrentUser(id)
const userPosts = await getCurrentUser(id)  // Cache hit!
const userSettings = await getCurrentUser(id)  // Cache hit!
```

### Aplicación en Four Points (Backend)

```typescript
// repositories/auth/user-repository.ts

import { cache } from 'react'

// ❌ ACTUAL
export async function getUserById(id: string) {
	return await db.user.findUnique({ where: { id } })
}

export async function getUserWithPermissions(id: string) {
	const user = await getUserById(id)  // Query 1
	const permissions = await getPermissionsByUser(id)  // Query 2
	return { user, permissions }
}

export async function getUserActivity(userId: string) {
	const user = await getUserById(userId)  // Query 3 (redundante!)
	return await db.activity.findMany({ where: { userId } })
}

// ✅ OPTIMIZADO
export const getUserById = cache(async (id: string) => {
	return await db.user.findUnique({ where: { id } })
})

export async function getUserWithPermissions(id: string) {
	const user = await getUserById(id)
	const permissions = await getPermissionsByUser(id)
	return { user, permissions }
}

export async function getUserActivity(userId: string) {
	const user = await getUserById(userId)  // Cache hit!
	return await db.activity.findMany({ where: { userId } })
}
```

```typescript
// repositories/parking/parking-repository.ts

import { cache } from 'react'

export const getParkingZoneById = cache(async (id: string) => {
	return await db.parking_zones.findUnique({ where: { id } })
})

export const getParkingSpacesByZone = cache(async (zoneId: string) => {
	return await db.parking_spaces.findMany({ where: { zoneId } })
})

// Uso en controller:
export async function getParkingDashboard(zoneId: string) {
	const zone = await getParkingZoneById(zoneId)      // Query + cache
	const spaces = await getParkingSpacesByZone(zoneId)  // Query + cache
	const bookings = await getActiveBookings(zoneId)     // Query
	return { zone, spaces, bookings }
}
```

---

## 6. LRU Cache - cross-request

**Impacto:** HIGH - cachea entre requests

**Problema:** `React.cache()` solo funciona dentro de un request.

```typescript
import { LRUCache } from 'lru-cache'

// ❌ ACTUAL: cada request = query a BD
export async function getUserById(id: string) {
	return await db.user.findUnique({ where: { id } })
}

// Request 1: User A → Query DB
// Request 2: User A → Otra query (cache solo intra-request)
// Request 3: User A → Otra query

// ✅ OPTIMIZADO: LRU cache cross-request
const userCache = new LRUCache<string, User>({
	max: 1000,           // Max 1000 usuarios en cache
	ttl: 5 * 60 * 1000,  // 5 minutos
})

export async function getUserById(id: string): Promise<User | null> {
	const cached = userCache.get(id)
	if (cached) {
		console.log(`[CACHE] User ${id} - hit`)
		return cached
	}

	console.log(`[CACHE] User ${id} - miss`)
	const user = await db.user.findUnique({ where: { id } })
	if (user) {
		userCache.set(id, user)
	}
	return user
}

// Request 1: User A → Query DB → Cache
// Request 2: User A → Cache hit!
// Request 3: User A → Cache hit!
```

### Aplicación en Four Points (Backend)

```typescript
// config/cache.ts

import { LRUCache } from 'lru-cache'

interface CacheEntry<T> {
	data: T
	timestamp: number
}

const defaultTTL = 5 * 60 * 1000 // 5 minutos

// Cache para datos de usuario
export const userCache = new LRUCache<string, CacheEntry<any>>({
	max: 500,
	ttl: defaultTTL,
})

// Cache para configuración
export const configCache = new LRUCache<string, CacheEntry<any>>({
	max: 100,
	ttl: 30 * 60 * 1000, // 30 minutos para config
})

// Cache para parking
export const parkingCache = new LRUCache<string, CacheEntry<any>>({
	max: 200,
	ttl: 2 * 60 * 1000, // 2 minutos para datos de parking
})

// Helper functions
export function getCached<T>(cache: LRUCache<string, CacheEntry<T>>, key: string): T | null {
	const entry = cache.get(key)
	if (entry && Date.now() - entry.timestamp < cache.ttl!) {
		return entry.data
	}
	cache.delete(key)
	return null
}

export function setCached<T>(cache: LRUCache<string, CacheEntry<T>>, key: string, data: T): void {
	cache.set(key, { data, timestamp: Date.now() })
}
```

```typescript
// repositories/parking/parking-repository.ts

import { getCached, setCached, parkingCache } from '../../config/cache.js'

export async function getParkingStats(zoneId: string) {
	const cacheKey = `stats:${zoneId}`
	
	const cached = getCached(parkingCache, cacheKey)
	if (cached) {
		return cached
	}

	const stats = await db.parking_spaces.groupBy({
		by: ['status'],
		where: { zone_id: zoneId },
		_count: true
	})

	setCached(parkingCache, cacheKey, stats)
	return stats
}

export async function getAvailableSpots(zoneId: string) {
	const cacheKey = `available:${zoneId}`
	
	const cached = getCached(parkingCache, cacheKey)
	if (cached) {
		return cached
	}

	const spots = await db.parking_spaces.findMany({
		where: { zone_id: zoneId, status: 'available' },
		take: 20
	})

	setCached(parkingCache, cacheKey, spots)
	return spots
}
```

---

## 7. Parallel fetching con composición de componentes

**Impacto:** HIGH - elimina server-side waterfalls

**Problema:** RSC ejecutan secuencialmente.

```tsx
// ❌ ACTUAL: Sidebar espera a Page
export default async function Page() {
	const header = await fetchHeader()  // +200ms
	return (
		<div>
			<div>{header}</div>
			<Sidebar />
		</div>
	)
}

async function Sidebar() {
	const items = await fetchSidebarItems()  // +150ms (espera a que termine Page!)
	return <nav>{items.map(renderItem)}</nav>
}

// ✅ OPTIMIZADO: ambos fetch en paralelo
async function Header() {
	const data = await fetchHeader()
	return <div>{data}</div>
}

async function Sidebar() {
	const items = await fetchSidebarItems()
	return <nav>{items.map(renderItem)}</nav>
}

export default function Page() {
	return (
		<div>
			<Header />
			<Sidebar />
		</div>
	)
}
// React ejecuta ambos async en paralelo automáticamente
```

### Aplicación en Four Points (Frontend)

```tsx
// app/dashboard/page.tsx

import { Suspense } from 'react'

// ❌ ACTUAL: fetch secuencial
async function DashboardPage() {
	const stats = await getParkingStats()       // +100ms
	const recentActivity = await getActivity()   // +80ms (espera stats)
	const notifications = await getNotifications() // +60ms (espera todo)

	return (
		<Dashboard
			stats={stats}
			activity={recentActivity}
			notifications={notifications}
		/>
	)
}

// ✅ OPTIMIZADO: Suspense boundaries
import { Skeleton } from '@/app/ui/skeletons'

export default function DashboardPage() {
	return (
		<div className="dashboard">
			<Suspense fallback={<Skeleton className="h-32" />}>
				<ParkingStats />
			</Suspense>

			<div className="grid grid-cols-2 gap-4">
				<Suspense fallback={<Skeleton className="h-64" />}>
					<RecentActivity />
				</Suspense>
				<Suspense fallback={<Skeleton className="h-64" />}>
					<NotificationsPanel />
				</Suspense>
			</div>
		</div>
	)
}

async function ParkingStats() {
	const stats = await getParkingStats()
	return <DashboardStats data={stats} />
}

async function RecentActivity() {
	const activity = await getActivity()
	return <ActivityFeed data={activity} />
}

async function NotificationsPanel() {
	const notifications = await getNotifications()
	return <NotificationsList data={notifications} />
}
```

---

## 8. Defer Await - solo donde se necesita

**Impacto:** HIGH - evita bloquear paths que no usan el dato

**Problema:** `await` al inicio bloquea todo, aunque el branch no lo necesite.

```typescript
// ❌ ACTUAL: bloquea aunque skip=true
async function handleRequest(userId: string, skipProcessing: boolean) {
	const userData = await fetchUserData(userId)  // +200ms desperdiciado

	if (skipProcessing) {
		return { skipped: true }  // No usa userData!
	}

	return processUserData(userData)
}

// ✅ OPTIMIZADO: solo espera si necesita el dato
async function handleRequest(userId: string, skipProcessing: boolean) {
	if (skipProcessing) {
		return { skipped: true }  // Regresa inmediatamente
	}

	const userData = await fetchUserData(userId)  // +200ms solo cuando necesario
	return processUserData(userData)
}

// ❌ OTRO EJEMPLO: siempre fetchea permissions
async function updateResource(resourceId: string, userId: string) {
	const permissions = await fetchPermissions(userId)  // +100ms
	const resource = await getResource(resourceId)       // +80ms

	if (!resource) {
		return { error: 'Not found' }  // permissions desperdiciado!
	}

	if (!permissions.canEdit) {
		return { error: 'Forbidden' }
	}

	return await updateResourceData(resource, permissions)
}

// ✅ OPTIMIZADO: fetchea en orden de prioridad
async function updateResource(resourceId: string, userId: string) {
	const resource = await getResource(resourceId)  // Primero lo que puede fallar

	if (!resource) {
		return { error: 'Not found' }
	}

	const permissions = await fetchPermissions(userId)  // Después permisos

	if (!permissions.canEdit) {
		return { error: 'Forbidden' }
	}

	return await updateResourceData(resource, permissions)
}
```

### Aplicación en Four Points (Backend)

```typescript
// controllers/auth/auth-controllers.ts

// ❌ ACTUAL
export async function getCurrentUser(req: Request, res: Response) {
	const sessionToken = req.cookies.access_token
	const user = await verifyToken(sessionToken)  // +50ms

	// Si no hay token, retornamos null - verifyToken fue innecesario
	if (!sessionToken) {
		return res.status(200).json({ user: null })
	}

	const userData = await getUserByToken(sessionToken)  // +30ms
	return res.json({ user: userData })
}

// ✅ OPTIMIZADO
export async function getCurrentUser(req: Request, res: Response) {
	const sessionToken = req.cookies.access_token

	if (!sessionToken) {
		return res.json({ user: null })  // Sale inmediatamente
	}

	const user = await getUserByToken(sessionToken)  // Solo aquí espera
	return res.json({ user })
}
```

```typescript
// controllers/maintenance/maintenance-controller.ts

// ❌ ACTUAL
export async function updateMaintenanceOrder(req: Request, res: Response) {
	const { id } = req.params
	const updates = req.body

	// Fetchea permissions primero
	const userId = req.user.id
	const permissions = await getUserPermissions(userId)  // +40ms

	// Fetchea order
	const order = await getOrderById(id)  // +30ms

	if (!order) {
		return res.status(404).json({ error: 'Not found' })  // Permissions desperdiciado!
	}

	if (!permissions.canEditOrders) {
		return res.status(403).json({ error: 'Forbidden' })
	}

	const updated = await updateOrder(id, updates)
	return res.json({ order: updated })
}

// ✅ OPTIMIZADO
export async function updateMaintenanceOrder(req: Request, res: Response) {
	const { id } = req.params
	const updates = req.body

	// Fetchea order primero (puede fallar)
	const order = await getOrderById(id)  // +30ms

	if (!order) {
		return res.status(404).json({ error: 'Not found' })  // Sale inmediatamente
	}

	// Solo fetchea permissions si el order existe
	const userId = req.user.id
	const permissions = await getUserPermissions(userId)  // +40ms

	if (!permissions.canEditOrders) {
		return res.status(403).json({ error: 'Forbidden' })
	}

	const updated = await updateOrder(id, updates)
	return res.json({ order: updated })
}
```

---

## 9. Suspense Boundaries - streaming UI

**Impacto:** HIGH - faster initial paint

**Problema:** Toda la page espera por data.

```tsx
// ❌ ACTUAL: todo el layout espera
async function DashboardPage() {
	const user = await fetchCurrentUser()    // +100ms
	const stats = await fetchStats()          // +150ms
	const activity = await fetchActivity()    // +80ms

	return (
		<div className="dashboard">
			<Sidebar user={user} />
			<StatsPanel stats={stats} />
			<ActivityFeed activity={activity} />
		</div>
	)
}

// Total wait: 330ms antes de mostrar NADA

// ✅ OPTIMIZADO: layout muestra inmediatamente
function DashboardPage() {
	return (
		<div className="dashboard">
			<Suspense fallback={<Skeleton className="w-64" />}>
				<Sidebar />
			</Suspense>

			<main className="flex-1">
				<Suspense fallback={<Skeleton className="h-32" />}>
					<StatsPanel />
				</Suspense>

				<Suspense fallback={<Skeleton className="h-64" />}>
					<ActivityFeed />
				</Suspense>
			</main>
		</div>
	)
}

async function Sidebar() {
	const user = await fetchCurrentUser()  // Solo bloquea sidebar
	return <UserSidebar user={user} />
}

async function StatsPanel() {
	const stats = await fetchStats()  // Solo bloquea stats
	return <StatsDisplay data={stats} />
}

async function ActivityFeed() {
	const activity = await fetchActivity()  // Solo bloquea activity
	return <ActivityList data={activity} />
}

// Initial paint: ~10ms (layout)
// Sidebar: ~100ms
// Stats: ~150ms
// Activity: ~80ms
```

### Aplicación en Four Points (Frontend)

```tsx
// app/dashboard/page.tsx

import { Suspense } from 'react'
import { DashboardHeader } from '@/app/components/dashboard/DashboardHeader'
import { Skeleton } from '@/app/ui/skeletons'

export default function DashboardPage() {
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header carga inmediatamente (datos mínimos) */}
			<DashboardHeader />

			<main className="container mx-auto px-4 py-6">
				{/* Parking Stats - con Suspense */}
				<section className="mb-6">
					<Suspense fallback={<ParkingStatsSkeleton />}>
						<ParkingStats />
					</Suspense>
				</section>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Recent Activity */}
					<section>
						<Suspense fallback={<ActivitySkeleton />}>
							<RecentActivity />
						</Suspense>
					</section>

					{/* Notifications */}
					<section>
						<Suspense fallback={<NotificationsSkeleton />}>
							<NotificationsPanel />
						</Suspense>
					</section>
				</div>

				{/* Logbooks pendientes */}
				<section className="mt-6">
					<Suspense fallback={<LogbooksSkeleton />}>
						<PendingLogbooks />
					</Suspense>
				</section>
			</main>
		</div>
	)
}

// Componentes async
async function ParkingStats() {
	const stats = await getParkingDashboardStats()
	return <ParkingDashboardClient data={stats} />
}

async function RecentActivity() {
	const activity = await getRecentActivity({ limit: 10 })
	return <ActivityFeed data={activity} />
}

async function NotificationsPanel() {
	const notifications = await getNotifications({ unreadOnly: true })
	return <NotificationsList data={notifications} />
}

async function PendingLogbooks() {
	const logbooks = await getPendingLogbooks()
	return <LogbookList data={logbooks} />
}

// Skeletons
function ParkingStatsSkeleton() {
	return <div className="h-48 bg-gray-200 animate-pulse rounded-lg" />
}

function ActivitySkeleton() {
	return <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />
}
```

---

# 📊 Checklist de Implementación

## Priority 1: Quick Wins (esfuerzo bajo, impacto alto)

| # | Task | Archivo | Estado |
|---|------|---------|--------|
| 1 | Promise.all() en auth controller | `controllers/auth/auth-controllers.ts` | ⬜ |
| 2 | Promise.all() en parking controller | `controllers/parking/parking.controller.ts` | ⬜ |
| 3 | Dynamic import analytics | `app/layout.tsx` | ⬜ |
| 4 | React.cache() para getUserById | `repositories/auth/user-repository.ts` | ⬜ |

## Priority 2: Medium Effort

| # | Task | Archivo | Estado |
|---|------|---------|--------|
| 5 | LRU Cache config | `config/cache.ts` | ⬜ |
| 6 | LRU Cache en parking | `repositories/parking/parking-repository.ts` | ⬜ |
| 7 | Suspense boundaries | `app/dashboard/page.tsx` | ⬜ |
| 8 | Defer await en controllers | Múltiples archivos | ⬜ |

## Priority 3: Investigation Needed

| # | Task | Descripción |
|---|------|-------------|
| 9 | Dynamic imports para HeavyChart/PDF | Revisar si hay componentes pesados |
| 10 | Parallel fetching | Revisar estructura de componentes |

---

# 📚 Recursos

- [React Best Practices - Vercel Engineering](.claude/skills/react-best-practices/)
- [Documentación React](https://react.dev)
- [Documentación Next.js](https://nextjs.org)
- [SWR - Data Fetching](https://swr.vercel.app)
- [lru-cache](https://github.com/isaacs/node-lru-cache)
- [Optimizing package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)
