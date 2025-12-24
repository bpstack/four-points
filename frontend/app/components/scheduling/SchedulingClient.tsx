// app/components/scheduling/SchedulingClient.tsx

'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import { ApiError } from '@/app/lib/apiClient'
import type { SchedulingMonthFull, SchedulingShift, MonthStatus } from '@/app/lib/scheduling'
import { ScheduleGrid } from './ScheduleGrid'
import { MonthSelector } from './MonthSelector'
import { ScheduleStats } from './ScheduleStats'
import { ShiftLegend } from './ShiftLegend'
import { ShiftSelector } from './ShiftSelector'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  FiCalendar,
  FiPlay,
  FiCheck,
  FiPlus,
  FiSettings,
  FiDownload,
  FiRefreshCw,
  FiRotateCcw,
} from 'react-icons/fi'

// Cell selection state for editing
interface SelectedCell {
  employeeId: string
  employeeName: string
  dayId: number
  dayNumber: number
  assignmentId: number | null
  currentShiftCode: string | null
  position: { x: number; y: number }
}

export function SchedulingClient() {
  const queryClient = useQueryClient()
  const [selectedMonthId, setSelectedMonthId] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

  // Fetch all months for the selector
  const { data: monthsData, isLoading: loadingMonths } = useQuery({
    queryKey: schedulingKeys.monthsList({ year: selectedYear }),
    queryFn: () => schedulingApi.getAllMonths({ year: selectedYear }),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch shifts for legend and cell rendering
  const { data: shifts = [] } = useQuery({
    queryKey: schedulingKeys.shifts(),
    queryFn: schedulingApi.getAllShifts,
    staleTime: 30 * 60 * 1000,
  })

  // Fetch full month data when a month is selected
  const {
    data: monthData,
    isLoading: loadingMonth,
    refetch: refetchMonth,
  } = useQuery({
    queryKey: schedulingKeys.month(selectedMonthId!),
    queryFn: () => schedulingApi.getMonthById(selectedMonthId!),
    enabled: !!selectedMonthId,
    staleTime: 2 * 60 * 1000,
  })

  // Create month mutation
  const createMonthMutation = useMutation({
    mutationFn: (data: { year: number; month: number }) => schedulingApi.createMonth(data),
    onSuccess: (newMonth) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
      setSelectedMonthId(newMonth.id)
      toast.success('Planning mensual creado')
    },
    onError: (error: unknown) => {
      // 409 = month already exists, just refresh the list
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
        toast('Este mes ya existe', { icon: 'ℹ️' })
      } else {
        toast.error('Error al crear el planning')
      }
    },
  })

  // Generate schedule mutation
  const generateMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.generateSchedule(monthId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      if (data.result.success) {
        toast.success(`Horarios generados: ${data.result.assignmentsCount} asignaciones`)
      } else {
        toast.error('Generación completada con errores')
      }
    },
    onError: () => {
      toast.error('Error al generar horarios')
    },
  })

  // Update month status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MonthStatus }) =>
      schedulingApi.updateMonth(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
      toast.success('Estado actualizado')
    },
    onError: () => {
      toast.error('Error al actualizar estado')
    },
  })

  // Unpublish month mutation
  const unpublishMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.unpublishMonth(monthId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
      toast.success('Mes revertido a estado generado')
    },
    onError: () => {
      toast.error('Error al revertir la publicación')
    },
  })

  // Update single assignment mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, shiftCode }: { assignmentId: number; shiftCode: string }) =>
      schedulingApi.updateAssignment(assignmentId, { shiftCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      setSelectedCell(null)
      toast.success('Turno actualizado')
    },
    onError: () => {
      toast.error('Error al actualizar turno')
    },
  })

  const handleCreateMonth = useCallback(
    (month: number) => {
      createMonthMutation.mutate({ year: selectedYear, month })
    },
    [createMonthMutation, selectedYear]
  )

  const handleGenerate = useCallback(() => {
    if (selectedMonthId) {
      generateMutation.mutate(selectedMonthId)
    }
  }, [generateMutation, selectedMonthId])

  const handlePublish = useCallback(() => {
    if (selectedMonthId && monthData?.status === 'generated') {
      updateStatusMutation.mutate({ id: selectedMonthId, status: 'published' })
    }
  }, [updateStatusMutation, selectedMonthId, monthData?.status])

  const handleUnpublish = useCallback(() => {
    if (selectedMonthId && monthData?.status === 'published') {
      unpublishMutation.mutate(selectedMonthId)
    }
  }, [unpublishMutation, selectedMonthId, monthData?.status])

  // Handle cell click to open shift selector
  const handleCellClick = useCallback(
    (employeeId: string, dayId: number, currentShift: string | null, event: React.MouseEvent) => {
      if (!monthData) return

      // Find employee info
      const employee = monthData.employees.find((e) => e.id === employeeId)
      if (!employee) return

      // Find the day to get dayNumber
      const day = monthData.days.find((d) => d.id === dayId)
      if (!day) return

      // Get assignment ID if exists
      const assignment = employee.assignments[day.dayNumber]
      const assignmentId = assignment?.id || null

      // Open selector at click position
      setSelectedCell({
        employeeId,
        employeeName: employee.name,
        dayId,
        dayNumber: day.dayNumber,
        assignmentId,
        currentShiftCode: currentShift,
        position: { x: event.clientX, y: event.clientY },
      })
    },
    [monthData]
  )

  // Handle shift selection from selector
  const handleShiftSelect = useCallback(
    (shiftCode: string) => {
      if (!selectedCell?.assignmentId) {
        toast.error('No se puede actualizar: asignación no encontrada')
        setSelectedCell(null)
        return
      }

      // Don't update if same shift
      if (shiftCode === selectedCell.currentShiftCode) {
        setSelectedCell(null)
        return
      }

      updateAssignmentMutation.mutate({
        assignmentId: selectedCell.assignmentId,
        shiftCode,
      })
    },
    [selectedCell, updateAssignmentMutation]
  )

  const getStatusConfig = (status: MonthStatus) => {
    const configs: Record<MonthStatus, { color: string; label: string }> = {
      draft: {
        color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        label: 'Borrador',
      },
      generated: {
        color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        label: 'Generado',
      },
      published: {
        color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        label: 'Publicado',
      },
      archived: {
        color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
        label: 'Archivado',
      },
    }
    return configs[status]
  }

  const months = monthsData?.months || []
  const shiftsMap = useMemo(() => {
    const map: Record<string, SchedulingShift> = {}
    shifts.forEach((s) => {
      map[s.code] = s
    })
    return map
  }, [shifts])

  const loading = loadingMonths || loadingMonth

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1800px] space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Planificación de Horarios
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Gestión de turnos del personal de recepción
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchMonth()}
              disabled={!selectedMonthId || loading}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <Link
              href="/dashboard/scheduling/config"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FiSettings className="w-3.5 h-3.5" />
              Config
            </Link>
          </div>
        </div>

        {/* Month Selector & Actions */}
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <MonthSelector
              months={months}
              selectedMonthId={selectedMonthId}
              selectedYear={selectedYear}
              onSelectMonth={setSelectedMonthId}
              onSelectYear={setSelectedYear}
              onCreateMonth={handleCreateMonth}
              loading={loadingMonths}
            />

            {monthData && (
              <div className="flex items-center gap-3">
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusConfig(monthData.status).color}`}
                >
                  {getStatusConfig(monthData.status).label}
                </span>

                {/* Action Buttons */}
                {monthData.status === 'draft' && (
                  <button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                  >
                    <FiPlay className="w-3.5 h-3.5" />
                    {generateMutation.isPending ? 'Generando...' : 'Generar Horarios'}
                  </button>
                )}

                {monthData.status === 'generated' && (
                  <>
                    <button
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <FiRefreshCw className="w-3.5 h-3.5" />
                      Regenerar
                    </button>
                    <button
                      onClick={handlePublish}
                      disabled={updateStatusMutation.isPending}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors disabled:opacity-50"
                    >
                      <FiCheck className="w-3.5 h-3.5" />
                      Publicar
                    </button>
                  </>
                )}

                {monthData.status === 'published' && (
                  <>
                    <button
                      onClick={handleUnpublish}
                      disabled={unpublishMutation.isPending}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md border border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                    >
                      <FiRotateCcw className="w-3.5 h-3.5" />
                      {unpublishMutation.isPending ? 'Revertiendo...' : 'Revertir'}
                    </button>
                    <button
                      onClick={() => {}}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <FiDownload className="w-3.5 h-3.5" />
                      Exportar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!selectedMonthId ? (
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-12 text-center">
            <FiCalendar className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Selecciona un mes
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Elige un mes existente o crea uno nuevo para comenzar
            </p>
          </div>
        ) : loadingMonth ? (
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
            <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando datos...</p>
          </div>
        ) : monthData ? (
          <div className="space-y-4">
            {/* Stats Summary */}
            <ScheduleStats monthData={monthData} />

            {/* Shift Legend */}
            <ShiftLegend shifts={shifts} />

            {/* Schedule Grid */}
            <ScheduleGrid
              monthData={monthData}
              shiftsMap={shiftsMap}
              onCellClick={handleCellClick}
              editable={monthData.status !== 'published' && monthData.status !== 'archived'}
            />
          </div>
        ) : null}

        {/* Shift Selector Popover */}
        {selectedCell && (
          <ShiftSelector
            shifts={shifts}
            currentShiftCode={selectedCell.currentShiftCode}
            employeeName={selectedCell.employeeName}
            dayNumber={selectedCell.dayNumber}
            position={selectedCell.position}
            onSelect={handleShiftSelect}
            onClose={() => setSelectedCell(null)}
            isLoading={updateAssignmentMutation.isPending}
          />
        )}
      </div>
    </div>
  )
}
