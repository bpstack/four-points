// app/components/parking/BookingsListClient.tsx

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { parkingApi } from '@/app/lib/parking'
import type { ParkingBooking } from '@/app/lib/parking/types'
import { toast } from 'react-hot-toast'
import {
  FiPlus,
  FiSearch,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiX,
  FiArrowLeft,
  FiChevronDown,
} from 'react-icons/fi'
import { FaParking } from 'react-icons/fa'

// Importar componentes y helpers compartidos
import { StatusBadge } from './StatusBadge'
import { ActionDropdown } from './ActionDropdown'
import { formatDateShort, formatTime, formatDateTimeLocal, isSameDay } from './helpers'

// ============================================
// TIPOS E INTERFACES
// ============================================
type StatusFilter = 'all' | 'reserved' | 'checked_in' | 'completed' | 'canceled' | 'no_show'
type DateQuickFilter = 'yesterday' | 'today' | 'tomorrow' | null
// Filtros compuestos para el dashboard (combinan estado + fecha)
type QuickFilter =
  | 'arrivals_pending' // Llegadas en espera: reserved + entrada hoy
  | 'arrivals_inside' // Dentro: checked_in (todos)
  | 'arrivals_total' // Total llegadas: reserved entrada hoy + checked_in
  | 'departures_pending' // Salidas en espera: checked_in + salida hoy
  | 'departures_completed' // Completadas: completed (hoy)
  | 'departures_total' // Total salidas: checked_in salida hoy + completed hoy
  | null

interface BookingsListClientProps {
  initialBookings: ParkingBooking[]
  initialTotal: number
}

// Dropdown personalizado para Vista Rápida
function QuickFilterDropdown({
  value,
  onChange,
}: {
  value: QuickFilter
  onChange: (value: QuickFilter) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const options = [
    { group: 'Llegadas', items: [
      { value: 'arrivals_pending', label: 'En espera (hoy)' },
      { value: 'arrivals_inside', label: 'Dentro' },
      { value: 'arrivals_total', label: 'Total llegadas' },
    ]},
    { group: 'Salidas', items: [
      { value: 'departures_pending', label: 'En espera (hoy)' },
      { value: 'departures_completed', label: 'Completadas (hoy)' },
      { value: 'departures_total', label: 'Total salidas' },
    ]},
  ]

  const getLabel = () => {
    for (const group of options) {
      const found = group.items.find(item => item.value === value)
      if (found) return found.label
    }
    return 'Vista rápida'
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = (val: string | null) => {
    onChange(val as QuickFilter)
    setIsOpen(false)
  }

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        minWidth: position.width,
        zIndex: 9999,
      }}
      className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Opción para limpiar */}
      <button
        onClick={() => handleSelect(null)}
        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
      >
        Vista rápida
      </button>
      <div className="h-px bg-gray-200 dark:bg-[#30363d]" />
      
      {options.map((group, idx) => (
        <div key={group.group}>
          {idx > 0 && <div className="h-px bg-gray-200 dark:bg-[#30363d]" />}
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-[#0d1117]">
            {group.group}
          </div>
          {group.items.map((item) => (
            <button
              key={item.value}
              onClick={() => handleSelect(item.value)}
              className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`w-full px-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent flex items-center justify-between gap-2 ${
          value
            ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-[#151b23] text-gray-700 dark:text-gray-200'
        }`}
      >
        <span className="truncate">{getLabel()}</span>
        <FiChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function BookingsListClient({
  initialBookings = [],
  initialTotal,
}: BookingsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estados
  const [bookings, setBookings] = useState<ParkingBooking[]>(initialBookings)
  const [filteredBookings, setFilteredBookings] = useState<ParkingBooking[]>(initialBookings)
  const [loading, setLoading] = useState(false)

  // Leer filtros desde URL - usar valores directamente de searchParams
  const searchTermFromUrl = searchParams.get('search') || ''
  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all'
  const dateQuickFilter = (searchParams.get('dateFilter') as DateQuickFilter) || null
  const specificDate = searchParams.get('date') || ''
  const quickFilter = (searchParams.get('filter') as QuickFilter) || null

  // Estado local para el input de búsqueda (para evitar lag al escribir)
  const [searchInputValue, setSearchInputValue] = useState(searchTermFromUrl)

  // Sincronizar el input con la URL cuando cambia externamente
  useEffect(() => {
    setSearchInputValue(searchTermFromUrl)
  }, [searchTermFromUrl])

  // Estados de modales
  const [selectedBooking, setSelectedBooking] = useState<ParkingBooking | null>(null)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showCheckOutModal, setShowCheckOutModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  // Datos de modales
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

  // ============================================
  // FUNCIONES DE URL Y FILTROS
  // ============================================
  const updateUrlWithFilters = useCallback(
    (newFilters: {
      search?: string
      status?: StatusFilter
      dateFilter?: DateQuickFilter
      date?: string
      filter?: QuickFilter
    }) => {
      const params = new URLSearchParams()
      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status)
      if (newFilters.dateFilter) params.set('dateFilter', newFilters.dateFilter)
      if (newFilters.date) params.set('date', newFilters.date)
      if (newFilters.filter) params.set('filter', newFilters.filter)

      const queryString = params.toString()
      router.push(queryString ? `?${queryString}` : '/dashboard/parking/bookings', {
        scroll: false,
      })
    },
    [router]
  )

  // Cargar bookings
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await parkingApi.getAllBookings({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date: specificDate || undefined,
      })
      setBookings(response.bookings)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cargar reservas: ' + message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, specificDate])

  // Aplicar filtros locales
  useEffect(() => {
    let filtered = [...bookings]

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // Si hay un filtro compuesto (quickFilter), aplicarlo primero
    if (quickFilter) {
      switch (quickFilter) {
        case 'arrivals_pending':
          // Llegadas en espera: reserved + entrada hoy
          filtered = filtered.filter((b) => {
            if (b.status !== 'reserved') return false
            const checkinDate = new Date(b.schedule.expected_checkin)
            return checkinDate >= today && checkinDate < tomorrow
          })
          break
        case 'arrivals_inside':
          // Dentro: todos los checked_in
          filtered = filtered.filter((b) => b.status === 'checked_in')
          break
        case 'arrivals_total':
          // Total llegadas: reserved entrada hoy + checked_in
          filtered = filtered.filter((b) => {
            if (b.status === 'checked_in') return true
            if (b.status === 'reserved') {
              const checkinDate = new Date(b.schedule.expected_checkin)
              return checkinDate >= today && checkinDate < tomorrow
            }
            return false
          })
          break
        case 'departures_pending':
          // Salidas en espera: checked_in + salida hoy
          filtered = filtered.filter((b) => {
            if (b.status !== 'checked_in') return false
            const checkoutDate = new Date(b.schedule.expected_checkout)
            return checkoutDate >= today && checkoutDate < tomorrow
          })
          break
        case 'departures_completed':
          // Completadas hoy
          filtered = filtered.filter((b) => {
            if (b.status !== 'completed') return false
            // Si tiene checkout real, usar esa fecha
            if (b.schedule.actual_checkout) {
              const actualCheckout = new Date(b.schedule.actual_checkout)
              return actualCheckout >= today && actualCheckout < tomorrow
            }
            return false
          })
          break
        case 'departures_total':
          // Total salidas: checked_in salida hoy + completed hoy
          filtered = filtered.filter((b) => {
            if (b.status === 'checked_in') {
              const checkoutDate = new Date(b.schedule.expected_checkout)
              return checkoutDate >= today && checkoutDate < tomorrow
            }
            if (b.status === 'completed') {
              if (b.schedule.actual_checkout) {
                const actualCheckout = new Date(b.schedule.actual_checkout)
                return actualCheckout >= today && actualCheckout < tomorrow
              }
            }
            return false
          })
          break
      }
    } else {
      // Filtros normales si no hay quickFilter

      // Filtro de estado
      if (statusFilter !== 'all') {
        filtered = filtered.filter((b) => b.status === statusFilter)
      }

      // Filtro rápido de fecha
      if (dateQuickFilter) {
        const targetDate = new Date(today)
        if (dateQuickFilter === 'yesterday') targetDate.setDate(today.getDate() - 1)
        if (dateQuickFilter === 'tomorrow') targetDate.setDate(today.getDate() + 1)

        filtered = filtered.filter((b) => {
          const checkinDate = new Date(b.schedule.expected_checkin)
          const checkoutDate = new Date(b.schedule.expected_checkout)
          return isSameDay(checkinDate, targetDate) || isSameDay(checkoutDate, targetDate)
        })
      }
    }

    // Filtro de búsqueda (siempre se aplica)
    if (searchTermFromUrl) {
      const term = searchTermFromUrl.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.booking_code.toLowerCase().includes(term) ||
          b.vehicle?.owner.toLowerCase().includes(term) ||
          b.vehicle?.plate.toLowerCase().includes(term) ||
          `${b.spot.level}-${b.spot.number}`.toLowerCase().includes(term)
      )
    }

    setFilteredBookings(filtered)
  }, [bookings, searchTermFromUrl, statusFilter, dateQuickFilter, quickFilter])

  // ============================================
  // HANDLERS DE FILTROS
  // ============================================
  const handleSearchChange = (value: string) => {
    setSearchInputValue(value)
    updateUrlWithFilters({
      search: value,
      status: statusFilter,
      dateFilter: dateQuickFilter,
      date: specificDate,
      filter: quickFilter,
    })
  }

  const handleStatusChange = (value: StatusFilter) => {
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: value,
      dateFilter: dateQuickFilter,
      date: specificDate,
      filter: null, // Limpiar quickFilter al cambiar status
    })
    loadBookings()
  }

  const handleDateQuickFilterChange = (value: DateQuickFilter) => {
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: statusFilter,
      dateFilter: value,
      date: '',
      filter: null, // Limpiar quickFilter al cambiar fecha
    })
  }

  const handleQuickFilterChange = (value: QuickFilter) => {
    // Limpiar otros filtros cuando se usa un filtro compuesto
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: 'all',
      dateFilter: null,
      date: '',
      filter: value,
    })
  }

  const handleClearFilters = () => {
    setSearchInputValue('')
    router.push('/dashboard/parking/bookings', { scroll: false })
    loadBookings()
  }

  const hasActiveFilters = searchTermFromUrl || statusFilter !== 'all' || dateQuickFilter || specificDate || quickFilter

  // ============================================
  // HANDLERS DE ACCIONES
  // ============================================
  const handleAction = (action: string, booking: ParkingBooking) => {
    setSelectedBooking(booking)

    switch (action) {
      case 'checkin':
        setCheckInData({ actual_checkin: formatDateTimeLocal(new Date()), notes: '' })
        setShowCheckInModal(true)
        break
      case 'checkout':
        setCheckOutData({
          actual_checkout: formatDateTimeLocal(new Date()),
          payment_amount: booking.payment.pending_amount.toString(),
          payment_method: 'cash',
          payment_reference: '',
          notes: '',
        })
        setShowCheckOutModal(true)
        break
      case 'edit':
        setUpdateData({
          expected_checkin: formatDateTimeLocal(new Date(booking.schedule.expected_checkin)),
          expected_checkout: formatDateTimeLocal(new Date(booking.schedule.expected_checkout)),
          total_amount: booking.payment.total_amount.toString(),
          notes: booking.notes || '',
        })
        setShowUpdateModal(true)
        break
      case 'cancel':
        if (confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
          handleCancel(booking)
        }
        break
      case 'noshow':
        if (confirm('¿Marcar esta reserva como No presentado?')) {
          handleNoShow(booking)
        }
        break
    }
  }

  const handleCheckIn = async () => {
    if (!selectedBooking) return
    try {
      await parkingApi.checkInBooking(selectedBooking.booking_code, checkInData)
      toast.success('Check-in realizado correctamente')
      setShowCheckInModal(false)
      setCheckInData({ actual_checkin: '', notes: '' })
      loadBookings()
    } catch (error) {
      toast.error(
        'Error al realizar check-in: ' + (error instanceof Error ? error.message : 'Error')
      )
    }
  }

  const handleCheckOut = async () => {
    if (!selectedBooking) return
    try {
      await parkingApi.checkOutBooking(selectedBooking.booking_code, {
        ...checkOutData,
        payment_amount: parseFloat(checkOutData.payment_amount),
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
      loadBookings()
    } catch (error) {
      toast.error(
        'Error al realizar check-out: ' + (error instanceof Error ? error.message : 'Error')
      )
    }
  }

  const handleUpdate = async () => {
    if (!selectedBooking) return
    try {
      await parkingApi.updateBooking(selectedBooking.booking_code, {
        expected_checkin: updateData.expected_checkin,
        expected_checkout: updateData.expected_checkout,
        total_amount: parseFloat(updateData.total_amount),
        notes: updateData.notes,
      })
      toast.success('Reserva actualizada correctamente')
      setShowUpdateModal(false)
      setUpdateData({ expected_checkin: '', expected_checkout: '', total_amount: '', notes: '' })
      loadBookings()
    } catch (error) {
      toast.error(
        'Error al actualizar reserva: ' + (error instanceof Error ? error.message : 'Error')
      )
    }
  }

  const handleCancel = async (booking: ParkingBooking) => {
    try {
      await parkingApi.cancelBooking(booking.booking_code)
      toast.success('Reserva cancelada')
      loadBookings()
    } catch (error) {
      toast.error('Error al cancelar: ' + (error instanceof Error ? error.message : 'Error'))
    }
  }

  const handleNoShow = async (booking: ParkingBooking) => {
    try {
      await parkingApi.markBookingNoShow(booking.booking_code)
      toast.success('Marcada como No presentado')
      loadBookings()
    } catch (error) {
      toast.error('Error: ' + (error instanceof Error ? error.message : 'Error'))
    }
  }

  const handleRowClick = (bookingCode: string) => {
    router.push(`/dashboard/parking/bookings/${bookingCode}`)
  }

  // ============================================
  // ESTADÍSTICAS
  // ============================================
  const totalBookings = filteredBookings.length
  const reservedCount = filteredBookings.filter((b) => b.status === 'reserved').length
  const occupiedCount = filteredBookings.filter((b) => b.status === 'checked_in').length
  const completedCount = filteredBookings.filter((b) => b.status === 'completed').length

  // ============================================
  // LOADING
  // ============================================
  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#010409] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando reservas...</p>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
        <div className="max-w-[1400px] space-y-5">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/parking"
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  title="Volver al Dashboard"
                >
                  <FiArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Reservas de Parking
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Gestión completa de reservas de estacionamiento
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/parking/status"
                  className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  title="Control de Parking"
                >
                  <FaParking className="w-4 h-4" />
                </Link>
                <Link
                  href="/dashboard/parking/bookings/new"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                  Nueva Reserva
                </Link>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-5">
            {/* Left Column - Main Content */}
            <div className="min-[1400px]:col-span-3 space-y-4">
              {/* Stats - Mobile/Tablet (hidden on >= 1400px) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-[1400px]:hidden">
                <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Total Reservas
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {totalBookings}
                      </p>
                    </div>
                    <FaParking className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Reservados
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {reservedCount}
                      </p>
                    </div>
                    <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 dark:text-yellow-400" />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Ocupados
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {occupiedCount}
                      </p>
                    </div>
                    <FiCalendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 dark:text-purple-400" />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Completados
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {completedCount}
                      </p>
                    </div>
                    <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder="Buscar por código, cliente, matrícula, plaza..."
                      value={searchInputValue}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {/* Vista rápida (filtros compuestos del dashboard) */}
                  <QuickFilterDropdown value={quickFilter} onChange={handleQuickFilterChange} />

                  {/* Filtro de fecha rápida */}
                  <select
                    value={dateQuickFilter || ''}
                    onChange={(e) =>
                      handleDateQuickFilterChange((e.target.value as DateQuickFilter) || null)
                    }
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
                  >
                    <option value="">Fecha</option>
                    <option value="yesterday">Ayer</option>
                    <option value="today">Hoy</option>
                    <option value="tomorrow">Mañana</option>
                  </select>

                  {/* Filtro de estado */}
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="reserved">Reservado</option>
                    <option value="checked_in">Ocupado</option>
                    <option value="completed">Completado</option>
                    <option value="canceled">Cancelado</option>
                    <option value="no_show">No presentado</option>
                  </select>

                  {/* Placeholder para mantener el grid */}
                  <div className="hidden sm:block"></div>

                  {/* Limpiar filtros */}
                  {hasActiveFilters && (
                    <button
                      onClick={handleClearFilters}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <FiX className="w-3 h-3" />
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Table - Desktop */}
              <div className="hidden md:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Entrada
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Salida
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Plaza
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                          >
                            {hasActiveFilters
                              ? 'No se encontraron reservas con esos criterios'
                              : 'No hay reservas registradas'}
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((booking) => (
                          <tr
                            key={booking.id}
                            onClick={() => handleRowClick(booking.booking_code)}
                            className="hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-2">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                {booking.booking_code}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div>
                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                  {booking.vehicle?.owner || 'Sin propietario'}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  {booking.vehicle?.plate || 'Sin matrícula'}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs text-gray-900 dark:text-gray-100">
                                {formatDateShort(booking.schedule.expected_checkin)}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatTime(booking.schedule.expected_checkin)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs text-gray-900 dark:text-gray-100">
                                {formatDateShort(booking.schedule.expected_checkout)}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatTime(booking.schedule.expected_checkout)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={booking.status} />
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                {booking.spot.level}-{booking.spot.number}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <ActionDropdown booking={booking} onAction={handleAction} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards - Mobile */}
              <div className="md:hidden space-y-2">
                {filteredBookings.length === 0 ? (
                  <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-6 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {hasActiveFilters
                        ? 'No se encontraron reservas con esos criterios'
                        : 'No hay reservas registradas'}
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <div
                      key={booking.id}
                      onClick={() => handleRowClick(booking.booking_code)}
                      className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {booking.booking_code}
                            </span>
                            <StatusBadge status={booking.status} />
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            Plaza {booking.spot.level}-{booking.spot.number}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ActionDropdown booking={booking} onAction={handleAction} />
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {booking.vehicle?.owner || 'Sin propietario'}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {booking.vehicle?.model && `${booking.vehicle.model} · `}
                          {booking.vehicle?.plate || 'Sin matrícula'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Entrada: </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatDateShort(booking.schedule.expected_checkin)}{' '}
                            {formatTime(booking.schedule.expected_checkin)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Salida: </span>
                          <span className="text-gray-900 dark:text-gray-100">
                            {formatDateShort(booking.schedule.expected_checkout)}{' '}
                            {formatTime(booking.schedule.expected_checkout)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* End Main Content */}

            {/* Right Column - Stats Sidebar (visible on >= 1400px) */}
            <div className="hidden min-[1400px]:block space-y-4">
              <div className="sticky top-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Resumen
                </h3>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Total Reservas
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {totalBookings}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <FaParking className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Reservados
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {reservedCount}
                      </p>
                    </div>
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <FiClock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Ocupados
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {occupiedCount}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <FiCalendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Completados
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {completedCount}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CHECK-IN */}
      {showCheckInModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Check-in - {selectedBooking.booking_code}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Plaza {selectedBooking.spot.level}-{selectedBooking.spot.number}
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
                  rows={2}
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
      {showCheckOutModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Check-out - {selectedBooking.booking_code}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Plaza {selectedBooking.spot.level}-{selectedBooking.spot.number}
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
      {showUpdateModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Modificar Reserva - {selectedBooking.booking_code}
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
    </>
  )
}
