// services/scheduling/build-solver-input.ts
// Construye el SolverInput a partir de los datos del mes en BD.

import * as repo from '../../repositories/scheduling/scheduling-repository.js'
import * as requestsRepo from '../../repositories/scheduling/employee-requests-repository.js'
import type { SolverInput, SolverEmployee, SolverDayInfo, SolverConfig } from './types/solver.js'
import type { DayOfWeek } from '../../models/scheduling/index.js'

export async function buildSolverInput(
  monthId: number,
  year: number,
  month: number
): Promise<SolverInput> {
  const [configMap, employees, days, assignments, approvedRequests, prevTailRows, nightsHistory] =
    await Promise.all([
      repo.getConfigMap(),
      repo.getSchedulableEmployees(),
      repo.getDaysByMonth(monthId),
      repo.getAssignmentsByMonth(monthId),
      requestsRepo.findApprovedForSolver(year, month),
      repo.getPreviousMonthEndAssignments(year, month, 7),
      repo.getNightHistoryForEmployees(monthId),
    ])

  // ── Empleados ──────────────────────────────────────────
  // Cargamos reglas por empleado (puede estar vacío en local)
  const allRules = await repo.getAllEmployeeRules()

  const solverEmployees: SolverEmployee[] = employees
    .map((emp) => {
      const rules = allRules.filter((r) => r.employee_id === emp.id && r.is_active === 1)
      const ruleMap: Record<string, string> = {}
      rules.forEach((r) => {
        ruleMap[r.rule_type] = r.rule_value
      })
      const fixedDaysRaw = ruleMap['fixed_days']

      return {
        id: emp.id,
        name: emp.username,
        rules: {
          fixedShift: ruleMap['fixed_shift'] ?? undefined,
          noWeekends: ruleMap['no_weekends'] === 'true',
          shiftPriority: ruleMap['shift_priority'] ?? undefined,
          fixedDays: fixedDaysRaw
            ? fixedDaysRaw.split(',').map(Number).filter((n) => !isNaN(n))
            : undefined,
        },
      }
    })
    // Excluir empleados P sin días fijos definidos (patrón manual desconocido).
    // Si tienen fixedDays, SÍ participan: su patrón se inyecta como lockedCells.
    .filter((emp) => emp.rules?.fixedShift !== 'P' || (emp.rules?.fixedDays?.length ?? 0) > 0)

  // ── Días ───────────────────────────────────────────────
  const solverDays: SolverDayInfo[] = days.map((d) => ({
    dayNumber: d.day_number,
    dayOfWeek: d.day_of_week as DayOfWeek,
    weekNumber: d.week_number,
    isHoliday: d.is_holiday === 1,
  }))

  // ── Config ─────────────────────────────────────────────
  const config: SolverConfig = {
    minMorningStaff: configMap.minMorningStaff ?? 1,
    prefMorningStaff: configMap.prefMorningStaff ?? 2,
    maxMorningStaff: configMap.maxMorningStaff ?? 6,
    minAfternoonStaff: configMap.minAfternoonStaff ?? 1,
    prefAfternoonStaff: configMap.prefAfternoonStaff ?? 2,
    maxAfternoonStaff: configMap.maxAfternoonStaff ?? 6,
    minNightStaff: configMap.minNightStaff ?? 1,
    maxNightStaff: configMap.maxNightStaff ?? 1,
    minNightBlock: configMap.minNightBlock ?? 4,
    maxNightBlock: configMap.maxNightBlock ?? 6,
    prefNightBlock: configMap.prefNightBlock ?? 5,
    minMonthlyLibre: configMap.minMonthlyLibre ?? 9,
    maxMonthlyLibre: configMap.maxMonthlyLibre ?? 11,
    prefMonthlyLibre:
      Math.round((configMap.minMonthlyLibre + configMap.maxMonthlyLibre) / 2),
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
    const toDate = new Date(req.date_to + 'T00:00:00')

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

  // Fuente 3: empleados con fixedDays — patrón semanal determinístico (ej: L-V con turno P)
  // Se inyectan como lockedCells: el solver (H7) fija sus variables, rest/libres no interfieren.
  const DOW_TO_NUM: Record<string, number> = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 7 }
  for (const emp of solverEmployees) {
    if (!emp.rules?.fixedDays?.length) continue
    const workShift = emp.rules.fixedShift ?? 'P'
    if (!lockedCells[emp.id]) lockedCells[emp.id] = {}
    for (const day of solverDays) {
      if (lockedCells[emp.id][String(day.dayNumber)]) continue // vacación/petición aprobada tiene prioridad
      const dow = DOW_TO_NUM[day.dayOfWeek] ?? 0
      lockedCells[emp.id][String(day.dayNumber)] = emp.rules.fixedDays.includes(dow)
        ? workShift
        : 'L'
    }
  }

  // ── Cola del mes anterior (continuidad cross-month) ───────────
  // Convierte los rows en Record<empId, string[]> con orden cronológico ASC
  const previousMonthTail: Record<string, string[]> = {}
  const sortedTail = [...prevTailRows].sort((a, b) => a.dayNumber - b.dayNumber)
  for (const row of sortedTail) {
    if (!previousMonthTail[row.employeeId]) previousMonthTail[row.employeeId] = []
    previousMonthTail[row.employeeId].push(row.shiftCode)
  }

  return {
    monthId,
    year,
    month,
    employees: solverEmployees,
    days: solverDays,
    lockedCells,
    previousMonthTail,
    nightsHistory,
    config,
    options: { timeoutSeconds: 30, optimizationLevel: 'balanced' },
  }
}

function shiftCodeForRequestType(type: string): string | null {
  switch (type) {
    case 'vacation':
      return 'V'
    case 'bonificable':
      return 'B'
    case 'baja_temporal':
      return 'IT'
    default:
      return null // shift_preference / shift_exclusion se gestionan diferente
  }
}
