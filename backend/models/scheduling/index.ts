// models/scheduling/index.ts
//
// NOTE: Some types are duplicated between frontend and backend:
// - Backend: backend/models/scheduling/index.ts (this file)
// - Frontend: frontend/app/lib/scheduling/types.ts
//
// Duplicated types include:
// - EmployeeStats, EmployeeAnnualTotals, DailyStats, SchedulingConfigMap
// - ConstraintType, EmployeeRuleType, MonthStatus, etc.
//
// TODO: Consider generating frontend types from backend or using a shared package
// to avoid maintenance burden of keeping both in sync.

import { RowDataPacket, ResultSetHeader } from 'mysql2'

// ============================================
// ENUMS
// ============================================

export type MonthStatus = 'draft' | 'generated' | 'published' | 'archived'

export type ConstraintType =
  | 'vacation'
  | 'sick_leave'
  | 'sick_day'
  | 'training'
  | 'holiday'
  | 'request_off'
  | 'request_shift'
  | 'request_no_shift'

export type ConstraintStatus = 'pending' | 'approved' | 'rejected'

export type EmployeeRuleType =
  | 'shift_priority'
  | 'max_shift_per_month'
  | 'min_shift_per_month'
  | 'fixed_days'
  | 'fixed_shift'
  | 'no_weekends'
  | 'custom'

export type HistoryAction =
  | 'created'
  | 'generated'
  | 'published'
  | 'unpublished'
  | 'assignment_changed'
  | 'constraint_added'
  | 'constraint_approved'
  | 'constraint_rejected'
  | 'manual_edit'

export type DayOfWeek = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D'

// ============================================
// DATABASE MODELS (RowDataPacket for queries)
// ============================================

// scheduling_config
export interface SchedulingConfigRow extends RowDataPacket {
  id: number
  config_key: string
  config_value: string
  description: string | null
  created_at: Date
  updated_at: Date
}

// scheduling_shifts
export interface SchedulingShiftRow extends RowDataPacket {
  id: number
  code: string
  name: string
  start_time: string | null
  end_time: string | null
  hours: number
  color: string
  is_work_shift: number
  is_paid: number
  display_order: number
  is_active: number
  created_at: Date
  updated_at: Date
}

// scheduling_employee_rules
export interface SchedulingEmployeeRuleRow extends RowDataPacket {
  id: number
  employee_id: string
  rule_type: EmployeeRuleType
  rule_value: string
  priority: number
  is_active: number
  notes: string | null
  created_at: Date
  updated_at: Date
}

// scheduling_months
export interface SchedulingMonthRow extends RowDataPacket {
  id: number
  year: number
  month: number
  status: MonthStatus
  generated_at: Date | null
  generated_by: string | null
  published_at: Date | null
  published_by: string | null
  notes: string | null
  created_by: string | null
  created_at: Date
  updated_at: Date
}

// scheduling_days
export interface SchedulingDayRow extends RowDataPacket {
  id: number
  month_id: number
  day_number: number
  date: string
  day_of_week: DayOfWeek
  week_number: number
  is_holiday: number
  holiday_name: string | null
  occupancy_pct: number | null
  arrivals: number | null
  departures: number | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

// scheduling_assignments
export interface SchedulingAssignmentRow extends RowDataPacket {
  id: number
  month_id: number
  day_id: number
  employee_id: string
  shift_code: string
  is_manual: number
  notes: string | null
  created_at: Date
  updated_at: Date
}

// scheduling_constraints
export interface SchedulingConstraintRow extends RowDataPacket {
  id: number
  month_id: number
  employee_id: string
  constraint_type: ConstraintType
  start_date: string
  end_date: string
  shift_code: string | null
  status: ConstraintStatus
  priority: number
  notes: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: Date | null
  created_at: Date
  updated_at: Date
}

// scheduling_history
export interface SchedulingHistoryRow extends RowDataPacket {
  id: number
  month_id: number
  action: HistoryAction
  table_affected: string | null
  record_id: number | null
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: Date
  notes: string | null
}

// ============================================
// EXTENDED MODELS (with JOINs)
// ============================================

export interface SchedulingMonthWithCreator extends SchedulingMonthRow {
  created_by_name: string | null
  generated_by_name: string | null
  published_by_name: string | null
}

export interface SchedulingAssignmentWithDetails extends SchedulingAssignmentRow {
  employee_name: string
  shift_name: string
  shift_color: string
  day_date: string
  day_of_week: DayOfWeek
}

export interface SchedulingConstraintWithDetails extends SchedulingConstraintRow {
  employee_name: string
  created_by_name: string | null
  approved_by_name: string | null
}

export interface SchedulingEmployeeRuleWithEmployee extends SchedulingEmployeeRuleRow {
  employee_name: string
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

// Month
export interface CreateMonthDTO {
  year: number
  month: number
  notes?: string | null
  created_by?: string
}

export interface UpdateMonthDTO {
  status?: MonthStatus
  notes?: string | null
  generated_at?: Date | null
  generated_by?: string | null
  published_at?: Date | null
  published_by?: string | null
}

// Day
export interface CreateDayDTO {
  month_id: number
  day_number: number
  date: string
  day_of_week: DayOfWeek
  week_number: number
  is_holiday?: boolean
  holiday_name?: string | null
  occupancy_pct?: number | null
  arrivals?: number | null
  departures?: number | null
  notes?: string | null
}

export interface UpdateDayDTO {
  is_holiday?: boolean
  holiday_name?: string | null
  occupancy_pct?: number | null
  arrivals?: number | null
  departures?: number | null
  notes?: string | null
}

// Assignment
export interface CreateAssignmentDTO {
  month_id: number
  day_id: number
  employee_id: string
  shift_code: string
  is_manual?: boolean
  notes?: string | null
}

export interface UpdateAssignmentDTO {
  shift_code?: string
  is_manual?: boolean
  notes?: string | null
}

export interface BulkAssignmentDTO {
  day_id: number
  employee_id: string
  shift_code: string
}

// Constraint
export interface CreateConstraintDTO {
  month_id: number
  employee_id: string
  constraint_type: ConstraintType
  start_date: string
  end_date: string
  shift_code?: string | null
  priority?: number
  notes?: string | null
  created_by?: string
}

export interface UpdateConstraintDTO {
  constraint_type?: ConstraintType
  start_date?: string
  end_date?: string
  shift_code?: string | null
  status?: ConstraintStatus
  priority?: number
  notes?: string | null
  approved_by?: string | null
  approved_at?: Date | null
}

// Employee Rule
export interface CreateEmployeeRuleDTO {
  employee_id: string
  rule_type: EmployeeRuleType
  rule_value: string
  priority?: number
  notes?: string | null
}

export interface UpdateEmployeeRuleDTO {
  rule_type?: EmployeeRuleType
  rule_value?: string
  priority?: number
  is_active?: boolean
  notes?: string | null
}

// Config
export interface UpdateConfigDTO {
  config_value: string
  description?: string
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface SchedulingShift {
  id: number
  code: string
  name: string
  startTime: string | null
  endTime: string | null
  hours: number
  color: string
  isWorkShift: boolean
  isPaid: boolean
  displayOrder: number
  isActive: boolean
}

export interface SchedulingEmployee {
  id: string
  name: string
  email: string
  rules: SchedulingEmployeeRule[]
}

export interface SchedulingEmployeeRule {
  id: number
  ruleType: EmployeeRuleType
  ruleValue: string
  priority: number
  isActive: boolean
  notes: string | null
}

export interface SchedulingDay {
  id: number
  dayNumber: number
  date: string
  dayOfWeek: DayOfWeek
  weekNumber: number
  isHoliday: boolean
  holidayName: string | null
  occupancyPct: number | null
  arrivals: number | null
  departures: number | null
  notes: string | null
}

export interface SchedulingAssignment {
  id: number
  dayId: number
  employeeId: string
  shiftCode: string
  isManual: boolean
  notes: string | null
}

export interface SchedulingConstraint {
  id: number
  employeeId: string
  employeeName: string
  constraintType: ConstraintType
  startDate: string
  endDate: string
  shiftCode: string | null
  status: ConstraintStatus
  priority: number
  notes: string | null
  createdBy: string | null
  createdByName: string | null
  approvedBy: string | null
  approvedByName: string | null
  approvedAt: string | null
}

// ============================================
// FULL MONTH RESPONSE (for frontend)
// ============================================

export interface EmployeeStats {
  L: number // Libres
  V: number // Vacaciones
  B: number // Abonables/Festivos
  E: number // Enfermedad
  IT: number // Incapacidad Temporal
  M: number // Mañanas
  T: number // Tardes
  N: number // Noches
  PI: number // Personal Intervención
  P: number // Presencia
  FO: number // Formación
  A: number // Ausencia injustificada
  presencias: number // Total días trabajados
  horas: number // Horas trabajadas
}

export interface EmployeeSchedule {
  id: string
  name: string
  assignments: {
    [dayNumber: number]: {
      id: number
      shiftCode: string
      isManual: boolean
      notes: string | null
    }
  }
  stats: EmployeeStats
}

export interface DailyStats {
  day: number
  M: number
  T: number
  N: number
  PI: number
  P: number
}

export interface FullMonthResponse {
  id: number
  year: number
  month: number
  status: MonthStatus
  generatedAt: string | null
  generatedBy: string | null
  publishedAt: string | null
  publishedBy: string | null
  notes: string | null
  days: SchedulingDay[]
  employees: EmployeeSchedule[]
  dailyStats: DailyStats[]
  constraints: SchedulingConstraint[]
}

// ============================================
// GENERATION TYPES
// ============================================

export interface GenerationOptions {
  useAI?: boolean
  forceRegenerate?: boolean
  aiProvider?: 'none' | 'ollama' | 'openai'
}

export interface GenerationWarning {
  type: 'coverage' | 'hours' | 'rest' | 'constraint' | 'night_block' | 'validation' | 'other'
  severity: 'info' | 'warning' | 'error'
  message: string
  day?: number
  employeeId?: string
  employeeName?: string
}

export interface GenerationResult {
  success: boolean
  monthId: number
  assignmentsCount: number
  generationTimeMs: number
  warnings: GenerationWarning[]
  stats: {
    byEmployee: EmployeeStats[]
    byDay: DailyStats[]
  }
  attempt?: number // Which attempt succeeded (if retrying)
}

export interface ValidationResult {
  isValid: boolean
  errors: GenerationWarning[]
  warnings: GenerationWarning[]
}

// ============================================
// CONFIG MAP (for easy access)
// ============================================

export interface SchedulingConfigMap {
  minMorningStaff: number
  prefMorningStaff: number
  maxMorningStaff: number      // NEW: Máximo 2 personas turno mañana
  minAfternoonStaff: number
  prefAfternoonStaff: number
  maxAfternoonStaff: number    // NEW: Máximo 2 personas turno tarde
  minNightStaff: number
  maxNightStaff: number
  maxWeeklyShifts: number
  prefWeeklyShifts: number
  minRestHours: number
  minNightBlock: number
  maxNightBlock: number
  prefNightBlock: number
  annualVacationDays: number
  annualHolidays: number
  annualFreeDays: number
  aiProvider: 'none' | 'ollama' | 'openai'
  // New validations
  minMonthlyLibre: number      // 8 - Mínimo libres al mes
  maxMonthlyLibre: number      // 12 - Máximo libres al mes
  maxConsecutiveWorkDays: number // 6 - Máximo días consecutivos de trabajo
  minConsecutiveLibre: number  // 2 - Mínimo días libres consecutivos por semana
}

// ============================================
// EMPLOYEE CONTRACTS (Convenio anual por empleado)
// ============================================

// scheduling_employee_contracts
export interface SchedulingEmployeeContractRow extends RowDataPacket {
  id: number
  employee_id: string
  year: number
  dias_trabajo: number
  horas_anuales: number
  dias_vacaciones: number
  dias_libre_semanal: number
  dias_bonificables: number
  dias_it: number
  dias_laborables_ano: number
  observaciones: string | null
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export interface SchedulingEmployeeContractWithEmployee extends SchedulingEmployeeContractRow {
  employee_name: string
}

// DTOs for contracts
export interface CreateEmployeeContractDTO {
  employee_id: string
  year: number
  dias_trabajo?: number
  horas_anuales?: number
  dias_vacaciones?: number
  dias_libre_semanal?: number
  dias_bonificables?: number
  dias_it?: number
  dias_laborables_ano?: number
  observaciones?: string | null
  created_by?: string
}

export interface UpdateEmployeeContractDTO {
  dias_trabajo?: number
  horas_anuales?: number
  dias_vacaciones?: number
  dias_libre_semanal?: number
  dias_bonificables?: number
  dias_it?: number
  dias_laborables_ano?: number
  observaciones?: string | null
}

// Response types for frontend
export interface EmployeeContract {
  id: number
  employeeId: string
  employeeName: string
  year: number
  diasTrabajo: number
  horasAnuales: number
  diasVacaciones: number
  diasLibreSemanal: number
  diasBonificables: number
  diasIt: number
  diasLaborablesAno: number
  observaciones: string | null
}

// ============================================
// ANNUAL TOTALS (Resumen anual calculado)
// ============================================

export interface EmployeeAnnualTotals {
  employeeId: string
  employeeName: string
  year: number
  
  // Datos de convenio (lo que debería trabajar)
  convenio: {
    diasTrabajo: number
    horasAnuales: number
    diasVacaciones: number
    diasLibreSemanal: number
    diasBonificables: number
    diasIt: number
    diasLaborablesAno: number
    observaciones: string | null
  }
  
  // Disfrutados (lo que ya ha trabajado/disfrutado)
  disfrutados: {
    diasTrabajados: number
    horasTrabajadas: number
    diasVacaciones: number
    diasLibreSemanal: number
    diasIt: number
    diasBonificables: number
    total: number
    // Desglose por turno
    M: number
    T: number
    N: number
    PI: number
    P: number
    FO: number
    E: number
    A: number
  }
  
  // Pendiente hasta final de año
  pendiente: {
    diasATrabaja: number
    horasATrabaja: number
    diasVacaciones: number
    diasLibreSemanal: number
    diasIt: number
    diasBonificables: number
    total: number
  }
  
  // Meses incluidos en el cálculo
  mesesIncluidos: number
  ultimoMesCalculado: { year: number; month: number } | null
}

export interface AnnualTotalsResponse {
  year: number
  employees: EmployeeAnnualTotals[]
  totalMesesPublicados: number
  fechaCalculo: string
}

// ============================================
// MYSQL RESULT TYPES
// ============================================

export { ResultSetHeader }
