// app/dashboard/parking/bookings/page.tsx

'use client'

import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { parkingApi } from '@/app/api/parking/routes'
import { ParkingBooking } from '@/app/lib/parking/types'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaEdit,
  FaExclamationTriangle,
  FaEllipsisV,
  FaPlus,
  FaSearch,
  FaChevronDown,
  FaCalendarAlt,
  FaParking,
} from 'react-icons/fa'

import SimpleCalendar from '@/app/ui/calendar/simplecalendar'

const formatDate = (date: string | Date) => {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const formatTime = (date: string | Date) => {
  const d = new Date(date)
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
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

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

interface ActionItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  divider?: boolean
}

// Componente ActionDropdown
function ActionDropdown({
  booking,
  onAction,
}: {
  booking: ParkingBooking
  onAction: (action: string, booking: ParkingBooking) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const actions: { [key: string]: ActionItem[] } = {
    reserved: [
      {
        id: 'checkin',
        label: 'Realizar Check-in',
        icon: FaSignInAlt,
        color: 'text-green-600 dark:text-green-500',
      },
      {
        id: 'edit',
        label: 'Modificar reserva',
        icon: FaEdit,
        color: 'text-blue-600 dark:text-blue-500',
      },
      {
        id: 'cancel',
        label: 'Cancelar reserva',
        icon: FaTimes,
        color: 'text-red-600 dark:text-red-500',
        divider: true,
      },
      {
        id: 'noshow',
        label: 'Marcar como No-show',
        icon: FaExclamationTriangle,
        color: 'text-orange-600 dark:text-orange-500',
      },
    ],
    checked_in: [
      {
        id: 'checkout',
        label: 'Realizar Check-out',
        icon: FaSignOutAlt,
        color: 'text-blue-600 dark:text-blue-500',
      },
      {
        id: 'cancel',
        label: 'Cancelar reserva',
        icon: FaTimes,
        color: 'text-red-600 dark:text-red-500',
      },
    ],
  }

  const availableActions = actions[booking.status] || []

  if (availableActions.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-600">-</span>
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        title="Acciones"
      >
        <FaEllipsisV className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-2xl z-50 overflow-hidden">
          {availableActions.map((action, index) => {
            const Icon = action.icon
            return (
              <div key={action.id}>
                {action.divider && index > 0 && (
                  <div className="h-px bg-gray-200 dark:bg-[#30363d] my-1" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(false)
                    onAction(action.id, booking)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors group"
                >
                  <Icon className={`w-4 h-4 ${action.color}`} />
                  <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    {action.label}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Componente StatusBadge
function StatusBadge({ status }: { status: string }) {
  const statusConfig: {
    [key: string]: { label: string; bg: string; text: string; border: string }
  } = {
    reserved: {
      label: 'Reservado',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
    checked_in: {
      label: 'Check-in',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
    },
    completed: {
      label: 'Completado',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    canceled: {
      label: 'Cancelado',
      bg: 'bg-gray-100 dark:bg-gray-800/50',
      text: 'text-gray-700 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-700',
    },
    no_show: {
      label: 'No-show',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
    },
  }

  const config = statusConfig[status] || statusConfig.reserved

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  )
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<ParkingBooking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<ParkingBooking[]>([])
  const [loading, setLoading] = useState(true)

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [quickDateFilter, setQuickDateFilter] = useState<'yesterday' | 'today' | 'tomorrow' | null>(
    null
  )
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'reserved' | 'completed' | 'canceled' | 'no_show'
  >('all')
  const [dateFilter, setDateFilter] = useState<Date | undefined>()

  // Estados de UI
  const [showBasicFilters, setShowBasicFilters] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  const basicRef = useRef<HTMLDivElement>(null)
  const advancedRef = useRef<HTMLDivElement>(null)

  // Estados de modales
  const [selectedBooking, setSelectedBooking] = useState<ParkingBooking | null>(null)
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

  // Click outside para cerrar dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (basicRef.current && !basicRef.current.contains(event.target as Node)) {
        setShowBasicFilters(false)
      }
      if (advancedRef.current && !advancedRef.current.contains(event.target as Node)) {
        setShowAdvancedFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const response = await parkingApi.getAllBookings()
      setBookings(response.bookings)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cargar reservas: ' + message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...bookings]

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.booking_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.vehicle?.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${b.spot.level}-${b.spot.number}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter)
    }

    // Filtro rápido de fecha (ayer, hoy, mañana)
    if (quickDateFilter) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      filtered = filtered.filter((b) => {
        const checkinDate = new Date(b.schedule.expected_checkin)
        checkinDate.setHours(0, 0, 0, 0)
        const checkoutDate = new Date(b.schedule.expected_checkout)
        checkoutDate.setHours(0, 0, 0, 0)

        if (quickDateFilter === 'today') {
          return isSameDay(checkinDate, today) || isSameDay(checkoutDate, today)
        }
        if (quickDateFilter === 'yesterday') {
          return isSameDay(checkinDate, yesterday) || isSameDay(checkoutDate, yesterday)
        }
        if (quickDateFilter === 'tomorrow') {
          return isSameDay(checkinDate, tomorrow) || isSameDay(checkoutDate, tomorrow)
        }
        return true
      })
    }

    // Filtro de fecha específica (calendario)
    if (dateFilter) {
      filtered = filtered.filter((b) => {
        const checkinDate = new Date(b.schedule.expected_checkin)
        const checkoutDate = new Date(b.schedule.expected_checkout)

        return isSameDay(checkinDate, dateFilter) || isSameDay(checkoutDate, dateFilter)
      })
    }

    setFilteredBookings(filtered)
  }, [bookings, searchTerm, statusFilter, quickDateFilter, dateFilter])

  const resetFilters = () => {
    setSearchTerm('')
    setQuickDateFilter(null)
    setStatusFilter('all')
    setDateFilter(undefined)
  }

  const hasActiveFilters =
    searchTerm !== '' ||
    quickDateFilter !== null ||
    statusFilter !== 'all' ||
    dateFilter !== undefined

  const handleAction = (action: string, booking: ParkingBooking) => {
    setSelectedBooking(booking)

    switch (action) {
      case 'checkin':
        setCheckInData({
          actual_checkin: formatDateTimeLocal(new Date()),
          notes: '',
        })
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
        if (confirm('¿Marcar esta reserva como No-show?')) {
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
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al realizar check-in: ' + message)
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
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al realizar check-out: ' + message)
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
      setUpdateData({
        expected_checkin: '',
        expected_checkout: '',
        total_amount: '',
        notes: '',
      })
      loadBookings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al actualizar reserva: ' + message)
    }
  }

  const handleCancel = async (booking: ParkingBooking) => {
    try {
      await parkingApi.cancelBooking(booking.booking_code)
      toast.success('Reserva cancelada')
      loadBookings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al cancelar: ' + message)
    }
  }

  const handleNoShow = async (booking: ParkingBooking) => {
    try {
      await parkingApi.markBookingNoShow(booking.booking_code)
      toast.success('Marcada como No-show')
      loadBookings()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error: ' + message)
    }
  }

  const handleRowClick = (bookingCode: string) => {
    router.push(`/dashboard/parking/bookings/${bookingCode}`)
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#010409]">
        <div className="text-gray-600 dark:text-gray-400">Cargando reservas...</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#010409]">
      {/* HEADER */}
      <div className="w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#010409]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Título + Botones */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Reservas de Parking
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestión completa de reservas
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Control de Parking - Icono discreto con tooltip */}
              <div className="relative group">
                <Link
                  href="/dashboard/parking/status"
                  className="inline-flex items-center justify-center w-9 h-9 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                  title="Control de Parking"
                >
                  <FaParking className="w-5 h-5" />
                </Link>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg">
                  Control de Parking
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              </div>
              {/* Nueva Reserva */}
              <Link
                href="/dashboard/parking/bookings/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <FaPlus className="w-4 h-4" />
                Nueva Reserva
              </Link>
            </div>
          </div>

          {/* Buscador + Filtros - Misma línea en desktop */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Buscador compacto */}
            <div className="w-full lg:w-auto lg:flex-1 lg:max-w-md">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código, cliente, matrícula, plaza..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-500 text-sm"
                />
              </div>
            </div>

            {/* Filtros - Responsive: vertical en mobile, horizontal en desktop */}
            <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2">
              {/* Filtros Básicos */}
              <div className="relative" ref={basicRef}>
                <button
                  onClick={() => setShowBasicFilters(!showBasicFilters)}
                  className={`w-full md:w-auto px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-between md:justify-center gap-2 ${
                    showBasicFilters || quickDateFilter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Filtros rápidos
                  <FaChevronDown className="w-3 h-3" />
                </button>

                {showBasicFilters && (
                  <div className="absolute top-full left-0 mt-1 w-full md:w-44 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        setQuickDateFilter(quickDateFilter === 'yesterday' ? null : 'yesterday')
                        setShowBasicFilters(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors ${
                        quickDateFilter === 'yesterday'
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Ayer
                    </button>
                    <button
                      onClick={() => {
                        setQuickDateFilter(quickDateFilter === 'today' ? null : 'today')
                        setShowBasicFilters(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors ${
                        quickDateFilter === 'today'
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      onClick={() => {
                        setQuickDateFilter(quickDateFilter === 'tomorrow' ? null : 'tomorrow')
                        setShowBasicFilters(false)
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors ${
                        quickDateFilter === 'tomorrow'
                          ? 'text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Mañana
                    </button>
                  </div>
                )}
              </div>

              {/* Filtros Avanzados */}
              <div className="relative" ref={advancedRef}>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`w-full md:w-auto px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-between md:justify-center gap-2 ${
                    showAdvancedFilters || statusFilter !== 'all' || dateFilter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Filtros avanzados
                  <FaChevronDown className="w-3 h-3" />
                </button>

                {showAdvancedFilters && (
                  <div className="absolute top-full left-0 mt-1 w-full md:w-64 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-xl z-50 p-4 space-y-4">
                    {/* Estado */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Estado
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                      >
                        <option value="all">Todas las reservas</option>
                        <option value="reserved">Reservado</option>
                        <option value="completed">Completado</option>
                        <option value="canceled">Cancelado</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>

                    {/* Calendario */}
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Fecha específica
                      </label>
                      <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-md hover:border-gray-400 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 text-left flex items-center justify-between"
                      >
                        <span className={dateFilter ? '' : 'text-gray-500 dark:text-gray-500'}>
                          {dateFilter
                            ? dateFilter.toLocaleDateString('es-ES')
                            : 'Seleccionar fecha'}
                        </span>
                        <FaCalendarAlt className="w-3.5 h-3.5 text-gray-400" />
                      </button>

                      {showCalendar && (
                        <div className="absolute top-full left-0 mt-1 z-50">
                          <SimpleCalendar
                            selectedDate={dateFilter}
                            onSelect={(date) => {
                              setDateFilter(date ?? undefined)
                              setShowCalendar(false) // ✅ Cierra automáticamente
                            }}
                            onClose={() => setShowCalendar(false)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botón reset */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="w-full md:w-auto px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center gap-2"
                >
                  <FaTimes className="w-3 h-3" />
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-[#010409] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#161b22] border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Referencia
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Entrada
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Salida
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Creación
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Plaza
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No hay reservas para mostrar
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      onClick={() => handleRowClick(booking.booking_code)}
                      className="hover:bg-gray-50 dark:hover:bg-[#161b22] transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                          {booking.booking_code}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {booking.vehicle?.owner || 'Sin propietario'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {booking.vehicle?.model && `${booking.vehicle.model} · `}
                            {booking.vehicle?.plate || 'Sin matrícula'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(booking.schedule.expected_checkin)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(booking.schedule.expected_checkin)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(booking.schedule.expected_checkout)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(booking.schedule.expected_checkout)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <StatusBadge status={booking.status} />
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(booking.timestamps.created_at)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(booking.timestamps.created_at)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {booking.spot.level}-{booking.spot.number}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <ActionDropdown booking={booking} onAction={handleAction} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
    </div>
  )
}
