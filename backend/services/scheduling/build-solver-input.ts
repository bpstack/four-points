// services/scheduling/build-solver-input.ts
// Construye el SolverInput a partir de los datos del mes en BD.

import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import * as requestsRepo from '../../repositories/scheduling/employee-requests-repository.js'
import type { SolverInput, SolverEmployee, SolverDayInfo, SolverConfig } from './types/solver.js'
import type { DayOfWeek } from '../../models/scheduling/index.js'

export async function buildSolverInput(monthId: number, year: number, month: number): Promise<SolverInput> {
  const [configMap, employees, days, assignments, approvedRequests] = await Promise.all([
    repo.getConfigMap(),
    repo.getSchedulableEmployees(),
    repo.getDaysByMonth(monthId),
    repo.getAssignmentsByMonth(monthId),
    requestsRepo.findApprovedForSolver(year, month),
  ])

  // ── Empleados ──────────────────────────────────────────
  // Cargamos reglas por empleado (puede estar vacío en local)
  const allRules = await repo.getAllEmployeeRules()

  const solverEmployees: SolverEmployee[] = employees
    .map((emp) => {
      const rules = allRules.filter((r) => r.employee_id === emp.id)
      const ruleMap: Record<string, string> = {}
      rules.forEach((r) => { ruleMap[r.rule_type] = r.rule_value })

      return {
        id: emp.id,
        name: emp.username,
        rules: {
          fixedShift: ruleMap['fixed_shift'] ?? undefined,
          noWeekends: ruleMap['no_weekends'] === 'true',
          shiftPriority: ruleMap['shift_priority'] ?? undefined,
        },
      }
    })
    // Excluir empleados con turno fijo no-rotatorio (P = Presencia fija, ej: dirección/admin).
    // Estos tienen su propio patrón semanal y no participan en la generación automática.
    .filter((emp) => emp.rules.fixedShift !== 'P')

  // ── Días ───────────────────────────────────────────────
  const solverDays: SolverDayInfo[] = days.map((d) => ({
    dayNumber: d.day_number,
    dayOfWeek: d.day_of_week as DayOfWeek,
    weekNumber: d.week_number,
    isHoliday: d.is_holiday === 1,
  }))

  // ── Config ─────────────────────────────────────────────
  const config: SolverConfig = {
    minMorningStaff:    configMap.minMorningStaff    ?? 1,
    prefMorningStaff:   configMap.prefMorningStaff   ?? 2,
    maxMorningStaff:    configMap.maxMorningStaff    ?? 6,
    minAfternoonStaff:  configMap.minAfternoonStaff  ?? 1,
    prefAfternoonStaff: configMap.prefAfternoonStaff ?? 2,
    maxAfternoonStaff:  configMap.maxAfternoonStaff  ?? 6,
    minNightStaff:      configMap.minNightStaff      ?? 1,
    maxNightStaff:      configMap.maxNightStaff      ?? 1,
    minMonthlyLibre:    configMap.minMonthlyLibre    ?? 9,
    maxMonthlyLibre:    configMap.maxMonthlyLibre    ?? 11,
    maxConsecutiveWorkDays: configMap.maxConsecutiveWorkDays ?? 6,
  }

  // ── Celdas bloqueadas ──────────────────────────────────
  // Fuente 1: assignments con source_constraint_id (vacaciones/libres aprobados)
  const lockedCells: Record<string, Record<string, string>> = {}

  const dayIdToNumber = new Map(days.map((d) => [d.id, d.day_number]))

  for (const a of assignments) {
    if (a.source_constraint_id === null) continue
    const dayNum = dayIdToNumber.get(a.day_id)
    if (dayNum === undefined) continue
    if (!lockedCells[a.employee_id]) lockedCells[a.employee_id] = {}
    lockedCells[a.employee_id][String(dayNum)] = a.shift_code
  }

  // Fuente 2: scheduling_employee_requests aprobadas
  for (const req of approvedRequests) {
    // Expandir el rango de fechas en números de día del mes
    const fromDate = new Date(req.date_from + 'T00:00:00')
    const toDate   = new Date(req.date_to   + 'T00:00:00')

    for (const day of days) {
      const dayDate = new Date(day.date)
      if (dayDate < fromDate || dayDate > toDate) continue

      const shiftCode = req.requested_value ?? shiftCodeForRequestType(req.request_type)
      if (!shiftCode) continue

      if (!lockedCells[req.employee_id]) lockedCells[req.employee_id] = {}
      // Solo bloquear si no hay ya una celda bloqueada (source_constraint_id tiene prioridad)
      if (!lockedCells[req.employee_id][String(day.day_number)]) {
        lockedCells[req.employee_id][String(day.day_number)] = shiftCode
      }
    }
  }

  return {
    monthId,
    year,
    month,
    employees: solverEmployees,
    days: solverDays,
    lockedCells,
    config,
    options: { timeoutSeconds: 30, optimizationLevel: 'fast' },
  }
}

function shiftCodeForRequestType(type: string): string | null {
  switch (type) {
    case 'vacation':       return 'V'
    case 'bonificable':    return 'B'
    case 'baja_temporal':  return 'IT'
    default:               return null  // shift_preference / shift_exclusion se gestionan diferente
  }
}
