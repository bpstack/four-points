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
import { PaymentModal } from './PaymentModal'
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
  const [showPaymentModal, setShowPaymentModal] = useState(false)

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

  const handlePayment = async (data: {
    payment_amount: number
    payment_method: 'cash' | 'card' | 'transfer' | 'agency'
    payment_reference?: string
  }) => {
    if (!booking) return
    try {
      await parkingApi.updateBooking(booking.booking_code, {
        payment_amount: data.payment_amount,
        payment_method: data.payment_method,
        payment_reference: data.payment_reference,
      })
      toast.success('Pago registrado correctamente')
      setShowPaymentModal(false)
      loadBooking(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al registrar pago: ' + message)
      throw error
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FiRefreshCw className="w-8 h-8 text-[#0969da] dark:text-[#58a6ff] animate-spin" />
          <p className="text-sm text-[#57606a] dark:text-[#8b949e]">Cargando reserva...</p>
        </div>
      </div>
    )
  }

  // Not found
  if (!booking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <FiAlertTriangle className="w-12 h-12 text-[#9a6700] dark:text-[#d29922] mx-auto mb-4" />
          <p className="text-[#57606a] dark:text-[#8b949e] mb-4">Reserva no encontrada</p>
          <Link
            href="/dashboard/parking/bookings"
            className="text-[#0969da] dark:text-[#58a6ff] hover:underline text-sm"
          >
            Volver a reservas
          </Link>
        </div>
      </div>
    )
  }

  // Payment status helpers
  const isPaid = booking.payment.pending_amount === 0
  const paymentPercentage =
    booking.payment.total_amount > 0
      ? Math.round((booking.payment.paid_amount / booking.payment.total_amount) * 100)
      : 0

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409]">
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

      {/* Content */}
      <div className="max-w-[1400px] px-4 md:px-6 py-6">
        {/* Stats Row - Mobile/Tablet */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6 min-[1400px]:hidden">
          {/* Plaza */}
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-[#d0d7de] dark:border-[#30363d] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-[#57606a] dark:text-[#8b949e] font-medium">
                  Plaza
                </p>
                <p className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#f0f6fc] mt-0.5">
                  {booking.spot.level}-{booking.spot.number}
                </p>
              </div>
              <FiMapPin className="w-5 h-5 sm:w-6 sm:h-6 text-[#0969da] dark:text-[#58a6ff]" />
            </div>
          </div>

          {/* Check-in */}
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-[#d0d7de] dark:border-[#30363d] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-[#57606a] dark:text-[#8b949e] font-medium">
                  Check-in
                </p>
                <p className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#f0f6fc] mt-0.5">
                  {formatDate(booking.schedule.expected_checkin, false)}
                </p>
              </div>
              <FiLogIn className="w-5 h-5 sm:w-6 sm:h-6 text-[#1a7f37] dark:text-[#3fb950]" />
            </div>
          </div>

          {/* Check-out */}
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-[#d0d7de] dark:border-[#30363d] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-[#57606a] dark:text-[#8b949e] font-medium">
                  Check-out
                </p>
                <p className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#f0f6fc] mt-0.5">
                  {formatDate(booking.schedule.expected_checkout, false)}
                </p>
              </div>
              <FiLogOut className="w-5 h-5 sm:w-6 sm:h-6 text-[#9a6700] dark:text-[#d29922]" />
            </div>
          </div>

          {/* Dias */}
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-[#d0d7de] dark:border-[#30363d] p-3 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-[#57606a] dark:text-[#8b949e] font-medium">
                  Duracion
                </p>
                <p className="text-sm sm:text-base font-bold text-[#24292f] dark:text-[#f0f6fc] mt-0.5">
                  {booking.schedule.planned_days} {booking.schedule.planned_days === 1 ? 'dia' : 'dias'}
                </p>
              </div>
              <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-[#8250df] dark:text-[#a371f7]" />
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-6">
          {/* Left Column - Main Content */}
          <div className="min-[1400px]:col-span-3 space-y-5">
            {/* Plaza de Parking */}
            <InfoCard
              title="Plaza de Parking"
              icon={<FiMapPin className="w-4 h-4" />}
              variant="highlighted"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#57606a] dark:text-[#8b949e] mb-1">Ubicacion</p>
                  <p className="text-xl font-bold text-[#24292f] dark:text-[#f0f6fc]">
                    {booking.spot.level} - {booking.spot.number}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#57606a] dark:text-[#8b949e] mb-1">Tipo de plaza</p>
                  <p className="text-base font-medium text-[#24292f] dark:text-[#f0f6fc]">
                    {SPOT_TYPES[booking.spot.type] || booking.spot.type}
                  </p>
                </div>
              </div>
            </InfoCard>

            {/* Vehiculo */}
            <InfoCard title="Vehiculo" icon={<FiTruck className="w-4 h-4" />}>
              {booking.vehicle ? (
                <div className="space-y-1">
                  <InfoRow label="Matricula" value={booking.vehicle.plate} mono highlight />
                  <InfoRow label="Propietario" value={booking.vehicle.owner} />
                  {booking.vehicle.model && (
                    <InfoRow label="Modelo" value={booking.vehicle.model} />
                  )}
                </div>
              ) : (
                <p className="text-[#57606a] dark:text-[#8b949e] italic text-sm">
                  Sin vehiculo asignado
                </p>
              )}
            </InfoCard>

            {/* Programacion */}
            <InfoCard title="Programacion" icon={<FiCalendar className="w-4 h-4" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Check-in */}
                <div>
                  <h4 className="text-xs font-semibold text-[#57606a] dark:text-[#8b949e] mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <FiLogIn className="w-3.5 h-3.5" />
                    Check-in
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-[#57606a] dark:text-[#8b949e] uppercase tracking-wide">
                        Esperado
                      </p>
                      <p className="text-sm font-medium text-[#24292f] dark:text-[#f0f6fc]">
                        {formatDate(booking.schedule.expected_checkin)}
                      </p>
                    </div>
                    {booking.schedule.actual_checkin && (
                      <div className="bg-[#dafbe1] dark:bg-[#23883726] border border-[#aceebb] dark:border-[#238636] rounded-md p-2.5">
                        <p className="text-[10px] text-[#1a7f37] dark:text-[#3fb950] font-medium uppercase tracking-wide">
                          Realizado
                        </p>
                        <p className="text-sm font-semibold text-[#1a7f37] dark:text-[#3fb950]">
                          {formatDate(booking.schedule.actual_checkin)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-out */}
                <div>
                  <h4 className="text-xs font-semibold text-[#57606a] dark:text-[#8b949e] mb-3 flex items-center gap-2 uppercase tracking-wide">
                    <FiLogOut className="w-3.5 h-3.5" />
                    Check-out
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-[#57606a] dark:text-[#8b949e] uppercase tracking-wide">
                        Esperado
                      </p>
                      <p className="text-sm font-medium text-[#24292f] dark:text-[#f0f6fc]">
                        {formatDate(booking.schedule.expected_checkout)}
                      </p>
                    </div>
                    {booking.schedule.actual_checkout && (
                      <div className="bg-[#dafbe1] dark:bg-[#23883726] border border-[#aceebb] dark:border-[#238636] rounded-md p-2.5">
                        <p className="text-[10px] text-[#1a7f37] dark:text-[#3fb950] font-medium uppercase tracking-wide">
                          Realizado
                        </p>
                        <p className="text-sm font-semibold text-[#1a7f37] dark:text-[#3fb950]">
                          {formatDate(booking.schedule.actual_checkout)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#d0d7de] dark:border-[#30363d] flex justify-between text-sm">
                <span className="text-[#57606a] dark:text-[#8b949e]">Dias planeados</span>
                <span className="font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  {booking.schedule.planned_days}
                </span>
              </div>
              {booking.schedule.actual_days && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#57606a] dark:text-[#8b949e]">Dias reales</span>
                  <span className="font-bold text-[#1a7f37] dark:text-[#3fb950]">
                    {booking.schedule.actual_days}
                  </span>
                </div>
              )}
            </InfoCard>

            {/* Notas */}
            {booking.notes && (
              <InfoCard title="Notas" icon={<FiFileText className="w-4 h-4" />}>
                <p className="text-sm text-[#57606a] dark:text-[#c9d1d9] whitespace-pre-wrap">
                  {booking.notes}
                </p>
              </InfoCard>
            )}

            {/* Informacion de Reserva - Only on mobile */}
            <div className="min-[1400px]:hidden space-y-5">
              <InfoCard title="Informacion de Reserva" icon={<FiInfo className="w-4 h-4" />}>
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

              {booking.operator && (
                <InfoCard title="Operador" icon={<FiUser className="w-4 h-4" />}>
                  <p className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
                    {booking.operator.username}
                  </p>
                </InfoCard>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-5">
            {/* Payment Card - Featured */}
            <div className="bg-white dark:bg-[#151b23] border border-[#d0d7de] dark:border-[#30363d] rounded-md overflow-hidden">
              {/* Payment Header with colored accent */}
              <div
                className={`px-4 py-3 border-b ${
                  isPaid
                    ? 'bg-[#dafbe1] dark:bg-[#23883726] border-[#aceebb] dark:border-[#238636]'
                    : 'bg-[#fff8c5] dark:bg-[#3d2c00] border-[#d4a72c66] dark:border-[#d29922]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#24292f] dark:text-[#f0f6fc] flex items-center gap-2">
                    <FiDollarSign className="w-4 h-4" />
                    Pago
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isPaid
                        ? 'bg-[#1a7f37] text-white'
                        : 'bg-[#9a6700] text-white'
                    }`}
                  >
                    {isPaid ? 'Pagado' : `${paymentPercentage}%`}
                  </span>
                </div>
              </div>

              <div className="p-4">
                {/* Total */}
                <div className="flex justify-between items-center pb-3 border-b border-[#d0d7de] dark:border-[#30363d]">
                  <span className="text-xs text-[#57606a] dark:text-[#8b949e]">Total</span>
                  <span className="text-xl font-bold text-[#24292f] dark:text-[#f0f6fc]">
                    {booking.payment.total_amount.toFixed(2)} €
                  </span>
                </div>

                {/* Progress bar */}
                <div className="my-3">
                  <div className="h-2 bg-[#d0d7de] dark:bg-[#30363d] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isPaid ? 'bg-[#1a7f37]' : 'bg-[#9a6700]'
                      }`}
                      style={{ width: `${paymentPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#57606a] dark:text-[#8b949e]">Pagado</span>
                    <span className="text-sm font-semibold text-[#1a7f37] dark:text-[#3fb950]">
                      {booking.payment.paid_amount.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#57606a] dark:text-[#8b949e]">Pendiente</span>
                    <span
                      className={`text-sm font-semibold ${
                        booking.payment.pending_amount > 0
                          ? 'text-[#cf222e] dark:text-[#f85149]'
                          : 'text-[#57606a] dark:text-[#8b949e]'
                      }`}
                    >
                      {booking.payment.pending_amount.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Payment details */}
                {booking.payment.method && (
                  <div className="mt-3 pt-3 border-t border-[#d0d7de] dark:border-[#30363d] space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#57606a] dark:text-[#8b949e]">Metodo</span>
                      <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
                        {PAYMENT_METHODS[booking.payment.method] || booking.payment.method}
                      </span>
                    </div>
                    {booking.payment.reference && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#57606a] dark:text-[#8b949e]">Referencia</span>
                        <span className="font-mono text-[#24292f] dark:text-[#f0f6fc]">
                          {booking.payment.reference}
                        </span>
                      </div>
                    )}
                    {booking.payment.date && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#57606a] dark:text-[#8b949e]">Fecha</span>
                        <span className="text-[#24292f] dark:text-[#f0f6fc]">
                          {formatDate(booking.payment.date)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Register Payment Button */}
                {booking.payment.total_amount > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className={`w-full mt-4 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${
                      isPaid
                        ? 'bg-[#f6f8fa] dark:bg-[#21262d] text-[#57606a] dark:text-[#8b949e] border border-[#d0d7de] dark:border-[#30363d] hover:bg-[#f3f4f6] dark:hover:bg-[#30363d]'
                        : 'bg-[#1a7f37] hover:bg-[#116329] text-white'
                    }`}
                  >
                    <FiDollarSign className="w-4 h-4" />
                    {isPaid ? 'Modificar Pago' : 'Registrar Pago'}
                  </button>
                )}
              </div>
            </div>

            {/* Info Reserva - Desktop */}
            <div className="hidden min-[1400px]:block">
              <InfoCard title="Informacion de Reserva" icon={<FiInfo className="w-4 h-4" />}>
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
            </div>

            {/* Operador - Desktop */}
            {booking.operator && (
              <div className="hidden min-[1400px]:block">
                <InfoCard title="Operador" icon={<FiUser className="w-4 h-4" />}>
                  <p className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
                    {booking.operator.username}
                  </p>
                </InfoCard>
              </div>
            )}

            {/* Registro */}
            <InfoCard title="Registro" icon={<FiClock className="w-4 h-4" />}>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] text-[#57606a] dark:text-[#8b949e] uppercase tracking-wide">
                    Creado
                  </p>
                  <p className="text-[#24292f] dark:text-[#f0f6fc]">
                    {formatDate(booking.timestamps.created_at, true, true)}
                  </p>
                  {booking.timestamps.created_by && (
                    <p className="text-[10px] text-[#57606a] dark:text-[#8b949e] mt-0.5">
                      por {booking.timestamps.created_by.username}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-[#57606a] dark:text-[#8b949e] uppercase tracking-wide">
                    Actualizado
                  </p>
                  <p className="text-[#24292f] dark:text-[#f0f6fc]">
                    {formatDate(booking.timestamps.updated_at, true, true)}
                  </p>
                  {booking.timestamps.updated_by && (
                    <p className="text-[10px] text-[#57606a] dark:text-[#8b949e] mt-0.5">
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

      {showPaymentModal && (
        <PaymentModal
          booking={booking}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handlePayment}
        />
      )}
    </div>
  )
}

export default BookingDetailClient
