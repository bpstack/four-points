// app/dashboard/blacklist/components/mains/Pagination.tsx
'use client'

/**
 * Componente de paginación SSR-friendly
 * Usa search params en la URL para mantener estado
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalEntries: number
  perPage: number
  hasNext: boolean
  hasPrev: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  totalEntries,
  perPage,
  hasNext,
  hasPrev,
}: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('common.pagination')

  // ========================================
  // NAVEGAR A PÁGINA
  // ========================================
  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  // ========================================
  // GENERAR NÚMEROS DE PÁGINA
  // ========================================
  const getPageNumbers = (): (number | string)[] => {
    const delta = 2 // Páginas a mostrar alrededor de la actual
    const pages: (number | string)[] = []

    // Siempre mostrar primera página
    pages.push(1)

    // Calcular rango
    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    // Agregar "..." si hay gap después de la primera página
    if (rangeStart > 2) {
      pages.push('...')
    }

    // Agregar páginas del rango
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pages.push(i)
    }

    // Agregar "..." si hay gap antes de la última página
    if (rangeEnd < totalPages - 1) {
      pages.push('...')
    }

    // Siempre mostrar última página (si hay más de 1)
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  // ========================================
  // CALCULAR RANGO DE REGISTROS
  // ========================================
  const getDisplayRange = () => {
    const start = (currentPage - 1) * perPage + 1
    const end = Math.min(currentPage * perPage, totalEntries)
    return { start, end }
  }

  const { start, end } = getDisplayRange()
  const pages = getPageNumbers()

  // Si solo hay 1 página, no mostrar paginación
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-surface border-t border-border">
      {/* Info de registros */}
      <div className="text-sm text-fg">
        {t('showing')} <span className="font-medium">{start}</span> {t('to')}{' '}
        <span className="font-medium">{end}</span> {t('of')}{' '}
        <span className="font-medium">{totalEntries}</span> {t('records')}
      </div>

      {/* Controles de navegación */}
      <div className="flex items-center gap-2">
        {/* Botón: Anterior */}
        <button
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={!hasPrev}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            hasPrev ? 'text-fg hover:bg-surface-hover' : 'text-fg-subtle cursor-not-allowed'
          )}
        >
          <IoChevronBack size={16} />
          <span className="hidden sm:inline">{t('previous')}</span>
        </button>

        {/* Números de página */}
        <div className="flex items-center gap-1">
          {pages.map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={`page-${page}`}
                onClick={() => navigateToPage(page)}
                className={clsx(
                  'min-w-[36px] h-9 px-3 text-sm font-medium rounded-md transition-colors',
                  page === currentPage
                    ? 'bg-accent text-accent-fg hover:bg-accent-hover'
                    : 'text-fg hover:bg-surface-hover'
                )}
              >
                {page}
              </button>
            ) : (
              <span
                key={`ellipsis-${index}`}
                className="min-w-[36px] h-9 px-3 flex items-center justify-center text-gray-500"
              >
                {page}
              </span>
            )
          )}
        </div>

        {/* Botón: Siguiente */}
        <button
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={!hasNext}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            hasNext ? 'text-fg hover:bg-surface-hover' : 'text-fg-subtle cursor-not-allowed'
          )}
        >
          <span className="hidden sm:inline">{t('next')}</span>
          <IoChevronForward size={16} />
        </button>
      </div>

      {/* Info adicional - mobile */}
      <div className="sm:hidden text-xs text-fg-muted">
        {t('page')} {currentPage} {t('pageOf')} {totalPages}
      </div>
    </div>
  )
}

// ✅ Features del componente Pagination:

// ✅ SSR-friendly - Usa search params en URL (?page=2)
// ✅ Smart page numbers:

// Siempre muestra primera y última página
// Muestra 2 páginas antes y después de la actual
// Usa "..." para gaps grandes

// ✅ Responsive:

// Desktop: "Anterior" y "Siguiente" con texto
// Mobile: Solo iconos

// ✅ Info de registros: "Mostrando 1 a 50 de 234 registros"
// ✅ Estados disabled - Prev/Next deshabilitados cuando no hay más páginas
// ✅ Navegación por URL - Mantiene otros filtros (búsqueda, etc.)
// ✅ Dark mode - Estilos para tema oscuro
// ✅ Accesibilidad - Botones con estados claros

//Ejemplo de uso:
// typescript<Pagination
//   currentPage={2}
//   totalPages={10}
//   totalEntries={234}
//   perPage={50}
//   hasNext={true}
//   hasPrev={true}
// />
// ```

// ### 🔗 URLs generadas:
// ```
// /dashboard/blacklist?page=1
// /dashboard/blacklist?page=2&q=john&severity=HIGH
// /dashboard/blacklist?page=3&status=ACTIVE
