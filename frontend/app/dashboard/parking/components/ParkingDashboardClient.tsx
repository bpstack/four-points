// app/dashboard/parking/components/ParkingDashboardClient.tsx

'use client'

import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FaCar } from 'react-icons/fa'
import {
  FiCalendar,
  FiTrendingUp,
  FiFileText,
  FiAlertCircle,
  FiMapPin,
  FiLogIn,
  FiLogOut,
  FiGrid,
  FiZap,
  FiArrowDown,
  FiArrowUp,
  FiActivity,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi'
import Link from 'next/link'
import {
  formatMadridDateLong,
  getCurrentWeekRange,
  getCurrentMonthRange,
} from '@/app/lib/helpers/date'
import { VehicleSearchModal } from '@/app/components/parking/VehicleSearchModal'
import { parkingApi } from '@/app/lib/parking'
import type { ParkingStats, ParkingDashboardResponse } from '../actions/getParkingDashboardStats'

// Query keys
const dashboardKeys = {
  stats: (period: string, range?: { start: string; end: string }) =>
    ['parking', 'dashboard', period, range] as const,
}

interface ParkingDashboardClientProps {
  initialStats?: ParkingStats
  initialOccupancy?: ParkingDashboardResponse['dashboard']['occupancy']
}

export default function ParkingDashboardClient({
  initialStats,
  initialOccupancy: _initialOccupancy,
}: ParkingDashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [showVehicleSearch, setShowVehicleSearch] = useState(false)

  // Calcular rango de fechas según período
  const getDateRange = useCallback(() => {
    if (selectedPeriod === 'week') {
      return getCurrentWeekRange()
    }
    if (selectedPeriod === 'month') {
      return getCurrentMonthRange()
    }
    return undefined
  }, [selectedPeriod])

  const dateRange = getDateRange()

  // Query con React Query
  const {
    data: dashboardData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: dashboardKeys.stats(selectedPeriod, dateRange),
    queryFn: async () => {
      if (selectedPeriod === 'today') {
        return parkingApi.getFullStats()
      } else if (dateRange) {
        return parkingApi.getStatsByRange(dateRange.start, dateRange.end)
      }
      return parkingApi.getFullStats()
    },
    initialData:
      selectedPeriod === 'today' && initialStats
        ? {
            success: true,
            period: { type: 'today' },
            dashboard: {
              stats: initialStats,
              occupancy: { levels: [], summary: {} as Record<string, unknown> },
              pending_checkins: null,
              pending_checkouts: null,
              availability: null,
            },
          }
        : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const stats: ParkingStats = dashboardData?.dashboard?.stats || {
    total_spots: 0,
    occupied_spots: 0,
    available_spots: 0,
    total_bookings: 0,
    pending_checkins: 0,
    pending_checkouts: 0,
    active_bookings: 0,
    completed_today: 0,
    canceled_today: 0,
    no_shows_today: 0,
    occupancy_rate: 0,
  }

  const loading = isLoading && !initialStats

  /**
   * Get human-readable label for current period
   */
  const getPeriodLabel = () => {
    if (selectedPeriod === 'today') {
      return formatMadridDateLong(new Date())
    }

    if (selectedPeriod === 'week') {
      const { start, end } = getCurrentWeekRange()
      const startParts = start.split('-')
      const endParts = end.split('-')
      const startFormatted = `${startParts[2]}/${startParts[1]}/${startParts[0].slice(2)}`
      const endFormatted = `${endParts[2]}/${endParts[1]}/${endParts[0].slice(2)}`
      return `${startFormatted} - ${endFormatted}`
    }

    if (selectedPeriod === 'month') {
      const { start, end } = getCurrentMonthRange()
      const startParts = start.split('-')
      const endParts = end.split('-')
      const startFormatted = `${startParts[2]}/${startParts[1]}/${startParts[0].slice(2)}`
      const endFormatted = `${endParts[2]}/${endParts[1]}/${endParts[0].slice(2)}`
      return `${startFormatted} - ${endFormatted}`
    }

    return 'Unknown period'
  }

  // Calculate totals
  const arrivalsTotal = stats.pending_checkins + stats.active_bookings
  const departuresTotal = stats.pending_checkouts + stats.completed_today

  const _formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
        <div className="max-w-[1600px] space-y-5">
          {/* Skeleton Header */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="h-8 w-48 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"></div>
              </div>
              <div className="h-10 w-48 bg-gray-200 dark:bg-[#21262d] rounded animate-pulse"></div>
            </div>
          </div>

          {/* Skeleton Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 h-64 animate-pulse"></div>
              <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 h-48 animate-pulse"></div>
            </div>
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 h-48 animate-pulse"></div>
              <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl p-5 h-48 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1600px] space-y-5">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md">
                  <FaCar className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#24292f] to-[#57606a] dark:from-[#f0f6fc] dark:to-[#c9d1d9] bg-clip-text text-transparent">
                  Parking Dashboard
                </h1>
              </div>
              <p className="text-xs text-[#57606a] dark:text-[#8b949e] ml-11 font-medium">
                {selectedPeriod === 'today' ? 'Hoy, ' : ''}
                {getPeriodLabel()}
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-white dark:bg-[#0D1117] p-1 rounded-lg border border-[#d0d7de] dark:border-[#30363d] shadow-sm">
              {(['today', 'week', 'month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 capitalize ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-sm'
                      : 'text-[#24292f] dark:text-[#c9d1d9] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d]'
                  }`}
                >
                  {period === 'today' ? 'Hoy' : period === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2 shadow-sm">
            <FiAlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              {error instanceof Error ? error.message : 'Error al cargar datos'}
            </p>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Left Column - Reservas + Control de Parking */}
          <div className="space-y-5">
            {/* Reservations Section */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <FiCalendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">
                      Reservas
                    </h2>
                  </div>
                  <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="p-1.5 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <FiRefreshCw
                      className={`w-3.5 h-3.5 text-[#57606a] dark:text-[#8b949e] ${isFetching ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[#57606a] dark:text-[#8b949e] leading-relaxed">
                  Toda la informacion sobre vehiculos que llegan y salen, incluyendo todos los
                  vehiculos estacionados y los pendientes por diversas razones.
                </p>
              </div>

              <div className="space-y-5">
                {/* Arrivals */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#d0d7de] dark:border-[#21262d]">
                    <div className="p-0.5 bg-green-100 dark:bg-green-900/20 rounded">
                      <FiArrowDown className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xs font-bold text-[#24292f] dark:text-[#f0f6fc]">
                      Llegadas
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <StatLink
                      label="En espera"
                      value={stats.pending_checkins}
                      loading={isFetching}
                      href="/dashboard/parking/bookings?filter=arrivals_pending"
                    />
                    <StatLink
                      label="Dentro"
                      value={stats.active_bookings}
                      loading={isFetching}
                      href="/dashboard/parking/bookings?filter=arrivals_inside"
                    />
                    <StatLink
                      label="Total"
                      value={arrivalsTotal}
                      loading={isFetching}
                      href="/dashboard/parking/bookings?filter=arrivals_total"
                    />
                  </div>
                </div>

                {/* Departures */}
                <div>
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#d0d7de] dark:border-[#21262d]">
                    <div className="p-0.5 bg-red-100 dark:bg-red-900/20 rounded">
                      <FiArrowUp className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xs font-bold text-[#24292f] dark:text-[#f0f6fc]">
                      Salidas
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <StatLink
                      label="En espera"
                      value={stats.pending_checkouts}
                      loading={isFetching}
                      href="/dashboard/parking/bookings?filter=departures_pending"
                    />
                    <StatLink
                      label="Completadas"
                      value={stats.completed_today}
                      loading={isFetching}
                      href="/dashboard/parking/bookings?filter=departures_completed"
                    />
                    <StatLink
                      label="Total"
                      value={departuresTotal}
                      loading={isFetching}
                      href="/dashboard/parking/bookings?filter=departures_total"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas - Mobile only (after Reservas) */}
            <div className="xl:hidden bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <FiZap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Acciones Rapidas
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <QuickActionCard
                  label="Nueva Reserva"
                  icon={FiCalendar}
                  href="/dashboard/parking/bookings/new"
                  color="blue"
                />
                <QuickActionCard
                  label="Todas las Reservas"
                  icon={FiGrid}
                  href="/dashboard/parking/bookings"
                  color="purple"
                />
                <QuickActionCard
                  label="Control de Parking"
                  icon={FiMapPin}
                  href="/dashboard/parking/status"
                  color="green"
                />
                <QuickActionCard
                  label="Buscar Vehiculo"
                  icon={FiSearch}
                  onClick={() => setShowVehicleSearch(true)}
                  color="orange"
                />
                <QuickActionCard
                  label="Check-Ins"
                  icon={FiLogIn}
                  href="/dashboard/parking/bookings?status=reserved"
                  color="teal"
                />
                <QuickActionCard
                  label="Check-Outs"
                  icon={FiLogOut}
                  href="/dashboard/parking/bookings?status=checked_in"
                  color="red"
                />
              </div>
            </div>

            {/* Control de Parking */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <FiActivity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Control de Parking
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Occupancy */}
                <Link
                  href="/dashboard/parking/status"
                  className="group p-4 bg-white dark:bg-[#161B22] border border-[#d0d7de] dark:border-[#21262d] rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[10px] font-bold text-[#57606a] dark:text-[#8b949e] mb-1.5 uppercase tracking-wide">
                        {selectedPeriod === 'today'
                          ? 'Ocupacion Actual'
                          : selectedPeriod === 'week'
                            ? 'Ocupaciones Semanales'
                            : 'Ocupaciones Mensuales'}
                      </div>
                      {isFetching ? (
                        <div className="h-7 w-24 bg-[#d0d7de] dark:bg-[#30363d] rounded-lg animate-pulse"></div>
                      ) : (
                        <div className="text-2xl font-bold text-[#24292f] dark:text-[#f0f6fc]">
                          {selectedPeriod === 'today' ? (
                            <>
                              {stats.occupied_spots}
                              <span className="text-base text-[#57606a] dark:text-[#8b949e] font-semibold">
                                /{stats.total_spots}
                              </span>
                            </>
                          ) : (
                            <>
                              {stats.total_bookings}
                              <span className="text-xs text-[#57606a] dark:text-[#8b949e] ml-1 font-medium">
                                total
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <FaCar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="text-[10px] text-[#57606a] dark:text-[#8b949e] font-medium">
                    {selectedPeriod === 'today'
                      ? `${stats.available_spots} plazas disponibles`
                      : selectedPeriod === 'week'
                        ? `Media diaria: ${Math.round(stats.total_bookings / 7)} ocupaciones`
                        : `Media diaria: ${Math.round(stats.total_bookings / 30)} ocupaciones`}
                  </div>
                </Link>

                {/* Occupancy Rate */}
                <Link
                  href="/dashboard/parking/status"
                  className={`group p-4 bg-white dark:bg-[#161B22] border rounded-xl hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 ${
                    stats.occupancy_rate >= 100
                      ? 'border-green-500 animate-pulse-green'
                      : 'border-[#d0d7de] dark:border-[#21262d] hover:border-blue-500 dark:hover:border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[10px] font-bold text-[#57606a] dark:text-[#8b949e] mb-1.5 uppercase tracking-wide">
                        {selectedPeriod === 'today'
                          ? 'Tasa de Ocupacion'
                          : selectedPeriod === 'week'
                            ? 'Tasa Media Semanal'
                            : 'Tasa Media Mensual'}
                      </div>
                      {isFetching ? (
                        <div className="h-7 w-16 bg-[#d0d7de] dark:bg-[#30363d] rounded-lg animate-pulse"></div>
                      ) : (
                        <div className="text-2xl font-bold text-[#24292f] dark:text-[#f0f6fc]">
                          {stats.occupancy_rate}%
                          {selectedPeriod !== 'today' && (
                            <span className="text-xs text-[#57606a] dark:text-[#8b949e] ml-1 font-medium">
                              promedio
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <FiTrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#d0d7de] dark:bg-[#21262d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-600 transition-all duration-500"
                      style={{ width: `${Math.min(stats.occupancy_rate, 100)}%` }}
                    ></div>
                  </div>
                  {selectedPeriod !== 'today' && (
                    <div className="text-[9px] text-[#57606a] dark:text-[#8b949e] mt-1.5 font-medium">
                      Capacidad maxima {selectedPeriod === 'week' ? 'semanal' : 'mensual'}:{' '}
                      {stats.total_spots * (selectedPeriod === 'week' ? 7 : 30)} plaza-dias
                    </div>
                  )}
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Acciones Rápidas (Desktop) + Resumen Diario */}
          <div className="space-y-5">
            {/* Acciones Rápidas - Desktop only */}
            <div className="hidden xl:block bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <FiZap className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  Acciones Rapidas
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <QuickActionCard
                  label="Nueva Reserva"
                  icon={FiCalendar}
                  href="/dashboard/parking/bookings/new"
                  color="blue"
                />
                <QuickActionCard
                  label="Todas las Reservas"
                  icon={FiGrid}
                  href="/dashboard/parking/bookings"
                  color="purple"
                />
                <QuickActionCard
                  label="Control de Parking"
                  icon={FiMapPin}
                  href="/dashboard/parking/status"
                  color="green"
                />
                <QuickActionCard
                  label="Buscar Vehiculo"
                  icon={FiSearch}
                  onClick={() => setShowVehicleSearch(true)}
                  color="orange"
                />
                <QuickActionCard
                  label="Check-Ins"
                  icon={FiLogIn}
                  href="/dashboard/parking/bookings?status=reserved"
                  color="teal"
                />
                <QuickActionCard
                  label="Check-Outs"
                  icon={FiLogOut}
                  href="/dashboard/parking/bookings?status=checked_in"
                  color="red"
                />
              </div>
            </div>

            {/* Resumen del Período */}
            <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                  <FiFileText className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                </div>
                <h2 className="text-base font-bold text-[#24292f] dark:text-[#f0f6fc]">
                  {selectedPeriod === 'today' ? 'Resumen Diario' : 'Resumen del Periodo'}
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
                <SummaryCard
                  label="Completadas"
                  value={stats.completed_today}
                  loading={isFetching}
                  icon="✓"
                  color="green"
                />
                <SummaryCard
                  label="Canceladas"
                  value={stats.canceled_today}
                  loading={isFetching}
                  icon="✕"
                  color="red"
                />
                <SummaryCard
                  label="No-Shows"
                  value={stats.no_shows_today}
                  loading={isFetching}
                  icon="?"
                  color="yellow"
                />
                <SummaryCard
                  label="Total Reservas"
                  value={stats.total_bookings}
                  loading={isFetching}
                  icon="#"
                  color="blue"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ayuda Contextual - Full width at bottom */}
        <div className="bg-gradient-to-br from-[#ddf4ff] to-[#b6e3ff] dark:from-[#051d30] dark:to-[#0a2540] border border-[#9cd7ff] dark:border-[#1f6feb] rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-2 mb-3">
            <div className="p-1.5 bg-blue-600 dark:bg-blue-500 rounded-lg shadow-lg">
              <FiAlertCircle className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-[#24292f] dark:text-[#f0f6fc]">
              Ayuda Contextual
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-xs text-[#24292f] dark:text-[#c9d1d9] leading-relaxed">
            <div className="space-y-1.5 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                📊 Reservas
              </div>
              <p>
                Vista completa del flujo de vehiculos. Rastrea vehiculos entrantes, estacionados y
                salientes.
              </p>
            </div>

            <div className="space-y-1.5 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="font-bold text-green-600 dark:text-green-400 text-[11px]">
                📥 Llegadas - En espera
              </div>
              <p>Vehiculos con reservas confirmadas pendientes de check-in.</p>
            </div>

            <div className="space-y-1.5 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="font-bold text-green-600 dark:text-green-400 text-[11px]">
                ✅ Llegadas - Dentro
              </div>
              <p>Vehiculos actualmente estacionados que han completado el check-in.</p>
            </div>

            <div className="space-y-1.5 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="font-bold text-red-600 dark:text-red-400 text-[11px]">
                📤 Salidas - En espera
              </div>
              <p>Vehiculos estacionados listos para el procesamiento de check-out.</p>
            </div>

            <div className="space-y-1.5 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <div className="font-bold text-purple-600 dark:text-purple-400 text-[11px]">
                🚗 Control de Parking
              </div>
              <p>Monitoreo en tiempo real de ocupacion y capacidad del parking.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Search Modal */}
      <VehicleSearchModal isOpen={showVehicleSearch} onClose={() => setShowVehicleSearch(false)} />
    </div>
  )
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatLink({
  label,
  value,
  loading,
  href,
}: {
  label: string
  value: number
  loading: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className="group text-center py-3 px-2 rounded-lg hover:bg-[#f6f8fa] dark:hover:bg-[#0d1117] border border-transparent hover:border-[#d0d7de] dark:hover:border-[#30363d] transition-all duration-200"
    >
      {loading ? (
        <div className="h-7 bg-[#d0d7de] dark:bg-[#30363d] rounded-lg animate-pulse mb-1.5"></div>
      ) : (
        <div className="text-2xl font-bold text-[#24292f] dark:text-[#f0f6fc] mb-1">{value}</div>
      )}
      <div className="text-[10px] font-semibold text-[#57606a] dark:text-[#8b949e] uppercase tracking-wide">
        {label}
      </div>
    </Link>
  )
}

function QuickActionCard({
  label,
  icon: Icon,
  href,
  color,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  color: string
  onClick?: () => void
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 hover:border-blue-500',
    purple: 'from-purple-500 to-purple-600 hover:border-purple-500',
    green: 'from-green-500 to-green-600 hover:border-green-500',
    orange: 'from-orange-500 to-orange-600 hover:border-orange-500',
    teal: 'from-teal-500 to-teal-600 hover:border-teal-500',
    red: 'from-red-500 to-red-600 hover:border-red-500',
  }

  const className = `group p-3 bg-white dark:bg-gradient-to-br dark:from-[#0d1117] dark:to-[#0D1117] border border-[#d0d7de] dark:border-[#21262d] rounded-lg ${colorClasses[color as keyof typeof colorClasses]} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5`

  const content = (
    <div className="flex flex-col items-center text-center space-y-2">
      <div
        className={`p-2 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]} rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300`}
      >
        <Icon className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="text-[10px] font-bold text-[#24292f] dark:text-[#c9d1d9] leading-tight">
        {label}
      </span>
    </div>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href || '#'} className={className}>
      {content}
    </Link>
  )
}

function SummaryCard({
  label,
  value,
  loading,
  icon,
  color,
}: {
  label: string
  value: number
  loading: boolean
  icon: string
  color: string
}) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  }

  return (
    <div className="p-3 bg-gradient-to-br from-[#f6f8fa] to-white dark:from-[#0d1117] dark:to-[#0D1117] border border-[#d0d7de] dark:border-[#21262d] rounded-lg text-center hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorClasses[color as keyof typeof colorClasses]}`}
        >
          {icon}
        </span>
        <div className="text-[10px] font-bold text-[#57606a] dark:text-[#8b949e] uppercase tracking-wide">
          {label}
        </div>
      </div>
      {loading ? (
        <div className="h-6 bg-[#d0d7de] dark:bg-[#30363d] rounded-lg animate-pulse"></div>
      ) : (
        <div className="text-xl font-bold text-[#24292f] dark:text-[#f0f6fc]">{value}</div>
      )}
    </div>
  )
}
