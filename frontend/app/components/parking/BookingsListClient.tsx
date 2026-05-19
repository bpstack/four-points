// app/components/parking/BookingsListClient.tsx

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { parkingApi } from '@/app/lib/parking'
import type { ParkingBooking, PaginationInfo } from '@/app/lib/parking/types'
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
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import { FaParking } from 'react-icons/fa'

// Importar componentes y helpers compartidos
import { StatusBadge } from './StatusBadge'
import { ActionDropdown } from './ActionDropdown'
import { Card, Button } from '@/app/ui/components'
import { formatDateShort, formatTime, formatDateTimeLocal } from './helpers'
import DatePickerInput from '@/app/ui/calendar/DatePickerInput'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

// ============================================
// TIPOS E INTERFACES
// ============================================
type StatusFilter = 'all' | 'reserved' | 'checked_in' | 'completed' | 'canceled' | 'no_show'
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
  initialPagination: PaginationInfo
}

// Dropdown personalizado para Vista Rápida
function QuickFilterDropdown({
  value,
  onChange,
  t,
}: {
  value: QuickFilter
  onChange: (value: QuickFilter) => void
  t: ReturnType<typeof useTranslations<'parking'>>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const options = [
    {
      group: t('quickFilters.arrivals'),
      items: [
        { value: 'arrivals_pending', label: t('quickFilters.arrivalsWaiting') },
        { value: 'arrivals_inside', label: t('quickFilters.arrivalsInside') },
        { value: 'arrivals_total', label: t('quickFilters.arrivalsTotal') },
      ],
    },
    {
      group: t('quickFilters.departures'),
      items: [
        { value: 'departures_pending', label: t('quickFilters.departuresWaiting') },
        { value: 'departures_completed', label: t('quickFilters.departuresCompleted') },
        { value: 'departures_total', label: t('quickFilters.departuresTotal') },
      ],
    },
  ]

  const getLabel = () => {
    for (const group of options) {
      const found = group.items.find((item) => item.value === value)
      if (found) return found.label
    }
    return t('filters.quickView')
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
      className="bg-surface border border-border rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Opción para limpiar */}
      <button
        onClick={() => handleSelect(null)}
        className="w-full px-3 py-2 text-left text-xs text-fg hover:bg-surface-hover transition-colors"
      >
        {t('filters.quickView')}
      </button>
      <div className="h-px bg-surface-hover" />

      {options.map((group, idx) => (
        <div key={group.group}>
          {idx > 0 && <div className="h-px bg-surface-hover" />}
          <div className="px-3 py-1.5 text-[10px] font-bold text-fg-subtle uppercase tracking-wide bg-surface">
            {group.group}
          </div>
          {group.items.map((item) => (
            <button
              key={item.value}
              onClick={() => handleSelect(item.value)}
              className="w-full px-3 py-2 text-left text-xs text-fg hover:bg-surface-hover transition-colors"
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
        className={`w-full px-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent flex items-center justify-between gap-2 ${
          value
            ? 'border-blue-400 dark:border-blue-600 bg-info/10 text-blue-700 dark:text-blue-300'
            : 'border-border bg-surface text-gray-700 dark:text-fg'
        }`}
      >
        <span className="truncate">{getLabel()}</span>
        <FiChevronDown
          className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
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
  initialTotal: _initialTotal,
  initialPagination,
}: BookingsListClientProps) {
  const t = useTranslations('parking')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estados
  const [bookings, setBookings] = useState<ParkingBooking[]>(initialBookings)
  const [filteredBookings, setFilteredBookings] = useState<ParkingBooking[]>(initialBookings)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination)

  // Leer filtros desde URL - usar valores directamente de searchParams
  const searchTermFromUrl = searchParams.get('search') || ''
  const statusFilter = (searchParams.get('status') as StatusFilter) || 'all'
  const startDate = searchParams.get('startDate') || ''
  const endDate = searchParams.get('endDate') || ''
  const quickFilter = (searchParams.get('filter') as QuickFilter) || null
  const currentPage = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1

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
      startDate?: string
      endDate?: string
      filter?: QuickFilter
      page?: number
    }) => {
      const params = new URLSearchParams()
      if (newFilters.search) params.set('search', newFilters.search)
      if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status)
      if (newFilters.startDate) params.set('startDate', newFilters.startDate)
      if (newFilters.endDate) params.set('endDate', newFilters.endDate)
      if (newFilters.filter) params.set('filter', newFilters.filter)
      if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page))

      const queryString = params.toString()
      router.push(queryString ? `?${queryString}` : '/dashboard/parking/bookings', {
        scroll: false,
      })
    },
    [router]
  )

  // Cargar bookings con paginación
  // Acepta parámetros opcionales para sobrescribir los valores de URL
  const loadBookings = useCallback(
    async (
      page: number = 1,
      overrides?: {
        startDate?: string
        endDate?: string
        quickFilter?: QuickFilter
        status?: StatusFilter
      }
    ) => {
      try {
        setLoading(true)

        // Usar overrides si se proporcionan, sino usar valores de URL
        const effectiveStartDate = overrides?.startDate ?? startDate
        const effectiveEndDate = overrides?.endDate ?? endDate
        const effectiveQuickFilter =
          overrides?.quickFilter !== undefined ? overrides.quickFilter : quickFilter
        const effectiveStatus = overrides?.status ?? statusFilter

        // Prioridad 1: quickFilter (filtros del dashboard)
        if (effectiveQuickFilter) {
          const response = await parkingApi.getAllBookings({
            quickFilter: effectiveQuickFilter,
            page,
            limit: 50,
          })
          setBookings(response.bookings)
          if (response.pagination) {
            setPagination(response.pagination)
          }
        }
        // Prioridad 2: dateFilter (rango de fechas)
        else if (effectiveStartDate) {
          const response = await parkingApi.getAllBookings({
            startDate: effectiveStartDate,
            endDate: effectiveEndDate || undefined,
            status: effectiveStatus !== 'all' ? effectiveStatus : undefined,
            page,
            limit: 50,
          })
          setBookings(response.bookings)
          if (response.pagination) {
            setPagination(response.pagination)
          }
        }
        // Prioridad 3: filtros estándar
        else {
          const response = await parkingApi.getAllBookings({
            status: effectiveStatus !== 'all' ? effectiveStatus : undefined,
            page,
            limit: 50,
          })
          setBookings(response.bookings)
          if (response.pagination) {
            setPagination(response.pagination)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        toast.error(t('messages.loadError') + (message ? ': ' + message : ''))
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFilter, startDate, endDate, quickFilter]
  )

  // Cuando hay filtros especiales desde URL, cargar datos frescos
  // porque el SSR inicial no incluye estos filtros
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if ((quickFilter || startDate) && !initialLoadDone.current) {
      initialLoadDone.current = true
      loadBookings(1)
    }
  }, [quickFilter, startDate, loadBookings])

  // Aplicar filtros locales (solo búsqueda por texto)
  // Los filtros de fecha, estado y quickFilter ya vienen del backend
  useEffect(() => {
    let filtered = [...bookings]

    // Filtro de búsqueda (siempre se aplica localmente)
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
  }, [bookings, searchTermFromUrl])

  // ============================================
  // HANDLERS DE FILTROS
  // ============================================
  const handleSearchChange = (value: string) => {
    setSearchInputValue(value)
    updateUrlWithFilters({
      search: value,
      status: statusFilter,
      startDate,
      endDate,
      filter: quickFilter,
      page: 1,
    })
  }

  const handleStatusChange = (value: StatusFilter) => {
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: value,
      startDate,
      endDate,
      filter: null, // Limpiar quickFilter al cambiar status
      page: 1,
    })
    loadBookings(1, { status: value, quickFilter: null })
  }

  const handleStartDateChange = (value: string) => {
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: statusFilter,
      startDate: value,
      endDate,
      filter: null, // Limpiar quickFilter al usar fechas
      page: 1,
    })
    // Cargar con el nuevo valor de startDate
    loadBookings(1, { startDate: value, quickFilter: null })
  }

  const handleEndDateChange = (value: string) => {
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: statusFilter,
      startDate,
      endDate: value,
      filter: null, // Limpiar quickFilter al usar fechas
      page: 1,
    })
    // Solo cargar si hay startDate
    if (startDate) {
      loadBookings(1, { endDate: value, quickFilter: null })
    }
  }

  const handleQuickFilterChange = (value: QuickFilter) => {
    // Limpiar filtros de fecha cuando se usa quickFilter
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: 'all',
      startDate: '',
      endDate: '',
      filter: value,
      page: 1,
    })
    loadBookings(1, { quickFilter: value, startDate: '', endDate: '', status: 'all' })
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    updateUrlWithFilters({
      search: searchTermFromUrl,
      status: statusFilter,
      startDate,
      endDate,
      filter: quickFilter,
      page: newPage,
    })
    loadBookings(newPage)
  }

  const handleClearFilters = () => {
    setSearchInputValue('')
    router.push('/dashboard/parking/bookings', { scroll: false })
    // Pasar overrides explícitos para limpiar todos los filtros
    loadBookings(1, { startDate: '', endDate: '', quickFilter: null, status: 'all' })
  }

  const hasActiveFilters =
    searchTermFromUrl || statusFilter !== 'all' || startDate || endDate || quickFilter

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
        if (confirm(t('modals.cancelBooking.confirm'))) {
          handleCancel(booking)
        }
        break
      case 'noshow':
        if (confirm(t('modals.noShow.confirm'))) {
          handleNoShow(booking)
        }
        break
    }
  }

  const handleCheckIn = async () => {
    if (!selectedBooking) return
    try {
      await parkingApi.checkInBooking(selectedBooking.booking_code, checkInData)
      toast.success(t('messages.checkInSuccess'))
      setShowCheckInModal(false)
      setCheckInData({ actual_checkin: '', notes: '' })
      loadBookings(currentPage)
    } catch (error) {
      toast.error(t('messages.checkInError') + (error instanceof Error ? ': ' + error.message : ''))
    }
  }

  const handleCheckOut = async () => {
    if (!selectedBooking) return
    try {
      await parkingApi.checkOutBooking(selectedBooking.booking_code, {
        ...checkOutData,
        payment_amount: parseFloat(checkOutData.payment_amount),
      })
      toast.success(t('messages.checkOutSuccess'))
      setShowCheckOutModal(false)
      setCheckOutData({
        actual_checkout: '',
        payment_amount: '',
        payment_method: 'cash',
        payment_reference: '',
        notes: '',
      })
      loadBookings(currentPage)
    } catch (error) {
      toast.error(
        t('messages.checkOutError') + (error instanceof Error ? ': ' + error.message : '')
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
      toast.success(t('messages.updateSuccess'))
      setShowUpdateModal(false)
      setUpdateData({ expected_checkin: '', expected_checkout: '', total_amount: '', notes: '' })
      loadBookings(currentPage)
    } catch (error) {
      toast.error(t('messages.updateError') + (error instanceof Error ? ': ' + error.message : ''))
    }
  }

  const handleCancel = async (booking: ParkingBooking) => {
    try {
      await parkingApi.cancelBooking(booking.booking_code)
      toast.success(t('modals.cancelBooking.success'))
      loadBookings(currentPage)
    } catch (error) {
      toast.error(t('messages.cancelError') + (error instanceof Error ? ': ' + error.message : ''))
    }
  }

  const handleNoShow = async (booking: ParkingBooking) => {
    try {
      await parkingApi.markBookingNoShow(booking.booking_code)
      toast.success(t('modals.noShow.success'))
      loadBookings(currentPage)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '')
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-fg-muted">{t('bookings.loading')}</p>
        </div>
      </div>
    )
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <div className="min-h-screen bg-bg p-4 md:p-6">
        <div className="max-w-[1400px] space-y-5">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/parking"
                  className="inline-flex items-center justify-center w-8 h-8 text-fg-subtle hover:text-gray-700 dark:hover:text-gray-200 hover:bg-surface-hover rounded-md transition-colors"
                  title={t('bookings.backToDashboard')}
                >
                  <FiArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-fg">{t('bookings.title')}</h1>
                  <p className="text-xs sm:text-sm text-fg-muted mt-0.5">
                    {t('bookings.subtitle')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/parking/status"
                  className="inline-flex items-center justify-center w-8 h-8 text-fg-subtle hover:text-info hover:bg-surface-hover rounded-md transition-colors"
                  title={t('quickActions.parkingControl')}
                >
                  <FaParking className="w-4 h-4" />
                </Link>
                <Button variant="accent" size="sm" as="a" href="/dashboard/parking/bookings/new">
                  <FiPlus className="w-3.5 h-3.5" />
                  {t('bookings.newBooking')}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 min-[1400px]:grid-cols-4 gap-5">
            {/* Left Column - Main Content */}
            <div className="min-[1400px]:col-span-3 space-y-4">
              {/* Stats - Mobile/Tablet (hidden on >= 1400px) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 min-[1400px]:hidden">
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.totalBookings')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{totalBookings}</p>
                    </div>
                    <FaParking className="w-5 h-5 sm:w-6 sm:h-6 text-info" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.reserved')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{reservedCount}</p>
                    </div>
                    <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-warning" />
                  </div>
                </Card>
                <Card padding="sm" hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.occupied')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">{occupiedCount}</p>
                    </div>
                    <FiCalendar className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                  </div>
                </Card>
                <Card padding="sm" hover className="col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] sm:text-xs text-fg-muted font-medium">
                        {t('stats.completed')}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-fg mt-0.5">
                        {completedCount}
                      </p>
                    </div>
                    <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
                  </div>
                </Card>
              </div>

              {/* Filters */}
              <div className="mb-4 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle" />
                    <input
                      type="text"
                      placeholder={t('filters.search')}
                      value={searchInputValue}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-border bg-surface text-fg rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent"
                    />
                  </div>
                </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* Vista rápida (filtros compuestos del dashboard) */}
                    <QuickFilterDropdown
                      value={quickFilter}
                      onChange={handleQuickFilterChange}
                      t={t}
                    />

                    {/* Fecha de entrada */}
                    <DatePickerInput
                      value={startDate || undefined}
                      onChange={(value) => handleStartDateChange(value || '')}
                      placeholder={t('filters.entry')}
                      clearable={true}
                      size="sm"
                    />

                    {/* Fecha de salida (opcional) */}
                    <DatePickerInput
                      value={endDate || undefined}
                      onChange={(value) => handleEndDateChange(value || '')}
                      placeholder={t('filters.exit')}
                      disabled={!startDate}
                      minDate={startDate ? new Date(startDate + 'T00:00:00') : null}
                      clearable={true}
                      size="sm"
                    />

                    {/* Filtro de estado */}
                    <SelectDropdown<StatusFilter>
                      value={statusFilter}
                      onChange={handleStatusChange}
                      options={[
                        { value: 'all', label: t('filters.allStatuses') },
                        { value: 'reserved', label: t('status.reserved') },
                        { value: 'checked_in', label: t('status.checkedIn') },
                        { value: 'completed', label: t('status.completed') },
                        { value: 'canceled', label: t('status.canceled') },
                        { value: 'no_show', label: t('status.noShow') },
                      ]}
                    />

                    {/* Limpiar filtros */}
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="px-3 py-1.5 text-xs font-medium text-danger bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1"
                      >
                        <FiX className="w-3 h-3" />
                        {t('filters.clear')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Table - Desktop */}
                <div className="hidden md:block bg-surface rounded-md border border-border shadow-sm">
                  <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full">
                      <thead className="bg-surface border-b border-border">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.code')}
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.client')}
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.entry')}
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.exit')}
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.status')}
                          </th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.spot')}
                          </th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-fg uppercase tracking-wider">
                            {t('table.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-border">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-8 text-center text-xs text-fg-subtle">
                              {hasActiveFilters
                                ? t('filters.noResultsWithFilters')
                                : t('filters.noBookings')}
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((booking) => (
                            <tr
                              key={booking.id}
                              onClick={() => handleRowClick(booking.booking_code)}
                              className="hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                              <td className="px-3 py-2">
                                <span className="text-xs font-medium text-info hover:underline">
                                  {booking.booking_code}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div>
                                  <div className="text-xs font-medium text-fg">
                                    {booking.vehicle?.owner || t('table.noOwner')}
                                  </div>
                                  <div className="text-[10px] text-fg-subtle mt-0.5">
                                    {booking.vehicle?.plate || t('table.noPlate')}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs text-fg">
                                  {formatDateShort(booking.schedule.expected_checkin)}
                                </div>
                                <div className="text-[10px] text-fg-subtle">
                                  {formatTime(booking.schedule.expected_checkin)}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs text-fg">
                                  {formatDateShort(booking.schedule.expected_checkout)}
                                </div>
                                <div className="text-[10px] text-fg-subtle">
                                  {formatTime(booking.schedule.expected_checkout)}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <StatusBadge status={booking.status} />
                              </td>
                              <td className="px-3 py-2">
                                <span className="text-xs font-medium text-fg">
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
              <div className="md:hidden space-y-2">
                {filteredBookings.length === 0 ? (
                  <div className="bg-surface rounded-md border border-border p-6 text-center">
                    <p className="text-xs text-fg-subtle">
                      {hasActiveFilters
                        ? t('filters.noResultsWithFilters')
                        : t('filters.noBookings')}
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((booking) => (
                    <Card
                      key={booking.id}
                      padding="sm"
                      hover
                      as="div"
                      onClick={() => handleRowClick(booking.booking_code)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-info">
                              {booking.booking_code}
                            </span>
                            <StatusBadge status={booking.status} />
                          </div>
                          <p className="text-[10px] text-fg-subtle mt-0.5">
                            {t('table.spot')} {booking.spot.level}-{booking.spot.number}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <ActionDropdown booking={booking} onAction={handleAction} />
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-xs font-medium text-fg">
                          {booking.vehicle?.owner || t('table.noOwner')}
                        </p>
                        <p className="text-[10px] text-fg-subtle">
                          {booking.vehicle?.model && `${booking.vehicle.model} · `}
                          {booking.vehicle?.plate || t('table.noPlate')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <div>
                          <span className="text-fg-subtle">{t('table.entry')}: </span>
                          <span className="text-fg">
                            {formatDateShort(booking.schedule.expected_checkin)}{' '}
                            {formatTime(booking.schedule.expected_checkin)}
                          </span>
                        </div>
                        <div>
                          <span className="text-fg-subtle">{t('table.exit')}: </span>
                          <span className="text-fg">
                            {formatDateShort(booking.schedule.expected_checkout)}{' '}
                            {formatTime(booking.schedule.expected_checkout)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Results Info & Pagination Controls */}
              <div className="mt-4 bg-surface rounded-md border border-border px-4 py-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Results info */}
                  <div className="text-xs text-fg-muted">
                    {filteredBookings.length === 0 ? (
                      <span>{t('bookings.noResults')}</span>
                    ) : (
                      <span>
                        <span className="font-medium text-fg">{filteredBookings.length}</span>{' '}
                        {filteredBookings.length !== 1
                          ? t('bookings.reservations')
                          : t('bookings.reservation')}
                        {pagination.totalPages > 1 && (
                          <span className="text-fg-subtle">
                            {' '}
                            ({t('bookings.page')} {pagination.page} {t('bookings.of')}{' '}
                            {pagination.totalPages})
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Pagination buttons */}
                  {pagination.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1 || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-fg bg-surface-hover border border-border rounded-md hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft className="w-3.5 h-3.5" />
                        {t('pagination.previous')}
                      </button>
                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          // Calculate which pages to show
                          let pageNum: number
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i
                          } else {
                            pageNum = pagination.page - 2 + i
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className={`w-8 h-8 text-xs font-medium rounded-md transition-colors ${
                                pageNum === pagination.page
                                  ? 'bg-accent text-accent-fg'
                                  : 'text-fg hover:bg-surface-hover'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages || loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-fg bg-surface-hover border border-border rounded-md hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {t('pagination.next')}
                        <FiChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* End Main Content */}

            {/* Right Column - Stats Sidebar (visible on >= 1400px) */}
            <div className="hidden min-[1400px]:block space-y-4">
              <div className="sticky top-4 space-y-3">
                <h3 className="text-sm font-semibold text-fg mb-3">{t('stats.summary')}</h3>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">
                        {t('stats.totalBookings')}
                      </p>
                      <p className="text-xl font-bold text-fg mt-0.5">{totalBookings}</p>
                    </div>
                    <div className="p-2 bg-info/10 rounded-lg">
                      <FaParking className="w-5 h-5 text-info" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.reserved')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{reservedCount}</p>
                    </div>
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <FiClock className="w-5 h-5 text-warning" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.occupied')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{occupiedCount}</p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <FiCalendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-fg-muted font-medium">{t('stats.completed')}</p>
                      <p className="text-xl font-bold text-fg mt-0.5">{completedCount}</p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-success" />
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
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-border">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-fg">
                {t('modals.checkIn.title')} - {selectedBooking.booking_code}
              </h3>
              <p className="text-sm text-fg-muted mt-1">
                {t('table.spot')} {selectedBooking.spot.level}-{selectedBooking.spot.number}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.checkIn.dateTime')}
                </label>
                <input
                  type="datetime-local"
                  value={checkInData.actual_checkin}
                  onChange={(e) =>
                    setCheckInData({ ...checkInData, actual_checkin: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.checkIn.notes')}
                </label>
                <textarea
                  value={checkInData.notes}
                  onChange={(e) => setCheckInData({ ...checkInData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder={t('modals.checkIn.notesPlaceholder')}
                />
              </div>
            </div>
            <div className="border-t border-border px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCheckInModal(false)
                  setCheckInData({ actual_checkin: '', notes: '' })
                }}
                className="px-4 py-2 text-sm font-medium text-fg bg-surface-hover hover:bg-surface-hover rounded-md transition-colors"
              >
                {t('modals.cancel')}
              </button>
              <button
                onClick={handleCheckIn}
                className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover dark:bg-green-700 dark:hover:bg-accent-hover rounded-md transition-colors"
              >
                {t('modals.checkIn.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHECK-OUT */}
      {showCheckOutModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-border">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-fg">
                {t('modals.checkOut.title')} - {selectedBooking.booking_code}
              </h3>
              <p className="text-sm text-fg-muted mt-1">
                {t('table.spot')} {selectedBooking.spot.level}-{selectedBooking.spot.number}
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.checkOut.dateTime')}
                </label>
                <input
                  type="datetime-local"
                  value={checkOutData.actual_checkout}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, actual_checkout: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.checkOut.amount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={checkOutData.payment_amount}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, payment_amount: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <SelectDropdown<string>
                  value={checkOutData.payment_method}
                  onChange={(v) => setCheckOutData({ ...checkOutData, payment_method: v })}
                  options={[
                    { value: 'cash', label: t('paymentMethods.cash') },
                    { value: 'card', label: t('paymentMethods.card') },
                    { value: 'transfer', label: t('paymentMethods.transfer') },
                    { value: 'other', label: t('paymentMethods.other') },
                  ]}
                  label={t('modals.checkOut.paymentMethod')}
                  size="md"
                  className="w-full"
                />
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.checkOut.reference')}
                </label>
                <input
                  type="text"
                  value={checkOutData.payment_reference}
                  onChange={(e) =>
                    setCheckOutData({ ...checkOutData, payment_reference: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder={t('modals.checkOut.referencePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.checkOut.notes')}
                </label>
                <textarea
                  value={checkOutData.notes}
                  onChange={(e) => setCheckOutData({ ...checkOutData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder={t('modals.checkOut.notesPlaceholder')}
                />
              </div>
            </div>
            <div className="border-t border-border px-6 py-4 flex gap-3 justify-end">
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
                className="px-4 py-2 text-sm font-medium text-fg bg-surface-hover hover:bg-surface-hover rounded-md transition-colors"
              >
                {t('modals.cancel')}
              </button>
              <button
                onClick={handleCheckOut}
                className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-md transition-colors"
              >
                {t('modals.checkOut.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICAR */}
      {showUpdateModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-lg shadow-xl max-w-md w-full border border-border">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-fg">
                {t('modals.update.title')} - {selectedBooking.booking_code}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.update.expectedCheckIn')}
                </label>
                <input
                  type="datetime-local"
                  value={updateData.expected_checkin}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, expected_checkin: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.update.expectedCheckOut')}
                </label>
                <input
                  type="datetime-local"
                  value={updateData.expected_checkout}
                  onChange={(e) =>
                    setUpdateData({ ...updateData, expected_checkout: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.update.totalAmount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updateData.total_amount}
                  onChange={(e) => setUpdateData({ ...updateData, total_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  {t('modals.update.notes')}
                </label>
                <textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface text-fg border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder={t('modals.update.notesPlaceholder')}
                />
              </div>
            </div>
            <div className="border-t border-border px-6 py-4 flex gap-3 justify-end">
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
                className="px-4 py-2 text-sm font-medium text-fg bg-surface-hover hover:bg-surface-hover rounded-md transition-colors"
              >
                {t('modals.cancel')}
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-sm font-medium text-accent-fg bg-accent hover:bg-accent-hover rounded-md transition-colors"
              >
                {t('modals.update.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
