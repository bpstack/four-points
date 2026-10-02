// app/components/scheduling/SchedulingClient.tsx

'use client'

import { useTranslations } from 'next-intl'
import { useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys, downloadSchedulePdf } from '@/app/lib/scheduling'
import { ApiError } from '@/app/lib/apiClient'
import type {
  SchedulingShift,
  SchedulingMonth,
  MonthStatus,
  GenerationWarning,
  BulkAssignmentDto,
} from '@/app/lib/scheduling'
import { ScheduleGrid } from './ScheduleGrid'
import type { BulkSelection } from './ScheduleGrid'
import { MonthSelector } from './MonthSelector'
import { ScheduleStats } from './ScheduleStats'
import { ShiftLegend } from './ShiftLegend'
import { ShiftSelector } from './ShiftSelector'
import { ValidationWarnings } from './ValidationWarnings'
import { MonthInfoPanel } from './MonthInfoPanel'
import { ManageHolidaysModal } from './ManageHolidaysModal'
import { ConfirmDialog } from '@/app/ui/components'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  FiCalendar,
  FiCheck,
  FiSettings,
  FiDownload,
  FiRotateCcw,
  FiTrash2,
  FiCpu,
  FiAlertTriangle,
  FiArrowRight,
  FiArrowLeft,
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

// Mapa de claves camelCase (vienen del solver) a snake_case (formato BD)
const CONFIG_KEY_MAP: Record<string, string> = {
  minMorningStaff: 'min_morning_staff',
  prefMorningStaff: 'pref_morning_staff',
  maxMorningStaff: 'max_morning_staff',
  minAfternoonStaff: 'min_afternoon_staff',
  prefAfternoonStaff: 'pref_afternoon_staff',
  maxAfternoonStaff: 'max_afternoon_staff',
  minNightStaff: 'min_night_staff',
  maxNightStaff: 'max_night_staff',
  maxWeeklyShifts: 'max_weekly_shifts',
  prefWeeklyShifts: 'pref_weekly_shifts',
  minRestHours: 'min_rest_hours',
  minNightBlock: 'min_night_block',
  maxNightBlock: 'max_night_block',
  prefNightBlock: 'pref_night_block',
  minMonthlyLibre: 'min_monthly_libre',
  maxMonthlyLibre: 'max_monthly_libre',
  prefMonthlyLibre: 'pref_monthly_libre',
  maxConsecutiveWorkDays: 'max_consecutive_work_days',
}

export function SchedulingClient() {
  const t = useTranslations('scheduling')
  const tToasts = useTranslations('scheduling.toasts')
  const tActions = useTranslations('scheduling.actions')
  const tMessages = useTranslations('scheduling.messages')
  const tStatus = useTranslations('scheduling.status')

  const queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get year and monthId from URL params
  const currentYear = new Date().getFullYear()
  const yearParam = searchParams.get('year')
  const monthIdParam = searchParams.get('month')

  const selectedYear = yearParam ? parseInt(yearParam, 10) : currentYear
  const selectedMonthId = monthIdParam ? parseInt(monthIdParam, 10) : null

  // Local state for cell selection (doesn't need URL persistence)
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

  // State for validation warnings
  const [validationWarnings, setValidationWarnings] = useState<{
    warnings: GenerationWarning[]
  } | null>(null)

  // Confirm dialog state
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false)
  const [infeasibleModal, setInfeasibleModal] = useState<{
    open: boolean
    constraints: { constraintName: string; humanExplanation: string; employeeIds?: string[] }[]
    relaxations: {
      constraint: string
      currentValue: number
      proposedValue: number
      impact: string
    }[]
  }>({ open: false, constraints: [], relaxations: [] })

  const [relaxationConfirm, setRelaxationConfirm] = useState<{
    constraint: string
    currentValue: number
    proposedValue: number
    impact: string
  } | null>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'reset' | 'delete' | null
  }>({ open: false, type: null })

  // Holidays modal state
  const [showHolidaysModal, setShowHolidaysModal] = useState(false)

  // Bulk multi-cell selection state
  const [bulkSelection, setBulkSelection] = useState<BulkSelection | null>(null)

  // Update URL when year changes
  const setSelectedYear = useCallback(
    (year: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (year === currentYear) {
        params.delete('year')
      } else {
        params.set('year', String(year))
      }
      // Clear month selection when year changes
      params.delete('month')
      const query = params.toString()
      router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams, currentYear]
  )

  // Update URL when month selection changes
  const setSelectedMonthId = useCallback(
    (monthId: number | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (monthId === null) {
        params.delete('month')
      } else {
        params.set('month', String(monthId))
      }
      const query = params.toString()
      router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

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
    refetch: _refetchMonth,
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
      toast.success(tToasts('planningCreated'))
    },
    onError: async (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
        const months = await queryClient.fetchQuery({
          queryKey: schedulingKeys.monthsList({ year: selectedYear }),
          queryFn: () => schedulingApi.getAllMonths({ year: selectedYear }),
        })
        const monthNumber = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
        const existingMonth = months?.months.find((m: SchedulingMonth) => m.month === monthNumber)
        if (existingMonth) {
          setSelectedMonthId(existingMonth.id)
          toast.success(tToasts('monthExists'))
        } else {
          toast.error(tToasts('planningCreateError'))
        }
      } else {
        toast.error(tToasts('planningCreateError'))
      }
    },
  })

  // Update month status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: MonthStatus }) =>
      schedulingApi.updateMonth(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.annualTotals(selectedYear) })
      toast.success(tToasts('statusUpdated'))
    },
    onError: () => {
      toast.error(tToasts('statusUpdateError'))
    },
  })

  // Unpublish month mutation
  const unpublishMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.unpublishMonth(monthId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.annualTotals(selectedYear) })
      toast.success(tToasts('monthReverted'))
    },
    onError: () => {
      toast.error(tToasts('revertError'))
    },
  })

  // Helper: revalidate schedule after any assignment change
  const revalidateSchedule = useCallback((monthId: number) => {
    setTimeout(async () => {
      try {
        const validationResult = await schedulingApi.validateSchedule(monthId)
        const allWarnings = [...validationResult.errors, ...validationResult.warnings]
        setValidationWarnings(allWarnings.length > 0 ? { warnings: allWarnings } : null)
      } catch {
        console.warn('Failed to revalidate schedule after edit')
      }
    }, 100)
  }, [])

  // Update single assignment mutation (no success toast — cell change is visual feedback enough)
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, shiftCode }: { assignmentId: number; shiftCode: string }) =>
      schedulingApi.updateAssignment(assignmentId, { shiftCode }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      setSelectedCell(null)
      if (selectedMonthId) revalidateSchedule(selectedMonthId)
    },
    onError: () => {
      toast.error(tToasts('shiftUpdateError'))
    },
  })

  // Bulk update assignments mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ monthId, assignments }: { monthId: number; assignments: BulkAssignmentDto[] }) =>
      schedulingApi.bulkUpdateAssignments(monthId, assignments),
    onSuccess: async (_, { assignments }) => {
      await queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      setBulkSelection(null)
      setSelectedCell(null)
      toast.success(
        `${assignments.length} turno${assignments.length !== 1 ? 's' : ''} actualizados`
      )
      if (selectedMonthId) revalidateSchedule(selectedMonthId)
    },
    onError: () => {
      toast.error(tToasts('shiftUpdateError'))
    },
  })

  const handleCreateMonth = useCallback(
    (month: number) => {
      createMonthMutation.mutate({ year: selectedYear, month })
    },
    [createMonthMutation, selectedYear]
  )

  // Generate schedule mutation
  const generateMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.generateSchedule(monthId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      toast.success(
        `Horario generado: ${data.assignmentsCreated} turnos en ${data.stats.solveTimeMs}ms`
      )
    },
    onError: (err: unknown) => {
      const e = err as ApiError & { data?: { conflictingConstraints?: { constraintName: string; humanExplanation: string; employeeIds?: string[] }[]; suggestedRelaxations?: { constraint: string; currentValue: number; proposedValue: number; impact: string }[]; error?: string } }
      if (e?.status === 422 && e?.data?.conflictingConstraints) {
        setInfeasibleModal({
          open: true,
          constraints: e.data.conflictingConstraints,
          relaxations: e.data.suggestedRelaxations ?? [],
        })
      } else {
        toast.error(e?.data?.error ?? 'Error generando el horario')
      }
    },
  })

  const handleGenerate = useCallback(() => {
    if (selectedMonthId) setGenerateConfirmOpen(true)
  }, [selectedMonthId])

  // Aplicar relajación sugerida y reintentar generación
  const applyRelaxationMutation = useMutation({
    mutationFn: async (params: { constraint: string; proposedValue: number; monthId: number }) => {
      const dbKey = CONFIG_KEY_MAP[params.constraint] ?? params.constraint
      await schedulingApi.updateConfig(dbKey, String(params.proposedValue))
      return params.monthId
    },
    onSuccess: (monthId) => {
      queryClient.invalidateQueries({ queryKey: ['scheduling', 'config'] })
      setInfeasibleModal({ open: false, constraints: [], relaxations: [] })
      setRelaxationConfirm(null)
      toast.success('Configuración relajada. Reintentando generación…')
      generateMutation.mutate(monthId)
    },
    onError: (err: unknown) => {
      const e = err as ApiError & { data?: { error?: string } }
      toast.error(e?.data?.error ?? 'Error aplicando la relajación')
      setRelaxationConfirm(null)
    },
  })

  // Reset month mutation
  const resetMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.resetMonth(monthId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.month(selectedMonthId!) })
      toast.success(tToasts('resetSuccess'))
    },
    onError: () => {
      toast.error(tToasts('resetError'))
    },
  })

  const handleReset = useCallback(() => {
    if (selectedMonthId) {
      setConfirmDialog({ open: true, type: 'reset' })
    }
  }, [selectedMonthId])

  const handlePublish = useCallback(() => {
    if (selectedMonthId && monthData?.status === 'draft') {
      updateStatusMutation.mutate({ id: selectedMonthId, status: 'published' })
    }
  }, [updateStatusMutation, selectedMonthId, monthData?.status])

  const handleUnpublish = useCallback(() => {
    if (selectedMonthId && monthData?.status === 'published') {
      unpublishMutation.mutate(selectedMonthId)
    }
  }, [unpublishMutation, selectedMonthId, monthData?.status])

  // Delete month mutation
  const deleteMonthMutation = useMutation({
    mutationFn: (monthId: number) => schedulingApi.deleteMonth(monthId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.months() })
      setSelectedMonthId(null)
      toast.success(tToasts('monthDeleted'))
    },
    onError: () => {
      toast.error(tToasts('monthDeleteError'))
    },
  })

  const handleDeleteMonth = useCallback(() => {
    if (selectedMonthId) {
      setConfirmDialog({ open: true, type: 'delete' })
    }
  }, [selectedMonthId])

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

  // Handle shift selection from selector (single cell)
  const handleShiftSelect = useCallback(
    (shiftCode: string) => {
      if (!selectedCell) {
        setSelectedCell(null)
        return
      }

      if (shiftCode === selectedCell.currentShiftCode) {
        setSelectedCell(null)
        return
      }

      if (!selectedCell.assignmentId) {
        if (!selectedMonthId) return
        bulkUpdateMutation.mutate({
          monthId: selectedMonthId,
          assignments: [
            {
              day_id: selectedCell.dayId,
              employee_id: selectedCell.employeeId,
              shift_code: shiftCode,
            },
          ],
        })
        return
      }

      updateAssignmentMutation.mutate({
        assignmentId: selectedCell.assignmentId,
        shiftCode,
      })
    },
    [selectedCell, selectedMonthId, updateAssignmentMutation, bulkUpdateMutation]
  )

  // Handle bulk cell drag selection from grid
  const handleBulkCellSelect = useCallback((selection: BulkSelection) => {
    setBulkSelection(selection)
  }, [])

  // Handle shift selection for bulk cells
  const handleBulkShiftSelect = useCallback(
    (shiftCode: string) => {
      if (!bulkSelection || !selectedMonthId) {
        setBulkSelection(null)
        return
      }

      const assignments: BulkAssignmentDto[] = bulkSelection.cells.map((cell) => ({
        day_id: cell.dayId,
        employee_id: bulkSelection.employeeId,
        shift_code: shiftCode,
      }))

      if (assignments.length === 0) {
        setBulkSelection(null)
        return
      }

      bulkUpdateMutation.mutate({ monthId: selectedMonthId, assignments })
    },
    [bulkSelection, selectedMonthId, bulkUpdateMutation]
  )

  const getStatusConfig = (status: MonthStatus) => {
    const configs: Record<MonthStatus, { color: string; label: string }> = {
      draft: {
        color: 'bg-surface-sunken text-fg-muted border-border',
        label: tStatus('draft'),
      },

      published: {
        color:
          'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        label: tStatus('published'),
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

  return (
    <div className="min-h-screen bg-bg p-4 md:p-6">
      <div className="max-w-[1800px] space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-fg">{t('page.title')}</h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-0.5">{t('page.subtitle')}</p>
          </div>
          <Link
            href="/dashboard/scheduling/config"
            title={tActions('configTooltip')}
            className="inline-flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/10 hover:bg-accent/20 hover:shadow-lg hover:shadow-accent/15 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm active:scale-[0.98] transition-all duration-200 shrink-0 group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-accent/20 group-hover:bg-accent/35 group-hover:rotate-45 transition-all duration-300 shrink-0">
              <FiSettings className="w-4 h-4 text-accent" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-accent leading-tight">{tActions('configButton')}</span>
              <span className="text-xs text-fg-muted leading-tight mt-0.5 group-hover:text-fg-subtle transition-colors">{tActions('configSubtext')}</span>
            </div>
            <span className="shrink-0 text-accent transition-all duration-200">
              <FiArrowRight className="w-4 h-4 group-hover:hidden" />
              <FiArrowLeft className="w-4 h-4 hidden group-hover:block" />
            </span>
          </Link>
        </div>

        {/* Month Selector & Actions */}
        <div className="bg-surface rounded-md border border-border p-4">
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Status Badge */}
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusConfig(monthData.status).color} shrink-0`}
                >
                  {getStatusConfig(monthData.status).label}
                </span>

                {/* Action Buttons - Wrapped container for mobile */}
                <div className="flex flex-wrap items-center gap-2">
                  {monthData.status === 'draft' && (
                    <>
                      <button
                        onClick={() => setShowHolidaysModal(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors whitespace-nowrap"
                      >
                        <FiCalendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tActions('manageHolidays')}</span>
                        <span className="sm:hidden">{tActions('manageHolidaysShort')}</span>
                      </button>
                      <button
                        onClick={handleGenerate}
                        disabled={generateMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600 dark:bg-purple-700 text-white text-xs font-medium rounded-md hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <FiCpu className="w-3.5 h-3.5" />
                        {generateMutation.isPending ? 'Generando...' : 'Generar horario'}
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={resetMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md border border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <FiRotateCcw className="w-3.5 h-3.5" />
                        {resetMutation.isPending ? tActions('resetting') : tActions('reset')}
                      </button>
                      <button
                        onClick={handlePublish}
                        disabled={updateStatusMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <FiCheck className="w-3.5 h-3.5" />
                        {tActions('publish')}
                      </button>
                    </>
                  )}

                  {monthData.status === 'published' && (
                    <>
                      <button
                        onClick={handleUnpublish}
                        disabled={unpublishMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md border border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <FiRotateCcw className="w-3.5 h-3.5" />
                        {unpublishMutation.isPending
                          ? tActions('reverting')
                          : tActions('unpublish')}
                      </button>
                      <button
                        onClick={() => monthData && downloadSchedulePdf(monthData)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-fg text-xs font-medium rounded-md border border-border hover:bg-surface-hover transition-colors whitespace-nowrap"
                      >
                        <FiDownload className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{tActions('exportPdf')}</span>
                        <span className="sm:hidden">PDF</span>
                      </button>
                    </>
                  )}

                  {/* Delete Month Button */}
                  <button
                    onClick={handleDeleteMonth}
                    disabled={deleteMonthMutation.isPending}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-red-700 dark:text-red-400 text-xs font-medium rounded-md border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {deleteMonthMutation.isPending ? tActions('deleting') : tActions('delete')}
                    </span>
                    <span className="sm:hidden">Eliminar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!selectedMonthId ? (
          <div className="bg-surface rounded-md border border-border p-12 text-center">
            <FiCalendar className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
            <h3 className="text-sm font-medium text-fg mb-2">{tMessages('selectMonth')}</h3>
            <p className="text-xs text-fg-muted mb-4">{tMessages('selectMonthHint')}</p>
          </div>
        ) : loadingMonth ? (
          <div className="bg-surface rounded-md border border-border p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
            <p className="mt-3 text-xs text-fg-muted">{tMessages('loadingData')}</p>
          </div>
        ) : monthData ? (
          <div className="space-y-4">
            {/* Validation Warnings */}
            {validationWarnings && validationWarnings.warnings.length > 0 && (
              <ValidationWarnings
                warnings={validationWarnings.warnings}
                onDismiss={() => setValidationWarnings(null)}
              />
            )}

            {/* Stats Summary */}
            <ScheduleStats monthData={monthData} />

            {/* Month Info Panel */}
            <MonthInfoPanel monthId={selectedMonthId!} />

            {/* Shift Legend */}
            <ShiftLegend shifts={shifts} />

            {/* Schedule Grid */}
            <ScheduleGrid
              monthData={monthData}
              shiftsMap={shiftsMap}
              onCellClick={handleCellClick}
              onBulkCellSelect={handleBulkCellSelect}
              editable={monthData.status !== 'published'}
            />
          </div>
        ) : null}

        {/* Shift Selector — single cell */}
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

        {/* Shift Selector — bulk multi-cell drag selection */}
        {bulkSelection && (
          <ShiftSelector
            shifts={shifts}
            currentShiftCode={null}
            employeeName={bulkSelection.employeeName}
            subtitle={`${bulkSelection.cells.length} días seleccionados`}
            position={bulkSelection.position}
            onSelect={handleBulkShiftSelect}
            onClose={() => setBulkSelection(null)}
            isLoading={bulkUpdateMutation.isPending}
          />
        )}

        {/* Confirm dialogs */}
        {/* Modal confirmación: Generar horario */}
        <ConfirmDialog
          isOpen={generateConfirmOpen}
          onClose={() => setGenerateConfirmOpen(false)}
          onConfirm={() => {
            setGenerateConfirmOpen(false)
            generateMutation.mutate(selectedMonthId!)
          }}
          title="Generar horario automático"
          message="El solver calculará un horario completo para este mes respetando las reglas de cobertura y descanso. Las celdas bloqueadas (vacaciones aprobadas, etc.) no se modificarán."
          confirmText="Generar"
          variant="warning"
          isLoading={generateMutation.isPending}
        />

        {/* Modal INFEASIBLE: sin solución posible */}
        {infeasibleModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3">
                <FiAlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <h2 className="text-base font-semibold text-fg">No se puede generar el horario</h2>
              </div>
              <p className="text-sm text-fg-muted">
                Las reglas actuales hacen imposible completar el mes. Causas detectadas:
              </p>
              <ul className="space-y-2">
                {infeasibleModal.constraints.map((c, i) => (
                  <li
                    key={i}
                    className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-2"
                  >
                    <div className="font-medium mb-0.5 text-xs text-red-600 dark:text-red-500">
                      {c.constraintName}
                    </div>
                    <div>{c.humanExplanation}</div>
                  </li>
                ))}
              </ul>
              {infeasibleModal.relaxations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-fg mb-2">
                    Relajaciones sugeridas (aplica una para reintentar):
                  </p>
                  <ul className="space-y-2">
                    {infeasibleModal.relaxations.map((r, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 text-xs bg-surface-sunken rounded px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-fg">
                            <strong>{r.constraint}</strong>: {r.currentValue} → {r.proposedValue}
                          </div>
                          <div className="text-fg-muted mt-0.5">{r.impact}</div>
                        </div>
                        <button
                          onClick={() => setRelaxationConfirm(r)}
                          disabled={applyRelaxationMutation.isPending}
                          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-accent text-accent-fg rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Aplicar
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() =>
                    setInfeasibleModal({ open: false, constraints: [], relaxations: [] })
                  }
                  className="px-4 py-2 text-sm font-medium bg-surface-sunken text-fg rounded-md hover:bg-surface-hover transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm dialog para aplicar relajación */}
        <ConfirmDialog
          isOpen={relaxationConfirm !== null}
          onClose={() => setRelaxationConfirm(null)}
          onConfirm={() => {
            if (relaxationConfirm && selectedMonthId) {
              applyRelaxationMutation.mutate({
                constraint: relaxationConfirm.constraint,
                proposedValue: relaxationConfirm.proposedValue,
                monthId: selectedMonthId,
              })
            }
          }}
          title="Aplicar relajación"
          message={
            relaxationConfirm
              ? `¿Cambiar "${relaxationConfirm.constraint}" de ${relaxationConfirm.currentValue} a ${relaxationConfirm.proposedValue} y reintentar generación? Este cambio afecta la configuración global del hotel.`
              : ''
          }
          confirmText="Aplicar y reintentar"
          cancelText="Cancelar"
          variant="warning"
          isLoading={applyRelaxationMutation.isPending}
        />

        <ConfirmDialog
          isOpen={confirmDialog.open && confirmDialog.type === 'reset'}
          onClose={() => setConfirmDialog({ open: false, type: null })}
          onConfirm={() => {
            setConfirmDialog({ open: false, type: null })
            resetMutation.mutate(selectedMonthId!)
          }}
          title={tActions('reset')}
          message={tActions('resetConfirm')}
          confirmText={tActions('reset')}
          variant="warning"
          isLoading={resetMutation.isPending}
        />
        <ConfirmDialog
          isOpen={confirmDialog.open && confirmDialog.type === 'delete'}
          onClose={() => setConfirmDialog({ open: false, type: null })}
          onConfirm={() => {
            setConfirmDialog({ open: false, type: null })
            deleteMonthMutation.mutate(selectedMonthId!)
          }}
          title={tActions('delete')}
          message={tActions('deleteMonthConfirm')}
          details={[
            tActions('deleteMonthDetail1'),
            tActions('deleteMonthDetail2'),
            tActions('deleteMonthDetail3'),
            tActions('deleteMonthDetail4'),
          ]}
          confirmText={tActions('delete')}
          variant="danger"
          isLoading={deleteMonthMutation.isPending}
        />

        {/* Holidays Modal */}
        {showHolidaysModal && monthData && (
          <ManageHolidaysModal
            monthId={monthData.id}
            year={monthData.year}
            month={monthData.month}
            days={monthData.days}
            onClose={() => setShowHolidaysModal(false)}
          />
        )}
      </div>
    </div>
  )
}
