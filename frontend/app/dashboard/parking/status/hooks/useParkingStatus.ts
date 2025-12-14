// app/dashboard/parking/status/hooks/useParkingStatus.ts

'use client'

import { useState, useEffect } from 'react'
import { parkingApi } from '@/app/lib/parking'
import { toast } from 'react-hot-toast'
import type {
  ParkingBooking,
  OverdueBooking,
  AvailabilityData,
  ParkingSpotDisplay,
  ParkingSpot,
} from '@/app/lib/parking/types'

export function useParkingStatus(selectedDate: string) {
  const [spots, setSpots] = useState<ParkingSpotDisplay[]>([])
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null)
  const [bookings, setBookings] = useState<ParkingBooking[]>([])
  const [overdueBookings, setOverdueBookings] = useState<OverdueBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para modales
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean
    booking: ParkingBooking | null
  }>({ isOpen: false, booking: null })

  const [checkinModal, setCheckinModal] = useState<{
    isOpen: boolean
    booking: ParkingBooking | null
  }>({ isOpen: false, booking: null })

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean
    booking: ParkingBooking | null
  }>({ isOpen: false, booking: null })

  const [overdueModal, setOverdueModal] = useState<{
    isOpen: boolean
    booking: OverdueBooking | null
  }>({ isOpen: false, booking: null })

  const [createModal, setCreateModal] = useState<{
    isOpen: boolean
    spot: ParkingSpotDisplay | null
  }>({ isOpen: false, spot: null })

  const [actionLoading, setActionLoading] = useState(false)

  // Cargar datos del parking
  const loadParkingData = async () => {
    setLoading(true)
    setError(null)

    try {
      const dashboardData = await parkingApi.getFullStats(selectedDate)

      if (dashboardData.success && dashboardData.dashboard.availability) {
        setAvailabilityData(dashboardData.dashboard.availability)
      } else {
        throw new Error('Error al cargar disponibilidad')
      }

      const bookingsResponse = await parkingApi.getAllBookings({})
      if (!bookingsResponse.success) {
        throw new Error('Error al cargar reservas')
      }

      const selectedDateObj = new Date(selectedDate)
      const activeDateBookings = bookingsResponse.bookings.filter((b: ParkingBooking) => {
        if (!['reserved', 'checked_in'].includes(b.status)) return false

        const checkin = new Date(b.schedule.expected_checkin)
        const checkout = new Date(b.schedule.expected_checkout)

        const checkinDate = new Date(checkin.getFullYear(), checkin.getMonth(), checkin.getDate())
        const checkoutDate = new Date(
          checkout.getFullYear(),
          checkout.getMonth(),
          checkout.getDate()
        )
        const selected = new Date(
          selectedDateObj.getFullYear(),
          selectedDateObj.getMonth(),
          selectedDateObj.getDate()
        )

        return checkinDate <= selected && selected <= checkoutDate
      })

      setBookings(activeDateBookings)

      const overdueResponse = await parkingApi.getOverdueBookings()
      if (overdueResponse.success) {
        setOverdueBookings(overdueResponse.bookings)
      }

      const allSpotsData = await parkingApi.getAllSpots()

      const spotsWithStatus = allSpotsData.map((spot: ParkingSpot) => {
        const activeBooking = activeDateBookings.find((b: ParkingBooking) => {
          const matchesSpot =
            b.spot.id === spot.id ||
            (b.spot.number === spot.spot_number && b.spot.level === spot.level_code)

          return matchesSpot && ['reserved', 'checked_in'].includes(b.status)
        })

        let status: 'free' | 'reserved' | 'checked_in' = 'free'
        if (activeBooking) {
          status = activeBooking.status === 'checked_in' ? 'checked_in' : 'reserved'
        }

        return {
          id: spot.id,
          level_code: spot.level_code,
          spot_number: spot.spot_number,
          spot_type: spot.spot_type,
          status,
          booking: activeBooking,
        }
      })

      setSpots(spotsWithStatus)
    } catch (error) {
      console.error('Error loading parking data:', error)
      const message = error instanceof Error ? error.message : 'Error al cargar los datos del parking'
      setError(message)
      toast.error('Error al cargar el estado del parking')
    } finally {
      setLoading(false)
    }
  }

  // Check-in
  const handleCheckIn = async (booking: ParkingBooking) => {
    setCheckinModal({ isOpen: true, booking })
  }

  const confirmCheckIn = async () => {
    if (!checkinModal.booking) return

    try {
      setActionLoading(true)
      await parkingApi.checkInBooking(checkinModal.booking.booking_code)
      toast.success('Check-in realizado correctamente')
      setCheckinModal({ isOpen: false, booking: null })
      await loadParkingData()
    } catch (error) {
      console.error('Error during check-in:', error)
      const message = error instanceof Error ? error.message : 'Error al realizar el check-in'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  // Check-out
  const handleCheckOut = async (booking: ParkingBooking) => {
    setCheckoutModal({ isOpen: true, booking })
  }

  const confirmCheckOut = async () => {
    if (!checkoutModal.booking) return

    try {
      setActionLoading(true)
      await parkingApi.checkOutBooking(checkoutModal.booking.booking_code)
      toast.success('Check-out realizado correctamente')
      setCheckoutModal({ isOpen: false, booking: null })
      await loadParkingData()
    } catch (error) {
      console.error('Error during check-out:', error)
      const message = error instanceof Error ? error.message : 'Error al realizar el check-out'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  // Cancelar
  const handleCancelBooking = async (booking: ParkingBooking) => {
    setCancelModal({ isOpen: true, booking })
  }

  const confirmCancelBooking = async () => {
    if (!cancelModal.booking) return

    try {
      setActionLoading(true)
      await parkingApi.cancelBooking(cancelModal.booking.booking_code)
      toast.success('Reserva cancelada correctamente')
      setCancelModal({ isOpen: false, booking: null })
      await loadParkingData()
    } catch (error) {
      console.error('Error cancelling booking:', error)
      const message = error instanceof Error ? error.message : 'Error al cancelar la reserva'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  // Crear reserva
  const handleCreateBooking = (spot: ParkingSpotDisplay) => {
    setCreateModal({ isOpen: true, spot })
  }

  // Gestionar overdue
  const handleOverdueAction = async (action: 'checkout' | 'no-show' | 'cancel' | 'delete') => {
    if (!overdueModal.booking) return

    setActionLoading(true)
    try {
      switch (action) {
        case 'checkout':
          await parkingApi.checkOutBooking(overdueModal.booking.booking_code)
          toast.success('Salida registrada correctamente')
          break
        case 'no-show':
          await parkingApi.markBookingNoShow(overdueModal.booking.booking_code)
          toast.success('Reserva marcada como No-Show')
          break
        case 'cancel':
          await parkingApi.cancelBooking(overdueModal.booking.booking_code)
          toast.success('Reserva cancelada')
          break
        case 'delete':
          await parkingApi.deleteBooking(overdueModal.booking.booking_code)
          toast.success('Reserva eliminada')
          break
      }

      setOverdueModal({ isOpen: false, booking: null })
      await loadParkingData()
    } catch (error) {
      const message = error instanceof Error ? error.message : `Error al ${action}`
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  // Cargar datos cuando cambia la fecha
  useEffect(() => {
    loadParkingData()
  }, [selectedDate])

  return {
    // Data
    spots,
    availabilityData,
    bookings,
    overdueBookings,
    loading,
    error,

    // Modals state
    checkoutModal,
    checkinModal,
    cancelModal,
    overdueModal,
    createModal,
    actionLoading,

    // Setters ✅ AÑADIDOS
    setCheckoutModal,
    setCheckinModal,
    setCancelModal,
    setOverdueModal,
    setCreateModal,

    // Actions
    handleCheckIn,
    confirmCheckIn,
    handleCheckOut,
    confirmCheckOut,
    handleCancelBooking,
    confirmCancelBooking,
    handleCreateBooking,
    handleOverdueAction,
    loadParkingData,
  }
}
