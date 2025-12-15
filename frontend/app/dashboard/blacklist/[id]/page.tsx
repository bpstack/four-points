// app/dashboard/blacklist/[id]/page.tsx

/**
 * Página de detalle de registro Blacklist
 * - Server Component (SSR)
 * - Vista completa del registro
 * - Galería de imágenes
 * - Historial de cambios
 * - Acciones: editar, eliminar
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IoChevronBack, IoCreateOutline } from 'react-icons/io5'
import { Card } from '@/app/components/blacklist/ui/Card'
import { Button } from '@/app/components/blacklist/ui/Button'
import { Badge } from '@/app/components/blacklist/ui/Badge'
import { ImageGallery } from '../../../components/blacklist/mains/ImageGallery'
import { AuditTrail } from '@/app/components/blacklist/mains/AuditTrail'
import { getBlacklistById } from '../actions'
import { DOCUMENT_TYPES, SEVERITY_LEVELS } from '@/app/lib/blacklist/types'
import { formatDate, formatDateTime, calculateStayDays } from '@/app/lib/blacklist/blacklistUtils'
import {
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoWarningOutline,
  IoPersonOutline,
} from 'react-icons/io5'
import { DeleteButton } from '../../../components/blacklist/mains/DeleteButton'

// Revalidar cada 30 segundos
export const revalidate = 30

interface PageProps {
  params: Promise<{
    // ✅ CAMBIO 1: Ahora es Promise
    id: string
  }>
}

export default async function BlacklistDetailPage({ params }: PageProps) {
  // ✅ CAMBIO 2: AWAIT params
  const { id } = await params

  let data

  try {
    data = await getBlacklistById(id)
  } catch {
    notFound()
  }

  const { entry, audit_trail } = data
  const stayDays = calculateStayDays(entry.check_in_date, entry.check_out_date)

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/dashboard/blacklist"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <IoChevronBack size={16} />
          Volver a la lista
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {entry.guest_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  entry.severity === 'CRITICAL'
                    ? 'danger'
                    : entry.severity === 'HIGH'
                      ? 'warning'
                      : entry.severity === 'MEDIUM'
                        ? 'info'
                        : 'default'
                }
              >
                {SEVERITY_LEVELS[entry.severity]}
              </Badge>
              <Badge variant={entry.status === 'ACTIVE' ? 'success' : 'default'}>
                {entry.status === 'ACTIVE' ? 'Activo' : 'Eliminado'}
              </Badge>
            </div>
          </div>

          {entry.status === 'ACTIVE' && (
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/blacklist/${id}/edit`}>
                <Button variant="secondary" leftIcon={<IoCreateOutline size={18} />}>
                  Editar
                </Button>
              </Link>
              <DeleteButton entryId={id} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <IoDocumentTextOutline size={20} />
                Información del documento
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Tipo de documento
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {DOCUMENT_TYPES[entry.document_type]}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Número de documento
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100 font-mono">
                    {entry.document_number}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <IoCalendarOutline size={20} />
                Fechas de hospedaje
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Entrada</div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(entry.check_in_date)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Salida</div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(entry.check_out_date)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estancia</div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {stayDays} {stayDays === 1 ? 'día' : 'días'}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <IoWarningOutline size={20} />
                Motivo del incidente
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.reason}</p>
            </Card>

            <Card className="dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Comentarios adicionales
              </h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {entry.comments}
              </p>
            </Card>

            <Card className="dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Evidencia fotográfica ({entry.images.length})
              </h3>
              <ImageGallery images={entry.images} alt={`Evidencia de ${entry.guest_name}`} />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <IoPersonOutline size={20} />
                Información
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Registrado por
                  </div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                    {entry.created_by_username || 'Desconocido'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Fecha de registro
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(entry.created_at)}
                  </div>
                </div>
                {entry.updated_at && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Última modificación
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {formatDateTime(entry.updated_at)}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Historial de cambios
              </h3>
              <AuditTrail entries={audit_trail} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
