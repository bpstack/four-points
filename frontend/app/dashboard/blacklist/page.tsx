// dashboard/blacklist/page.tsx
// app/dashboard/blacklist/page.tsx

/**
 * Página principal del módulo Blacklist
 * - Server Component (SSR)
 * - Tabla con paginación
 * - Búsqueda y filtros
 * - Search params en URL
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { IoAddOutline } from 'react-icons/io5'
import { Button } from '@/app/components/blacklist/ui/Button'
import { Card } from '@/app/components/blacklist/ui/Card'
import { SearchBar } from '@/app/components/blacklist/mains/SearchBar'
import { BlacklistTable } from '@/app/components/blacklist/mains/BlacklistTable'
import { Pagination } from '@/app/components/blacklist/mains/Pagination'
import { getBlacklist } from './actions'
import type { BlacklistFilters } from '@/app/lib/blacklist/types'

// Revalidar cada 60 segundos
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{
    // ✅ CAMBIO 1: Ahora es Promise
    page?: string
    q?: string
    document?: string
    severity?: string
    status?: string
    from_date?: string
    to_date?: string
  }>
}

export default async function BlacklistPage({ searchParams }: PageProps) {
  // ✅ CAMBIO 2: AWAIT searchParams
  const params = await searchParams

  // Validar severity y status antes de asignarlos
  const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
  const validStatuses = ['ACTIVE', 'DELETED', 'ALL'] as const

  const severity = validSeverities.includes(params.severity as (typeof validSeverities)[number])
    ? (params.severity as BlacklistFilters['severity'])
    : undefined

  const status = validStatuses.includes(params.status as (typeof validStatuses)[number])
    ? (params.status as BlacklistFilters['status'])
    : undefined

  const filters: BlacklistFilters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: 50,
    q: params.q,
    document: params.document,
    severity,
    status,
    from_date: params.from_date,
    to_date: params.to_date,
  }

  let data
  let error

  try {
    data = await getBlacklist(filters)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error desconocido'
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Blacklist de Huéspedes
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Gestión de huéspedes con mala conducta
            </p>
          </div>

          <Link href="/dashboard/blacklist/new">
            <Button
              variant="primary"
              leftIcon={<IoAddOutline size={14} />}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
            >
              Nuevo Registro
            </Button>
          </Link>
        </div>

        <Card className="mb-4">
          <Suspense fallback={<SearchBarSkeleton />}>
            <SearchBar totalResults={data?.pagination.total_entries} />
          </Suspense>
        </Card>

        {error ? (
          <ErrorDisplay message={error} />
        ) : data ? (
          <>
            <Card noPadding className="shadow-sm overflow-hidden">
              <Suspense fallback={<TableSkeleton />}>
                <BlacklistTable entries={data.entries} searchTerm={params.q} />
              </Suspense>

              {data.pagination.total_pages > 1 && (
                <Pagination
                  currentPage={data.pagination.current_page}
                  totalPages={data.pagination.total_pages}
                  totalEntries={data.pagination.total_entries}
                  perPage={data.pagination.per_page}
                  hasNext={data.pagination.has_next}
                  hasPrev={data.pagination.has_prev}
                />
              )}
            </Card>
          </>
        ) : (
          <Card>
            <TableSkeleton />
          </Card>
        )}
      </div>
    </div>
  )
}

function SearchBarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      ))}
    </div>
  )
}

// ✅ CAMBIO 4: Componente de error separado (para evitar onClick en Server Component)
function ErrorDisplay({ message }: { message: string }) {
  return (
    <Card>
      {' '}
      {/* Sin clases adicionales */}
      <div className="text-center py-8">
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">{message}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          {message.includes('404') || message.includes('no encontrada')
            ? 'El backend no está disponible. Usando datos de demostración.'
            : 'Ocurrió un error al cargar los datos.'}
        </p>
      </div>
    </Card>
  )
}
