// app/components/maintenance/MaintenanceListClient.tsx

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { maintenanceApi } from '@/app/lib/maintenance/maintenanceApi'
import type { MaintenanceReport, ReportFilters } from '@/app/lib/maintenance/maintenance'
import { CreateReportPanel } from './panels/CreateReportPanel'
import { FiPlus, FiSearch, FiAlertCircle, FiTool, FiCheckCircle, FiClock } from 'react-icons/fi'

interface Pagination {
  total: number
  page: number
  limit: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

interface MaintenanceListClientProps {
  initialReports: MaintenanceReport[]
  initialPagination?: Pagination
}

export function MaintenanceListClient({
  initialReports = [],
  initialPagination,
}: MaintenanceListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get('panel')

  const [reports, setReports] = useState<MaintenanceReport[]>(initialReports || [])
  const [pagination, setPagination] = useState<Pagination | undefined>(initialPagination)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [filters, setFilters] = useState<ReportFilters>({
    status: (searchParams.get('status') as any) || undefined,
    priority: (searchParams.get('priority') as any) || undefined,
    location_type: (searchParams.get('location_type') as any) || undefined,
  })

  // Cargar reportes cuando cambien los filtros
  const loadReports = async (newFilters?: ReportFilters, page?: number) => {
    try {
      setLoading(true)
      const response = await maintenanceApi.getAll({
        ...filters,
        ...newFilters,
        search: searchTerm || undefined,
        page: page || 1,
        limit: 20,
      })
      setReports(response.reports || [])
      setPagination(response.pagination)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  // Actualizar URL con filtros
  const updateUrlWithFilters = (newFilters: ReportFilters, search?: string) => {
    const params = new URLSearchParams()
    if (newFilters.status) params.set('status', newFilters.status)
    if (newFilters.priority) params.set('priority', newFilters.priority)
    if (newFilters.location_type) params.set('location_type', newFilters.location_type)
    if (search) params.set('search', search)

    const queryString = params.toString()
    router.push(queryString ? `?${queryString}` : '/dashboard/maintenance', { scroll: false })
  }

  const handleSearch = () => {
    updateUrlWithFilters(filters, searchTerm)
    loadReports(filters)
  }

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters)
    updateUrlWithFilters(newFilters, searchTerm)
    loadReports(newFilters)
  }

  const handleCreateReport = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('panel', 'create-report')
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleClosePanel = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('panel')
    router.push(`?${params.toString()}`, { scroll: false })
    loadReports() // Recargar después de cerrar panel
  }

  const handleViewReport = (reportId: string) => {
    router.push(`/dashboard/maintenance/${reportId}`)
  }

  const handlePageChange = (newPage: number) => {
    loadReports(filters, newPage)
  }

  const getStatusConfig = (status: MaintenanceReport['status']) => {
    const configs = {
      reported: {
        color:
          'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        label: 'Reportado',
      },
      assigned: {
        color:
          'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        label: 'Asignado',
      },
      in_progress: {
        color:
          'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
        label: 'En Progreso',
      },
      waiting: {
        color:
          'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        label: 'En Espera',
      },
      completed: {
        color:
          'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        label: 'Completado',
      },
      closed: {
        color:
          'bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800',
        label: 'Cerrado',
      },
      canceled: {
        color:
          'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        label: 'Cancelado',
      },
    }
    return configs[status]
  }

  const getPriorityConfig = (priority: MaintenanceReport['priority']) => {
    const configs = {
      low: {
        color: 'text-gray-600 dark:text-gray-400',
        label: 'Baja',
      },
      medium: {
        color: 'text-blue-600 dark:text-blue-400',
        label: 'Media',
      },
      high: {
        color: 'text-orange-600 dark:text-orange-400',
        label: 'Alta',
      },
      urgent: {
        color: 'text-red-600 dark:text-red-400',
        label: 'Urgente',
      },
    }
    return configs[priority]
  }

  const getLocationTypeLabel = (type: MaintenanceReport['location_type']) => {
    const labels = {
      room: 'Habitación',
      common_area: 'Área Común',
      exterior: 'Exterior',
      facilities: 'Instalaciones',
      other: 'Otro',
    }
    return labels[type]
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Stats
  const totalReports = pagination?.total || reports.length
  const urgentReports = reports.filter((r) => r.priority === 'urgent').length
  const inProgressReports = reports.filter((r) => r.status === 'in_progress').length
  const roomsOutOfService = reports.filter((r) => r.room_out_of_service === true).length

  if (loading && reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
        <div className="max-w-[1400px] space-y-5">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Mantenimiento
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Gestión de reportes de mantenimiento
                </p>
              </div>
              <button
                onClick={handleCreateReport}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
              >
                <FiPlus className="w-3.5 h-3.5" />
                Nuevo Reporte
              </button>
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
                      Total Reportes
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                      {totalReports}
                    </p>
                  </div>
                  <FiTool className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Urgentes
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                      {urgentReports}
                    </p>
                  </div>
                  <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                      En Progreso
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                      {inProgressReports}
                    </p>
                  </div>
                  <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 dark:text-purple-400" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                      Hab. Fuera de Servicio
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                      {roomsOutOfService}
                    </p>
                  </div>
                  <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 dark:text-orange-400" />
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
                    placeholder="Buscar por título, descripción, ubicación, habitación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-4 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select
                  value={filters.status || ''}
                  onChange={(e) =>
                    handleFilterChange({ ...filters, status: (e.target.value as any) || undefined })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
                >
                  <option value="">Todos los estados</option>
                  <option value="reported">Reportado</option>
                  <option value="assigned">Asignado</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting">En Espera</option>
                  <option value="completed">Completado</option>
                  <option value="closed">Cerrado</option>
                  <option value="canceled">Cancelado</option>
                </select>

                <select
                  value={filters.priority || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      priority: (e.target.value as any) || undefined,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
                >
                  <option value="">Todas las prioridades</option>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>

                <select
                  value={filters.location_type || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      ...filters,
                      location_type: (e.target.value as any) || undefined,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
                >
                  <option value="">Todas las ubicaciones</option>
                  <option value="room">Habitación</option>
                  <option value="common_area">Área Común</option>
                  <option value="exterior">Exterior</option>
                  <option value="facilities">Instalaciones</option>
                  <option value="other">Otro</option>
                </select>

                <button
                  onClick={() => {
                    setFilters({})
                    setSearchTerm('')
                    router.push('/dashboard/maintenance', { scroll: false })
                    loadReports({})
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>

            {/* Table - Desktop */}
            <div className="hidden md:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Prioridad
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Asignado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {reports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                        >
                          {searchTerm ||
                          Object.keys(filters).some((k) => filters[k as keyof ReportFilters])
                            ? 'No se encontraron reportes con esos criterios'
                            : 'No hay reportes registrados'}
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => {
                        const statusConfig = getStatusConfig(report.status)
                        const priorityConfig = getPriorityConfig(report.priority)
                        return (
                          <tr
                            key={report.id}
                            onClick={() => handleViewReport(report.id)}
                            className="hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors cursor-pointer"
                          >
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {formatDate(report.report_date)}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                {report.title}
                              </div>
                              {report.room_out_of_service && (
                                <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                  Habitación fuera de servicio
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs text-gray-900 dark:text-gray-100">
                                {getLocationTypeLabel(report.location_type)}
                                {report.room_number && ` - ${report.room_number}`}
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                                {report.location_description}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-xs font-medium ${priorityConfig.color}`}>
                                {priorityConfig.label}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}
                              >
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                              {report.assigned_type === 'external'
                                ? report.external_company_name
                                : report.assigned_to
                                  ? 'Usuario asignado'
                                  : '-'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                    {pagination.total} resultados
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.has_prev || loading}
                      className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.has_next || loading}
                      className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-2">
              {reports.length === 0 ? (
                <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-6 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {searchTerm ||
                    Object.keys(filters).some((k) => filters[k as keyof ReportFilters])
                      ? 'No se encontraron reportes con esos criterios'
                      : 'No hay reportes registrados'}
                  </p>
                </div>
              ) : (
                reports.map((report) => {
                  const statusConfig = getStatusConfig(report.status)
                  const priorityConfig = getPriorityConfig(report.priority)
                  return (
                    <div
                      key={report.id}
                      onClick={() => handleViewReport(report.id)}
                      className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                            {report.title}
                          </h3>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                            {getLocationTypeLabel(report.location_type)}
                            {report.room_number && ` - ${report.room_number}`}
                          </p>
                        </div>
                        <span className={`ml-2 text-[10px] font-medium ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2">
                          {report.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-500">
                            {formatDate(report.report_date)}
                          </span>
                        </div>

                        {report.room_out_of_service && (
                          <div className="pt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                              Habitación fuera de servicio
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Mobile Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev || loading}
                    className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="px-4 py-2 text-xs text-gray-500">
                    {pagination.page} / {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next || loading}
                    className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
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
                        Total Reportes
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {totalReports}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <FiTool className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Urgentes</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {urgentReports}
                      </p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        En Progreso
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {inProgressReports}
                      </p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <FiClock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#0D1117] border border-[#d0d7de] dark:border-[#30363d] rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Hab. Fuera de Servicio
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {roomsOutOfService}
                      </p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CreateReportPanel */}
      <CreateReportPanel isOpen={panel === 'create-report'} onClose={handleClosePanel} />
    </>
  )
}
