// app/components/parking/bookings/BookingHeader.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { ParkingBooking } from '@/app/lib/parking/types'
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiLogIn,
  FiLogOut,
  FiX,
  FiAlertTriangle,
} from 'react-icons/fi'
import { StatusBadge } from '../StatusBadge'
import { SPOT_TYPES, type BookingStatus } from '../helpers'

interface BookingHeaderProps {
  booking: ParkingBooking
  onEdit: () => void
  onDelete: () => void
  onCheckIn: () => void
  onCheckOut: () => void
  onCancel: () => void
  onNoShow: () => void
}

export function BookingHeader({
  booking,
  onEdit,
  onDelete,
  onCheckIn,
  onCheckOut,
  onCancel,
  onNoShow,
}: BookingHeaderProps) {
  const router = useRouter()

  const canCheckIn = booking.status === 'reserved'
  const canCheckOut = booking.status === 'checked_in'
  const canEdit = ['reserved', 'checked_in'].includes(booking.status)
  const canCancel = ['reserved', 'checked_in'].includes(booking.status)
  const canNoShow = booking.status === 'reserved'
  const canDelete = ['reserved', 'canceled'].includes(booking.status)

  return (
    <div className="bg-white dark:bg-[#010409] border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-[1400px] px-4 md:px-6 py-4">
        {/* Back button */}
        <button
          onClick={() => router.push('/dashboard/parking/bookings')}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4 transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Volver al listado
        </button>

        {/* Header content */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {booking.booking_code}
              </h1>
              <StatusBadge status={booking.status as BookingStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Plaza:{' '}
                <span className="font-medium">
                  {booking.spot.level} - {booking.spot.number}
                </span>
              </span>
              <span>•</span>
              <span>{SPOT_TYPES[booking.spot.type] || booking.spot.type}</span>
              {booking.vehicle && (
                <>
                  <span>•</span>
                  <span className="font-mono">{booking.vehicle.plate}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {canCheckIn && (
              <button
                onClick={onCheckIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
              >
                <FiLogIn className="w-3.5 h-3.5" />
                Check-in
              </button>
            )}

            {canCheckOut && (
              <button
                onClick={onCheckOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                Check-out
              </button>
            )}

            {canEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FiEdit className="w-3.5 h-3.5" />
                Editar
              </button>
            )}

            {canCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <FiX className="w-3.5 h-3.5" />
                Cancelar
              </button>
            )}

            {canNoShow && (
              <button
                onClick={onNoShow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-400 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-800 rounded-md hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                title="Marcar como No-show"
              >
                <FiAlertTriangle className="w-3.5 h-3.5" />
                No-show
              </button>
            )}

            {canDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )}
          </div>
        </div>

        {/* Payment warning */}
        {booking.payment.pending_amount > 0 && booking.status === 'checked_in' && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-400 font-medium">
              Pago pendiente: {booking.payment.pending_amount.toFixed(2)} EUR
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingHeader
