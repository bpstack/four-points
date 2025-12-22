// app/components/parking/bookings/BookingDetailClient.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { parkingApi } from '@/app/lib/parking'
import type { ParkingBooking } from '@/app/lib/parking/types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import {
  FiRefreshCw,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiUser,
  FiTruck,
  FiFileText,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiAlertTriangle,
} from 'react-icons/fi'

// Imports relativos dentro del módulo
import { InfoCard, InfoRow } from './InfoCard'
import { CheckInModal } from './CheckInModal'
import { CheckOutModal } from './CheckOutModal'
import { EditBookingModal } from './EditBookingModal'
import { BookingHeader } from './BookingHeader'
import { formatDate, BOOKING_SOURCES, PAYMENT_METHODS, SPOT_TYPES } from '../helpers'

interface BookingDetailClientProps {
  code: string
}

export function BookingDetailClient({ code }: BookingDetailClientProps) {
  const router = useRouter()
  const [booking, setBooking] = useState<ParkingBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [_refreshing, setRefreshing] = useState(false)

  // Modals
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const loadBooking = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true)
        else setLoading(true)

        const response = await parkingApi.getBookingByCode(code)
        setBooking(response.booking)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido'
        toast.error('Error al cargar la reserva: ' + message)
        router.push('/dashboard/parking/bookings')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [code, router]
  )

  useEffect(() => {
    if (code) loadBooking()
  }, [code, loadBooking])

  // Handlers
  const handleCheckIn = async (data: { actual_checkin?: string; notes?: string }) => {
    if (!booking) return
    try {
      await parkingApi.checkInBooking(booking.booking_code, data)
      toast.success('Check-in realizado correctamente')
      setShowCheckInModal(false)
      loadBooking(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al hacer check-in: ' + message)
      throw error
    }
  }

  const handleCheckOut = async (data: {
    actual_checkout?: string
    payment_amount?: number
    payment_method?: string
    payment_reference?: string
    notes?: string
  }) => {
    if (!booking) return
    try {
      await parkingApi.checkOutBooking(booking.booking_code, data)
      toast.success('Check-out realizado correctamente')
      setShowCheckOutModal(false)
      loadBooking(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al hacer check-out: ' + message)
      throw error
    }
  }

  const handleUpdate = async (data: Parameters<typeof parkingApi.updateBooking>[1]) => {
    if (!booking) return
    try {
      await parkingApi.updateBooking(booking.booking_code, data)
      toast.success('Reserva actualizada correctamente')
      setShowEditModal(false)
      loadBooking(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al actualizar: ' + message)
      throw error
    }
  }

  const handleCancel = async () => {
    if (!booking) return
    if (!confirm('¿Seguro que quieres cancelar esta reserva?')) return

    try {
      await parkingApi.cancelBooking(booking.booking_code)
      toast.success('Reserva cancelada')
      loadBooking(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cancelar: ' + message)
    }
  }

  const handleNoShow = async () => {
    if (!booking) return
    if (!confirm('¿Marcar esta reserva como no-show?')) return

    try {
      await parkingApi.markBookingNoShow(booking.booking_code)
      toast.success('Marcado como no-show')
      loadBooking(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error: ' + message)
    }
  }

  const handleDelete = async () => {
    if (!booking) return
    if (!confirm('¿ELIMINAR permanentemente esta reserva? Esta accion NO se puede deshacer.'))
      return

    try {
      await parkingApi.deleteBooking(booking.booking_code)
      toast.success('Reserva eliminada')
      router.push('/dashboard/parking/bookings')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al eliminar: ' + message)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FiRefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Cargando reserva...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!booking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">Reserva no encontrada</p>
          <Link
            href="/dashboard/parking/bookings"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Volver a reservas
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <BookingHeader
        booking={booking}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        onCheckIn={() => setShowCheckInModal(true)}
        onCheckOut={() => setShowCheckOutModal(true)}
        onCancel={handleCancel}
        onNoShow={handleNoShow}
      />

      {/* Content Grid */}
      <div className="max-w-[1400px] px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plaza */}
            <InfoCard title="Plaza de Parking" icon={<FiMapPin className="w-5 h-5" />}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ubicacion</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {booking.spot.level} - {booking.spot.number}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo de plaza</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {SPOT_TYPES[booking.spot.type] || booking.spot.type}
                  </p>
                </div>
              </div>
            </InfoCard>

            {/* Vehiculo */}
            <InfoCard title="Vehiculo" icon={<FiTruck className="w-5 h-5" />}>
              {booking.vehicle ? (
                <div className="space-y-1">
                  <InfoRow label="Matricula" value={booking.vehicle.plate} mono highlight />
                  <InfoRow label="Propietario" value={booking.vehicle.owner} />
                  {booking.vehicle.model && (
                    <InfoRow label="Modelo" value={booking.vehicle.model} />
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                  Sin vehiculo asignado
                </p>
              )}
            </InfoCard>

            {/* Fechas */}
            <InfoCard title="Programacion" icon={<FiCalendar className="w-5 h-5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Check-in */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiLogIn className="w-4 h-4" />
                    Check-in
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Esperado</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(booking.schedule.expected_checkin)}
                      </p>
                    </div>
                    {booking.schedule.actual_checkin && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                          Realizado
                        </p>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                          {formatDate(booking.schedule.actual_checkin)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-out */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiLogOut className="w-4 h-4" />
                    Check-out
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Esperado</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(booking.schedule.expected_checkout)}
                      </p>
                    </div>
                    {booking.schedule.actual_checkout && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                          Realizado
                        </p>
                        <p className="text-sm font-semibold text-green-900 dark:text-green-300">
                          {formatDate(booking.schedule.actual_checkout)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Dias planeados</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {booking.schedule.planned_days}
                </span>
              </div>
              {booking.schedule.actual_days && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Dias reales</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {booking.schedule.actual_days}
                  </span>
                </div>
              )}
            </InfoCard>

            {/* Notas */}
            {booking.notes && (
              <InfoCard title="Notas" icon={<FiFileText className="w-5 h-5" />}>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
                  {booking.notes}
                </p>
              </InfoCard>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Pago */}
            <InfoCard title="Pago" icon={<FiDollarSign className="w-5 h-5" />}>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {booking.payment.total_amount.toFixed(2)} EUR
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pagado</span>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {booking.payment.paid_amount.toFixed(2)} EUR
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pendiente</span>
                  <span
                    className={`text-lg font-semibold ${
                      booking.payment.pending_amount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {booking.payment.pending_amount.toFixed(2)} EUR
                  </span>
                </div>

                {booking.payment.method && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-1">
                    <InfoRow
                      label="Metodo"
                      value={PAYMENT_METHODS[booking.payment.method] || booking.payment.method}
                    />
                    {booking.payment.reference && (
                      <InfoRow label="Referencia" value={booking.payment.reference} mono />
                    )}
                    {booking.payment.date && (
                      <InfoRow label="Fecha pago" value={formatDate(booking.payment.date)} />
                    )}
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Info Reserva */}
            <InfoCard title="Informacion de Reserva" icon={<FiInfo className="w-5 h-5" />}>
              <div className="space-y-1">
                <InfoRow
                  label="Origen"
                  value={
                    BOOKING_SOURCES[booking.booking_info.source] || booking.booking_info.source
                  }
                />
                {booking.booking_info.external_id && (
                  <InfoRow label="ID Externo" value={booking.booking_info.external_id} mono />
                )}
              </div>
            </InfoCard>

            {/* Operador */}
            {booking.operator && (
              <InfoCard title="Operador" icon={<FiUser className="w-5 h-5" />}>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {booking.operator.username}
                </p>
              </InfoCard>
            )}

            {/* Registro */}
            <InfoCard title="Registro" icon={<FiClock className="w-5 h-5" />}>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Creado</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDate(booking.timestamps.created_at, true, true)}
                  </p>
                  {booking.timestamps.created_by && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      por {booking.timestamps.created_by.username}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Actualizado</p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDate(booking.timestamps.updated_at, true, true)}
                  </p>
                  {booking.timestamps.updated_by && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      por {booking.timestamps.updated_by.username}
                    </p>
                  )}
                </div>
              </div>
            </InfoCard>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCheckInModal && (
        <CheckInModal
          booking={booking}
          onClose={() => setShowCheckInModal(false)}
          onConfirm={handleCheckIn}
        />
      )}

      {showCheckOutModal && (
        <CheckOutModal
          booking={booking}
          onClose={() => setShowCheckOutModal(false)}
          onConfirm={handleCheckOut}
        />
      )}

      {showEditModal && (
        <EditBookingModal
          booking={booking}
          onClose={() => setShowEditModal(false)}
          onConfirm={handleUpdate}
        />
      )}
    </>
  )
}

export default BookingDetailClient
