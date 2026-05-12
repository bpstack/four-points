// controllers/scheduling/scheduling-controller.ts

import { Request, Response } from 'express'
import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import { validateSchedule as validateScheduleService } from '../../services/scheduling/schedule-validator.js'
import {
  createMonthSchema,
  updateMonthSchema,
  updateDaySchema,
  bulkUpdateDaysSchema,
  updateAssignmentSchema,
  bulkUpdateAssignmentsSchema,
  createConstraintSchema,
  updateConstraintSchema,
  approveConstraintSchema,
  createEmployeeRuleSchema,
  updateEmployeeRuleSchema,
  updateConfigSchema,
  monthQuerySchema,
  constraintQuerySchema,
} from '../../validations/scheduling/scheduling-schemas.js'
import type {
  FullMonthResponse,
  SchedulingDay,
  EmployeeSchedule,
  EmployeeStats,
  DailyStats,
  SchedulingConstraint,
  SchedulingShift,
  CreateDayDTO,
  EmployeeContract,
  AnnualTotalsResponse,
} from '../../models/scheduling/index.js'

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

async function initializeMonthGrid(
  monthId: number
): Promise<
  { day_id: number; employee_id: string; shift_code: string; source_constraint_id: number | null }[]
> {
  const monthDays = await repo.getDaysByMonth(monthId)
  const approvedConstraints = await repo.getConstraintsByMonth(monthId, { status: 'approved' })

  const constraintToShiftCode: Record<string, string> = {
    vacation: 'V',
    sick_leave: 'IT',
    sick_day: 'E',
    training: 'FO',
    holiday: 'B',
    request_off: 'L',
  }

  const schedulableEmployees = await repo.getSchedulableEmployees()

  const assignments: {
    day_id: number
    employee_id: string
    shift_code: string
    source_constraint_id: number | null
  }[] = []

  for (const emp of schedulableEmployees) {
    const empConstraints = approvedConstraints.filter((c) => c.employee_id === emp.id)

    for (const day of monthDays) {
      const constraint = empConstraints.find((c) =>
        isDateInRange(day.date, c.start_date, c.end_date)
      )

      let shiftCode = 'L'
      if (constraint) {
        shiftCode =
          constraint.shift_code || constraintToShiftCode[constraint.constraint_type] || 'L'
      }

      assignments.push({
        day_id: day.id,
        employee_id: emp.id,
        shift_code: shiftCode,
        source_constraint_id: constraint?.id ?? null,
      })
    }
  }

  return assignments
}

// ============================================
// HELPER: ZodError handler
// ============================================

function handleZodError(err: unknown, res: Response): boolean {
  const error = err as Error & { name?: string; issues?: unknown[] }
  if (error.name === 'ZodError') {
    const firstIssue = (error.issues?.[0] as { message?: string } | undefined) ?? undefined
    res.status(400).json({
      error: firstIssue?.message || 'Datos inválidos',
      details: error.issues,
    })
    return true
  }
  return false
}

// ============================================
// CONFIG
// ============================================

export async function getAllConfig(_req: Request, res: Response): Promise<void> {
  try {
    const config = await repo.getAllConfig()
    res.json(config)
  } catch (err) {
    console.error('Error getting config:', err)
    res.status(500).json({ error: 'Error al obtener la configuración' })
  }
}

export async function getConfigMap(_req: Request, res: Response): Promise<void> {
  try {
    const configMap = await repo.getConfigMap()
    res.json(configMap)
  } catch (err) {
    console.error('Error getting config map:', err)
    res.status(500).json({ error: 'Error al obtener la configuración' })
  }
}

export async function updateConfig(req: Request, res: Response): Promise<void> {
  try {
    const { key } = req.params
    const data = updateConfigSchema.parse(req.body)

    const updated = await repo.updateConfig(key, data)
    if (!updated) {
      res.status(404).json({ error: 'Configuración no encontrada' })
      return
    }

    res.json({ message: 'Configuración actualizada correctamente' })
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error updating config:', err)
    res.status(500).json({ error: 'Error al actualizar la configuración' })
  }
}

// ============================================
// SHIFTS
// ============================================

export async function getAllShifts(_req: Request, res: Response): Promise<void> {
  try {
    const shifts = await repo.getAllShifts()
    const formatted: SchedulingShift[] = shifts.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      startTime: s.start_time,
      endTime: s.end_time,
      hours: s.hours,
      color: s.color,
      isWorkShift: s.is_work_shift === 1,
      isPaid: s.is_paid === 1,
      displayOrder: s.display_order,
      isActive: s.is_active === 1,
    }))
    res.json(formatted)
  } catch (err) {
    console.error('Error getting shifts:', err)
    res.status(500).json({ error: 'Error al obtener los turnos' })
  }
}

export async function getShiftById(req: Request, res: Response): Promise<void> {
  try {
    const shiftId = parseInt(req.params.id)
    if (isNaN(shiftId)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const shift = await repo.getShiftById(shiftId)
    if (!shift) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    res.json({
      id: shift.id,
      code: shift.code,
      name: shift.name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      hours: shift.hours,
      color: shift.color,
      isWorkShift: shift.is_work_shift === 1,
      isPaid: shift.is_paid === 1,
      displayOrder: shift.display_order,
      isActive: shift.is_active === 1,
    })
  } catch (err) {
    console.error('Error getting shift:', err)
    res.status(500).json({ error: 'Error al obtener el turno' })
  }
}

export async function createShift(req: Request, res: Response): Promise<void> {
  try {
    const { code, name, startTime, endTime, hours, color, isWorkShift, isPaid, displayOrder } =
      req.body

    if (!code || !name || hours === undefined) {
      res.status(400).json({ error: 'Código, nombre y horas son requeridos' })
      return
    }

    // Check if code already exists
    const existing = await repo.getShiftByCode(code)
    if (existing) {
      res.status(400).json({ error: 'Ya existe un turno con ese código' })
      return
    }

    const shiftId = await repo.createShift({
      code,
      name,
      start_time: startTime || null,
      end_time: endTime || null,
      hours,
      color: color || '#6b7280',
      is_work_shift: isWorkShift ?? false,
      is_paid: isPaid ?? false,
      display_order: displayOrder ?? 99,
    })

    res.status(201).json({ id: shiftId, message: 'Turno creado correctamente' })
  } catch (err) {
    console.error('Error creating shift:', err)
    res.status(500).json({ error: 'Error al crear el turno' })
  }
}

export async function updateShift(req: Request, res: Response): Promise<void> {
  try {
    const shiftId = parseInt(req.params.id)
    if (isNaN(shiftId)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const shift = await repo.getShiftById(shiftId)
    if (!shift) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    const {
      code,
      name,
      startTime,
      endTime,
      hours,
      color,
      isWorkShift,
      isPaid,
      displayOrder,
      isActive,
    } = req.body

    // If changing code, check it doesn't conflict with another shift
    if (code && code !== shift.code) {
      const existing = await repo.getShiftByCode(code)
      if (existing && existing.id !== shiftId) {
        res.status(400).json({ error: 'Ya existe otro turno con ese código' })
        return
      }
    }

    const updated = await repo.updateShift(shiftId, {
      code,
      name,
      start_time: startTime,
      end_time: endTime,
      hours,
      color,
      is_work_shift: isWorkShift,
      is_paid: isPaid,
      display_order: displayOrder,
      is_active: isActive,
    })

    if (updated) {
      res.json({ message: 'Turno actualizado correctamente' })
    } else {
      res.status(400).json({ error: 'No se realizaron cambios' })
    }
  } catch (err) {
    console.error('Error updating shift:', err)
    res.status(500).json({ error: 'Error al actualizar el turno' })
  }
}

export async function deleteShift(req: Request, res: Response): Promise<void> {
  try {
    const shiftId = parseInt(req.params.id)
    if (isNaN(shiftId)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const shift = await repo.getShiftById(shiftId)
    if (!shift) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    // Soft delete (marks as inactive)
    const deleted = await repo.deleteShift(shiftId)

    if (deleted) {
      res.json({ message: 'Turno eliminado correctamente' })
    } else {
      res.status(400).json({ error: 'No se pudo eliminar el turno' })
    }
  } catch (err) {
    console.error('Error deleting shift:', err)
    res.status(500).json({ error: 'Error al eliminar el turno' })
  }
}

// ============================================
// MONTHS
// ============================================

export async function getAllMonths(req: Request, res: Response): Promise<void> {
  try {
    const query = monthQuerySchema.parse(req.query)
    const months = await repo.getAllMonths(query)
    res.json({ months, total: months.length })
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error getting months:', err)
    res.status(500).json({ error: 'Error al obtener los meses' })
  }
}

export async function getMonthById(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const month = await repo.getMonthById(monthId)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    // Get full data for the month
    const [days, assignments, constraints, schedulableEmployees] = await Promise.all([
      repo.getDaysByMonth(monthId),
      repo.getAssignmentsByMonth(monthId),
      repo.getConstraintsByMonth(monthId),
      repo.getSchedulableEmployees(),
    ])

    // Create Map for O(1) day lookups instead of O(n) array.find()
    const daysById = new Map(days.map((d) => [d.id, d]))

    // Build base employee map from schedulable employees (config)
    const employeeMap = new Map<string, { id: string; name: string }>()
    schedulableEmployees.forEach((emp) => {
      employeeMap.set(emp.id, { id: emp.id, name: emp.username })
    })

    // Ensure we also include any employees that have assignments but are not in schedulable list
    assignments.forEach((a) => {
      if (!employeeMap.has(a.employee_id)) {
        employeeMap.set(a.employee_id, { id: a.employee_id, name: a.employee_name })
      }
    })

    // Build employee schedules with stats for all mapped employees
    const employees: EmployeeSchedule[] = []
    employeeMap.forEach((emp) => {
      const empAssignments = assignments.filter((a) => a.employee_id === emp.id)

      // Build assignments as object keyed by day number (frontend expects this format)
      const assignmentsMap: {
        [dayNumber: number]: {
          id: number
          shiftCode: string
          sourceConstraintId?: number | null
          notes: string | null
          libreNumber?: number | null
        }
      } = {}
      empAssignments.forEach((a) => {
        const day = daysById.get(a.day_id) // O(1) lookup
        if (day) {
          assignmentsMap[day.day_number] = {
            id: a.id,
            shiftCode: a.shift_code,
            sourceConstraintId: a.source_constraint_id,
            notes: a.notes,
            libreNumber: a.libre_number ?? null,
          }
        }
      })

      // Calculate stats
      const stats: EmployeeStats = {
        L: 0,
        V: 0,
        B: 0,
        E: 0,
        IT: 0,
        M: 0,
        T: 0,
        N: 0,
        PI: 0,
        P: 0,
        FO: 0,
        A: 0,
        presencias: 0,
        horas: 0,
      }

      empAssignments.forEach((a) => {
        const code = a.shift_code.toUpperCase()
        if (code === 'L' || code.startsWith('L')) stats.L++
        else if (code === 'V') stats.V++
        else if (code === 'B') stats.B++
        else if (code === 'E') stats.E++
        else if (code === 'IT') stats.IT++
        else if (code === 'M') stats.M++
        else if (code === 'T') stats.T++
        else if (code === 'N') stats.N++
        else if (code === 'PI') stats.PI++
        else if (code === 'P') stats.P++
        else if (code === 'FO') stats.FO++
        else if (code === 'A') stats.A++
      })

      stats.presencias = stats.M + stats.T + stats.N + stats.PI + stats.P
      stats.horas = stats.presencias * 8

      employees.push({
        id: emp.id,
        name: emp.name,
        assignments: assignmentsMap,
        stats,
      })
    })

    // Calculate daily stats - pre-group assignments by day_id for O(1) lookup
    const assignmentsByDayId = new Map<number, typeof assignments>()
    assignments.forEach((a) => {
      const dayAssignments = assignmentsByDayId.get(a.day_id) || []
      dayAssignments.push(a)
      assignmentsByDayId.set(a.day_id, dayAssignments)
    })

    const dailyStats: DailyStats[] = days.map((d) => {
      const dayAssignments = assignmentsByDayId.get(d.id) || []
      let M = 0,
        T = 0,
        N = 0,
        PI = 0,
        P = 0
      dayAssignments.forEach((a) => {
        if (a.shift_code === 'M') M++
        else if (a.shift_code === 'T') T++
        else if (a.shift_code === 'N') N++
        else if (a.shift_code === 'PI') PI++
        else if (a.shift_code === 'P') P++
      })
      return { day: d.day_number, M, T, N, PI, P }
    })

    // Format constraints
    const formattedConstraints: SchedulingConstraint[] = constraints.map((c) => ({
      id: c.id,
      employeeId: c.employee_id,
      employeeName: c.employee_name,
      constraintType: c.constraint_type,
      startDate: c.start_date,
      endDate: c.end_date,
      shiftCode: c.shift_code,
      status: c.status,
      priority: c.priority,
      notes: c.notes,
      createdBy: c.created_by,
      createdByName: c.created_by_name,
      approvedBy: c.approved_by,
      approvedByName: c.approved_by_name,
      approvedAt: c.approved_at ? c.approved_at.toISOString() : null,
    }))

    // Format days
    const formattedDays: SchedulingDay[] = days.map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      date: d.date,
      dayOfWeek: d.day_of_week,
      weekNumber: d.week_number,
      isHoliday: d.is_holiday === 1,
      holidayName: d.holiday_name,
      occupancyPct: d.occupancy_pct,
      arrivals: d.arrivals,
      departures: d.departures,
      notes: d.notes,
    }))

    const response: FullMonthResponse = {
      id: month.id,
      year: month.year,
      month: month.month,
      status: month.status,
      publishedAt: month.published_at ? month.published_at.toISOString() : null,
      publishedBy: month.published_by_name,
      notes: month.notes,
      days: formattedDays,
      employees,
      dailyStats,
      constraints: formattedConstraints,
    }

    res.json(response)
  } catch (err) {
    console.error('Error getting month:', err)
    res.status(500).json({ error: 'Error al obtener el mes' })
  }
}

// ============================================
// MONTH INFO
// ============================================

/**
 * GET /months/:id/info
 * Returns informational data about the month: rules and approved requests
 */
export async function getMonthInfo(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const month = await repo.getMonthById(monthId)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    // Get approved constraints for this month
    const approvedConstraints = await repo.getConstraintsByMonth(monthId, { status: 'approved' })

    // Get employee rules
    const allRules = await repo.getAllEmployeeRules()

    // Get schedulable employees
    const schedulableEmployees = await repo.getSchedulableEmployees()

    // Format approved constraints as readable info
    const requestsInfo = approvedConstraints.map((c) => {
      const typeLabels: Record<string, string> = {
        vacation: 'Vacaciones',
        sick_leave: 'Baja médica (IT)',
        sick_day: 'Enfermedad',
        training: 'Formación',
        holiday: 'Festivo',
        request_off: 'Día libre',
        request_shift: 'Petición de turno',
      }

      return {
        id: c.id,
        employeeId: c.employee_id,
        employeeName: c.employee_name,
        type: c.constraint_type,
        typeLabel: typeLabels[c.constraint_type] || c.constraint_type,
        startDate: c.start_date,
        endDate: c.end_date,
        shiftCode: c.shift_code,
        notes: c.notes,
      }
    })

    // Format employee rules as readable info
    const rulesInfo = schedulableEmployees
      .map((emp) => {
        const empRules = allRules.filter((r) => r.employee_id === emp.id)
        if (empRules.length === 0) return null

        const rules: string[] = []
        for (const rule of empRules) {
          switch (rule.rule_type) {
            case 'fixed_shift':
              rules.push(`Turno fijo: ${rule.rule_value}`)
              break
            case 'no_weekends':
              rules.push('Sin fines de semana')
              break
            case 'shift_priority':
              rules.push(`Prioridad: ${rule.rule_value}`)
              break
            case 'fixed_days':
              rules.push(`Días fijos: ${rule.rule_value}`)
              break
            case 'max_shift_per_month':
              rules.push(`Máx turnos: ${rule.rule_value}`)
              break
            case 'min_shift_per_month':
              rules.push(`Mín turnos: ${rule.rule_value}`)
              break
          }
        }

        return rules.length > 0
          ? {
              employeeId: emp.id,
              employeeName: emp.username,
              rules,
            }
          : null
      })
      .filter(Boolean)

    res.json({
      month: {
        id: month.id,
        year: month.year,
        month: month.month,
        status: month.status,
      },
      requests: requestsInfo,
      employeeRules: rulesInfo,
      summary: {
        totalRequests: requestsInfo.length,
        totalEmployeesWithRules: rulesInfo.length,
      },
    })
  } catch (err) {
    console.error('Error getting month info:', err)
    res.status(500).json({ error: 'Error al obtener información del mes' })
  }
}

export async function createMonth(req: Request, res: Response): Promise<void> {
  try {
    const data = createMonthSchema.parse(req.body)
    const userId = req.user!.id

    // Check if month already exists
    const existing = await repo.getMonthByYearMonth(data.year, data.month)
    if (existing) {
      res.status(409).json({ error: 'Ya existe un planning para este mes' })
      return
    }

    // Create month
    const monthId = await repo.createMonth({
      ...data,
      created_by: userId,
    })

    // Create days for the month
    const daysInMonth = repo.getDaysInMonth(data.year, data.month)
    const daysData: CreateDayDTO[] = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(data.year, data.month - 1, day)
      const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayOfWeek = repo.getDayOfWeek(date)
      const weekNumber = repo.getWeekNumber(date, new Date(data.year, data.month - 1, 1))

      daysData.push({
        month_id: monthId,
        day_number: day,
        date: dateStr,
        day_of_week: dayOfWeek,
        week_number: weekNumber,
      })
    }

    await repo.createDaysBulk(daysData)

    // Pre-load approved constraints as assignments
    const assignments = await initializeMonthGrid(monthId)

    // Save assignments if any
    if (assignments.length > 0) {
      await repo.createAssignmentsBulk(monthId, assignments)
      console.log(`[createMonth] Initialized ${assignments.length} assignments`)

      // Number libre pairs immediately after seeding
      const uniqueEmployees = new Set(assignments.map((a) => a.employee_id))
      for (const empId of uniqueEmployees) {
        await repo.recalculateLibreNumbers(empId, data.year)
      }
    }

    // Log history
    await repo.createHistory(monthId, 'created', userId)

    const month = await repo.getMonthById(monthId)
    res.status(201).json(month)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error creating month:', err)
    res.status(500).json({ error: 'Error al crear el mes' })
  }
}

// ============================================
// RESET MONTH
// ============================================

export async function resetMonth(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const userId = req.user!.id

    // Get month
    const month = await repo.getMonthById(monthId)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    // Only allow reset in draft status
    if (month.status !== 'draft') {
      res.status(400).json({ error: 'Solo se puede resetear un mes en estado draft' })
      return
    }

    // Fix dates in scheduling_days (timezone issue fix)
    const fixedCount = await repo.fixMonthDates(monthId, month.year, month.month)
    console.log(`[resetMonth] Fixed ${fixedCount} day dates for month ${monthId}`)

    // Delete all assignments
    await repo.deleteAllAssignmentsByMonth(monthId)
    console.log(`[resetMonth] Deleted all assignments for month ${monthId}`)

    // Re-pre-load approved constraints as assignments
    const assignments = await initializeMonthGrid(monthId)

    // Save assignments if any
    if (assignments.length > 0) {
      await repo.createAssignmentsBulk(monthId, assignments)
      console.log(`[resetMonth] Initialized ${assignments.length} assignments`)

      // Number libre pairs immediately after seeding
      const uniqueEmployees = new Set(assignments.map((a) => a.employee_id))
      for (const empId of uniqueEmployees) {
        await repo.recalculateLibreNumbers(empId, month.year)
      }
    }

    // Log history
    await repo.createHistory(monthId, 'reset', userId)

    res.json({
      success: true,
      message: 'Mes reseteado correctamente',
      assignmentsCount: assignments.length,
    })
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error resetting month:', err)
    res.status(500).json({ error: 'Error al resetear el mes' })
  }
}

export async function updateMonth(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const data = updateMonthSchema.parse(req.body)
    const userId = req.user!.id

    const existing = await repo.getMonthById(monthId)
    if (!existing) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    // Handle status changes
    if (data.status === 'published' && existing.status !== 'published') {
      await repo.updateMonth(monthId, {
        ...data,
        published_at: new Date(),
        published_by: userId,
      })
      await repo.createHistory(monthId, 'published', userId)
    } else {
      await repo.updateMonth(monthId, data)
    }

    const month = await repo.getMonthById(monthId)
    res.json(month)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error updating month:', err)
    res.status(500).json({ error: 'Error al actualizar el mes' })
  }
}

export async function deleteMonth(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const existing = await repo.getMonthById(monthId)
    if (!existing) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    if (existing.status === 'published') {
      res.status(400).json({ error: 'No se puede eliminar un mes publicado' })
      return
    }

    await repo.deleteMonth(monthId)
    res.json({ message: 'Mes eliminado correctamente' })
  } catch (err) {
    console.error('Error deleting month:', err)
    res.status(500).json({ error: 'Error al eliminar el mes' })
  }
}

// ============================================
// DAYS
// ============================================

export async function updateDay(req: Request, res: Response): Promise<void> {
  try {
    const dayId = parseInt(req.params.dayId)
    if (isNaN(dayId)) {
      res.status(400).json({ error: 'ID de día inválido' })
      return
    }

    const data = updateDaySchema.parse(req.body)

    const existing = await repo.getDayById(dayId)
    if (!existing) {
      res.status(404).json({ error: 'Día no encontrado' })
      return
    }

    await repo.updateDay(dayId, data)
    const day = await repo.getDayById(dayId)
    res.json(day)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error updating day:', err)
    res.status(500).json({ error: 'Error al actualizar el día' })
  }
}

export async function bulkUpdateDays(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const data = bulkUpdateDaysSchema.parse(req.body)

    // Verify month exists
    const month = await repo.getMonthById(monthId)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    const updatedCount = await repo.bulkUpdateDays(data.days)

    res.json({
      success: true,
      message: `${updatedCount} día(s) actualizado(s) correctamente`,
      updatedCount,
    })
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error bulk updating days:', err)
    res.status(500).json({ error: 'Error al actualizar los días' })
  }
}

// ============================================
// ASSIGNMENTS
// ============================================

export async function updateAssignment(req: Request, res: Response): Promise<void> {
  try {
    const assignmentId = parseInt(req.params.assignmentId)
    if (isNaN(assignmentId)) {
      res.status(400).json({ error: 'ID de asignación inválido' })
      return
    }

    const data = updateAssignmentSchema.parse(req.body)
    const userId = req.user!.id

    const existing = await repo.getAssignmentById(assignmentId)
    if (!existing) {
      res.status(404).json({ error: 'Asignación no encontrada' })
      return
    }

    if (existing.source_constraint_id) {
      res.status(409).json({
        error: 'Esta celda está bloqueada por una petición aprobada y no se puede editar',
      })
      return
    }

    // Validate shift exists
    const shift = await repo.getShiftByCode(data.shift_code)
    if (!shift) {
      res.status(400).json({ error: 'Código de turno inválido' })
      return
    }

    await repo.updateAssignment(assignmentId, {
      ...data,
    })

    if (data.shift_code === 'L' || existing.shift_code === 'L') {
      const month = await repo.getMonthById(existing.month_id)
      if (month) {
        await repo.recalculateLibreNumbers(existing.employee_id, month.year)
      }
    }

    // Log history
    await repo.createHistory(existing.month_id, 'assignment_changed', userId, {
      tableAffected: 'scheduling_assignments',
      recordId: assignmentId,
      fieldChanged: 'shift_code',
      oldValue: existing.shift_code,
      newValue: data.shift_code,
    })

    res.json({ message: 'Asignación actualizada correctamente' })
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error updating assignment:', err)
    res.status(500).json({ error: 'Error al actualizar la asignación' })
  }
}

export async function bulkUpdateAssignments(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const data = bulkUpdateAssignmentsSchema.parse(req.body)
    const userId = req.user!.id

    const month = await repo.getMonthById(monthId)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    // Validate all shift codes
    const shifts = await repo.getAllShifts()
    const validCodes = new Set(shifts.map((s) => s.code))

    for (const assignment of data.assignments) {
      if (!validCodes.has(assignment.shift_code)) {
        res.status(400).json({ error: `Código de turno inválido: ${assignment.shift_code}` })
        return
      }
    }

    // Prevent editing locked cells (preloaded from approved constraints)
    for (const assignment of data.assignments) {
      const existing = await repo.getAssignmentByDayEmployee(
        assignment.day_id,
        assignment.employee_id
      )
      if (existing?.source_constraint_id) {
        res.status(409).json({
          error:
            'Hay celdas bloqueadas por peticiones aprobadas. No se pueden editar desde bulk update.',
        })
        return
      }
    }

    // Upsert each assignment
    for (const assignment of data.assignments) {
      await repo.upsertAssignment({
        month_id: monthId,
        day_id: assignment.day_id,
        employee_id: assignment.employee_id,
        shift_code: assignment.shift_code,
      })
    }

    const affectedEmployees = new Set(data.assignments.map((a) => a.employee_id))
    for (const empId of affectedEmployees) {
      await repo.recalculateLibreNumbers(empId, month.year)
    }

    // Log history
    await repo.createHistory(monthId, 'manual_edit', userId, {
      notes: `Actualización masiva de ${data.assignments.length} asignaciones`,
    })

    res.json({ message: `${data.assignments.length} asignaciones actualizadas` })
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error bulk updating assignments:', err)
    res.status(500).json({ error: 'Error al actualizar las asignaciones' })
  }
}

// ============================================
// CONSTRAINTS
// ============================================

export async function getConstraintsByMonth(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const query = constraintQuerySchema.parse(req.query)
    const constraints = await repo.getConstraintsByMonth(monthId, query)

    // Transform to camelCase for frontend
    const formatted = constraints.map((c) => ({
      id: c.id,
      monthId: c.month_id,
      employeeId: c.employee_id,
      employeeName: c.employee_name,
      constraintType: c.constraint_type,
      startDate: c.start_date,
      endDate: c.end_date,
      shiftCode: c.shift_code,
      status: c.status,
      priority: c.priority,
      notes: c.notes,
      createdBy: c.created_by,
      createdByName: c.created_by_name,
      approvedBy: c.approved_by,
      approvedByName: c.approved_by_name,
      approvedAt: c.approved_at ? c.approved_at.toISOString() : null,
      createdAt: c.created_at ? c.created_at.toISOString() : null,
    }))

    res.json(formatted)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error getting constraints:', err)
    res.status(500).json({ error: 'Error al obtener las restricciones' })
  }
}

export async function createConstraint(req: Request, res: Response): Promise<void> {
  try {
    const data = createConstraintSchema.parse(req.body)
    const userId = req.user!.id

    // Verify month exists
    const month = await repo.getMonthById(data.month_id)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    const constraintId = await repo.createConstraint({
      ...data,
      created_by: userId,
    })

    // Log history
    await repo.createHistory(data.month_id, 'constraint_added', userId, {
      tableAffected: 'scheduling_constraints',
      recordId: constraintId,
    })

    const constraint = await repo.getConstraintById(constraintId)
    res.status(201).json(constraint)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error creating constraint:', err)
    res.status(500).json({ error: 'Error al crear la restricción' })
  }
}

export async function updateConstraint(req: Request, res: Response): Promise<void> {
  try {
    const constraintId = parseInt(req.params.constraintId)
    if (isNaN(constraintId)) {
      res.status(400).json({ error: 'ID de restricción inválido' })
      return
    }

    const data = updateConstraintSchema.parse(req.body)

    const existing = await repo.getConstraintById(constraintId)
    if (!existing) {
      res.status(404).json({ error: 'Restricción no encontrada' })
      return
    }

    await repo.updateConstraint(constraintId, data)
    const constraint = await repo.getConstraintById(constraintId)
    res.json(constraint)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error updating constraint:', err)
    res.status(500).json({ error: 'Error al actualizar la restricción' })
  }
}

export async function approveConstraint(req: Request, res: Response): Promise<void> {
  try {
    const constraintId = parseInt(req.params.constraintId)
    if (isNaN(constraintId)) {
      res.status(400).json({ error: 'ID de restricción inválido' })
      return
    }

    const data = approveConstraintSchema.parse(req.body)
    const userId = req.user!.id

    const existing = await repo.getConstraintById(constraintId)
    if (!existing) {
      res.status(404).json({ error: 'Restricción no encontrada' })
      return
    }

    await repo.updateConstraint(constraintId, {
      status: data.status,
      notes: data.notes,
      approved_by: userId,
      approved_at: new Date(),
    })

    // Sync assignments when approving or rejecting
    const monthDays = await repo.getDaysByMonth(existing.month_id)
    const affectedDays = monthDays.filter((d) =>
      isDateInRange(d.date, existing.start_date, existing.end_date)
    )

    if (data.status === 'approved') {
      const constraintToShiftCode: Record<string, string> = {
        vacation: 'V',
        sick_leave: 'IT',
        sick_day: 'E',
        training: 'FO',
        holiday: 'B',
        request_off: 'L',
      }
      const shiftCode =
        existing.shift_code || constraintToShiftCode[existing.constraint_type] || 'L'

      for (const day of affectedDays) {
        const assignment = await repo.getAssignmentByDayEmployee(day.id, existing.employee_id)
        if (assignment) {
          await repo.updateAssignment(assignment.id, {
            shift_code: shiftCode,
            source_constraint_id: constraintId,
          })
        }
      }
    } else if (data.status === 'rejected' && existing.status === 'approved') {
      // Was approved before — clear the lock and reset to 'L'
      for (const day of affectedDays) {
        const assignment = await repo.getAssignmentByDayEmployee(day.id, existing.employee_id)
        if (assignment && assignment.source_constraint_id === constraintId) {
          await repo.updateAssignment(assignment.id, {
            shift_code: 'L',
            source_constraint_id: null,
          })
        }
      }
    }

    // Log history
    const action = data.status === 'approved' ? 'constraint_approved' : 'constraint_rejected'
    await repo.createHistory(existing.month_id, action, userId, {
      tableAffected: 'scheduling_constraints',
      recordId: constraintId,
    })

    const constraint = await repo.getConstraintById(constraintId)
    res.json(constraint)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error approving constraint:', err)
    res.status(500).json({ error: 'Error al aprobar/rechazar la restricción' })
  }
}

export async function deleteConstraint(req: Request, res: Response): Promise<void> {
  try {
    const constraintId = parseInt(req.params.constraintId)
    if (isNaN(constraintId)) {
      res.status(400).json({ error: 'ID de restricción inválido' })
      return
    }

    const existing = await repo.getConstraintById(constraintId)
    if (!existing) {
      res.status(404).json({ error: 'Restricción no encontrada' })
      return
    }

    await repo.deleteConstraint(constraintId)
    res.json({ message: 'Restricción eliminada correctamente' })
  } catch (err) {
    console.error('Error deleting constraint:', err)
    res.status(500).json({ error: 'Error al eliminar la restricción' })
  }
}

// ============================================
// EMPLOYEE RULES
// ============================================

export async function getAllEmployeeRules(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await repo.getAllEmployeeRules()
    const rules = rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      ruleType: r.rule_type,
      ruleValue: r.rule_value,
      priority: r.priority,
      isActive: r.is_active === 1,
      notes: r.notes,
      createdAt: r.created_at,
    }))
    res.json({ rules, total: rules.length })
  } catch (err) {
    console.error('Error getting employee rules:', err)
    res.status(500).json({ error: 'Error al obtener las reglas de empleados' })
  }
}

export async function getEmployeeRulesByEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params
    const rules = await repo.getEmployeeRulesByEmployee(employeeId)
    res.json(rules)
  } catch (err) {
    console.error('Error getting employee rules:', err)
    res.status(500).json({ error: 'Error al obtener las reglas del empleado' })
  }
}

export async function createEmployeeRule(req: Request, res: Response): Promise<void> {
  try {
    const data = createEmployeeRuleSchema.parse(req.body)
    const ruleId = await repo.createEmployeeRule(data)
    const rule = await repo.getEmployeeRuleById(ruleId)
    res.status(201).json(rule)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error creating employee rule:', err)
    res.status(500).json({ error: 'Error al crear la regla del empleado' })
  }
}

export async function updateEmployeeRule(req: Request, res: Response): Promise<void> {
  try {
    const ruleId = parseInt(req.params.ruleId)
    if (isNaN(ruleId)) {
      res.status(400).json({ error: 'ID de regla inválido' })
      return
    }

    const data = updateEmployeeRuleSchema.parse(req.body)

    const existing = await repo.getEmployeeRuleById(ruleId)
    if (!existing) {
      res.status(404).json({ error: 'Regla no encontrada' })
      return
    }

    await repo.updateEmployeeRule(ruleId, data)
    const rule = await repo.getEmployeeRuleById(ruleId)
    res.json(rule)
  } catch (err) {
    if (handleZodError(err, res)) return
    console.error('Error updating employee rule:', err)
    res.status(500).json({ error: 'Error al actualizar la regla del empleado' })
  }
}

export async function deleteEmployeeRule(req: Request, res: Response): Promise<void> {
  try {
    const ruleId = parseInt(req.params.ruleId)
    if (isNaN(ruleId)) {
      res.status(400).json({ error: 'ID de regla inválido' })
      return
    }

    const existing = await repo.getEmployeeRuleById(ruleId)
    if (!existing) {
      res.status(404).json({ error: 'Regla no encontrada' })
      return
    }

    await repo.deleteEmployeeRule(ruleId)
    res.json({ message: 'Regla eliminada correctamente' })
  } catch (err) {
    console.error('Error deleting employee rule:', err)
    res.status(500).json({ error: 'Error al eliminar la regla del empleado' })
  }
}

// ============================================
// HISTORY
// ============================================

export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const history = await repo.getHistoryByMonth(monthId)
    res.json(history)
  } catch (err) {
    console.error('Error getting history:', err)
    res.status(500).json({ error: 'Error al obtener el historial' })
  }
}

export async function validateSchedule(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const month = await repo.getMonthById(monthId)
    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    // Use the validation service
    const result = await validateScheduleService(monthId)

    if (!result) {
      res.status(500).json({ error: 'Error al crear el validador' })
      return
    }

    console.log(
      `[ValidateSchedule] Month ${monthId}: ${result.stats.totalErrors} errors, ${result.stats.totalWarnings} warnings`
    )
    if (result.errors.length > 0) {
      console.log(`[ValidateSchedule] Errors:`, result.errors.map((e) => e.message).slice(0, 5))
    }

    res.json(result)
  } catch (err) {
    console.error('Error validating schedule:', err)
    res.status(500).json({ error: 'Error al validar el horario' })
  }
}

/**
 * Unpublish a month - revert from 'published' to 'draft' status
 * This allows editing the schedule and re-publishing to update totals
 */
export async function unpublishMonth(req: Request, res: Response): Promise<void> {
  try {
    const monthId = parseInt(req.params.id)
    if (isNaN(monthId)) {
      res.status(400).json({ error: 'ID de mes inválido' })
      return
    }

    const userId = req.user!.id
    const month = await repo.getMonthById(monthId)

    if (!month) {
      res.status(404).json({ error: 'Mes no encontrado' })
      return
    }

    if (month.status !== 'published') {
      res.status(400).json({ error: 'El mes no está publicado' })
      return
    }

    // Revert to draft status, clear published info
    await repo.updateMonth(monthId, {
      status: 'draft',
      published_at: null,
      published_by: null,
    })

    // Log history
    await repo.createHistory(monthId, 'unpublished', userId, {
      notes: 'Mes revertido a estado draft para permitir edición',
    })

    const updatedMonth = await repo.getMonthById(monthId)
    res.json({
      success: true,
      message: 'Mes revertido a estado draft',
      month: updatedMonth,
    })
  } catch (err) {
    console.error('Error unpublishing month:', err)
    res.status(500).json({ error: 'Error al revertir la publicación' })
  }
}

// ============================================
// SCHEDULABLE EMPLOYEES
// ============================================

export async function getSchedulableEmployees(_req: Request, res: Response): Promise<void> {
  try {
    const employees = await repo.getSchedulableEmployees()
    res.json(employees)
  } catch (err) {
    console.error('Error getting schedulable employees:', err)
    res.status(500).json({ error: 'Error al obtener empleados' })
  }
}

export async function getAllEmployeesWithStatus(_req: Request, res: Response): Promise<void> {
  try {
    const employees = await repo.getAllEmployeesWithSchedulableStatus()
    res.json(employees)
  } catch (err) {
    console.error('Error getting employees with status:', err)
    res.status(500).json({ error: 'Error al obtener empleados' })
  }
}

export async function addSchedulableEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params
    const userId = req.user?.id

    await repo.addSchedulableEmployee(employeeId, userId)
    res.json({ success: true, message: 'Empleado añadido a horarios' })
  } catch (err) {
    console.error('Error adding schedulable employee:', err)
    res.status(500).json({ error: 'Error al añadir empleado' })
  }
}

export async function removeSchedulableEmployee(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params

    await repo.removeSchedulableEmployee(employeeId)
    res.json({ success: true, message: 'Empleado removido de horarios' })
  } catch (err) {
    console.error('Error removing schedulable employee:', err)
    res.status(500).json({ error: 'Error al remover empleado' })
  }
}

export async function setSchedulableEmployees(req: Request, res: Response): Promise<void> {
  try {
    const { employeeIds } = req.body
    const userId = req.user?.id

    if (!Array.isArray(employeeIds)) {
      res.status(400).json({ error: 'employeeIds debe ser un array' })
      return
    }

    await repo.setSchedulableEmployees(employeeIds, userId)
    res.json({ success: true, message: `${employeeIds.length} empleados configurados` })
  } catch (err) {
    console.error('Error setting schedulable employees:', err)
    res.status(500).json({ error: 'Error al configurar empleados' })
  }
}

// ============================================
// EMPLOYEE CONTRACTS
// ============================================

export async function getContractsByYear(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year)
    if (isNaN(year)) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    const contracts = await repo.getContractsByYear(year)

    // Transform to camelCase for frontend
    const formatted: EmployeeContract[] = contracts.map((c) => ({
      id: c.id,
      employeeId: c.employee_id,
      employeeName: c.employee_name,
      year: c.year,
      diasTrabajo: c.dias_trabajo,
      horasAnuales: c.horas_anuales,
      diasVacaciones: c.dias_vacaciones,
      diasLibreSemanal: c.dias_libre_semanal,
      diasBonificables: c.dias_bonificables,
      diasIt: c.dias_it,
      diasLaborablesAno: c.dias_laborables_ano,
      observaciones: c.observaciones,
    }))

    res.json(formatted)
  } catch (err) {
    console.error('Error getting contracts:', err)
    res.status(500).json({ error: 'Error al obtener contratos' })
  }
}

export async function getContractByEmployeeYear(req: Request, res: Response): Promise<void> {
  try {
    const { employeeId } = req.params
    const year = parseInt(req.params.year)

    if (isNaN(year)) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    const contract = await repo.getContractByEmployeeYear(employeeId, year)

    if (!contract) {
      res.status(404).json({ error: 'Contrato no encontrado' })
      return
    }

    res.json({
      id: contract.id,
      employeeId: contract.employee_id,
      year: contract.year,
      diasTrabajo: contract.dias_trabajo,
      horasAnuales: contract.horas_anuales,
      diasVacaciones: contract.dias_vacaciones,
      diasLibreSemanal: contract.dias_libre_semanal,
      diasBonificables: contract.dias_bonificables,
      diasIt: contract.dias_it,
      diasLaborablesAno: contract.dias_laborables_ano,
      observaciones: contract.observaciones,
    })
  } catch (err) {
    console.error('Error getting contract:', err)
    res.status(500).json({ error: 'Error al obtener contrato' })
  }
}

export async function createContract(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id
    const {
      employee_id,
      year,
      dias_trabajo,
      horas_anuales,
      dias_vacaciones,
      dias_libre_semanal,
      dias_bonificables,
      dias_it,
      dias_laborables_ano,
      observaciones,
    } = req.body

    if (!employee_id || !year) {
      res.status(400).json({ error: 'employee_id y year son requeridos' })
      return
    }

    // Check if already exists
    const existing = await repo.getContractByEmployeeYear(employee_id, year)
    if (existing) {
      res.status(409).json({ error: 'Ya existe un contrato para este empleado y año' })
      return
    }

    const contractId = await repo.createContract({
      employee_id,
      year,
      dias_trabajo,
      horas_anuales,
      dias_vacaciones,
      dias_libre_semanal,
      dias_bonificables,
      dias_it,
      dias_laborables_ano,
      observaciones,
      created_by: userId,
    })

    const contract = await repo.getContractById(contractId)
    res.status(201).json(contract)
  } catch (err) {
    console.error('Error creating contract:', err)
    res.status(500).json({ error: 'Error al crear contrato' })
  }
}

export async function updateContract(req: Request, res: Response): Promise<void> {
  try {
    const contractId = parseInt(req.params.id)
    if (isNaN(contractId)) {
      res.status(400).json({ error: 'ID de contrato inválido' })
      return
    }

    const existing = await repo.getContractById(contractId)
    if (!existing) {
      res.status(404).json({ error: 'Contrato no encontrado' })
      return
    }

    const {
      dias_trabajo,
      horas_anuales,
      dias_vacaciones,
      dias_libre_semanal,
      dias_bonificables,
      dias_it,
      dias_laborables_ano,
      observaciones,
    } = req.body

    await repo.updateContract(contractId, {
      dias_trabajo,
      horas_anuales,
      dias_vacaciones,
      dias_libre_semanal,
      dias_bonificables,
      dias_it,
      dias_laborables_ano,
      observaciones,
    })

    const contract = await repo.getContractById(contractId)
    res.json(contract)
  } catch (err) {
    console.error('Error updating contract:', err)
    res.status(500).json({ error: 'Error al actualizar contrato' })
  }
}

export async function deleteContract(req: Request, res: Response): Promise<void> {
  try {
    const contractId = parseInt(req.params.id)
    if (isNaN(contractId)) {
      res.status(400).json({ error: 'ID de contrato inválido' })
      return
    }

    const existing = await repo.getContractById(contractId)
    if (!existing) {
      res.status(404).json({ error: 'Contrato no encontrado' })
      return
    }

    await repo.deleteContract(contractId)
    res.json({ message: 'Contrato eliminado correctamente' })
  } catch (err) {
    console.error('Error deleting contract:', err)
    res.status(500).json({ error: 'Error al eliminar contrato' })
  }
}

export async function initializeContractsForYear(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year)
    if (isNaN(year)) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    const userId = req.user?.id
    const created = await repo.initializeContractsForYear(year, userId)

    res.json({
      success: true,
      message: `${created} contratos creados con valores por defecto`,
      created,
    })
  } catch (err) {
    console.error('Error initializing contracts:', err)
    res.status(500).json({ error: 'Error al inicializar contratos' })
  }
}

/**
 * Initialize a single contract for an employee with optional start date
 * POST /api/scheduling/contracts/:year/employee/:employeeId
 */
export async function initializeContractForEmployee(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year)
    const employeeId = req.params.employeeId
    const { startDate } = req.body // Optional: YYYY-MM-DD format
    const userId = req.user?.id

    if (isNaN(year)) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    if (!employeeId) {
      res.status(400).json({ error: 'ID de empleado requerido' })
      return
    }

    // Validate startDate format if provided
    if (startDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(startDate)) {
        res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' })
        return
      }
    }

    const contractId = await repo.initializeContractForEmployee(employeeId, year, startDate, userId)

    if (contractId === null) {
      res.status(409).json({ error: 'El empleado ya tiene un contrato para este año' })
      return
    }

    // Get the created contract to return it
    const contract = await repo.getContractById(contractId)

    res.status(201).json({
      success: true,
      message: startDate
        ? `Contrato creado con valores proporcionales desde ${startDate}`
        : 'Contrato creado con valores completos',
      contract: contract
        ? {
            id: contract.id,
            employeeId: contract.employee_id,
            employeeName: contract.employee_name,
            year: contract.year,
            diasTrabajo: contract.dias_trabajo,
            horasAnuales: contract.horas_anuales,
            diasVacaciones: contract.dias_vacaciones,
            diasLibreSemanal: contract.dias_libre_semanal,
            diasBonificables: contract.dias_bonificables,
            diasIt: contract.dias_it,
            diasLaborablesAno: contract.dias_laborables_ano,
            observaciones: contract.observaciones,
          }
        : null,
    })
  } catch (err) {
    console.error('Error initializing contract for employee:', err)
    res.status(500).json({ error: 'Error al inicializar contrato' })
  }
}

/**
 * Calculate proportional contract values (preview without creating)
 * GET /api/scheduling/contracts/:year/calculate?startDate=YYYY-MM-DD
 */
export async function calculateProportionalContract(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year)
    const startDate = req.query.startDate as string

    if (isNaN(year)) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    if (!startDate) {
      res.status(400).json({ error: 'startDate es requerido' })
      return
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate)) {
      res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' })
      return
    }

    const values = repo.calculateProportionalContract(year, startDate)

    res.json({
      year,
      startDate,
      values: {
        diasTrabajo: values.diasTrabajo,
        horasAnuales: values.horasAnuales,
        diasVacaciones: values.diasVacaciones,
        diasLibreSemanal: values.diasLibreSemanal,
        diasBonificables: values.diasBonificables,
        diasLaborablesAno: values.diasLaborablesAno,
      },
    })
  } catch (err) {
    console.error('Error calculating proportional contract:', err)
    res.status(500).json({ error: 'Error al calcular valores proporcionales' })
  }
}

// ============================================
// SHIFT STATS
// ============================================

export async function getShiftStats(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear()
    if (isNaN(year) || year < 2020 || year > 2100) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    const rows = await repo.getShiftCountsByYear(year)

    // Pivot: group by employee, collect shift → count map
    const empMap = new Map<string, { employeeId: string; employeeName: string; counts: Record<string, number> }>()
    const codesSet = new Set<string>()

    for (const row of rows) {
      codesSet.add(row.shiftCode)
      if (!empMap.has(row.employeeId)) {
        empMap.set(row.employeeId, { employeeId: row.employeeId, employeeName: row.employeeName, counts: {} })
      }
      empMap.get(row.employeeId)!.counts[row.shiftCode] = row.count
    }

    const SHIFT_ORDER = ['M', 'T', 'N', 'PI', 'P', 'L', 'V', 'B', 'E', 'IT', 'FO', 'A']
    const shiftCodes = SHIFT_ORDER.filter((c) => codesSet.has(c))

    res.json({
      year,
      shiftCodes,
      employees: [...empMap.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
    })
  } catch (err) {
    console.error('Error getting shift stats:', err)
    res.status(500).json({ error: 'Error al obtener contabilidad de turnos' })
  }
}

// ============================================
// ANNUAL TOTALS
// ============================================

export async function getAnnualTotals(req: Request, res: Response): Promise<void> {
  try {
    const year = parseInt(req.params.year)
    if (isNaN(year)) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    const totals = await repo.calculateAnnualTotals(year)

    // Get count of published months for this year
    const publishedMonths = await repo.getAllMonths({ year, status: 'published' })

    const response: AnnualTotalsResponse = {
      year,
      employees: totals,
      totalMesesPublicados: publishedMonths.length,
      fechaCalculo: new Date().toISOString(),
    }

    res.json(response)
  } catch (err) {
    console.error('Error getting annual totals:', err)
    res.status(500).json({ error: 'Error al obtener totales anuales' })
  }
}

// Annual totals route already handled above
