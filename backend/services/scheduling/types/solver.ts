// services/scheduling/types/solver.ts
// Contratos TypeScript para la comunicación Node ↔ solver Python.
// Deben mantenerse en sync con backend/scheduling-solver/schemas.py

export interface EmployeeRules {
  fixedShift?: string
  noWeekends?: boolean
  shiftPriority?: string
  fixedDays?: number[]
  maxShiftPerMonth?: Record<string, number>
  minShiftPerMonth?: Record<string, number>
}

export interface SolverEmployee {
  id: string
  name: string
  rules?: EmployeeRules
}

export interface SolverDayInfo {
  dayNumber: number
  dayOfWeek: 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D'
  weekNumber: number
  isHoliday?: boolean
}

export interface SolverConfig {
  minMorningStaff?: number
  prefMorningStaff?: number
  maxMorningStaff?: number
  minAfternoonStaff?: number
  prefAfternoonStaff?: number
  maxAfternoonStaff?: number
  minNightStaff?: number
  maxNightStaff?: number
  maxWeeklyShifts?: number
  prefWeeklyShifts?: number
  minRestHours?: number
  minNightBlock?: number
  maxNightBlock?: number
  prefNightBlock?: number
  minMonthlyLibre?: number
  maxMonthlyLibre?: number
  maxConsecutiveWorkDays?: number
}

export interface SolverOptions {
  timeoutSeconds?: number
  optimizationLevel?: 'fast' | 'balanced' | 'thorough'
  seed?: number
}

export interface SolverInput {
  monthId: number
  year: number
  month: number
  employees: SolverEmployee[]
  days: SolverDayInfo[]
  /** employeeId → dayNumber (string) → shiftCode */
  lockedCells: Record<string, Record<string, string>>
  /**
   * employeeId → lista de shift codes de los últimos N días del mes anterior (orden ASC).
   * Usado para continuidad cross-month: bloques de noche, transiciones, trabajo consecutivo.
   */
  previousMonthTail?: Record<string, string[]>
  config: SolverConfig
  options?: SolverOptions
}

// ──────────────────────────────────────────────────────────────
// OUTPUT
// ──────────────────────────────────────────────────────────────

export interface SolverStats {
  solveTimeMs: number
  hardConstraintsSatisfied: boolean
  softPenalty?: number
  softPenaltyBreakdown?: Record<string, number>
  status: string
}

export interface SolverSuccess {
  status: 'ok'
  /** employeeId → dayNumber (string) → shiftCode */
  matrix: Record<string, Record<string, string>>
  stats: SolverStats
}

export interface ConflictingConstraint {
  constraintName: string
  employeeIds?: string[]
  dayNumbers?: number[]
  humanExplanation: string
}

export interface SuggestedRelaxation {
  constraint: string
  currentValue: number
  proposedValue: number
  impact: string
}

export interface SolverInfeasible {
  status: 'infeasible'
  conflictingConstraints: ConflictingConstraint[]
  suggestedRelaxations: SuggestedRelaxation[]
}

export interface SolverError {
  status: 'error'
  errorCode: 'INVALID_INPUT' | 'TIMEOUT' | 'INTERNAL'
  message: string
  details?: unknown
}

export type SolverOutput = SolverSuccess | SolverInfeasible | SolverError
