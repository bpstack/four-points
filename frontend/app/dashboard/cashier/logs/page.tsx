'use client'

import { useState } from 'react'
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import HistoryTable from '@/app/components/cashier/logs/HistoryTable'
import HistoryStats from '@/app/components/cashier/logs/HistoryStats'
import HistoryFilters from '@/app/components/cashier/logs/HistoryFilters'
import { useHistoryLogs, useHistoryStats } from '@/app/lib/cashier/queries'
import type { HistoryAction } from '@/app/lib/cashier/types'

export default function LogsPage() {
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0])
  const [actionFilter, setActionFilter] = useState<HistoryAction | 'all'>('all')
  const [userFilter, setUserFilter] = useState<string>('')
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)

  // Calcular rango de fechas (día seleccionado)
  const fromDate = selectedDate
  const toDate = selectedDate

  const { data: logsResponse, isLoading: logsLoading } = useHistoryLogs({
    from_date: fromDate,
    to_date: toDate,
    action: actionFilter === 'all' ? undefined : actionFilter,
    changed_by: userFilter || undefined,
    limit,
    offset,
  })

  const { data: statsResponse, isLoading: statsLoading } = useHistoryStats({
    from_date: fromDate,
    to_date: toDate,
  })

  // ✅ Extraer data de las respuestas
  const logsData = logsResponse?.data || []
  const statsData = statsResponse?.data

  const handlePreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split('T')[0])
    setOffset(0)
  }

  const handleNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().split('T')[0])
    setOffset(0)
  }

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setOffset(0)
  }

  const handleExport = () => {
    console.log('Exportar logs')
    // TODO: Implementar exportación
  }

  const handleNextPage = () => {
    setOffset(offset + limit)
  }

  const handlePreviousPage = () => {
    setOffset(Math.max(0, offset - limit))
  }

  const handleActionFilterChange = (action: HistoryAction | 'all') => {
    setActionFilter(action)
    setOffset(0)
  }

  const handleUserFilterChange = (user: string) => {
    setUserFilter(user)
    setOffset(0)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🔍 Historial y Auditoría
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Registro completo de cambios y acciones
            </p>
          </div>

          {/* Selector de fecha */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousDay}
              className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
              <FiCalendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white min-w-[120px] text-center">
                {new Date(selectedDate).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Stats */}
        {!statsLoading && statsData && <HistoryStats stats={statsData} />}

        {/* Filtros */}
        <HistoryFilters
          actionFilter={actionFilter}
          onActionFilterChange={handleActionFilterChange}
          userFilter={userFilter}
          onUserFilterChange={handleUserFilterChange}
          onExport={handleExport}
        />

        {/* Tabla de logs */}
        <HistoryTable
          logs={logsData}
          isLoading={logsLoading}
          offset={offset}
          limit={limit}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
        />
      </div>
    </div>
  )
}
