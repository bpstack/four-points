// app/dashboard/parking/bookings/page.tsx

'use client'

import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { parkingApi } from '@/app/lib/parking'
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
  const [showCalendar, setShowCalendar] = useState(false)

  const basicRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

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
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      {/* HEADER */}
      <div className="max-w-[1600px] space-y-5">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                Reservas de Parking
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                Gestión completa de reservas
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Control de Parking */}
              <Link
                href="/dashboard/parking/status"
                className="inline-flex items-center justify-center w-8 h-8 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                title="Control de Parking"
              >
                <FaParking className="w-4 h-4" />
              </Link>
              {/* Nueva Reserva */}
              <Link
                href="/dashboard/parking/bookings/new"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              >
                <FaPlus className="w-3.5 h-3.5" />
                Nueva Reserva
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, cliente, matrícula, plaza..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Filtros Básicos */}
            <div className="relative" ref={basicRef}>
              <button
                onClick={() => setShowBasicFilters(!showBasicFilters)}
                className={`w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-between gap-2 ${
                  showBasicFilters || quickDateFilter
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-[#151b23] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>Filtros rápidos</span>
                <FaChevronDown className="w-3 h-3" />
              </button>

              {showBasicFilters && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setQuickDateFilter(quickDateFilter === 'yesterday' ? null : 'yesterday')
                      setShowBasicFilters(false)
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors ${
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
                    className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors ${
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
                    className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-[#1c2128] transition-colors ${
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

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
            >
              <option value="all">Todos los estados</option>
              <option value="reserved">Reservado</option>
              <option value="completed">Completado</option>
              <option value="canceled">Cancelado</option>
              <option value="no_show">No Show</option>
            </select>

            {/* Fecha específica */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`w-full px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-between gap-2 ${
                  dateFilter
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-[#151b23] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>{dateFilter ? dateFilter.toLocaleDateString('es-ES') : 'Fecha'}</span>
                <FaCalendarAlt className="w-3 h-3" />
              </button>

              {showCalendar && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <SimpleCalendar
                    selectedDate={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date ?? undefined)
                      setShowCalendar(false)
                    }}
                    onClose={() => setShowCalendar(false)}
                  />
                </div>
              )}
            </div>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1"
              >
                <FaTimes className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="space-y-4">
          {/* Table - Desktop */}
          <div className="hidden md:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Referencia
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
                        No hay reservas para mostrar
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
                            {formatDate(booking.schedule.expected_checkin)}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            {formatTime(booking.schedule.expected_checkin)}
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          <div className="text-xs text-gray-900 dark:text-gray-100">
                            {formatDate(booking.schedule.expected_checkout)}
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
                  No hay reservas para mostrar
                </p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => handleRowClick(booking.booking_code)}
                  className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
                >
                  {/* Header: Código + Estado + Acciones */}
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

                  {/* Cliente */}
                  <div className="mb-2">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {booking.vehicle?.owner || 'Sin propietario'}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {booking.vehicle?.model && `${booking.vehicle.model} · `}
                      {booking.vehicle?.plate || 'Sin matrícula'}
                    </p>
                  </div>

                  {/* Fechas */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Entrada: </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDate(booking.schedule.expected_checkin)}{' '}
                        {formatTime(booking.schedule.expected_checkin)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Salida: </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDate(booking.schedule.expected_checkout)}{' '}
                        {formatTime(booking.schedule.expected_checkout)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
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
