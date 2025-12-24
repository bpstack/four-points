// repositories/scheduling/scheduling-repository.ts
// CRUD operations for scheduling module

import db from '../../config/db.js'
import { RowDataPacket } from 'mysql2'
import type {
  SchedulingConfigRow,
  SchedulingShiftRow,
  SchedulingMonthRow,
  SchedulingMonthWithCreator,
  SchedulingDayRow,
  SchedulingAssignmentRow,
  SchedulingAssignmentWithDetails,
  SchedulingConstraintWithDetails,
  SchedulingEmployeeRuleRow,
  SchedulingEmployeeRuleWithEmployee,
  SchedulingHistoryRow,
  CreateMonthDTO,
  UpdateMonthDTO,
  CreateDayDTO,
  UpdateDayDTO,
  CreateAssignmentDTO,
  UpdateAssignmentDTO,
  BulkAssignmentDTO,
  CreateConstraintDTO,
  UpdateConstraintDTO,
  CreateEmployeeRuleDTO,
  UpdateEmployeeRuleDTO,
  UpdateConfigDTO,
  ResultSetHeader,
  SchedulingConfigMap,
  DayOfWeek,
  HistoryAction,
} from '../../models/scheduling/index.js'

// ============================================
// PAGINATION DEFAULTS
// ============================================
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

interface PaginationOptions {
  limit?: number
  offset?: number
}

function sanitizeLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

// ============================================
// CONFIG
// ============================================

export async function getAllConfig(): Promise<SchedulingConfigRow[]> {
  const [rows] = await db.query<SchedulingConfigRow[]>(
    'SELECT * FROM scheduling_config ORDER BY config_key'
  )
  return rows
}

export async function getConfigByKey(key: string): Promise<SchedulingConfigRow | undefined> {
  const [rows] = await db.execute<SchedulingConfigRow[]>(
    'SELECT * FROM scheduling_config WHERE config_key = ?',
    [key]
  )
  return rows[0]
}

export async function updateConfig(key: string, data: UpdateConfigDTO): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_config 
     SET config_value = ?, description = COALESCE(?, description), updated_at = NOW()
     WHERE config_key = ?`,
    [data.config_value, data.description ?? null, key]
  )
  return result.affectedRows > 0
}

export async function getConfigMap(): Promise<SchedulingConfigMap> {
  const configs = await getAllConfig()
  const map: Record<string, string> = {}
  configs.forEach((c) => {
    map[c.config_key] = c.config_value
  })

  return {
    minMorningStaff: parseInt(map['min_morning_staff'] || '1'),
    prefMorningStaff: parseInt(map['pref_morning_staff'] || '2'),
    maxMorningStaff: parseInt(map['max_morning_staff'] || '2'),
    minAfternoonStaff: parseInt(map['min_afternoon_staff'] || '1'),
    prefAfternoonStaff: parseInt(map['pref_afternoon_staff'] || '2'),
    maxAfternoonStaff: parseInt(map['max_afternoon_staff'] || '2'),
    minNightStaff: parseInt(map['min_night_staff'] || '1'),
    maxNightStaff: parseInt(map['max_night_staff'] || '1'),
    maxWeeklyShifts: parseInt(map['max_weekly_shifts'] || '6'),
    prefWeeklyShifts: parseInt(map['pref_weekly_shifts'] || '5'),
    minRestHours: parseInt(map['min_rest_hours'] || '48'),
    minNightBlock: parseInt(map['min_night_block'] || '4'),
    maxNightBlock: parseInt(map['max_night_block'] || '6'),
    prefNightBlock: parseInt(map['pref_night_block'] || '5'),
    annualVacationDays: parseInt(map['annual_vacation_days'] || '30'),
    annualHolidays: parseInt(map['annual_holidays'] || '14'),
    annualFreeDays: parseInt(map['annual_free_days'] || '95'),
    aiProvider: (map['ai_provider'] as 'none' | 'ollama' | 'openai') || 'none',
    // New validations with defaults from business rules
    minMonthlyLibre: parseInt(map['min_monthly_libre'] || '8'),
    maxMonthlyLibre: parseInt(map['max_monthly_libre'] || '12'),
    maxConsecutiveWorkDays: parseInt(map['max_consecutive_work_days'] || '6'),
    minConsecutiveLibre: parseInt(map['min_consecutive_libre'] || '2'),
  }
}

// ============================================
// SHIFTS
// ============================================

export async function getAllShifts(): Promise<SchedulingShiftRow[]> {
  const [rows] = await db.query<SchedulingShiftRow[]>(
    'SELECT * FROM scheduling_shifts WHERE is_active = 1 ORDER BY display_order'
  )
  return rows
}

export async function getShiftByCode(code: string): Promise<SchedulingShiftRow | undefined> {
  const [rows] = await db.execute<SchedulingShiftRow[]>(
    'SELECT * FROM scheduling_shifts WHERE code = ?',
    [code]
  )
  return rows[0]
}

// ============================================
// MONTHS
// ============================================

export async function getAllMonths(
  options: PaginationOptions & { year?: number; status?: string } = {}
): Promise<SchedulingMonthWithCreator[]> {
  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0

  let query = `
    SELECT 
      m.*,
      u1.username as created_by_name,
      u2.username as generated_by_name,
      u3.username as published_by_name
    FROM scheduling_months m
    LEFT JOIN users u1 ON m.created_by = u1.id
    LEFT JOIN users u2 ON m.generated_by = u2.id
    LEFT JOIN users u3 ON m.published_by = u3.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (options.year) {
    query += ' AND m.year = ?'
    params.push(options.year)
  }

  if (options.status) {
    query += ' AND m.status = ?'
    params.push(options.status)
  }

  query += ' ORDER BY m.year DESC, m.month DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const [rows] = await db.query<SchedulingMonthWithCreator[]>(query, params)
  return rows
}

export async function getMonthById(id: number): Promise<SchedulingMonthWithCreator | undefined> {
  const [rows] = await db.execute<SchedulingMonthWithCreator[]>(
    `SELECT 
      m.*,
      u1.username as created_by_name,
      u2.username as generated_by_name,
      u3.username as published_by_name
    FROM scheduling_months m
    LEFT JOIN users u1 ON m.created_by = u1.id
    LEFT JOIN users u2 ON m.generated_by = u2.id
    LEFT JOIN users u3 ON m.published_by = u3.id
    WHERE m.id = ?`,
    [id]
  )
  return rows[0]
}

export async function getMonthByYearMonth(
  year: number,
  month: number
): Promise<SchedulingMonthRow | undefined> {
  const [rows] = await db.execute<SchedulingMonthRow[]>(
    'SELECT * FROM scheduling_months WHERE year = ? AND month = ?',
    [year, month]
  )
  return rows[0]
}

/**
 * Get the last N days of assignments from the previous month
 * Used for continuity in schedule generation (night blocks, shifts, etc.)
 * IMPORTANT: Only uses PUBLISHED months for continuity to ensure stable rotation
 */
export async function getPreviousMonthEndAssignments(
  year: number,
  month: number,
  lastNDays: number = 7
): Promise<{ employeeId: string; dayNumber: number; shiftCode: string; date: Date }[]> {
  // Calculate previous month
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth < 1) {
    prevMonth = 12
    prevYear = year - 1
  }
  
  // Get the previous month record
  const prevMonthRecord = await getMonthByYearMonth(prevYear, prevMonth)
  if (!prevMonthRecord) {
    return [] // No previous month exists
  }
  
  // CRITICAL: Only use PUBLISHED months for continuity
  // This ensures rotation continues from stable, approved schedules
  if (prevMonthRecord.status !== 'published') {
    console.log(`[getPreviousMonthEndAssignments] Previous month ${prevYear}-${prevMonth} is ${prevMonthRecord.status}, not published - skipping continuity`)
    return []
  }
  
  console.log(`[getPreviousMonthEndAssignments] Using published month ${prevYear}-${prevMonth} for continuity`)
  
  // Get assignments for last N days of previous month
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT 
      a.employee_id as employeeId,
      d.day_number as dayNumber,
      a.shift_code as shiftCode,
      d.date
    FROM scheduling_assignments a
    JOIN scheduling_days d ON a.day_id = d.id
    WHERE a.month_id = ?
      AND d.day_number > (SELECT MAX(day_number) - ? FROM scheduling_days WHERE month_id = ?)
    ORDER BY d.day_number DESC, a.employee_id`,
    [prevMonthRecord.id, lastNDays, prevMonthRecord.id]
  )
  
  return rows.map(r => ({
    employeeId: r.employeeId,
    dayNumber: r.dayNumber,
    shiftCode: r.shiftCode,
    date: new Date(r.date)
  }))
}

export async function createMonth(data: CreateMonthDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_months (year, month, status, notes, created_by, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?, NOW(), NOW())`,
    [data.year, data.month, data.notes ?? null, data.created_by ?? null]
  )
  return result.insertId
}

export async function updateMonth(id: number, data: UpdateMonthDTO): Promise<boolean> {
  const fields: string[] = []
  const params: (string | number | Date | null)[] = []

  if (data.status !== undefined) {
    fields.push('status = ?')
    params.push(data.status)
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?')
    params.push(data.notes ?? null)
  }
  if (data.generated_at !== undefined) {
    fields.push('generated_at = ?')
    params.push(data.generated_at ?? null)
  }
  if (data.generated_by !== undefined) {
    fields.push('generated_by = ?')
    params.push(data.generated_by ?? null)
  }
  if (data.published_at !== undefined) {
    fields.push('published_at = ?')
    params.push(data.published_at ?? null)
  }
  if (data.published_by !== undefined) {
    fields.push('published_by = ?')
    params.push(data.published_by ?? null)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  params.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_months SET ${fields.join(', ')} WHERE id = ?`,
    params
  )
  return result.affectedRows > 0
}

export async function deleteMonth(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM scheduling_months WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

// ============================================
// DAYS
// ============================================

export async function getDaysByMonth(monthId: number): Promise<SchedulingDayRow[]> {
  const [rows] = await db.execute<SchedulingDayRow[]>(
    'SELECT * FROM scheduling_days WHERE month_id = ? ORDER BY day_number',
    [monthId]
  )
  return rows
}

export async function getDayById(id: number): Promise<SchedulingDayRow | undefined> {
  const [rows] = await db.execute<SchedulingDayRow[]>(
    'SELECT * FROM scheduling_days WHERE id = ?',
    [id]
  )
  return rows[0]
}

export async function createDay(data: CreateDayDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_days 
     (month_id, day_number, date, day_of_week, week_number, is_holiday, holiday_name, 
      occupancy_pct, arrivals, departures, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.month_id,
      data.day_number,
      data.date,
      data.day_of_week,
      data.week_number,
      data.is_holiday ? 1 : 0,
      data.holiday_name ?? null,
      data.occupancy_pct ?? null,
      data.arrivals ?? null,
      data.departures ?? null,
      data.notes ?? null,
    ]
  )
  return result.insertId
}

export async function createDaysBulk(days: CreateDayDTO[]): Promise<void> {
  if (days.length === 0) return

  const values = days.map((d) => [
    d.month_id,
    d.day_number,
    d.date,
    d.day_of_week,
    d.week_number,
    d.is_holiday ? 1 : 0,
    d.holiday_name ?? null,
    d.occupancy_pct ?? null,
    d.arrivals ?? null,
    d.departures ?? null,
    d.notes ?? null,
  ])

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())').join(', ')
  const flatValues = values.flat()

  await db.query(
    `INSERT INTO scheduling_days 
     (month_id, day_number, date, day_of_week, week_number, is_holiday, holiday_name, 
      occupancy_pct, arrivals, departures, notes, created_at, updated_at)
     VALUES ${placeholders}`,
    flatValues
  )
}

export async function updateDay(id: number, data: UpdateDayDTO): Promise<boolean> {
  const fields: string[] = []
  const params: (string | number | null)[] = []

  if (data.is_holiday !== undefined) {
    fields.push('is_holiday = ?')
    params.push(data.is_holiday ? 1 : 0)
  }
  if (data.holiday_name !== undefined) {
    fields.push('holiday_name = ?')
    params.push(data.holiday_name ?? null)
  }
  if (data.occupancy_pct !== undefined) {
    fields.push('occupancy_pct = ?')
    params.push(data.occupancy_pct ?? null)
  }
  if (data.arrivals !== undefined) {
    fields.push('arrivals = ?')
    params.push(data.arrivals ?? null)
  }
  if (data.departures !== undefined) {
    fields.push('departures = ?')
    params.push(data.departures ?? null)
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?')
    params.push(data.notes ?? null)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  params.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_days SET ${fields.join(', ')} WHERE id = ?`,
    params
  )
  return result.affectedRows > 0
}

export async function deleteAllDaysByMonth(monthId: number): Promise<void> {
  await db.execute('DELETE FROM scheduling_days WHERE month_id = ?', [monthId])
}

// ============================================
// ASSIGNMENTS
// ============================================

export async function getAssignmentsByMonth(
  monthId: number
): Promise<SchedulingAssignmentWithDetails[]> {
  const [rows] = await db.execute<SchedulingAssignmentWithDetails[]>(
    `SELECT 
      a.*,
      u.username as employee_name,
      s.name as shift_name,
      s.color as shift_color,
      d.date as day_date,
      d.day_of_week
    FROM scheduling_assignments a
    JOIN users u ON a.employee_id = u.id
    JOIN scheduling_shifts s ON a.shift_code = s.code
    JOIN scheduling_days d ON a.day_id = d.id
    WHERE a.month_id = ?
    ORDER BY d.day_number, u.username`,
    [monthId]
  )
  return rows
}

export async function getAssignmentsByEmployee(
  monthId: number,
  employeeId: string
): Promise<SchedulingAssignmentRow[]> {
  const [rows] = await db.execute<SchedulingAssignmentRow[]>(
    `SELECT * FROM scheduling_assignments 
     WHERE month_id = ? AND employee_id = ?
     ORDER BY day_id`,
    [monthId, employeeId]
  )
  return rows
}

export async function getAssignmentById(id: number): Promise<SchedulingAssignmentRow | undefined> {
  const [rows] = await db.execute<SchedulingAssignmentRow[]>(
    'SELECT * FROM scheduling_assignments WHERE id = ?',
    [id]
  )
  return rows[0]
}

export async function getAssignmentByDayEmployee(
  dayId: number,
  employeeId: string
): Promise<SchedulingAssignmentRow | undefined> {
  const [rows] = await db.execute<SchedulingAssignmentRow[]>(
    'SELECT * FROM scheduling_assignments WHERE day_id = ? AND employee_id = ?',
    [dayId, employeeId]
  )
  return rows[0]
}

export async function createAssignment(data: CreateAssignmentDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_assignments 
     (month_id, day_id, employee_id, shift_code, is_manual, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.month_id,
      data.day_id,
      data.employee_id,
      data.shift_code,
      data.is_manual ? 1 : 0,
      data.notes ?? null,
    ]
  )
  return result.insertId
}

export async function createAssignmentsBulk(monthId: number, assignments: BulkAssignmentDTO[]): Promise<void> {
  if (assignments.length === 0) return

  const values = assignments.map((a) => [
    monthId,
    a.day_id,
    a.employee_id,
    a.shift_code,
    0, // is_manual = false (generated)
  ])

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, NULL, NOW(), NOW())').join(', ')
  const flatValues = values.flat()

  await db.query(
    `INSERT INTO scheduling_assignments 
     (month_id, day_id, employee_id, shift_code, is_manual, notes, created_at, updated_at)
     VALUES ${placeholders}`,
    flatValues
  )
}

export async function updateAssignment(id: number, data: UpdateAssignmentDTO): Promise<boolean> {
  const fields: string[] = []
  const params: (string | number | null)[] = []

  if (data.shift_code !== undefined) {
    fields.push('shift_code = ?')
    params.push(data.shift_code)
  }
  if (data.is_manual !== undefined) {
    fields.push('is_manual = ?')
    params.push(data.is_manual ? 1 : 0)
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?')
    params.push(data.notes ?? null)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  params.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_assignments SET ${fields.join(', ')} WHERE id = ?`,
    params
  )
  return result.affectedRows > 0
}

export async function upsertAssignment(data: CreateAssignmentDTO): Promise<number> {
  // Check if exists
  const existing = await getAssignmentByDayEmployee(data.day_id, data.employee_id)
  
  if (existing) {
    await updateAssignment(existing.id, {
      shift_code: data.shift_code,
      is_manual: data.is_manual,
      notes: data.notes,
    })
    return existing.id
  } else {
    return createAssignment(data)
  }
}

export async function deleteAllAssignmentsByMonth(monthId: number): Promise<void> {
  await db.execute('DELETE FROM scheduling_assignments WHERE month_id = ?', [monthId])
}

// ============================================
// CONSTRAINTS
// ============================================

export async function getConstraintsByMonth(
  monthId: number,
  options: { employeeId?: string; type?: string; status?: string } = {}
): Promise<SchedulingConstraintWithDetails[]> {
  let query = `
    SELECT 
      c.*,
      u1.username as employee_name,
      u2.username as created_by_name,
      u3.username as approved_by_name
    FROM scheduling_constraints c
    JOIN users u1 ON c.employee_id = u1.id
    LEFT JOIN users u2 ON c.created_by = u2.id
    LEFT JOIN users u3 ON c.approved_by = u3.id
    WHERE c.month_id = ?
  `
  const params: (string | number)[] = [monthId]

  if (options.employeeId) {
    query += ' AND c.employee_id = ?'
    params.push(options.employeeId)
  }
  if (options.type) {
    query += ' AND c.constraint_type = ?'
    params.push(options.type)
  }
  if (options.status) {
    query += ' AND c.status = ?'
    params.push(options.status)
  }

  query += ' ORDER BY c.priority ASC, c.start_date ASC'

  const [rows] = await db.query<SchedulingConstraintWithDetails[]>(query, params)
  return rows
}

export async function getConstraintById(id: number): Promise<SchedulingConstraintWithDetails | undefined> {
  const [rows] = await db.execute<SchedulingConstraintWithDetails[]>(
    `SELECT 
      c.*,
      u1.username as employee_name,
      u2.username as created_by_name,
      u3.username as approved_by_name
    FROM scheduling_constraints c
    JOIN users u1 ON c.employee_id = u1.id
    LEFT JOIN users u2 ON c.created_by = u2.id
    LEFT JOIN users u3 ON c.approved_by = u3.id
    WHERE c.id = ?`,
    [id]
  )
  return rows[0]
}

export async function createConstraint(data: CreateConstraintDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_constraints 
     (month_id, employee_id, constraint_type, start_date, end_date, shift_code, 
      status, priority, notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
    [
      data.month_id,
      data.employee_id,
      data.constraint_type,
      data.start_date,
      data.end_date,
      data.shift_code ?? null,
      data.priority ?? 5,
      data.notes ?? null,
      data.created_by ?? null,
    ]
  )
  return result.insertId
}

export async function updateConstraint(id: number, data: UpdateConstraintDTO): Promise<boolean> {
  const fields: string[] = []
  const params: (string | number | Date | null)[] = []

  if (data.constraint_type !== undefined) {
    fields.push('constraint_type = ?')
    params.push(data.constraint_type)
  }
  if (data.start_date !== undefined) {
    fields.push('start_date = ?')
    params.push(data.start_date)
  }
  if (data.end_date !== undefined) {
    fields.push('end_date = ?')
    params.push(data.end_date)
  }
  if (data.shift_code !== undefined) {
    fields.push('shift_code = ?')
    params.push(data.shift_code ?? null)
  }
  if (data.status !== undefined) {
    fields.push('status = ?')
    params.push(data.status)
  }
  if (data.priority !== undefined) {
    fields.push('priority = ?')
    params.push(data.priority)
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?')
    params.push(data.notes ?? null)
  }
  if (data.approved_by !== undefined) {
    fields.push('approved_by = ?')
    params.push(data.approved_by ?? null)
  }
  if (data.approved_at !== undefined) {
    fields.push('approved_at = ?')
    params.push(data.approved_at ?? null)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  params.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_constraints SET ${fields.join(', ')} WHERE id = ?`,
    params
  )
  return result.affectedRows > 0
}

export async function deleteConstraint(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM scheduling_constraints WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

// ============================================
// EMPLOYEE RULES
// ============================================

export async function getAllEmployeeRules(): Promise<SchedulingEmployeeRuleWithEmployee[]> {
  const [rows] = await db.query<SchedulingEmployeeRuleWithEmployee[]>(
    `SELECT r.*, u.username as employee_name
     FROM scheduling_employee_rules r
     JOIN users u ON r.employee_id = u.id
     WHERE r.is_active = 1
     ORDER BY u.username, r.priority DESC`
  )
  return rows
}

export async function getEmployeeRulesByEmployee(
  employeeId: string
): Promise<SchedulingEmployeeRuleRow[]> {
  const [rows] = await db.execute<SchedulingEmployeeRuleRow[]>(
    `SELECT * FROM scheduling_employee_rules 
     WHERE employee_id = ? AND is_active = 1
     ORDER BY priority DESC`,
    [employeeId]
  )
  return rows
}

export async function getEmployeeRuleById(id: number): Promise<SchedulingEmployeeRuleRow | undefined> {
  const [rows] = await db.execute<SchedulingEmployeeRuleRow[]>(
    'SELECT * FROM scheduling_employee_rules WHERE id = ?',
    [id]
  )
  return rows[0]
}

export async function createEmployeeRule(data: CreateEmployeeRuleDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_employee_rules 
     (employee_id, rule_type, rule_value, priority, is_active, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())`,
    [
      data.employee_id,
      data.rule_type,
      data.rule_value,
      data.priority ?? 0,
      data.notes ?? null,
    ]
  )
  return result.insertId
}

export async function updateEmployeeRule(id: number, data: UpdateEmployeeRuleDTO): Promise<boolean> {
  const fields: string[] = []
  const params: (string | number | null)[] = []

  if (data.rule_type !== undefined) {
    fields.push('rule_type = ?')
    params.push(data.rule_type)
  }
  if (data.rule_value !== undefined) {
    fields.push('rule_value = ?')
    params.push(data.rule_value)
  }
  if (data.priority !== undefined) {
    fields.push('priority = ?')
    params.push(data.priority)
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?')
    params.push(data.is_active ? 1 : 0)
  }
  if (data.notes !== undefined) {
    fields.push('notes = ?')
    params.push(data.notes ?? null)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  params.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_employee_rules SET ${fields.join(', ')} WHERE id = ?`,
    params
  )
  return result.affectedRows > 0
}

export async function deleteEmployeeRule(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM scheduling_employee_rules WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

// ============================================
// HISTORY
// ============================================

export async function createHistory(
  monthId: number,
  action: HistoryAction,
  changedBy: string | null,
  details: {
    tableAffected?: string
    recordId?: number
    fieldChanged?: string
    oldValue?: string
    newValue?: string
    notes?: string
  } = {}
): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_history 
     (month_id, action, table_affected, record_id, field_changed, old_value, new_value, changed_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      monthId,
      action,
      details.tableAffected ?? null,
      details.recordId ?? null,
      details.fieldChanged ?? null,
      details.oldValue ?? null,
      details.newValue ?? null,
      changedBy,
      details.notes ?? null,
    ]
  )
  return result.insertId
}

export async function getHistoryByMonth(monthId: number): Promise<SchedulingHistoryRow[]> {
  const [rows] = await db.execute<SchedulingHistoryRow[]>(
    `SELECT h.*, u.username as changed_by_name
     FROM scheduling_history h
     LEFT JOIN users u ON h.changed_by = u.id
     WHERE h.month_id = ?
     ORDER BY h.changed_at DESC`,
    [monthId]
  )
  return rows
}

// ============================================
// SCHEDULABLE EMPLOYEES
// ============================================

export interface SchedulableEmployee extends RowDataPacket {
  id: string
  username: string
  role_id: number
}

export interface SchedulableEmployeeWithStatus extends SchedulableEmployee {
  is_schedulable: boolean
  added_at: string | null
}

/**
 * Get employees selected for scheduling (from scheduling_employees table)
 * Used by the schedule generator
 */
export async function getSchedulableEmployees(): Promise<SchedulableEmployee[]> {
  const [rows] = await db.query<SchedulableEmployee[]>(
    `SELECT u.id, u.username, u.role_id
     FROM users u
     INNER JOIN scheduling_employees se ON u.id = se.employee_id
     WHERE u.is_active = 1
     ORDER BY u.username`
  )
  return rows
}

/**
 * Get all active employees with their schedulable status
 * Used by config UI to show which employees are selected
 */
export async function getAllEmployeesWithSchedulableStatus(): Promise<SchedulableEmployeeWithStatus[]> {
  const [rows] = await db.query<SchedulableEmployeeWithStatus[]>(
    `SELECT 
       u.id, 
       u.username, 
       u.role_id,
       CASE WHEN se.employee_id IS NOT NULL THEN TRUE ELSE FALSE END as is_schedulable,
       se.added_at
     FROM users u
     LEFT JOIN scheduling_employees se ON u.id = se.employee_id
     WHERE u.is_active = 1
     ORDER BY u.username`
  )
  return rows
}

/**
 * Add an employee to scheduling
 */
export async function addSchedulableEmployee(employeeId: string, addedBy?: string): Promise<void> {
  await db.query(
    `INSERT IGNORE INTO scheduling_employees (employee_id, added_by) VALUES (?, ?)`,
    [employeeId, addedBy || null]
  )
}

/**
 * Remove an employee from scheduling
 */
export async function removeSchedulableEmployee(employeeId: string): Promise<void> {
  await db.query(
    `DELETE FROM scheduling_employees WHERE employee_id = ?`,
    [employeeId]
  )
}

/**
 * Set the list of schedulable employees (replaces all)
 */
export async function setSchedulableEmployees(employeeIds: string[], addedBy?: string): Promise<void> {
  // Clear existing
  await db.query(`DELETE FROM scheduling_employees`)
  
  // Insert new ones
  if (employeeIds.length > 0) {
    const values = employeeIds.map(id => [id, addedBy || null])
    await db.query(
      `INSERT INTO scheduling_employees (employee_id, added_by) VALUES ?`,
      [values]
    )
  }
}

// ============================================
// HELPERS
// ============================================

export function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  return days[date.getDay()]
}

export function getWeekNumber(date: Date, monthStart: Date): number {
  // Week number within the month (1-6)
  const dayOfMonth = date.getDate()
  const firstDayOfWeek = monthStart.getDay() // 0=Sunday, 1=Monday...
  
  // Adjust to Monday start (0=Monday)
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  
  return Math.ceil((dayOfMonth + adjustedFirstDay) / 7)
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
