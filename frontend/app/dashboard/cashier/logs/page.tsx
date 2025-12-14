// app/dashboard/cashier/logs/page.tsx
'use client'

import { useCashierStore, useLogsFilters } from '@/app/stores/useCashierStore'
import DateNavigator from '@/app/components/cashier/DateNavigator'
import HistoryTable from '@/app/components/cashier/logs/HistoryTable'
import HistoryStats from '@/app/components/cashier/logs/HistoryStats'
import HistoryFilters from '@/app/components/cashier/logs/HistoryFilters'
import { useHistoryLogs, useHistoryStats } from '@/app/lib/cashier/queries'

export default function LogsPage() {
  // Zustand store
  const {
    logsDate,
    getLogsFormattedDate,
    logsGoToPreviousDay,
    logsGoToNextDay,
    logsGoToToday,
    setLogsActionFilter,
    setLogsUserFilter,
    logsNextPage,
    logsPreviousPage,
  } = useCashierStore()

  const { actionFilter, userFilter, limit, offset } = useLogsFilters()

  // Queries
  const { data: logsResponse, isLoading: logsLoading } = useHistoryLogs({
    from_date: logsDate,
    to_date: logsDate,
    action: actionFilter === 'all' ? undefined : actionFilter,
    changed_by: userFilter || undefined,
    limit,
    offset,
  })

  const { data: statsResponse, isLoading: statsLoading } = useHistoryStats({
    from_date: logsDate,
    to_date: logsDate,
  })

  // Extraer data de las respuestas
  const logsData = logsResponse?.data || []
  const statsData = statsResponse?.data

  const handleExport = () => {
    // TODO: Implementar exportación
    console.log('Exportar logs')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Historial y Auditoría
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Registro completo de cambios y acciones
            </p>
          </div>

          <DateNavigator
            displayLabel={getLogsFormattedDate()}
            onPrevious={logsGoToPreviousDay}
            onNext={logsGoToNextDay}
            onToday={logsGoToToday}
          />
        </div>

        {/* Stats */}
        {!statsLoading && statsData && <HistoryStats stats={statsData} />}

        {/* Filtros */}
        <HistoryFilters
          actionFilter={actionFilter}
          onActionFilterChange={setLogsActionFilter}
          userFilter={userFilter}
          onUserFilterChange={setLogsUserFilter}
          onExport={handleExport}
        />

        {/* Tabla de logs */}
        <HistoryTable
          logs={logsData}
          isLoading={logsLoading}
          offset={offset}
          limit={limit}
          onNextPage={logsNextPage}
          onPreviousPage={logsPreviousPage}
        />
      </div>
    </div>
  )
}
