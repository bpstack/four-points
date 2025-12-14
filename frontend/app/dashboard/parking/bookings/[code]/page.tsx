//app/dashboard/parking/bookings/code/page.tsx
//app/dashboard/parking/bookings/code/PK-20251023-0018
// app/dashboard/parking/bookings/[code]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { parkingApi } from '@/app/api/parking/routes'
import { ParkingBooking } from '@/app/lib/parking/types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import {
  FaArrowLeft,
  FaCar,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaClock,
  FaUser,
  FaMoneyBillWave,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaEdit,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaTrash,
  FaSync,
} from 'react-icons/fa'

const formatDate = (date: string | Date, includeTime = true, includeSeconds = false) => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')

  if (includeTime) {
    if (includeSeconds) {
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    }
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }
  return `${day}/${month}/${year}`
}

const formatDateTimeLocal = (date: Date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  const [booking, setBooking] = useState<ParkingBooking | null>(null)
  const [loading, setLoading] = useState(true)

  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  const [checkInData, setCheckInData] = useState({ actual_checkin: '', notes: '' })
  const [checkOutData, setCheckOutData] = useState({
    actual_checkout: '',
    payment_amount: '',
    payment_method: 'cash',
    payment_reference: '',
    notes: '',
  })
  const [updateData, setUpdateData] = useState({
    expected_checkin: '',
    expected_checkout: '',
    total_amount: '',
    notes: '',
  })

  const loadBooking = async () => {
    try {
      setLoading(true)
      const response = await parkingApi.getBookingByCode(code)
      setBooking(response.booking)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cargar la reserva: ' + message)
      router.push('/dashboard/parking/bookings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (code) {
      loadBooking()
    }
  }, [code])

  const handleCheckIn = async () => {
    if (!booking) return

    try {
      await parkingApi.checkInBooking(booking.booking_code, {
        actual_checkin: checkInData.actual_checkin || undefined,
        notes: checkInData.notes || undefined,
      })

      toast.success('Check-in realizado correctamente')
      setShowCheckInModal(false)
      setCheckInData({ actual_checkin: '', notes: '' })
      loadBooking()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al hacer check-in: ' + message)
    }
  }

  const handleCheckOut = async () => {
    if (!booking) return

    try {
      await parkingApi.checkOutBooking(booking.booking_code, {
        actual_checkout: checkOutData.actual_checkout || undefined,
        payment_amount: checkOutData.payment_amount
          ? parseFloat(checkOutData.payment_amount)
          : undefined,
        payment_method: checkOutData.payment_method || undefined,
        payment_reference: checkOutData.payment_reference || undefined,
        notes: checkOutData.notes || undefined,
      })

      toast.success('Check-out realizado correctamente')
      setShowCheckOutModal(false)
      setCheckOutData({
        actual_checkout: '',
        payment_amount: '',
        payment_method: 'cash',
        payment_reference: '',
        notes: '',
      })
      loadBooking()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al hacer check-out: ' + message)
    }
  }

  const handleCancel = async () => {
    if (!booking) return
    if (!confirm('¿Seguro que quieres cancelar esta reserva?')) return

    try {
      await parkingApi.cancelBooking(booking.booking_code)
      toast.success('Reserva cancelada')
      loadBooking()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cancelar: ' + message)
    }
  }

  const handleNoShow = async () => {
    if (!booking) return
    if (!confirm('¿Marcar como no-show?')) return

    try {
      await parkingApi.markBookingNoShow(booking.booking_code)
      toast.success('Marcado como no-show')
      loadBooking()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error: ' + message)
    }
  }

  const handleUpdate = async () => {
    if (!booking) return

    try {
      const dataToUpdate: Partial<{
        expected_checkin: string
        expected_checkout: string
        total_amount: number
        notes: string
      }> = {}
      if (updateData.expected_checkin) dataToUpdate.expected_checkin = updateData.expected_checkin
      if (updateData.expected_checkout)
        dataToUpdate.expected_checkout = updateData.expected_checkout
      if (updateData.total_amount) dataToUpdate.total_amount = parseFloat(updateData.total_amount)
      if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes

      await parkingApi.updateBooking(booking.booking_code, dataToUpdate)

      toast.success('Reserva actualizada')
      setShowUpdateModal(false)
      loadBooking()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al actualizar: ' + message)
    }
  }

  const handleDelete = async () => {
    if (!booking) return
    if (!confirm('¿ELIMINAR permanentemente esta reserva? Esta acción NO se puede deshacer.'))
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

  const openCheckInModal = () => {
    if (!booking) return
    setCheckInData({
      actual_checkin: formatDateTimeLocal(new Date(booking.schedule.expected_checkin)),
      notes: '',
    })
    setShowCheckInModal(true)
  }

  const openCheckOutModal = () => {
    if (!booking) return
    setCheckOutData({
      actual_checkout: formatDateTimeLocal(new Date(booking.schedule.expected_checkout)),
      payment_amount: booking.payment.pending_amount.toString(),
      payment_method: 'cash',
      payment_reference: '',
      notes: '',
    })
    setShowCheckOutModal(true)
  }

  const openUpdateModal = () => {
    if (!booking) return
    setUpdateData({
      expected_checkin: formatDateTimeLocal(new Date(booking.schedule.expected_checkin)),
      expected_checkout: formatDateTimeLocal(new Date(booking.schedule.expected_checkout)),
      total_amount: booking.payment.total_amount.toString(),
      notes: booking.notes || '',
    })
    setShowUpdateModal(true)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      reserved:
        'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800',
      checked_in:
        'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-800',
      completed:
        'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700',
      canceled:
        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-2 border-red-200 dark:border-red-800',
      no_show:
        'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-2 border-orange-200 dark:border-orange-800',
    }
    const labels = {
      reserved: 'Reservado',
      checked_in: 'Check-in Realizado',
      completed: 'Completado',
      canceled: 'Cancelado',
      no_show: 'No-show',
    }
    const icons = {
      reserved: FaClock,
      checked_in: FaCheckCircle,
      completed: FaCheckCircle,
      canceled: FaTimesCircle,
      no_show: FaExclamationTriangle,
    }

    const Icon = icons[status as keyof typeof icons] || FaInfoCircle

    return (
      <span
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${styles[status as keyof typeof styles]}`}
      >
        <Icon className="w-4 h-4" />
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FaSync className="w-12 h-12 text-blue-500 dark:text-blue-400 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Cargando detalles de la reserva...</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/parking/bookings"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <FaArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Reserva {booking.booking_code}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Detalles completos de la reserva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {booking.status === 'reserved' && (
              <>
                <button
                  onClick={openCheckInModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FaSignInAlt className="w-4 h-4" />
                  Check-in
                </button>
                <button
                  onClick={openUpdateModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FaEdit className="w-4 h-4" />
                  Modificar
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FaTimes className="w-4 h-4" />
                  Cancelar
                </button>
                <button
                  onClick={handleNoShow}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FaExclamationTriangle className="w-4 h-4" />
                  No-show
                </button>
              </>
            )}
            {booking.status === 'checked_in' && (
              <>
                <button
                  onClick={openCheckOutModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FaSignOutAlt className="w-4 h-4" />
                  Check-out
                </button>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FaTimes className="w-4 h-4" />
                  Cancelar
                </button>
              </>
            )}
            {(booking.status === 'reserved' || booking.status === 'canceled') && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium"
                title="Eliminar definitivamente"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* STATUS BADGE */}
        <div className="flex items-center justify-center">{getStatusBadge(booking.status)}</div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA */}
          <div className="lg:col-span-2 space-y-6">
            {/* INFORMACIÓN DE LA PLAZA */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Plaza de Parking
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Número de Plaza</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {booking.spot.level}-{booking.spot.number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tipo</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {booking.spot.type}
                  </p>
                </div>
              </div>
            </div>

            {/* INFORMACIÓN DEL VEHÍCULO */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FaCar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Información del Vehículo
              </h2>
              {booking.vehicle ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Matrícula</span>
                    <span className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
                      {booking.vehicle.plate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Propietario</span>
                    <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {booking.vehicle.owner}
                    </span>
                  </div>
                  {booking.vehicle.model && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Modelo</span>
                      <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {booking.vehicle.model}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No hay información del vehículo
                </p>
              )}
            </div>

            {/* PROGRAMACIÓN */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FaCalendarAlt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Programación
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Check-in
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Esperado</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(booking.schedule.expected_checkin)}
                      </p>
                    </div>
                    {booking.schedule.actual_checkin && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                          Realizado
                        </p>
                        <p className="text-base font-semibold text-green-900 dark:text-green-300">
                          {formatDate(booking.schedule.actual_checkin)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Check-out
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Esperado</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(booking.schedule.expected_checkout)}
                      </p>
                    </div>
                    {booking.schedule.actual_checkout && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                          Realizado
                        </p>
                        <p className="text-base font-semibold text-green-900 dark:text-green-300">
                          {formatDate(booking.schedule.actual_checkout)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Días planeados</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {booking.schedule.planned_days}
                  </span>
                </div>
                {booking.schedule.actual_days && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Días reales</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {booking.schedule.actual_days}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* NOTAS */}
            {booking.notes && (
              <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <FaInfoCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Notas
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {booking.notes}
                </p>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            {/* PAGO */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FaMoneyBillWave className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Información de Pago
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {booking.payment.total_amount.toFixed(2)}€
                  </span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pagado</span>
                  <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {booking.payment.paid_amount.toFixed(2)}€
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pendiente</span>
                  <span
                    className={`text-lg font-semibold ${
                      booking.payment.pending_amount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {booking.payment.pending_amount.toFixed(2)}€
                  </span>
                </div>
                {booking.payment.method && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Método</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {booking.payment.method}
                      </span>
                    </div>
                    {booking.payment.reference && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Referencia</span>
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {booking.payment.reference}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* INFORMACIÓN DE RESERVA */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FaInfoCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Información Adicional
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Origen</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {booking.booking_info.source}
                  </p>
                </div>
                {booking.booking_info.external_id && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Externo</p>
                    <p className="text-sm font-mono font-medium text-gray-700 dark:text-gray-300">
                      {booking.booking_info.external_id}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* OPERADOR */}
            {booking.operator && (
              <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <FaUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Operador
                </h2>
                <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {booking.operator.username}
                </p>
              </div>
            )}

            {/* TIMESTAMPS */}
            <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FaClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Registro
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Creado</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(booking.timestamps.created_at, true, true)}
                  </p>
                  {booking.timestamps.created_by && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      por {booking.timestamps.created_by.username}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Actualizado</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(booking.timestamps.updated_at, true, true)}
                  </p>
                  {booking.timestamps.updated_by && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      por {booking.timestamps.updated_by.username}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALES (MISMOS QUE EN LA PÁGINA PRINCIPAL) */}
      {/* MODAL CHECK-IN */}
      {showCheckInModal && booking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Check-in - {booking.booking_code}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Plaza {booking.spot.level}-{booking.spot.number}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha y hora de entrada
                </label>
                <input
                  type="datetime-local"
                  value={checkInData.actual_checkin}
                  onChange={(e) =>
                    setCheckInData({ ...checkInData, actual_checkin: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={checkInData.notes}
                  onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  placeholder="Observaciones del check-in..."
                />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCheckInModal(false)
                  setCheckInData({ actual_checkin: '', notes: '' })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckIn}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 rounded-md transition-colors"
              >
                Confirmar Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {showCheckOutModal && booking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Check-out - {booking.booking_code}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Plaza {booking.spot.level}-{booking.spot.number}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha y hora de salida
                </label>
                <input
                  type="datetime-local"
                  value={checkOutData.actual_checkout}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, actual_checkout: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Importe a cobrar (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={checkOutData.payment_amount}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, payment_amount: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Método de pago
                </label>
                <select
                  value={checkOutData.payment_method}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, payment_method: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Referencia (opcional)
                </label>
                <input
                  type="text"
                  value={checkOutData.payment_reference}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, payment_reference: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  placeholder="Número de operación..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={checkOutData.notes}
                  onChange={(e) => setCheckOutData({ ...checkOutData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  placeholder="Observaciones del check-out..."
                />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCheckOutModal(false)
                  setCheckOutData({
                    actual_checkout: '',
                    payment_amount: '',
                    payment_method: 'cash',
                    payment_reference: '',
                    notes: '',
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckOut}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md transition-colors"
              >
                Confirmar Check-out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR */}
      {showUpdateModal && booking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Modificar Reserva - {booking.booking_code}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-in esperado
                </label>
                <input
                  type="datetime-local"
                  value={updateData.expected_checkin}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, expected_checkin: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Check-out esperado
                </label>
                <input
                  type="datetime-local"
                  value={updateData.expected_checkout}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, expected_checkout: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Importe total (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updateData.total_amount}
                  onChange={(e) => setUpdateData({ ...updateData, total_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas
                </label>
                <textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUpdateModal(false)
                  setUpdateData({
                    expected_checkin: '',
                    expected_checkout: '',
                    total_amount: '',
                    notes: '',
                  })
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-md transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
