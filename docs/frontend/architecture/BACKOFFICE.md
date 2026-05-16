# Arquitectura del Modulo Back Office

Este documento es la referencia completa de arquitectura del modulo Back Office, analizado y comparado con el modulo Parking (referencia del proyecto).

**Puntuacion: 9/10** - Segundo mejor modulo del proyecto

---

## Tabla de Contenidos

1. [Estructura de Archivos](#estructura-de-archivos)
2. [Diagrama de Flujo de Datos](#diagrama-de-flujo-de-datos)
3. [Server Components](#server-components)
4. [Server Actions (data.ts)](#server-actions)
5. [Client Components](#client-components)
6. [API Layer (backofficeApi)](#api-layer)
7. [React Query Integration](#react-query-integration)
8. [Gestion de Estado en URL](#gestion-de-estado-en-url)
9. [Barrel Exports](#barrel-exports)
10. [Sistema de Tabs con Lazy Loading](#sistema-de-tabs)
11. [Modales y Formularios](#modales-y-formularios)
12. [Export Utilities](#export-utilities)
13. [Comparacion con Parking](#comparacion-con-parking)
14. [Areas de Mejora](#areas-de-mejora)
15. [Checklist para Replicar](#checklist-para-replicar)

---

## Estructura de Archivos

```
app/dashboard/bo/
├── page.tsx                              # Server Component - Dashboard principal
├── loading.tsx                           # Route-level loading con i18n
├── error.tsx                             # Error boundary completo

app/components/bo/
├── modals/
│   ├── ConfirmDialog.tsx                 # Dialogo de confirmacion reutilizable
│   ├── InvoiceFormModal.tsx              # Formulario crear/editar factura
│   ├── PdfEditorModal.tsx                # Editor PDF con sello/firma
│   ├── PdfUploadModal.tsx                # Upload de PDF
│   ├── PdfViewerModal.tsx                # Visor de PDF
│   ├── SupplierFormModal.tsx             # Formulario crear/editar proveedor
│   ├── SupplierInvoicesModal.tsx         # Listado facturas de proveedor
│   └── index.ts                          # Barrel exports
├── tabs/
│   ├── PendingInvoicesTab.tsx            # Tab facturas pendientes
│   ├── PendingInvoicesTabLazy.tsx        # Version con React Query
│   ├── PaidInvoicesTab.tsx               # Tab facturas pagadas
│   ├── PaidInvoicesTabLazy.tsx           # Version con React Query
│   ├── SuppliersTab.tsx                  # Tab proveedores
│   ├── SuppliersTabLazy.tsx              # Version con React Query
│   ├── SettingsTab.tsx                   # Tab configuracion (assets)
│   ├── SettingsTabLazy.tsx               # Version con React Query
│   └── index.ts                          # Barrel exports
├── StatsCards.tsx                        # Server Component - Stats del header
├── StatsCardsSkeleton.tsx                # Skeleton para stats
├── TabContent.tsx                        # Client - Router de tabs
└── TabsNavigation.tsx                    # Client - Navegacion tabs

app/lib/backoffice/
├── types.ts                              # TypeScript interfaces + helpers
├── data.ts                               # Server Actions (server-only)
├── backofficeApi.ts                      # Client-side API
├── export-utils.ts                       # Utilidades exportacion Excel/PDF
└── index.ts                              # Barrel exports
```

---

## Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE DATOS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────────┐
                        │   Usuario navega a   │
                        │   /dashboard/bo      │
                        └──────────┬───────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. SERVER COMPONENT (page.tsx)                                               │
│                                                                              │
│    export default async function BackOfficePage({ searchParams }) {          │
│      const params = await searchParams                                       │
│      const [stats, categories, ...data] = await Promise.all([               │
│        getStats(),           ◄─── Server Action                              │
│        getCategories(),      ◄─── Server Action                              │
│        getPendingInvoices(), ◄─── Server Action                              │
│        getPaidInvoices(),    ◄─── Server Action                              │
│        getSuppliers(),       ◄─── Server Action                              │
│        getAssets(),          ◄─── Server Action                              │
│      ])                                                                      │
│      return <TabContent {...data} />  ◄─── Pasar datos a Client             │
│    }                                                                         │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. SERVER ACTIONS (data.ts) con 'server-only'                                │
│                                                                              │
│    import 'server-only'  ◄─── Garantiza que NUNCA se ejecuta en cliente     │
│                                                                              │
│    async function serverFetch<T>(endpoint, options): Promise<T> {            │
│      const authHeaders = await getAuthHeaders()  ◄─── cookies() server-side │
│      const response = await fetch(url, {                                     │
│        headers: { ...authHeaders },                                          │
│        next: { revalidate, tags }  ◄─── Caching de Next.js                  │
│      })                                                                      │
│      if (response.status === 401) redirect('/login')  ◄─── Auth redirect    │
│    }                                                                         │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. CLIENT COMPONENT (TabContent.tsx + Tabs)                                  │
│                                                                              │
│    'use client'                                                              │
│    function TabContent({ pendingInvoices, suppliers, ... }) {                │
│      const currentTab = searchParams.get('tab') || 'pending'  ◄─── URL state│
│      return currentTab === 'pending' ? (                                     │
│        <PendingInvoicesTabLazy initialInvoices={pendingInvoices} />         │
│      ) : ...                                                                 │
│    }                                                                         │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. TAB COMPONENTS con React Query                                            │
│                                                                              │
│    const { data } = useQuery({                                               │
│      queryKey: ['backoffice', 'invoices', 'pending', page],                  │
│      queryFn: () => backofficeApi.getInvoices({ status: 'pending' }),        │
│      initialData: { invoices: initialInvoices },  ◄─── Hydration            │
│      staleTime: 5 * 60 * 1000,                                               │
│    })                                                                        │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ 5. API LAYER (backofficeApi.ts)                                              │
│                                                                              │
│    // Para operaciones client-side (mutations, refetch manual)               │
│    export const backofficeApi = {                                            │
│      getInvoices: (filters) => apiClient.get('/api/backoffice/invoices'),   │
│      validateInvoice: (id) => apiClient.post(`/invoices/${id}/validate`),   │
│      uploadInvoicePdf: (id, file) => apiClient.postFormData(...),           │
│    }                                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Server Components

### Page Principal con Parallel Data Fetching

```typescript
// app/dashboard/bo/page.tsx
// ✅ Server Component - Sin 'use client'

import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import {
  getStats,
  getCategories,
  getPendingInvoices,
  getPaidInvoices,
  getSuppliers,
  getAssets,
} from '@/app/lib/backoffice/data'

// ✅ Force dynamic para datos de usuario
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BackOfficePage({ searchParams }: PageProps) {
  // ✅ Await searchParams (Next.js 15)
  const params = await searchParams
  const paidPage = params.paidPage ? parseInt(params.paidPage as string, 10) : 1
  const suppliersPage = params.suppliersPage ? parseInt(params.suppliersPage as string, 10) : 1

  // ✅ PATRON CLAVE: Fetch paralelo con Promise.all
  const [stats, categories, pendingData, paidData, suppliersData, assets, t] = await Promise.all([
    getStats(),
    getCategories(),
    getPendingInvoices(),
    getPaidInvoices(paidPage, 50),
    getSuppliers(suppliersPage, 100),
    getAssets(),
    getTranslations('backoffice'),
  ])

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      {/* Stats Cards - Server Component con Suspense */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <StatsCards />
      </Suspense>

      {/* Tab Navigation - Client Component */}
      <Suspense fallback={<TabsNavigationSkeleton />}>
        <TabsNavigation pendingCount={stats.pending_count} />
      </Suspense>

      {/* Tab Content - Client Component con datos del servidor */}
      <Suspense fallback={<TabContentSkeleton />}>
        <TabContent
          pendingInvoices={pendingData.invoices}
          paidInvoices={paidData.invoices}
          suppliers={suppliersData.suppliers}
          categories={categories}
          assets={assets}
          pendingPagination={pendingData.pagination}
          paidPagination={paidData.pagination}
          suppliersPagination={suppliersData.pagination}
        />
      </Suspense>
    </div>
  )
}
```

### Stats Cards como Server Component Puro

```typescript
// app/components/bo/StatsCards.tsx
// ✅ Server Component - NO 'use client'

import { getTranslations } from 'next-intl/server'
import { getStats } from '@/app/lib/backoffice/data'
import { formatCurrency } from '@/app/lib/backoffice/types'

export async function StatsCards() {
  // ✅ Data fetching directo en el componente
  const stats = await getStats()
  const t = await getTranslations('backoffice')

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
      {/* Pending Invoices */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border p-3">
        <p className="text-xs text-gray-600">{t('stats.pendingInvoices')}</p>
        <p className="text-xl font-bold">{stats.pending_count}</p>
      </div>

      {/* Total Pending */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border p-3">
        <p className="text-xs text-gray-600">{t('stats.pendingTotal')}</p>
        <p className="text-xl font-bold text-orange-600">
          {formatCurrency(stats.pending_total)}
        </p>
      </div>

      {/* ... mas stats ... */}
    </div>
  )
}
```

### Loading.tsx con i18n

```typescript
// app/dashboard/bo/loading.tsx
// ✅ Server Component que puede usar getTranslations

import { getTranslations } from 'next-intl/server'

export default async function BackOfficeLoading() {
  const t = await getTranslations('backoffice')

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1600px] space-y-5">
        {/* Header skeleton */}
        <div className="mb-4 sm:mb-6">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#151b23] rounded-md border p-3">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
            </div>
          ))}
        </div>

        {/* ✅ Mensaje de carga traducido */}
        <p className="text-sm text-gray-500">{t('loading')}</p>
      </div>
    </div>
  )
}
```

### Error.tsx Completo

```typescript
// app/dashboard/bo/error.tsx
'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BackOfficeError({ error, reset }: ErrorProps) {
  const t = useTranslations('backoffice')

  // ✅ Logging para debugging
  useEffect(() => {
    console.error('[BackOffice Error]', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('error.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('error.description')}
        </p>

        {/* ✅ Detalles en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 overflow-auto">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        )}

        {/* ✅ Boton reset */}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FiRefreshCw className="w-4 h-4" />
          {t('error.retry')}
        </button>
      </div>
    </div>
  )
}
```

---

## Server Actions

### Patron con 'server-only'

```typescript
// app/lib/backoffice/data.ts
/**
 * Server-only data fetching functions for Backoffice module
 * These functions run ONLY on the server and can safely use secrets
 */

import 'server-only' // ✅ CRITICO: Garantiza que nunca se incluye en bundle cliente

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SERVER_API_BASE_URL } from '@/app/lib/env'

// ========================================
// HELPER: Get auth headers from cookies
// ========================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` }
  }

  // ✅ Fallback: Forward all cookies (para HttpOnly)
  const allCookies = cookieStore.getAll()
  if (allCookies.length > 0) {
    const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ')
    return { Cookie: cookieHeader }
  }

  return {}
}

// ========================================
// HELPER: Server-side fetch with auth
// ========================================

interface FetchOptions {
  revalidate?: number | false
  tags?: string[]
  cache?: RequestCache
}

async function serverFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { revalidate = 60, tags = [], cache } = options
  const url = `${SERVER_API_BASE_URL}${endpoint}`
  const authHeaders = await getAuthHeaders()

  const fetchOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  }

  // ✅ Configurar caching de Next.js
  if (cache) {
    fetchOptions.cache = cache
  } else if (revalidate !== undefined) {
    fetchOptions.next = { revalidate, tags }
  }

  const response = await fetch(url, fetchOptions)

  if (!response.ok) {
    // ✅ Redirect a login si 401
    if (response.status === 401) {
      redirect('/login')
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// ========================================
// STATS - con cache: 'no-store' para datos en tiempo real
// ========================================

export async function getStats(): Promise<SummaryStats> {
  return serverFetch<SummaryStats>('/api/backoffice/stats', {
    cache: 'no-store', // ✅ Siempre datos frescos
  })
}

// ========================================
// CATEGORIES - con revalidate largo (raramente cambian)
// ========================================

export async function getCategories(): Promise<Category[]> {
  const response = await serverFetch<CategoriesResponse>('/api/backoffice/categories', {
    revalidate: 3600, // ✅ 1 hora de cache
    tags: ['backoffice-categories'],
  })
  return response.categories
}

// ========================================
// INVOICES - con cache: 'no-store' para datos criticos
// ========================================

export async function getInvoices(filters?: InvoiceFilters): Promise<{
  invoices: InvoiceWithDetails[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}> {
  const params = new URLSearchParams()

  // ✅ Construir query params dinamicamente
  if (filters?.status) params.append('status', filters.status)
  if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())

  const endpoint = `/api/backoffice/invoices${params.toString() ? `?${params.toString()}` : ''}`

  const response = await serverFetch<InvoicesResponse>(endpoint, {
    cache: 'no-store', // ✅ Critico: validated_pdf_url debe estar actualizado
  })

  return {
    invoices: response.invoices,
    pagination: response.pagination,
  }
}
```

---

## Client Components

### TabContent - Router de Tabs

```typescript
// app/components/bo/TabContent.tsx
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { TabType } from './TabsNavigation'

// ✅ Imports lazy de tabs
import { PendingInvoicesTabLazy } from './tabs/PendingInvoicesTabLazy'
import { PaidInvoicesTabLazy } from './tabs/PaidInvoicesTabLazy'
import { SuppliersTabLazy } from './tabs/SuppliersTabLazy'
import { SettingsTabLazy } from './tabs/SettingsTabLazy'

interface TabContentProps {
  pendingInvoices: InvoiceWithDetails[]
  paidInvoices: InvoiceWithDetails[]
  suppliers: SupplierWithStats[]
  categories: Category[]
  assets: Asset[]
  pendingPagination: { page: number; total: number; totalPages: number; limit?: number }
  paidPagination: { page: number; total: number; totalPages: number; limit?: number }
  suppliersPagination: { page: number; total: number; totalPages: number; limit?: number }
}

export function TabContent({
  pendingInvoices,
  paidInvoices,
  suppliers,
  categories,
  assets,
  pendingPagination,
  paidPagination,
  suppliersPagination,
}: TabContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // ✅ Estado del tab desde URL
  const currentTab = (searchParams.get('tab') as TabType) || 'pending'

  // ✅ Handlers de paginacion que actualizan URL
  const handlePaidPageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'paid')
      params.set('paidPage', newPage.toString())
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return (
    <div className="mt-4">
      {/* ✅ Renderizado condicional segun tab */}
      {currentTab === 'pending' && (
        <PendingInvoicesTabLazy
          initialInvoices={pendingInvoices}
          categories={categories}
          suppliers={suppliers}
          pagination={{ ...pendingPagination, limit: pendingPagination.limit ?? 50 }}
        />
      )}
      {currentTab === 'paid' && (
        <PaidInvoicesTabLazy
          initialInvoices={paidInvoices}
          categories={categories}
          pagination={{ ...paidPagination, limit: paidPagination.limit ?? 50 }}
          onPageChange={handlePaidPageChange}
        />
      )}
      {currentTab === 'suppliers' && (
        <SuppliersTabLazy
          initialSuppliers={suppliers}
          categories={categories}
          pagination={{ ...suppliersPagination, limit: suppliersPagination.limit ?? 100 }}
        />
      )}
      {currentTab === 'settings' && <SettingsTabLazy initialAssets={assets} />}
    </div>
  )
}
```

### Tab con React Query y Filtrado Local

```typescript
// app/components/bo/tabs/PendingInvoicesTabLazy.tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import toast from 'react-hot-toast'

// ✅ Query keys centralizados
const pendingKey = (page: number) => ['backoffice', 'invoices', 'pending', page] as const
const pendingListKey = () => ['backoffice', 'invoices', 'pending'] as const

interface PendingInvoicesTabLazyProps {
  initialInvoices: InvoiceWithDetails[]
  categories: Category[]
  suppliers: SupplierWithStats[]
  pagination: { page: number; total: number; totalPages: number; limit: number }
}

export function PendingInvoicesTabLazy({
  initialInvoices,
  categories,
  suppliers,
  pagination,
}: PendingInvoicesTabLazyProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, startTransition] = useTransition()

  // ✅ Estado local para filtros (no en URL - filtrado client-side)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    'all' | 'transfer' | 'direct_debit'
  >('all')
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([])

  // ✅ React Query con initialData del servidor
  const { data } = useQuery({
    queryKey: pendingKey(pagination.page),
    queryFn: async () => {
      const response = await backofficeApi.getInvoices({
        status: 'pending,validated',
        page: pagination.page,
        limit: pagination.limit ?? 50,
      })
      return response
    },
    // ✅ PATRON CLAVE: Usar datos del servidor como initial
    initialData: {
      invoices: initialInvoices,
      pagination: {
        page: pagination.page,
        limit: pagination.limit ?? 50,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
      filters_applied: {},
    },
    staleTime: 5 * 60 * 1000, // 5 min fresh
    gcTime: 10 * 60 * 1000, // 10 min cache
    structuralSharing: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  })

  const invoices = data?.invoices ?? initialInvoices

  // ✅ Filtrado client-side con useMemo
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        invoice.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || invoice.category_id === categoryFilter
      const matchesPaymentMethod =
        paymentMethodFilter === 'all' || invoice.payment_method === paymentMethodFilter
      return matchesSearch && matchesCategory && matchesPaymentMethod
    })
  }, [invoices, searchTerm, categoryFilter, paymentMethodFilter])

  // ✅ Helper para invalidar cache despues de mutation
  const invalidatePending = () => {
    queryClient.invalidateQueries({ queryKey: pendingListKey(), refetchType: 'active' })
  }

  // ✅ Action handlers
  const handleValidate = async (invoice: InvoiceWithDetails) => {
    if (invoice.original_pdf_url) {
      // Abrir editor PDF para anadir sello
      setEditingPdfInvoice(invoice)
      setPdfEditorOpen(true)
      return
    }
    // Validar directamente si no tiene PDF
    setValidatingInvoice(invoice)
    setValidateDialogOpen(true)
  }

  const handleConfirmValidate = async () => {
    if (!validatingInvoice) return

    startTransition(async () => {
      try {
        await backofficeApi.validateInvoice(validatingInvoice.id)
        toast.success(t('toast.invoiceValidated'))
        setValidateDialogOpen(false)
        invalidatePending()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : t('toast.invoiceValidateError')
        toast.error(message)
      }
    })
  }

  // ... render
}
```

---

## API Layer

### Client-side API (backofficeApi)

```typescript
// app/lib/backoffice/backofficeApi.ts
/**
 * Servicio API para el modulo Back Office
 * Todas las llamadas HTTP al backend centralizadas aqui
 */

import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'

const API_BASE = API_BASE_URL

export const backofficeApi = {
  // ========================================
  // CATEGORIAS
  // ========================================

  getCategories: async (): Promise<CategoriesResponse> => {
    const url = `${API_BASE}/api/backoffice/categories`
    return apiClient.get(url)
  },

  createCategory: async (data: {
    cost_center: string
    department: string
    description?: string
  }): Promise<{ message: string; category: Category }> => {
    const url = `${API_BASE}/api/backoffice/categories`
    return apiClient.post(url, data)
  },

  // ========================================
  // PROVEEDORES
  // ========================================

  getSuppliers: async (filters?: SupplierFilters): Promise<SuppliersResponse> => {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())

    const url = `${API_BASE}/api/backoffice/suppliers?${params.toString()}`
    return apiClient.get(url)
  },

  createSupplier: async (
    data: SupplierFormData
  ): Promise<{ message: string; supplier: SupplierWithStats }> => {
    const url = `${API_BASE}/api/backoffice/suppliers`
    return apiClient.post(url, data)
  },

  updateSupplier: async (
    id: number,
    data: Partial<SupplierFormData>
  ): Promise<{ message: string; supplier: SupplierWithStats }> => {
    const url = `${API_BASE}/api/backoffice/suppliers/${id}`
    return apiClient.patch(url, data)
  },

  // ========================================
  // FACTURAS
  // ========================================

  getInvoices: async (filters?: InvoiceFilters): Promise<InvoicesResponse> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())

    const url = `${API_BASE}/api/backoffice/invoices?${params.toString()}`
    return apiClient.get(url)
  },

  // ✅ Workflow de validacion
  validateInvoice: async (
    id: number,
    data?: {
      validated_pdf_url?: string
      validation_notes?: string
    }
  ): Promise<{ message: string; invoice: InvoiceWithDetails }> => {
    const url = `${API_BASE}/api/backoffice/invoices/${id}/validate`
    return apiClient.post(url, data || {})
  },

  unvalidateInvoice: async (
    id: number,
    notes?: string
  ): Promise<{ message: string; invoice: InvoiceWithDetails }> => {
    const url = `${API_BASE}/api/backoffice/invoices/${id}/unvalidate`
    return apiClient.post(url, { notes: notes || null })
  },

  markAsPaid: async (
    id: number,
    paid_date: string
  ): Promise<{ message: string; invoice: InvoiceWithDetails }> => {
    const url = `${API_BASE}/api/backoffice/invoices/${id}/pay`
    return apiClient.post(url, { paid_date })
  },

  // ✅ Upload de archivos
  uploadInvoicePdf: async (
    id: number,
    file: File,
    type: 'original' | 'validated'
  ): Promise<{ message: string; invoice: InvoiceWithDetails }> => {
    const url = `${API_BASE}/api/backoffice/invoices/${id}/pdf?type=${type}`
    const formData = new FormData()
    formData.append('pdf', file)
    return apiClient.postFormData(url, formData)
  },

  // ✅ Descargar multiples facturas como ZIP
  downloadValidatedInvoicesZip: async (invoiceIds: number[]): Promise<Blob> => {
    const url = `${API_BASE}/api/backoffice/invoices/download-zip`

    const makeRequest = async (): Promise<Response> =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_ids: invoiceIds }),
        credentials: 'include',
      })

    let response = await makeRequest()

    // ✅ Retry con refresh token si 401
    if (typeof window !== 'undefined' && response.status === 401) {
      const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (refreshResponse.ok) {
        response = await makeRequest()
      }
    }

    return response.blob()
  },

  // ========================================
  // BATCH PAYMENT
  // ========================================

  previewBatchPayment: async (
    year?: number,
    month?: number
  ): Promise<{
    message: string
    year: number
    month: number
    count: number
    total_amount: number
  }> => {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())
    if (month) params.append('month', month.toString())

    const url = `${API_BASE}/api/backoffice/invoices/batch-pay/preview?${params.toString()}`
    return apiClient.get(url)
  },

  executeBatchPayment: async (
    year?: number,
    month?: number
  ): Promise<{
    message: string
    success: boolean
    count: number
    invoiceIds: number[]
  }> => {
    const url = `${API_BASE}/api/backoffice/invoices/batch-pay`
    return apiClient.post(url, { year, month })
  },
}

export default backofficeApi
```

---

## React Query Integration

### Query Keys Pattern

```typescript
// ✅ Keys centralizados (usados en tabs)
const pendingKey = (page: number) => ['backoffice', 'invoices', 'pending', page] as const
const pendingListKey = () => ['backoffice', 'invoices', 'pending'] as const
const paidKey = (page: number) => ['backoffice', 'invoices', 'paid', page] as const
const suppliersKey = (page: number) => ['backoffice', 'suppliers', page] as const
const assetsKey = () => ['backoffice', 'assets'] as const
```

### Configuracion de Queries

```typescript
const { data } = useQuery({
  queryKey: pendingKey(pagination.page),
  queryFn: async () => backofficeApi.getInvoices({ status: 'pending,validated' }),

  // ✅ Hydration con datos del servidor
  initialData: {
    invoices: initialInvoices,
    pagination: pagination,
    filters_applied: {},
  },

  // ✅ Configuracion optima
  staleTime: 5 * 60 * 1000, // 5 min fresh
  gcTime: 10 * 60 * 1000, // 10 min cache
  structuralSharing: false, // Evitar comparacion profunda
  refetchOnWindowFocus: false, // No refetch al volver
  refetchOnReconnect: false,
  refetchOnMount: false, // Usar initialData
  retry: false,
})
```

### Invalidacion despues de Mutations

```typescript
// ✅ Invalidar queries relacionados
const invalidatePending = () => {
  queryClient.invalidateQueries({
    queryKey: pendingListKey(), // Prefix match
    refetchType: 'active',
  })
}

// Uso despues de mutation
const handleConfirmValidate = async () => {
  try {
    await backofficeApi.validateInvoice(invoice.id)
    toast.success(t('toast.invoiceValidated'))
    invalidatePending() // ✅ Refetch data
  } catch (error) {
    toast.error(error.message)
  }
}
```

---

## Gestion de Estado en URL

### Tab Navigation

```typescript
// app/components/bo/TabsNavigation.tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type TabType = 'pending' | 'paid' | 'suppliers' | 'settings'

export function TabsNavigation({ pendingCount = 0 }: { pendingCount?: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ✅ Leer tab desde URL
  const currentTab = (searchParams.get('tab') as TabType) || 'pending'

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    // ✅ Push sin scroll
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <nav className="flex space-x-4">
      {tabIds.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={currentTab === tab.id ? 'border-blue-600' : 'border-transparent'}
        >
          {t(`tabs.${tab.id}`)}
          {tab.id === 'pending' && pendingCount > 0 && (
            <span className="ml-1 px-1.5 text-xs bg-yellow-100 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}
```

### Paginacion en URL

```typescript
// En TabContent.tsx
const handlePaidPageChange = useCallback(
  (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'paid')
    params.set('paidPage', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  },
  [searchParams, router, pathname]
)
```

---

## Barrel Exports

### Modales

```typescript
// app/components/bo/modals/index.ts
export { InvoiceFormModal } from './InvoiceFormModal'
export { SupplierFormModal } from './SupplierFormModal'
export { PdfUploadModal } from './PdfUploadModal'
export { PdfViewerModal } from './PdfViewerModal'
export { PdfEditorModal } from './PdfEditorModal'
export { ConfirmDialog } from './ConfirmDialog'
export { SupplierInvoicesModal } from './SupplierInvoicesModal'
```

### Tabs

```typescript
// app/components/bo/tabs/index.ts
export { PendingInvoicesTab } from './PendingInvoicesTab'
export { PaidInvoicesTab } from './PaidInvoicesTab'
export { SuppliersTab } from './SuppliersTab'
export { SettingsTab } from './SettingsTab'
```

### Lib Module

```typescript
// app/lib/backoffice/index.ts
export * from './types'
export { backofficeApi } from './backofficeApi'
export { backofficeApi as default } from './backofficeApi'
```

---

## Sistema de Tabs

### Patron Lazy Loading

Cada tab tiene dos versiones:

- `Tab.tsx` - Componente base
- `TabLazy.tsx` - Version con React Query que recibe `initialData`

```typescript
// ✅ TabLazy recibe datos del servidor
<PendingInvoicesTabLazy
  initialInvoices={pendingInvoices}  // Del servidor
  categories={categories}
  suppliers={suppliers}
  pagination={pendingPagination}
/>

// ✅ Dentro del TabLazy usa React Query con initialData
const { data } = useQuery({
  queryKey: pendingKey(page),
  queryFn: () => backofficeApi.getInvoices({ status: 'pending' }),
  initialData: { invoices: initialInvoices, pagination },  // Hydration
})
```

---

## Modales y Formularios

### Patron de Estado de Modal

```typescript
// Estado en componente padre
const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null)

// Abrir para crear
const handleOpenNewInvoice = () => {
  setEditingInvoice(null)
  setInvoiceModalOpen(true)
}

// Abrir para editar
const handleOpenEditInvoice = (invoice: InvoiceWithDetails) => {
  setEditingInvoice(invoice)
  setInvoiceModalOpen(true)
}

// Render
<InvoiceFormModal
  isOpen={invoiceModalOpen}
  onClose={() => {
    setInvoiceModalOpen(false)
    setEditingInvoice(null)
  }}
  onSuccess={invalidatePending}
  invoice={editingInvoice}  // null = crear, object = editar
  categories={categories}
  suppliers={suppliers}
/>
```

### ConfirmDialog Reutilizable

```typescript
<ConfirmDialog
  isOpen={deleteDialogOpen && !!deletingInvoice}
  onClose={() => {
    setDeleteDialogOpen(false)
    setDeletingInvoice(null)
  }}
  onConfirm={handleDelete}
  title={t('modals.deleteInvoice.title')}
  message={t('modals.deleteInvoice.message', { number: deletingInvoice?.invoice_number })}
  confirmText={t('modals.deleteInvoice.confirmButton')}
  variant="danger"
/>
```

---

## Export Utilities

### Exportacion a Excel y PDF

```typescript
// app/lib/backoffice/export-utils.ts
import * as XLSX from 'xlsx'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Export invoices to Excel file
 */
export async function exportToExcel(
  invoices: InvoiceWithDetails[],
  filename?: string
): Promise<void> {
  const data = invoices.map((inv) => ({
    Proveedor: inv.supplier_name,
    'N Factura': inv.invoice_number,
    'Fecha Factura': formatDate(inv.invoice_date),
    'Centro Coste': inv.cost_center || '-',
    Departamento: inv.department || '-',
    BI: formatNumber(Number(inv.amount_without_vat) || 0),
    'IVA %': inv.vat_percentage,
    'Importe Total': formatNumber(Number(inv.amount_with_vat) || 0),
    Estado: INVOICE_STATUS_LABELS[inv.status],
    // ...
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Proveedor
    { wch: 20 }, // N Factura
    // ...
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Facturas')
  XLSX.writeFile(wb, filename || `facturas_${timestamp}.xlsx`)
}

/**
 * Export invoices to PDF file
 */
export async function exportToPdf(
  invoices: InvoiceWithDetails[],
  filename?: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  // ... generar PDF
}
```

---

## Comparacion con Parking

### Similitudes (Patrones Compartidos)

| Aspecto                    | Parking         | Backoffice            |
| -------------------------- | --------------- | --------------------- |
| Page como Server Component | ✅              | ✅                    |
| Server Actions separados   | ✅ `actions.ts` | ✅ `data.ts`          |
| Client API separado        | ✅ `queries.ts` | ✅ `backofficeApi.ts` |
| React Query integration    | ✅              | ✅                    |
| URL state                  | ✅              | ✅                    |
| Barrel exports             | ✅              | ✅                    |
| loading.tsx                | ✅              | ✅ + i18n             |
| error.tsx                  | ❌ Falta        | ✅ Completo           |
| Types separados            | ✅              | ✅ + helpers          |

### Diferencias

| Aspecto               | Parking                             | Backoffice                     |
| --------------------- | ----------------------------------- | ------------------------------ |
| Server Actions        | `'use server'` directive            | `import 'server-only'` (mejor) |
| Data fetching en page | `getParkingDashboardStats('today')` | `Promise.all([...])` (mejor)   |
| Custom hooks          | ✅ `useParkingStatus.ts`            | ❌ No tiene (inline en tabs)   |
| Layout                | Client Component (innecesario)      | No tiene (usa parent)          |
| i18n en loading       | ❌                                  | ✅                             |
| Error boundary        | ❌                                  | ✅ Con detalles dev            |
| Export utilities      | ❌                                  | ✅ Excel + PDF                 |

### Donde Backoffice es Mejor

1. **`import 'server-only'`** - Garantiza que el codigo nunca se incluye en bundle cliente
2. **Promise.all en page** - Fetch paralelo de 6 endpoints
3. **error.tsx completo** - Con detalles en dev, boton retry, logging
4. **loading.tsx con i18n** - Textos traducidos en skeleton
5. **Export utilities** - Excel y PDF generation
6. **Types con helpers** - `formatCurrency`, `getStatusBadgeClasses` en types.ts

### Donde Parking es Mejor

1. **Custom hooks** - `useParkingStatus.ts` encapsula toda la logica
2. **Organizacion de acciones** - Carpeta `actions/` separada
3. **Estructura mas granular** - Sub-rutas como `/status/`, `/bookings/`

---

## Areas de Mejora

### 1. Extraer Custom Hook

**Actual:** Logica de modales y mutations inline en cada tab (1100+ lineas)

**Mejora:** Crear `useInvoiceOperations.ts`

```typescript
// app/components/bo/hooks/useInvoiceOperations.ts
'use client'

export function useInvoiceOperations(selectedDate: string, messages: Messages) {
  const queryClient = useQueryClient()

  // Estado de modales
  const [invoiceModal, setInvoiceModal] = useState({ isOpen: false, invoice: null })
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, invoice: null })

  // Mutations
  const validateMutation = useMutation({
    mutationFn: (id: number) => backofficeApi.validateInvoice(id),
    onSuccess: () => {
      toast.success(messages.validated)
      invalidateAll()
    },
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['backoffice', 'invoices'] })
  }

  return {
    invoiceModal,
    setInvoiceModal,
    deleteDialog,
    setDeleteDialog,
    validateMutation,
    // ... mas acciones
  }
}
```

### 2. Agregar Prefetching

```typescript
// En TabsNavigation.tsx
const prefetchTab = (tab: TabType) => {
  if (tab === 'paid') {
    queryClient.prefetchQuery({
      queryKey: paidKey(1),
      queryFn: () => backofficeApi.getInvoices({ status: 'paid' }),
    })
  }
}

<button
  onMouseEnter={() => prefetchTab(tab.id)}
  onClick={() => handleTabChange(tab.id)}
>
```

### 3. Optimistic Updates para Validacion

```typescript
const validateMutation = useMutation({
  mutationFn: (id: number) => backofficeApi.validateInvoice(id),

  // ✅ Actualizar cache inmediatamente
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: pendingListKey() })

    const previous = queryClient.getQueryData(pendingKey(page))

    queryClient.setQueryData(pendingKey(page), (old) => ({
      ...old,
      invoices: old.invoices.map((inv) => (inv.id === id ? { ...inv, status: 'validated' } : inv)),
    }))

    return { previous }
  },

  // ✅ Rollback si falla
  onError: (err, id, context) => {
    queryClient.setQueryData(pendingKey(page), context.previous)
    toast.error(err.message)
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: pendingListKey() })
  },
})
```

### 4. Separar Componentes en Tabs

Los tabs tienen 800-1100 lineas. Dividir en:

```
tabs/
├── pending/
│   ├── PendingInvoicesTab.tsx      # Main component
│   ├── PendingFilters.tsx          # Filtros
│   ├── PendingTable.tsx            # Tabla desktop
│   ├── PendingCards.tsx            # Cards mobile
│   ├── PendingActions.tsx          # Barra de acciones
│   └── index.ts
```

---

## Checklist para Replicar

### Estructura de Archivos

- [x] `page.tsx` - Server Component con Promise.all
- [x] `loading.tsx` - Skeleton con i18n
- [x] `error.tsx` - Error boundary completo
- [ ] `layout.tsx` - No necesario (usa parent)

### Lib Module

- [x] `types.ts` - Interfaces + helpers
- [x] `data.ts` - Server Actions con `server-only`
- [x] `api.ts` - Client API
- [x] `index.ts` - Barrel exports
- [x] `export-utils.ts` - Si necesita exportacion

### Server Components

- [x] Page lee `searchParams` para paginacion
- [x] Page hace data fetching con Promise.all
- [x] Page pasa `initialData` a Client Components
- [x] StatsCards como Server Component puro
- [x] Usar `Suspense` con skeletons

### Client Components

- [x] Reciben `initialData` como props
- [x] Usan React Query con `initialData`
- [x] Actualizan URL con `router.push`
- [x] Filtrado local con `useMemo`

### React Query

- [x] Query keys centralizados
- [x] `staleTime` y `gcTime` configurados
- [x] `refetchOnWindowFocus: false`
- [x] Mutations con `invalidateQueries`
- [x] Toast feedback en success/error

### Exports

- [x] Barrel exports en modals/index.ts
- [x] Barrel exports en tabs/index.ts
- [x] Re-exportar desde lib/backoffice/index.ts

---

## Resumen

**Puntuacion: 9/10**

### Fortalezas

1. `import 'server-only'` - Mejor que `'use server'` para data fetching
2. Promise.all en page - Fetch paralelo eficiente
3. error.tsx completo - Con detalles dev y retry
4. loading.tsx con i18n - UX profesional
5. Export utilities - Funcionalidad completa Excel/PDF
6. Sistema de tabs lazy - Excelente patron de hydration

### Debilidades

1. Tabs muy largos (1100 lineas) - Falta separacion
2. Sin custom hooks - Logica no reutilizable
3. Sin optimistic updates - UX menos fluida
4. Sin prefetching - Navegacion mas lenta

### Hoja de Ruta

| Prioridad | Tarea                                     | Esfuerzo |
| --------- | ----------------------------------------- | -------- |
| Alta      | Extraer hook `useInvoiceOperations`       | 2h       |
| Alta      | Separar componentes en tabs               | 3h       |
| Media     | Agregar optimistic updates                | 2h       |
| Media     | Agregar prefetching en tabs               | 1h       |
| Baja      | Agregar virtualization para listas largas | 4h       |

******************\*\*\*\*******************\*\*\*\*******************\*\*\*\******************* EXPLICACIÓN LINEA POR LINEA

# Explicación Línea por Línea del Módulo Back Office

## ÍNDICE

1. [Server Component Principal (page.tsx)](#server-component-principal)
2. [Patron 'server-only'](#patron-server-only)
3. [Promise.all - Fetch Paralelo](#promiseall---fetch-paralelo)
4. [React Query + initialData](#react-query--initialdata)
5. [Mutations + Invalidaciones](#mutations--invalidaciones)
6. [URL State Management](#url-state-management)
7. [Error Boundary](#error-boundary)
8. [Loading States](#loading-states)

---

# SERVER COMPONENT PRINCIPAL

## Archivo: app/dashboard/bo/page.tsx

```typescript
// ============================================================================
// LINEA 1: Import de React - Importamos Suspense para streaming
// ============================================================================
import { Suspense } from 'react'
// ✅ Suspense es un componente de React que permite mostrar un fallback
//    mientras un componente asincronico se esta cargando
// Ejemplo: <Suspense fallback={<Skeleton />}><ComponenteAsincrono /></Suspense>


// ============================================================================
// LINEA 2-3: Imports de next-intl - Para internacionalizacion
// ============================================================================
import { getTranslations } from 'next-intl/server'
// ✅ getTranslations es una funcion que obtiene los mensajes traducidos
//    Este es el hook de SERVIDOR (no se usa en cliente)
// Uso: const t = await getTranslations('backoffice')
// Luego: t('stats.pendingInvoices') → "Facturas Pendientes"


// ============================================================================
// LINEA 4-10: Imports de Server Actions - Las funciones que traen datos
// ============================================================================
import {
  getStats,           // ← Funcion que obtiene estadisticas del backend
  getCategories,      // ← Funcion que obtiene categorias
  getPendingInvoices, // ← Funcion que obtiene facturas pendientes
  getPaidInvoices,    // ← Funcion que obtiene facturas pagadas
  getSuppliers,       // ← Funcion que obtiene proveedores
  getAssets,          // ← Funcion que obtiene activos
} from '@/app/lib/backoffice/data'
// ✅ Estas son Server Actions - funciones que solo se ejecutan en el servidor
//    Se usan en componentes Server Components para traer datos


// ============================================================================
// LINEA 11-13: Configuracion de la ruta
// ============================================================================
export const dynamic = 'force-dynamic'
// ✅ force-dynamic significa que esta pagina SIEMPRE traera datos frescos
//    No usa cache - cada request es nuevo
// Sin esto, Next.js podria cachear los datos y mostrar informacion vieja


// ============================================================================
// LINEA 14-16: Interface para los searchParams
// ============================================================================
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}
// ✅ searchParams es lo que va en la URL despues del "?"
// Ejemplo: /dashboard/bo?tab=paid&paidPage=2
// En este caso:
//   - tab = 'paid'
//   - paidPage = '2'
//
// IMPORTANTE: En Next.js 15, searchParams es una Promise (async)
// Por eso debe hacer await antes de usarlo


// ============================================================================
// LINEA 17-18: Exportamos la funcion como default async
// ============================================================================
export default async function BackOfficePage({ searchParams }: PageProps) {
// ✅ Esta es la funcion principal que Next.js renderiza
// ✅ ES ASYNC - Puede hacer await de operaciones asincronicas
// ✅ ES SERVER COMPONENT - Se ejecuta solo en el servidor (no en browser)
// NO TIENE 'use client' - Eso seria error
//
// Recibe destructurado { searchParams } - los parametros de la URL


// ============================================================================
// LINEA 19-20: Await de searchParams
// ============================================================================
  const params = await searchParams
  // ✅ Espera a que searchParams se resuelva (es una Promise)
  // Ahora 'params' es un objeto con los valores de la URL
  // Ejemplo: { tab: 'paid', paidPage: '2' }


// ============================================================================
// LINEA 21-22: Obtener el numero de pagina de facturas pagadas
// ============================================================================
  const paidPage = params.paidPage ? parseInt(params.paidPage as string, 10) : 1
  // DESGLOSEMOS ESTO:
  // 1. params.paidPage → obtiene el valor de la URL (o undefined si no existe)
  // 2. ? ... : 1 → operador ternario (if-else en una linea)
  // 3. Si params.paidPage EXISTE:
  //    - parseInt(params.paidPage as string, 10)
  //      = Convierte el string '2' a numero 2
  //      = El '10' significa base decimal
  // 4. Si NO existe:
  //    - Usa 1 (pagina por defecto)
  //
  // RESULTADO: paidPage sera un numero (1, 2, 3, etc.)


// ============================================================================
// LINEA 23-24: Mismo patron para la pagina de proveedores
// ============================================================================
  const suppliersPage = params.suppliersPage ? parseInt(params.suppliersPage as string, 10) : 1
  // ✅ Mismo proceso que paidPage
  // RESULTADO: suppliersPage sera un numero


// ============================================================================
// LINEA 26-34: PATRON CLAVE - Promise.all para fetch paralelo
// ============================================================================
  const [stats, categories, pendingData, paidData, suppliersData, assets, t] = await Promise.all([
  //    ↑                                                                          ↑
  //    Destructuramos los resultados                        Esperamos que TODAS las promises terminen

    getStats(),           // ← Fetch 1: Obtiene estadisticas (tiempo: 50ms)
    getCategories(),      // ← Fetch 2: Obtiene categorias (tiempo: 30ms)
    getPendingInvoices(), // ← Fetch 3: Obtiene facturas pendientes (tiempo: 100ms)
    getPaidInvoices(paidPage, 50),     // ← Fetch 4: Obtiene facturas pagadas
    getSuppliers(suppliersPage, 100),  // ← Fetch 5: Obtiene proveedores
    getAssets(),          // ← Fetch 6: Obtiene activos
    getTranslations('backoffice'), // ← Fetch 7: Obtiene traducciones
  ])

  // ✅ EXPLICACION DE Promise.all:
  // Sin Promise.all (LENTO - secuencial):
  //   const stats = await getStats()           // Espera 50ms
  //   const categories = await getCategories() // Espera 30ms (total: 80ms)
  //   const pending = await getPendingInvoices() // Espera 100ms (total: 180ms)
  //   // ... Total: ~430ms
  //
  // Con Promise.all (RAPIDO - paralelo):
  //   await Promise.all([getStats(), getCategories(), ...])
  //   // Todas se ejecutan AL MISMO TIEMPO
  //   // Total: ~100ms (el tiempo del fetch mas lento)
  //
  // RESULTADO: [stats, categories, pendingData, paidData, suppliersData, assets, t]


// ============================================================================
// LINEA 36-42: Retornamos el JSX que se renderiza en el navegador
// ============================================================================
  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
    //   ↑ div contenedor principal
    //   ├─ min-h-screen: altura minima = alto de pantalla
    //   ├─ bg-white: fondo blanco en tema claro
    //   ├─ dark:bg-[#010409]: fondo oscuro en modo oscuro
    //   ├─ p-4: padding (espacio interior) pequeño
    //   └─ md:p-6: padding mas grande en pantallas medianas y grandes


      {/* Stats Cards - Server Component con Suspense */}
      <Suspense fallback={<StatsCardsSkeleton />}>
      //           ↑ fallback = lo que mostrar mientras carga
        <StatsCards />
      //  ↑ Componente que muestra las tarjetas de estadisticas
      </Suspense>
      // ✅ Mientras StatsCards se carga (si tuviera suspense),
      //    mostrara StatsCardsSkeleton (animacion de carga)


      {/* Tab Navigation - Client Component */}
      <Suspense fallback={<TabsNavigationSkeleton />}>
        <TabsNavigation pendingCount={stats.pending_count} />
      //                           ↑ Pasamos datos del servidor como prop
      </Suspense>
      // ✅ TabsNavigation es Client Component (tiene 'use client')
      //    Recibe pendingCount desde el servidor (stats)


      {/* Tab Content - Client Component con datos del servidor */}
      <Suspense fallback={<TabContentSkeleton />}>
        <TabContent
          pendingInvoices={pendingData.invoices}
        //↑ Pasamos las facturas pendientes del servidor
          paidInvoices={paidData.invoices}
          suppliers={suppliersData.suppliers}
          categories={categories}
          assets={assets}
          pendingPagination={pendingData.pagination}
        //↑ Pasamos info de paginacion
          paidPagination={paidData.pagination}
          suppliersPagination={suppliersData.pagination}
        />
      </Suspense>
      // ✅ TabContent es Client Component que recibe MUCHOS datos del servidor
      //    Luego usa React Query para sincronizar cambios


    </div>
  )
  // ✅ Cierre del return
}
```

---

# PATRON 'server-only'

## Archivo: app/lib/backoffice/data.ts

```typescript
// ============================================================================
// LINEA 1: Import 'server-only' - CRITICO
// ============================================================================
import 'server-only'
// ✅ Este import hace que Next.js lance ERROR si se intenta usar este archivo
//    desde un Client Component
//
// EJEMPLO DE ERROR:
//    'use client'
//    import { getStats } from './data' // ← ERROR! No se puede importar
//
// ¿POR QUÉ ES IMPORTANTE?
// - Si olvidamos 'use client' en un componente, accidentalmente podria
//   ejecutar codigo del servidor en el browser
// - Con 'server-only', Next.js nos detiene INMEDIATAMENTE
// - Sin 'server-only', el codigo se incluiria en el bundle del cliente
//   (basura innecesaria)

import { cookies } from 'next/headers'
// ✅ cookies() es una funcion que obtiene las cookies HTTP
// Solo funciona en SERVIDOR (por eso usamos 'server-only')

import { redirect } from 'next/navigation'
// ✅ redirect() es una funcion que redirige al usuario a otra URL
// Ej: if (!user) redirect('/login')

import { SERVER_API_BASE_URL } from '@/app/lib/env'
// ✅ BASE_URL del servidor API
// Ej: 'https://api.example.com' o 'http://localhost:3001'

// ============================================================================
// LINEA ~15-20: Definicion de interface para response de la API
// ============================================================================
// No mostrado, pero seria algo como:

interface SummaryStats {
  pending_count: number
  pending_total: number
  paid_count: number
  paid_total: number
  // ... mas campos
}
// ✅ Interface que describe la estructura de datos que trae el backend

// ============================================================================
// LINEA ~25-35: Helper function - getAuthHeaders
// ============================================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  // ✅ Funcion que obtiene headers de autenticacion
  // async = asincronico (puede tomar tiempo)
  // Promise<Record<string, string>> = retorna un objeto con pares key-value
  //   Ej: { Authorization: 'Bearer token123' }

  const cookieStore = await cookies()
  // ✅ Obtiene el objeto de cookies
  // await porque cookies() es asincronica

  const accessToken = cookieStore.get('access_token')?.value
  // ✅ Obtiene la cookie llamada 'access_token'
  // ?.value = optional chaining - si existe, obtiene el .value
  // Si no existe, sera undefined

  if (accessToken) {
    return { Authorization: `Bearer ${accessToken}` }
  }
  // ✅ Si el token existe:
  // Retorna un header Authorization con formato "Bearer [token]"
  // Ej: { Authorization: 'Bearer eyJhbGc...' }

  // ✅ Fallback: Si no hay token en variable, obtener todas las cookies
  const allCookies = cookieStore.getAll()
  // ✅ Obtiene TODAS las cookies como array
  // Ej: [{name: 'sessionId', value: '...'}, {name: 'lang', value: 'es'}]

  if (allCookies.length > 0) {
    // ✅ Si hay al menos una cookie
    const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ')
    //                   ↑ map = transformar cada cookie
    //                   `${c.name}=${c.value}` = formato "name=value"
    //                   .join('; ') = unir con "; " entre cookies
    // RESULTADO: "sessionId=...; lang=es"

    return { Cookie: cookieHeader }
    // ✅ Retorna en formato de header Cookie
  }

  return {}
  // ✅ Si no hay cookies, retorna objeto vacio {}
}
```

---

# Promise.all - FETCH PARALELO

## Entendiendo por qué Promise.all es mejor

```typescript
// ============================================================================
// COMPARACION: SIN Promise.all (LENTO)
// ============================================================================

async function SlowWayBackOfficePage() {
  // Tiempo total: 50ms + 30ms + 100ms + 80ms + 120ms + 40ms = 420ms

  const stats = await getStats()           // ESPERA 50ms ✋
  // Ahora que termino stats (50ms), comienza categories

  const categories = await getCategories() // ESPERA 30ms (total: 80ms) ✋
  // Ahora que termino categories, comienza pending

  const pending = await getPendingInvoices() // ESPERA 100ms (total: 180ms) ✋
  // ... etc

  // Total: 420ms - MUY LENTO


// ============================================================================
// COMPARACION: CON Promise.all (RAPIDO)
// ============================================================================

async function FastWayBackOfficePage() {
  // Tiempo total: MAX(50, 30, 100, 80, 120, 40) = 120ms

  const [stats, categories, pending, paid, suppliers, assets] = await Promise.all([
  //   ↑ Destructuramos los 6 resultados

    getStats(),           // Comienza INMEDIATAMENTE
    getCategories(),      // Comienza INMEDIATAMENTE
    getPendingInvoices(), // Comienza INMEDIATAMENTE (TODAS AL MISMO TIEMPO)
    getPaidInvoices(),    // Comienza INMEDIATAMENTE
    getSuppliers(),       // Comienza INMEDIATAMENTE
    getAssets(),          // Comienza INMEDIATAMENTE
  ])
  // Espera a que la LENTA termine (120ms)

  // Total: 120ms - RAPIDO!

  // VISUALIZACION TEMPORAL:
  // Sin Promise.all:
  //   stats      |--------|
  //   categories       |---|
  //   pending              |----|
  //   ... (secuencial)
  //   Total: |--------|---|----| ← 420ms
  //
  // Con Promise.all:
  //   stats      |--------|
  //   categories |---|
  //   pending    |----| (TODAS SIMULTANEAS)
  //   ...
  //   Total:     |--------|  ← 120ms
}
```

---

# REACT QUERY + initialData

## Archivo: app/components/bo/tabs/PendingInvoicesTabLazy.tsx

```typescript
'use client'
// ✅ Client Component - se ejecuta en el navegador

import { useMemo, useState } from 'react'
// ✅ Hooks de React que usaremos

import { useQuery, useQueryClient } from '@tanstack/react-query'
// ✅ Hooks de React Query:
// - useQuery: obtener y cachear datos
// - useQueryClient: acceder al cache

import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
// ✅ Nuestro cliente API (hace requests HTTP)

// ============================================================================
// LINEA ~30: Query keys - Patron clave para React Query
// ============================================================================

const pendingKey = (page: number) => ['backoffice', 'invoices', 'pending', page] as const
//    ↑ Funcion que CREA una query key
//      Retorna: ['backoffice', 'invoices', 'pending', 1]
//                ['backoffice', 'invoices', 'pending', 2]
//                etc dependiendo de 'page'
// ✅ React Query usa esto para:
//    1. Cachear resultados
//    2. Invalidar (refrescar) datos
//    3. Deduplicar requests

const pendingListKey = () => ['backoffice', 'invoices', 'pending'] as const
//    ↑ Query key SIN el numero de pagina
// Usamos esto cuando queremos invalidar TODAS las paginas de facturas

// ============================================================================
// LINEA ~35-50: Props que recibe el componente
// ============================================================================

interface PendingInvoicesTabLazyProps {
  initialInvoices: InvoiceWithDetails[]
  //↑ Las facturas que trae el SERVIDOR
  // Ej: [{ id: 1, invoice_number: 'FAC-001', ... }, { id: 2, ... }]

  categories: Category[]
  //↑ Las categorias del servidor

  suppliers: SupplierWithStats[]
  //↑ Los proveedores del servidor

  pagination: { page: number; total: number; totalPages: number; limit: number }
  //↑ Info de paginacion del servidor
  // Ej: { page: 1, total: 150, totalPages: 3, limit: 50 }
}

export function PendingInvoicesTabLazy({
  initialInvoices,
  categories,
  suppliers,
  pagination,
}: PendingInvoicesTabLazyProps) {
  // ✅ Recibimos los datos del SERVIDOR como props

  const queryClient = useQueryClient()
  // ✅ Instancia de React Query
  // Usaremos esto para invalidar queries (refrescar datos)

  // ============================================================================
  // LINEA ~60: Estado local para filtros
  // ============================================================================

  const [searchTerm, setSearchTerm] = useState('')
  // ✅ useState crea estado reactivo
  // searchTerm = valor actual del input de busqueda
  // setSearchTerm = funcion para actualizar ese valor
  // '' = valor inicial (string vacio)

  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  // ✅ Estado para el filtro de categoria
  // Puede ser un numero (id de categoria) o 'all' (todas)

  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([])
  // ✅ Array de IDs de facturas seleccionadas
  // [] = inicialmente vacio (ninguna seleccionada)

  // ============================================================================
  // LINEA ~70-100: PATRON CLAVE - React Query con initialData
  // ============================================================================

  const { data } = useQuery({
    //    ↑ Destructuramos 'data' del resultado de useQuery

    queryKey: pendingKey(pagination.page),
    //↑ Identificador unico para esta query
    // Si cambia pagination.page, React Query sabe que es otra query diferente

    queryFn: async () => {
      //↑ Funcion que obtiene los datos
      // async = puede hacer await

      const response = await backofficeApi.getInvoices({
        //                      ↑ Llamamos nuestro API

        status: 'pending,validated',
        //↑ Queremos facturas pendientes O validadas

        page: pagination.page,
        limit: pagination.limit ?? 50,
        //↑ ?? = operador nullish coalescing
        // Si limit es null/undefined, usa 50
      })

      return response
      // ✅ Retorna los datos (facturas, paginacion, etc.)
    },

    // ============================================================================
    // LINEA ~85-90: initialData - PATRON CLAVE
    // ============================================================================

    initialData: {
      // ✅ IMPORTANTE: Datos iniciales del SERVIDOR
      // React Query los usa inmediatamente sin hacer fetch
      // Esto hace que el componente se renderice al instante sin espera

      invoices: initialInvoices,
      //↑ Las facturas que recibimos como prop (del servidor)

      pagination: {
        page: pagination.page,
        limit: pagination.limit ?? 50,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
      //↑ Info de paginacion del servidor

      filters_applied: {},
      //↑ Objeto vacio (no hay filtros aplicados aun)
    },

    // ============================================================================
    // LINEA ~95-105: Configuracion de React Query
    // ============================================================================

    staleTime: 5 * 60 * 1000,
    //↑ 5 minutos en milisegundos (5 * 60 segundos * 1000)
    // Los datos son "fresh" (frescos) durante 5 minutos
    // Si el usuario abre esta tab nuevamente en 2 minutos, NO hace fetch nuevamente

    gcTime: 10 * 60 * 1000,
    //↑ 10 minutos
    // Si los datos no se usan por 10 minutos, se eliminan de la memoria
    // (garbage collection - limpieza)

    structuralSharing: false,
    //↑ Normalmente React Query compara la estructura de datos
    // Para evitar re-renders innecesarios
    // Aqui lo desactivamos (false) para evitar overhead

    refetchOnWindowFocus: false,
    //↑ Cuando el usuario vuelve a la ventana del navegador,
    // NO refetch automaticamente
    // Esto evita requests innecesarios

    refetchOnReconnect: false,
    //↑ Cuando se reconecta a internet, no refetch

    refetchOnMount: false,
    //↑ Cuando monta el componente, no refetch
    // Confiamos en initialData del servidor

    retry: false,
    //↑ Si la query falla, no reintentar
  })

  // RESULTADO: 'data' contiene { invoices, pagination, filters_applied }

  const invoices = data?.invoices ?? initialInvoices
  // ✅ Obtiene las facturas de 'data'
  // ?? = si data es null/undefined, usa initialInvoices como fallback
  // Esto evita errores si algo falla

  // ============================================================================
  // LINEA ~110-130: Filtrado CLIENT-SIDE con useMemo
  // ============================================================================

  const filteredInvoices = useMemo(() => {
    // ✅ useMemo = "recuerda" el resultado
    // Si los inputs no cambian, no recalcula
    // IMPORTANTE para performance

    return invoices.filter((invoice) => {
      // ✅ .filter() = retorna nuevo array con los que cumplen la condicion

      const matchesSearch =
        invoice.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        //↑ ¿El nombre del proveedor contiene lo que busca?
        // toLowerCase() = convierte a minusculas para comparacion case-insensitive
        // includes() = ¿esta contenido?
        // || = O (cualquiera puede ser true)

        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
      //↑ O ¿el numero de factura contiene lo que busca?

      const matchesCategory = categoryFilter === 'all' || invoice.category_id === categoryFilter
      //↑ ¿la categoria coincide? O es 'all' (mostrar todos)

      const matchesPaymentMethod =
        paymentMethodFilter === 'all' || invoice.payment_method === paymentMethodFilter
      //↑ ¿el metodo de pago coincide? O es 'all'

      return matchesSearch && matchesCategory && matchesPaymentMethod
      //↑ && = AND (TODOS deben ser true)
      // La factura se incluye solo si cumple los 3 criterios
    })
  }, [invoices, searchTerm, categoryFilter, paymentMethodFilter])
  //↑ Dependencias - si alguna cambia, recalcula
  // Si no cambian, retorna el mismo resultado guardado en memoria

  // ============================================================================
  // LINEA ~135-145: Invalidar queries
  // ============================================================================

  const invalidatePending = () => {
    // ✅ Funcion que "invalida" los datos en cache
    // Invalida = marca como "no frescos" fuerza refetch

    queryClient.invalidateQueries({
      // ✅ Metodo de React Query

      queryKey: pendingListKey(),
      //↑ queryKey = ['backoffice', 'invoices', 'pending']
      // Esto invalida TODAS las paginas de facturas pendientes
      // (Porque omitimos el numero de pagina)

      refetchType: 'active',
      //↑ Solo refetch si la query estaba siendo usada ("active")
      // No refetch cosas que nadie esta mirando
    })
  }

  // ============================================================================
  // LINEA ~150-165: Action handlers - Manejar clicks de usuario
  // ============================================================================

  const handleValidate = async (invoice: InvoiceWithDetails) => {
    // ✅ Funcion que se ejecuta cuando usuario hace click en "Validar"
    // invoice = la factura que hace click

    if (invoice.original_pdf_url) {
      // ✅ Si la factura tiene un PDF adjunto

      // Abrir editor PDF para anadir sello
      setEditingPdfInvoice(invoice)
      //↑ Guardar en estado cual factura estamos editando

      setPdfEditorOpen(true)
      //↑ Abrir el modal del editor

      return
      //↑ Salir de la funcion (no continuar al siguiente)
    }

    // Si NO tiene PDF, validar directamente
    setValidatingInvoice(invoice)
    //↑ Marcar cual factura estamos validando

    setValidateDialogOpen(true)
    //↑ Abrir dialog de confirmacion
  }

  const handleConfirmValidate = async () => {
    // ✅ Cuando usuario confirma la validacion

    if (!validatingInvoice) return
    // ✅ Verificar que hay una factura (seguridad)
    // Si no hay, salir

    startTransition(async () => {
      // ✅ startTransition marca una operacion "urgente"
      // React sabe que debe priorizar esto

      try {
        // ✅ try-catch para manejar errores

        await backofficeApi.validateInvoice(validatingInvoice.id)
        //↑ Hacer request HTTP para validar
        // Esperar a que termine

        toast.success(t('toast.invoiceValidated'))
        //↑ Mostrar notificacion "Validada!"

        setValidateDialogOpen(false)
        //↑ Cerrar el dialog

        invalidatePending()
        //↑ CRITICO: Refrescar datos de facturas
        // Ahora que cambio, el usuario ve los datos actualizados
      } catch (error: unknown) {
        // ✅ Si algo falla

        const message = error instanceof Error ? error.message : t('toast.invoiceValidateError')
        //↑ Si es un Error, obtener .message
        // Si no, usar mensaje de traduccion

        toast.error(message)
        //↑ Mostrar error al usuario
      }
    })
  }
}
```

---

# MUTATIONS + INVALIDACIONES

## Explicacion en profundidad

```typescript
// ============================================================================
// PATRÓN COMPLETO: Mutation + Toast + Invalidacion
// ============================================================================

// En un componente Client-side:

'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { backofficeApi } from '@/app/lib/backoffice'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

export function InvoiceActions() {
  const queryClient = useQueryClient()
  // ✅ Instancia de React Query para invalidaciones

  const t = useTranslations('backoffice')
  // ✅ Traducciones


  // ============================================================================
  // PASO 1: Definir la mutation
  // ============================================================================

  const validateMutation = useMutation({
  // ✅ useMutation = para operaciones que CAMBIAN datos
  // useQuery = para LEER datos

    mutationFn: async (invoiceId: number) => {
    // ✅ mutationFn = funcion que realiza la operacion
    // Recibe el ID de la factura
    // Retorna la respuesta del backend

      const response = await backofficeApi.validateInvoice(invoiceId)
      //↑ Llamada HTTP POST/PUT para validar
      return response
    },


    // ============================================================================
    // PASO 2: onMutate - Optimistic Update
    // ============================================================================

    onMutate: async (invoiceId) => {
    // ✅ onMutate se ejecuta ANTES de que termine la request
    // Aqui podemos actualizar el cache INMEDIATAMENTE
    // Esto hace que el UI se actualice al instante (optimistic)

      // Cancelar requests en proceso para este query
      await queryClient.cancelQueries({
        queryKey: pendingKey(1), // Cancelar fetch de pending
      })
      //✅ Si el usuario estaba refrescando, lo cancela
      // Evita que pise nuestros datos


      // Guardar los datos anteriores (para rollback)
      const previousData = queryClient.getQueryData(pendingKey(1))
      //✅ Obtener datos actuales del cache
      // Los guardamos por si la mutation FALLA


      // Actualizar datos en cache INMEDIATAMENTE
      queryClient.setQueryData(pendingKey(1), (oldData) => {
      // ✅ setQueryData modifica el cache directamente
      // Sin hacer request nuevamente

        return {
          ...oldData,
          //↑ Copiar todos los datos viejos

          invoices: oldData.invoices.map((invoice) =>
          // ✅ Transformar el array de facturas

            invoice.id === invoiceId
            ? { ...invoice, status: 'validated' }
            // Si es la factura que estamos validando, cambiar status
            // { ...invoice } = copiar todos los campos

            : invoice
            // Si no es, dejarla igual
          ),
        }
      })
      //✅ RESULTADO: El estado se actualiza inmediatamente en el UI


      // Retornar datos viejos para usar en onError
      return { previousData }
      //✅ Si falla, podemos restaurar con this.previousData
    },


    // ============================================================================
    // PASO 3: onSuccess - Si todo va bien
    // ============================================================================

    onSuccess: (data, invoiceId, context) => {
    // ✅ Se ejecuta cuando la request HTTP termina EXITOSAMENTE
    // data = respuesta del servidor
    // invoiceId = el parametro que pasamos
    // context = lo que retornamos en onMutate

      toast.success(t('toast.invoiceValidated'))
      //↑ Mostrar notificacion verde

      // OPCION 1: Revalidar (refetch)
      queryClient.invalidateQueries({
        queryKey: pendingListKey(),
        // Invalida TODAS las paginas de pending
        refetchType: 'active',
      })
      //✅ Esto fuerza que React Query haga fetch nuevamente
      // Para asegurar que los datos del servidor sean correctos

      // OPCION 2: No hacer nada
      // Si el optimistic update ya actualizo el UI correctamente,
      // no necesitamos refetch
    },


    // ============================================================================
    // PASO 4: onError - Si algo falla
    // ============================================================================

    onError: (error, invoiceId, context) => {
    // ✅ Se ejecuta si la request HTTP falla
    // error = el error del servidor
    // context = lo que retornamos en onMutate

      toast.error(error.message || t('toast.invoiceValidateError'))
      //↑ Mostrar notificacion roja

      // Restaurar datos viejos
      if (context?.previousData) {
      // ✅ Si hay datos viejos guardados

        queryClient.setQueryData(pendingKey(1), context.previousData)
        //↑ Revertir el cache al estado anterior
        // El UI se actualiza automaticamente
      }
    },


    // ============================================================================
    // PASO 5: onSettled - Cuando termina (success o error)
    // ============================================================================

    onSettled: (data, error, invoiceId, context) => {
    // ✅ Se ejecuta SIEMPRE al final, haya exito o error
    // Aqui ponemos cosas de limpieza

      // Limpiar estado de carga
      setValidatingInvoice(null)
      setValidateDialogOpen(false)

      // OPCION: Hacer un refetch final para estar seguros
      queryClient.invalidateQueries({
        queryKey: pendingListKey(),
      })
    },
  })
  //✅ Cierre de useMutation


  // ============================================================================
  // PASO 6: Usar la mutation en un handler
  // ============================================================================

  const handleValidate = async (invoiceId: number) => {
  // ✅ Cuando usuario hace click en "Validar"

    try {
      // Ejecutar la mutation
      await validateMutation.mutateAsync(invoiceId)
      // ✅ mutateAsync = ejecuta y espera el resultado
      // Esto dispara:
      // 1. onMutate (optimistic update)
      // 2. Hace fetch
      // 3. onSuccess O onError
      // 4. onSettled

    } catch (error) {
      // Si no se maneja en onError, capturar aqui tambien
      console.error('Failed to validate:', error)
    }
  }


  // ============================================================================
  // PASO 7: Usar el estado de la mutation en el UI
  // ============================================================================

  return (
    <button
      onClick={() => handleValidate(123)}
      disabled={validateMutation.isPending}
      // ✅ isPending = true mientras se esta ejecutando
      // Deshabilita el boton para evitar clicks multiples
    >
      {validateMutation.isPending ? 'Validando...' : 'Validar'}
      // ✅ Mostrar diferente texto segun el estado
    </button>
  )
}
```

---

# URL STATE MANAGEMENT

## Explicacion paso a paso

```typescript
// ============================================================================
// COMPONENTE: Navegacion de Tabs
// ============================================================================

'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type TabType = 'pending' | 'paid' | 'suppliers' | 'settings'

export function TabsNavigation() {
  const router = useRouter()
  // ✅ Router de Next.js para navegar
  // No refresca la pagina, solo cambia la URL y renderiza

  const searchParams = useSearchParams()
  // ✅ Obtiene los parametros de la URL actual
  // Ej: si URL es "/bo?tab=paid", searchParams.get('tab') retorna 'paid'


  // ============================================================================
  // LEER TAB ACTUAL DE LA URL
  // ============================================================================

  const currentTab = (searchParams.get('tab') as TabType) || 'pending'
  // DESGLOSE:
  // 1. searchParams.get('tab') → obtiene el valor del parametro 'tab'
  //    - Si URL es "/bo?tab=paid", retorna 'paid'
  //    - Si no existe, retorna null
  //
  // 2. as TabType → asegura que TypeScript lo trate como TabType
  //    (casting de tipos)
  //
  // 3. || 'pending' → si get retorna null, usa 'pending' como default
  // RESULTADO: currentTab sera siempre uno de: 'pending', 'paid', 'suppliers', 'settings'


  // ============================================================================
  // MANEJAR CLICK EN UN TAB
  // ============================================================================

  const handleTabChange = (newTab: TabType) => {
  // ✅ Se ejecuta cuando usuario hace click en un tab
  // newTab = el tab que clickeo (ej: 'paid')

    const params = new URLSearchParams(searchParams.toString())
    // ✅ Obtiene los parametros actuales de la URL
    // URLSearchParams = utilidad para manipular query strings
    // Ej: si URL es "/bo?paidPage=2", searchParams.toString() es "paidPage=2"


    params.set('tab', newTab)
    // ✅ Cambia el parametro 'tab' al nuevo valor
    // Ej: params.set('tab', 'paid')
    // Ahora params representa "tab=paid&paidPage=2" (si paidPage estaba)


    router.push(`?${params.toString()}`, { scroll: false })
    // ✅ Navega a la nueva URL
    // `?${params.toString()}` = construye la URL completa
    //   "/bo?tab=paid&paidPage=2"
    //
    // { scroll: false } = NO DESPLAZA LA PAGINA
    //   Por defecto, new.push() hace scroll al top
    //   Esto lo previene para mejor UX


    // ✅ RESULTADO: La URL cambio, el componente se re-renderiza
    //    Con el nuevo tab seleccionado
  }


  // ============================================================================
  // RENDERIZAR BOTONES DE TABS
  // ============================================================================

  return (
    <nav className="flex space-x-4">
      <button
        onClick={() => handleTabChange('pending')}
        className={currentTab === 'pending' ? 'border-blue-600' : 'border-transparent'}
        // ✅ Si el tab actual es 'pending', mostrar como activo (border azul)
        // Si no, mostrar como inactivo (border transparente)
      >
        Pendientes (5)
      </button>

      <button
        onClick={() => handleTabChange('paid')}
        className={currentTab === 'paid' ? 'border-blue-600' : 'border-transparent'}
      >
        Pagadas
      </button>

      {/* ...mas tabs... */}
    </nav>
  )
}


// ============================================================================
// COMPONENTE PADRE: Leer URL y decidir que tab mostrar
// ============================================================================

export function TabContent({ pendingInvoices, paidInvoices, ... }: TabContentProps) {
  const searchParams = useSearchParams()
  // ✅ Obtener URL actual

  const currentTab = (searchParams.get('tab') as TabType) || 'pending'
  // ✅ Leer cual tab mostrar


  return (
    <div>
      {/* IMPORTANTE: Renderizado condicional */}

      {currentTab === 'pending' && (
        <PendingInvoicesTab invoices={pendingInvoices} />
        // ✅ Si currentTab es 'pending', mostrar este componente
      )}

      {currentTab === 'paid' && (
        <PaidInvoicesTab invoices={paidInvoices} />
        // ✅ Si currentTab es 'paid', mostrar este
      )}

      {/* ...mas tabs... */}
    </div>
  )
}


// ============================================================================
// PAGINACION EN URL
// ============================================================================

export function PaginationControls() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  // ✅ pathname = la ruta actual (sin query string)
  // Ej: "/dashboard/bo"


  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  // ✅ Obtener numero de pagina actual de la URL
  // Si no existe, usar 1 como default
  // parseInt(..., 10) = convertir a numero en base 10


  const handlePreviousPage = () => {
  // ✅ Cuando usuario hace click en "Anterior"

    if (currentPage > 1) {
    // ✅ Solo si no estamos en pagina 1

      const params = new URLSearchParams(searchParams.toString())
      // ✅ Obtener parametros actuales

      params.set('page', (currentPage - 1).toString())
      // ✅ Cambiar 'page' al numero anterior (3 → 2)

      router.push(`${pathname}?${params.toString()}`)
      // ✅ Navegar a la nueva URL
      // "/dashboard/bo?page=2"
    }
  }


  const handleNextPage = () => {
    // ✅ Cuando usuario hace click en "Siguiente"

    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (currentPage + 1).toString())
    // ✅ Cambiar 'page' al numero siguiente (2 → 3)

    router.push(`${pathname}?${params.toString()}`)
  }


  return (
    <div>
      <button onClick={handlePreviousPage} disabled={currentPage === 1}>
        Anterior
      </button>

      <span>
        Pagina {currentPage}
      </span>

      <button onClick={handleNextPage}>
        Siguiente
      </button>
    </div>
  )
}
```

---

# ERROR BOUNDARY

## Explicacion detallada

```typescript
// ============================================================================
// ARCHIVO: app/dashboard/bo/error.tsx
// ============================================================================

'use client'
// ✅ Error boundaries DEBEN ser Client Components


import { useEffect } from 'react'
// ✅ useEffect para logging cuando ocurre error


import { useTranslations } from 'next-intl'
// ✅ Hook para traducciones en el cliente


import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'
// ✅ Iconos para la UI


// ============================================================================
// INTERFACE: Propiedades que recibe un error boundary
// ============================================================================

interface ErrorProps {
  error: Error & { digest?: string }
  // ✅ error = el error que ocurrio
  // Error es una clase de JavaScript
  // ✅ digest = ID unico del error (para debugging)

  reset: () => void
  // ✅ reset = funcion que intenta renderizar nuevamente
  // Le permite al usuario reintentar (like a "reload button")
}


// ============================================================================
// COMPONENTE: Error boundary
// ============================================================================

export default function BackOfficeError({ error, reset }: ErrorProps) {
// ✅ Recibe error y reset como props
// Next.js automaticamente pasa estos cuando ocurre un error en la ruta


  // ============================================================================
  // LOGGING: Cuando ocurre el error
  // ============================================================================

  useEffect(() => {
  // ✅ useEffect se ejecuta cuando el componente renderiza
  // Pero useEffect es para EFECTOS (cosas que ocurren en el browser)

    console.error('[BackOffice Error]', error)
    // ✅ Loguear el error en la consola del navegador
    // '[BackOffice Error]' = prefijo para saber de donde viene
    // console.error = usa color rojo en consola

  }, [error])
  // ✅ Dependencia: si el 'error' cambia, ejecutar useEffect nuevamente


  // ============================================================================
  // OBTENER TRADUCCIONES
  // ============================================================================

  const t = useTranslations('backoffice')
  // ✅ Obtener mensajes traducidos para el modulo


  // ============================================================================
  // RENDERIZAR LA UI DE ERROR
  // ============================================================================

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
    // ✅ Contenedor que ocupa al menos 400px de alto
    //    flex = CSS flexbox
    //    items-center = centrar verticalmente
    //    justify-center = centrar horizontalmente
    //    p-6 = padding


      <div className="text-center max-w-md">
      // ✅ Caja central, ancho maximo 28rem (md)


        <FiAlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        // ✅ Icono de alerta
        //    w-12 h-12 = 48px x 48px
        //    text-red-500 = rojo
        //    mx-auto = margin horizontal auto (centrado)
        //    mb-4 = margin bottom


        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('error.title')}
        // ✅ Titulo del error (traducido)
        //    text-xl = fuente grande
        //    font-bold = negrita
        //    text-gray-900 en tema claro, gray-100 en tema oscuro
        </h2>


        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('error.description')}
        // ✅ Descripcion del error (traducida)
        //    text-gray-600 = gris oscuro en tema claro
        </p>


        {/* DETALLES DEL ERROR - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
        // ✅ process.env.NODE_ENV = 'development' o 'production'
        // && = Y (solo renderizar si es true)
        // Esto significa: mostrar detalles SOLO en desarrollo

          <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4 overflow-auto">
          // ✅ <pre> = preformated text (mantiene espacios)
          //    text-xs = fuente muy pequena
          //    overflow-auto = scrollable si es muy largo

            {error.message}
            {/* Mensaje del error */}

            {error.digest && `\nDigest: ${error.digest}`}
            {/* Si existe digest, mostrarlo */}
          </pre>
        )}


        {/* BOTON PARA REINTENTAR */}
        <button
          onClick={reset}
          // ✅ Cuando hace click, ejecutar reset()
          // reset() intenta renderizar el componente nuevamente
          // Si el error fue temporal, ahora podria funcionar

          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          // ✅ Estilos del boton
          //    inline-flex = flexbox en linea (pequeno)
          //    gap-2 = espacio entre items (icono y texto)
          //    px-4 py-2 = padding horizontal y vertical
          //    bg-blue-600 = fondo azul
          //    hover:bg-blue-700 = azul mas oscuro cuando hover
        >
          <FiRefreshCw className="w-4 h-4" />
          // ✅ Icono de refrescar

          {t('error.retry')}
          // ✅ Texto del boton (traducido)
        </button>
      </div>
    </div>
  )
}


// ============================================================================
// COMO FUNCIONA UN ERROR BOUNDARY EN NEXT.js
// ============================================================================

/*
PASO A PASO:
1. Usuario navega a /dashboard/bo
2. Se ejecuta la page.tsx (Server Component)
3. Si ocurre un error durante SSR:
   ↓
4. Next.js CAPTURA el error
5. Next.js NO muestra la pagina normal
6. Next.js renderiza error.tsx en su lugar
7. Le pasa { error, reset } como props
8. El usuario ve la UI de error con boton "Reintentar"
9. Si usuario hace click en "Reintentar":
   ↓
10. Se ejecuta reset()
11. Next.js intenta renderizar la pagina nuevamente
12. Si ahora funciona, se muestra normalmente
13. Si vuelve a fallar, se muestra error.tsx nuevamente

IMPORTANTE:
- Error boundaries solo capturan errores durante renderizado
- No capturan errores en event handlers (requieren try-catch)
- Si quieres capturar error en un boton, usa try-catch:

  const handleClick = async () => {
    try {
      await someAsyncOperation()
    } catch (error) {
      console.error(error)
      // Mostrar UI de error manualmente
    }
  }
*/
```

---

# LOADING STATES

## Archivo: app/dashboard/bo/loading.tsx

```typescript
// ============================================================================
// EXPLICACION: Cuando se muestra loading.tsx
// ============================================================================

/*
FLUJO:
1. Usuario navega a /dashboard/bo
2. Page.tsx comienza a cargar datos (Promise.all con 6 fetches)
3. Mientras espera los datos...
4. Next.js renderiza loading.tsx inmediatamente
5. Usuario ve el skeleton UI
6. Cuando Page.tsx termina de cargar...
7. Next.js reemplaza loading.tsx con la pagina real
8. Usuario ve los datos!

IMPORTANTE:
- loading.tsx se muestra AUTOMATICAMENTE
- No necesitas hacer nada especial
- Solo crear el archivo en la carpeta correcta
*/


import { getTranslations } from 'next-intl/server'
// ✅ Obtener traducciones en el servidor


export default async function BackOfficeLoading() {
// ✅ Este es un Server Component
// Se ejecuta en el servidor para acceder a traducciones


  const t = await getTranslations('backoffice')
  // ✅ Obtener mensajes traducidos
  // await porque getTranslations es async


  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
    // ✅ Contenedor principal
    //    min-h-screen = altura minima = alto de pantalla


      <div className="max-w-[1600px] space-y-5">
      // ✅ Contenedor con ancho maximo
      //    space-y-5 = espacio vertical entre children
      //    (margin-bottom en cada elemento excepto el ultimo)


        {/* HEADER SKELETON */}
        <div className="mb-4 sm:mb-6">
        // ✅ Titulo/encabezado


          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          // ✅ Linea 1 del header (skeleton)
          //    h-6 = altura 24px
          //    w-48 = ancho 192px
          //    bg-gray-200 = fondo gris claro
          //    animate-pulse = animacion fade in/out
          //    RESULTADO: Una barra gris que parpadea (efecto de carga)


          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
          // ✅ Linea 2 del header (esqueleto)
          //    Mas pequena que la primera


        </div>


        {/* STATS GRID SKELETON */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        // ✅ Grid de 6 tarjetas de stats
        //    grid-cols-2 = 2 columnas en pantalla pequena
        //    lg:grid-cols-4 = 4 columnas en pantalla grande
        //    xl:grid-cols-6 = 6 columnas en pantalla muy grande


          {[...Array(6)].map((_, i) => (
          // ✅ Crear 6 items (array vacio de largo 6)
          //    .map() = iterar sobre cada uno
          //    _ = ignoramos el valor (no lo usamos)
          //    i = indice (0, 1, 2, 3, 4, 5)

            <div key={i} className="bg-white dark:bg-[#151b23] rounded-md border p-3">
            // ✅ Una tarjeta de stats
            //    key={i} = identificador unico para React
            //    p-3 = padding


              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              // ✅ Linea 1: Label (muy pequena)
              //    h-3 = altura 12px


              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
              // ✅ Linea 2: Valor (mas grande)
              //    h-6 = altura 24px
              //    mt-2 = margin-top (espacio con linea anterior)
            </div>
          ))}
        </div>


        {/* LOADING MESSAGE - Traducido */}
        <p className="text-sm text-gray-500">
          {t('loading')}
          // ✅ Mensaje de carga traducido
          // Ej: "Cargando datos..."
        </p>
      </div>
    </div>
  )
}


// ============================================================================
// POR QUE ES IMPORTANTE EL SKELETON UI
// ============================================================================

/*
SIN skeleton UI:
┌─────────────────────────────┐
│  Pagina blanca              │  ← Esperando
│  (nada visible)             │
│                             │  Tiempo: 2 segundos
│                             │
└─────────────────────────────┘
↓
┌─────────────────────────────┐
│  Stats Pendientes: 5        │  ← Datos cargados
│  Stats Pagadas: 20          │
│  ...                        │
└─────────────────────────────┘

PROBLEMA: Usuario ve pantalla en blanco → piensa que se rompio

CON skeleton UI:
┌─────────────────────────────┐
│  [████] [████] [████]       │  ← Skeleton (efecto "loading")
│  [████]         [████]      │
│                             │  Tiempo: 0.5 segundos (PARECE rapido)
│  [████]    [████]           │
└─────────────────────────────┘
↓
┌─────────────────────────────┐
│  Stats Pendientes: 5        │  ← Datos reales
│  Stats Pagadas: 20          │
│  ...                        │
└─────────────────────────────┘

BENEFICIO:
- Usuario VE algo ocurriendo
- Parece mas rapido (perceptual)
- Layout no cambia (sin CLS)
*/
```

---

## RESUMEN QUICK REFERENCE

```typescript
// ============================================================================
// PATRON 1: Server Component con Promise.all
// ============================================================================

export default async function Page() {
  const [data1, data2, data3] = await Promise.all([
    fetch1(),  // Comienzan TODAS al mismo tiempo
    fetch2(),  // No secuencial, paralelo
    fetch3(),  // Mucho mas rapido
  ])
  return <ClientComponent data={{data1, data2, data3}} />
}


// ============================================================================
// PATRON 2: React Query con initialData
// ============================================================================

const { data } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => api.get('/resource/' + id),
  initialData: serverData,  // ← Usa datos del servidor
  staleTime: 5 * 60 * 1000, // 5 min
})


// ============================================================================
// PATRON 3: Mutation con invalidacion
// ============================================================================

const mutation = useMutation({
  mutationFn: (id) => api.update(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
    // Refetch automaticamente
    toast.success('Actualizado!')
  },
  onError: (error) => {
    toast.error(error.message)
  },
})


// ============================================================================
// PATRON 4: URL State
// ============================================================================

const currentTab = searchParams.get('tab') || 'default'

const handleChange = (newTab) => {
  const params = new URLSearchParams(searchParams)
  params.set('tab', newTab)
  router.push(`?${params}`, { scroll: false })
}


// ============================================================================
// PATRON 5: server-only
// ============================================================================

import 'server-only'  // ← Previene accidentales imports en cliente

async function getData() {
  const token = cookies().get('token').value  // Solo en servidor!
  return fetch(`${API}/data`, { headers: { Authorization: `Bearer ${token}` } })
}
```

Este documento proporciona explicación **extremadamente detallada** de cada línea. Cada concepto se explica en español claro sin asumir conocimiento previo.
