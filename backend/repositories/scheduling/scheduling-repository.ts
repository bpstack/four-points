// repositories/scheduling/scheduling-repository.ts
// CRUD operations for scheduling module

import db from '../../config/db.js'
import { RowDataPacket } from 'mysql2'
import { logger } from '../../config/logger.js'
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
  SchedulingEmployeeContractRow,
  SchedulingEmployeeContractWithEmployee,
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
  CreateEmployeeContractDTO,
  UpdateEmployeeContractDTO,
  UpdateConfigDTO,
  ResultSetHeader,
  SchedulingConfigMap,
  DayOfWeek,
  HistoryAction,
  EmployeeAnnualTotals,
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
    // New validations with defaults from business rules
    minMonthlyLibre: parseInt(map['min_monthly_libre'] || '8'),
    maxMonthlyLibre: parseInt(map['max_monthly_libre'] || '12'),
    prefMonthlyLibre: parseInt(map['pref_monthly_libre'] ||
      String(Math.round((parseInt(map['min_monthly_libre'] || '8') + parseInt(map['max_monthly_libre'] || '12')) / 2))),
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

export async function getShiftById(id: number): Promise<SchedulingShiftRow | undefined> {
  const [rows] = await db.execute<SchedulingShiftRow[]>(
    'SELECT * FROM scheduling_shifts WHERE id = ?',
    [id]
  )
  return rows[0]
}

export interface CreateShiftDTO {
  code: string
  name: string
  start_time?: string | null
  end_time?: string | null
  hours: number
  color?: string
  is_work_shift?: boolean
  is_paid?: boolean
  display_order?: number
}

export async function createShift(data: CreateShiftDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_shifts (code, name, start_time, end_time, hours, color, is_work_shift, is_paid, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      data.code,
      data.name,
      data.start_time ?? null,
      data.end_time ?? null,
      data.hours,
      data.color ?? '#6b7280',
      data.is_work_shift ? 1 : 0,
      data.is_paid ? 1 : 0,
      data.display_order ?? 99,
    ]
  )
  return result.insertId
}

export interface UpdateShiftDTO {
  code?: string
  name?: string
  start_time?: string | null
  end_time?: string | null
  hours?: number
  color?: string
  is_work_shift?: boolean
  is_paid?: boolean
  display_order?: number
  is_active?: boolean
}

export async function updateShift(id: number, data: UpdateShiftDTO): Promise<boolean> {
  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (data.code !== undefined) {
    fields.push('code = ?')
    values.push(data.code)
  }
  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }
  if (data.start_time !== undefined) {
    fields.push('start_time = ?')
    values.push(data.start_time)
  }
  if (data.end_time !== undefined) {
    fields.push('end_time = ?')
    values.push(data.end_time)
  }
  if (data.hours !== undefined) {
    fields.push('hours = ?')
    values.push(data.hours)
  }
  if (data.color !== undefined) {
    fields.push('color = ?')
    values.push(data.color)
  }
  if (data.is_work_shift !== undefined) {
    fields.push('is_work_shift = ?')
    values.push(data.is_work_shift ? 1 : 0)
  }
  if (data.is_paid !== undefined) {
    fields.push('is_paid = ?')
    values.push(data.is_paid ? 1 : 0)
  }
  if (data.display_order !== undefined) {
    fields.push('display_order = ?')
    values.push(data.display_order)
  }
  if (data.is_active !== undefined) {
    fields.push('is_active = ?')
    values.push(data.is_active ? 1 : 0)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  values.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_shifts SET ${fields.join(', ')} WHERE id = ?`,
    values
  )
  return result.affectedRows > 0
}

export async function deleteShift(id: number): Promise<boolean> {
  // Soft delete - just mark as inactive
  const [result] = await db.execute<ResultSetHeader>(
    'UPDATE scheduling_shifts SET is_active = 0, updated_at = NOW() WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
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
      u3.username as published_by_name
    FROM scheduling_months m
    LEFT JOIN users u1 ON m.created_by = u1.id
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
      u3.username as published_by_name
    FROM scheduling_months m
    LEFT JOIN users u1 ON m.created_by = u1.id
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
 * Get the last N days of assignments from the previous month.
 * Used for continuity in schedule generation (night blocks, shifts, cross-month transitions).
 * Uses published OR draft months — draft months are intentional mid-planning context.
 * If the previous month changes, the current month can simply be regenerated.
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

  logger.info({ status: prevMonthRecord.status, year: prevYear, month: prevMonth }, '[getPreviousMonthEndAssignments] Using previous month for continuity')

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

  return rows.map((r) => ({
    employeeId: r.employeeId,
    dayNumber: r.dayNumber,
    shiftCode: r.shiftCode,
    date: new Date(r.date),
  }))
}

/**
 * Conteo de cada tipo de turno por empleado para el año indicado.
 * Incluye meses publicados y en borrador (draft).
 * Un único GROUP BY — muy eficiente incluso con muchos meses y empleados.
 */
export async function getShiftCountsByYear(year: number): Promise<
  Array<{ employeeId: string; employeeName: string; shiftCode: string; count: number }>
> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT
       sa.employee_id      AS employeeId,
       u.username          AS employeeName,
       sa.shift_code       AS shiftCode,
       COUNT(*)            AS count
     FROM scheduling_assignments sa
     JOIN scheduling_months sm ON sa.month_id = sm.id
     JOIN users u ON sa.employee_id = u.id
     WHERE sm.year = ?
       AND sm.status IN ('published', 'draft')
     GROUP BY sa.employee_id, u.username, sa.shift_code
     ORDER BY u.username, sa.shift_code`,
    [year]
  )
  return rows.map((r) => ({
    employeeId: r.employeeId as string,
    employeeName: r.employeeName as string,
    shiftCode: r.shiftCode as string,
    count: Number(r.count),
  }))
}

/**
 * Total de noches (shift_code='N') por empleado en todos los meses PUBLICADOS
 * excluyendo el mes indicado por monthId (el que se está generando).
 * Usado por el solver para balancear noches con contexto histórico.
 */
export async function getNightHistoryForEmployees(
  excludeMonthId: number
): Promise<Record<string, number>> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.employee_id AS employeeId, COUNT(*) AS nightCount
     FROM scheduling_assignments a
     JOIN scheduling_days d ON a.day_id = d.id
     JOIN scheduling_months m ON d.month_id = m.id
     WHERE m.status = 'published'
       AND d.month_id != ?
       AND a.shift_code = 'N'
     GROUP BY a.employee_id`,
    [excludeMonthId]
  )
  const result: Record<string, number> = {}
  for (const row of rows) {
    result[row.employeeId as string] = Number(row.nightCount)
  }
  return result
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
  const [result] = await db.execute<ResultSetHeader>('DELETE FROM scheduling_months WHERE id = ?', [
    id,
  ])
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

  const placeholders = values
    .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())')
    .join(', ')
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

export async function bulkUpdateDays(
  days: Array<{ day_id: number; is_holiday?: boolean; holiday_name?: string | null }>
): Promise<number> {
  if (days.length === 0) return 0

  let updatedCount = 0

  for (const day of days) {
    const fields: string[] = []
    const params: (string | number | null)[] = []

    if (day.is_holiday !== undefined) {
      fields.push('is_holiday = ?')
      params.push(day.is_holiday ? 1 : 0)
    }
    if (day.holiday_name !== undefined) {
      fields.push('holiday_name = ?')
      params.push(day.holiday_name ?? null)
    }

    if (fields.length > 0) {
      fields.push('updated_at = NOW()')
      params.push(day.day_id)

      const [result] = await db.execute<ResultSetHeader>(
        `UPDATE scheduling_days SET ${fields.join(', ')} WHERE id = ?`,
        params
      )
      if (result.affectedRows > 0) {
        updatedCount++
      }
    }
  }

  return updatedCount
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
     (month_id, day_id, employee_id, shift_code, source_constraint_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.month_id,
      data.day_id,
      data.employee_id,
      data.shift_code,
      data.source_constraint_id ?? null,
      data.notes ?? null,
    ]
  )
  return result.insertId
}

export async function createAssignmentsBulk(
  monthId: number,
  assignments: BulkAssignmentDTO[]
): Promise<void> {
  if (assignments.length === 0) return

  const values = assignments.map((a) => [
    monthId,
    a.day_id,
    a.employee_id,
    a.shift_code,
    a.source_constraint_id ?? null,
  ])

  const placeholders = values.map(() => '(?, ?, ?, ?, ?, NULL, NOW(), NOW())').join(', ')
  const flatValues = values.flat()

  await db.query(
    `INSERT INTO scheduling_assignments 
     (month_id, day_id, employee_id, shift_code, source_constraint_id, notes, created_at, updated_at)
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
  if (data.source_constraint_id !== undefined) {
    fields.push('source_constraint_id = ?')
    params.push(data.source_constraint_id ?? null)
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
  // Use INSERT ... ON DUPLICATE KEY UPDATE for better performance
  // Avoids extra SELECT query before INSERT/UPDATE
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_assignments 
     (month_id, day_id, employee_id, shift_code, source_constraint_id, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE 
       shift_code = VALUES(shift_code),
       notes = VALUES(notes),
       updated_at = NOW()`,
    [
      data.month_id,
      data.day_id,
      data.employee_id,
      data.shift_code,
      data.source_constraint_id ?? null,
      data.notes ?? null,
    ]
  )
  // insertId is the new ID on insert, or 0 on update
  // For updates, we need to fetch the existing ID
  if (result.insertId === 0) {
    const existing = await getAssignmentByDayEmployee(data.day_id, data.employee_id)
    return existing?.id ?? 0
  }
  return result.insertId
}

export async function recalculateLibreNumbers(employeeId: string, year: number): Promise<void> {
  const [lRows] = await db.execute<RowDataPacket[]>(
    `SELECT a.id
     FROM scheduling_assignments a
     JOIN scheduling_days d ON a.day_id = d.id
     JOIN scheduling_months m ON a.month_id = m.id
     WHERE a.employee_id = ? AND a.shift_code = 'L' AND m.year = ?
     ORDER BY d.date ASC`,
    [employeeId, year]
  )

  if (lRows.length > 0) {
    const cases = lRows.map((r, i) => `WHEN ${r.id} THEN ${Math.ceil((i + 1) / 2)}`).join(' ')
    const ids = lRows.map((r) => r.id).join(',')
    await db.execute(
      `UPDATE scheduling_assignments
       SET libre_number = CASE id ${cases} END
       WHERE id IN (${ids})`
    )
  }

  await db.execute(
    `UPDATE scheduling_assignments a
     JOIN scheduling_days d ON a.day_id = d.id
     JOIN scheduling_months m ON a.month_id = m.id
     SET a.libre_number = NULL
     WHERE a.employee_id = ?
       AND m.year = ?
       AND a.shift_code != 'L'
       AND a.libre_number IS NOT NULL`,
    [employeeId, year]
  )
}

export async function deleteAllAssignmentsByMonth(monthId: number): Promise<void> {
  await db.execute('DELETE FROM scheduling_assignments WHERE month_id = ?', [monthId])
}

/** Borra las asignaciones no bloqueadas e inserta las nuevas en una sola transacción. */
export async function applyGeneratedSchedule(
  monthId: number,
  toInsert: BulkAssignmentDTO[]
): Promise<{ deleted: number; inserted: number }> {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const [delResult] = await connection.execute<ResultSetHeader>(
      'DELETE FROM scheduling_assignments WHERE month_id = ? AND source_constraint_id IS NULL',
      [monthId]
    )

    if (toInsert.length > 0) {
      const values = toInsert.map((a) => [
        monthId, a.day_id, a.employee_id, a.shift_code, a.source_constraint_id ?? null,
      ])
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, NULL, NOW(), NOW())').join(', ')
      await connection.query(
        `INSERT INTO scheduling_assignments
         (month_id, day_id, employee_id, shift_code, source_constraint_id, notes, created_at, updated_at)
         VALUES ${placeholders}`,
        values.flat()
      )
    }

    await connection.commit()
    return { deleted: delResult.affectedRows, inserted: toInsert.length }
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }
}

// ============================================
// SOLVER RUNS — historial de ejecuciones del solver CP-SAT
// ============================================

export interface SolverRunRecord {
  monthId: number
  generatedBy: string | null
  status: 'ok' | 'infeasible' | 'error'
  solveTimeMs: number | null
  cpStatus: string | null
  softPenalty: number | null
  softPenaltyBreakdown: Record<string, number> | null
  solverInput: unknown
  solverMatrix: unknown | null
  conflictingConstraints: unknown | null
}

export async function insertSolverRun(data: SolverRunRecord): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_solver_runs
     (month_id, generated_by, status, solve_time_ms, cp_status,
      soft_penalty, soft_penalty_breakdown, solver_input, solver_matrix, conflicting_constraints)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.monthId,
      data.generatedBy,
      data.status,
      data.solveTimeMs,
      data.cpStatus,
      data.softPenalty,
      data.softPenaltyBreakdown ? JSON.stringify(data.softPenaltyBreakdown) : null,
      data.solverInput ? JSON.stringify(data.solverInput) : null,
      data.solverMatrix ? JSON.stringify(data.solverMatrix) : null,
      data.conflictingConstraints ? JSON.stringify(data.conflictingConstraints) : null,
    ]
  )
  return result.insertId
}

export async function getAnnualLCountByEmployee(
  year: number
): Promise<{ employee_id: string; employee_name: string; libre_count: number }[]> {
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.employee_id, u.username AS employee_name, COUNT(*) AS libre_count
     FROM scheduling_assignments a
     JOIN scheduling_months m ON a.month_id = m.id
     JOIN users u ON a.employee_id = u.id
     WHERE a.shift_code = 'L' AND m.year = ?
     GROUP BY a.employee_id, u.username`,
    [year]
  )
  return rows as { employee_id: string; employee_name: string; libre_count: number }[]
}

export async function fixMonthDates(monthId: number, year: number, month: number): Promise<number> {
  const daysInMonth = new Date(year, month, 0).getDate()

  let fixedCount = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const correctDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const [result] = await db.execute(
      'UPDATE scheduling_days SET date = ? WHERE month_id = ? AND day_number = ?',
      [correctDate, monthId, day]
    )
    fixedCount += (result as any).affectedRows
  }
  return fixedCount
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

export async function getConstraintById(
  id: number
): Promise<SchedulingConstraintWithDetails | undefined> {
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

export async function getEmployeeRuleById(
  id: number
): Promise<SchedulingEmployeeRuleRow | undefined> {
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
    [data.employee_id, data.rule_type, data.rule_value, data.priority ?? 0, data.notes ?? null]
  )
  return result.insertId
}

export async function updateEmployeeRule(
  id: number,
  data: UpdateEmployeeRuleDTO
): Promise<boolean> {
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
     ORDER BY se.display_order IS NULL, se.display_order, u.username`
  )
  return rows
}

/**
 * Get all active employees with their schedulable status
 * Used by config UI to show which employees are selected
 */
export async function getAllEmployeesWithSchedulableStatus(): Promise<
  SchedulableEmployeeWithStatus[]
> {
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
     ORDER BY se.display_order IS NULL, se.display_order, u.username`
  )
  return rows
}

/**
 * Add an employee to scheduling
 */
export async function addSchedulableEmployee(employeeId: string, addedBy?: string): Promise<void> {
  await db.query(`INSERT IGNORE INTO scheduling_employees (employee_id, added_by) VALUES (?, ?)`, [
    employeeId,
    addedBy || null,
  ])
}

/**
 * Remove an employee from scheduling
 */
export async function removeSchedulableEmployee(employeeId: string): Promise<void> {
  await db.query(`DELETE FROM scheduling_employees WHERE employee_id = ?`, [employeeId])
}

/**
 * Update the manual display_order for a batch of schedulable employees.
 * Pass the full ordered list — the order index in the array becomes the value.
 * Employees not present in the payload are left untouched.
 */
export async function setSchedulableEmployeesOrder(
  orderedIds: string[]
): Promise<void> {
  if (orderedIds.length === 0) return
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query(
        `UPDATE scheduling_employees SET display_order = ? WHERE employee_id = ?`,
        [i, orderedIds[i]]
      )
    }
    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Set the list of schedulable employees (replaces all)
 */
export async function setSchedulableEmployees(
  employeeIds: string[],
  addedBy?: string
): Promise<void> {
  // Clear existing
  await db.query(`DELETE FROM scheduling_employees`)

  // Insert new ones
  if (employeeIds.length > 0) {
    const values = employeeIds.map((id) => [id, addedBy || null])
    await db.query(`INSERT INTO scheduling_employees (employee_id, added_by) VALUES ?`, [values])
  }
}

// ============================================
// EMPLOYEE CONTRACTS
// ============================================

export async function getContractsByYear(
  year: number
): Promise<SchedulingEmployeeContractWithEmployee[]> {
  const [rows] = await db.query<SchedulingEmployeeContractWithEmployee[]>(
    `SELECT c.*, u.username as employee_name
     FROM scheduling_employee_contracts c
     JOIN users u ON c.employee_id = u.id
     JOIN scheduling_employees se ON c.employee_id = se.employee_id
     WHERE c.year = ?
     ORDER BY se.display_order IS NULL, se.display_order, u.username`,
    [year]
  )
  return rows
}

export async function getContractByEmployeeYear(
  employeeId: string,
  year: number
): Promise<SchedulingEmployeeContractRow | undefined> {
  const [rows] = await db.execute<SchedulingEmployeeContractRow[]>(
    'SELECT * FROM scheduling_employee_contracts WHERE employee_id = ? AND year = ?',
    [employeeId, year]
  )
  return rows[0]
}

export async function getContractById(
  id: number
): Promise<SchedulingEmployeeContractWithEmployee | undefined> {
  const [rows] = await db.execute<SchedulingEmployeeContractWithEmployee[]>(
    `SELECT c.*, u.username as employee_name
     FROM scheduling_employee_contracts c
     JOIN users u ON c.employee_id = u.id
     WHERE c.id = ?`,
    [id]
  )
  return rows[0]
}

export async function createContract(data: CreateEmployeeContractDTO): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_employee_contracts 
     (employee_id, year, dias_trabajo, horas_anuales, dias_vacaciones, 
      dias_libre_semanal, dias_bonificables, dias_it, dias_laborables_ano, 
      observaciones, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      data.employee_id,
      data.year,
      data.dias_trabajo ?? 225,
      data.horas_anuales ?? 1800,
      data.dias_vacaciones ?? 30,
      data.dias_libre_semanal ?? 90,
      data.dias_bonificables ?? 20,
      data.dias_it ?? 0,
      data.dias_laborables_ano ?? 365,
      data.observaciones ?? null,
      data.created_by ?? null,
    ]
  )
  return result.insertId
}

export async function updateContract(
  id: number,
  data: UpdateEmployeeContractDTO
): Promise<boolean> {
  const fields: string[] = []
  const params: (string | number | null)[] = []

  if (data.dias_trabajo !== undefined) {
    fields.push('dias_trabajo = ?')
    params.push(data.dias_trabajo)
  }
  if (data.horas_anuales !== undefined) {
    fields.push('horas_anuales = ?')
    params.push(data.horas_anuales)
  }
  if (data.dias_vacaciones !== undefined) {
    fields.push('dias_vacaciones = ?')
    params.push(data.dias_vacaciones)
  }
  if (data.dias_libre_semanal !== undefined) {
    fields.push('dias_libre_semanal = ?')
    params.push(data.dias_libre_semanal)
  }
  if (data.dias_bonificables !== undefined) {
    fields.push('dias_bonificables = ?')
    params.push(data.dias_bonificables)
  }
  if (data.dias_it !== undefined) {
    fields.push('dias_it = ?')
    params.push(data.dias_it)
  }
  if (data.dias_laborables_ano !== undefined) {
    fields.push('dias_laborables_ano = ?')
    params.push(data.dias_laborables_ano)
  }
  if (data.observaciones !== undefined) {
    fields.push('observaciones = ?')
    params.push(data.observaciones ?? null)
  }

  if (fields.length === 0) return false

  fields.push('updated_at = NOW()')
  params.push(id)

  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE scheduling_employee_contracts SET ${fields.join(', ')} WHERE id = ?`,
    params
  )
  return result.affectedRows > 0
}

export async function upsertContract(data: CreateEmployeeContractDTO): Promise<number> {
  // Use INSERT ... ON DUPLICATE KEY UPDATE for better performance
  // Avoids extra SELECT query before INSERT/UPDATE
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scheduling_employee_contracts 
     (employee_id, year, dias_trabajo, horas_anuales, dias_vacaciones, 
      dias_libre_semanal, dias_bonificables, dias_it, dias_laborables_ano, 
      observaciones, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE 
       dias_trabajo = VALUES(dias_trabajo),
       horas_anuales = VALUES(horas_anuales),
       dias_vacaciones = VALUES(dias_vacaciones),
       dias_libre_semanal = VALUES(dias_libre_semanal),
       dias_bonificables = VALUES(dias_bonificables),
       dias_it = VALUES(dias_it),
       dias_laborables_ano = VALUES(dias_laborables_ano),
       observaciones = VALUES(observaciones),
       updated_at = NOW()`,
    [
      data.employee_id,
      data.year,
      data.dias_trabajo ?? 225,
      data.horas_anuales ?? 1800,
      data.dias_vacaciones ?? 30,
      data.dias_libre_semanal ?? 90,
      data.dias_bonificables ?? 20,
      data.dias_it ?? 0,
      data.dias_laborables_ano ?? 365,
      data.observaciones ?? null,
      data.created_by ?? null,
    ]
  )
  // insertId is the new ID on insert, or 0 on update
  if (result.insertId === 0) {
    const existing = await getContractByEmployeeYear(data.employee_id, data.year)
    return existing?.id ?? 0
  }
  return result.insertId
}

export async function deleteContract(id: number): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM scheduling_employee_contracts WHERE id = ?',
    [id]
  )
  return result.affectedRows > 0
}

/**
 * Calculate proportional contract values based on start date
 * @param year The contract year
 * @param startDate The employee's start date (YYYY-MM-DD format)
 * @returns Proportional values for the contract
 */
export function calculateProportionalContract(
  year: number,
  startDate: string
): {
  diasTrabajo: number
  horasAnuales: number
  diasVacaciones: number
  diasLibreSemanal: number
  diasBonificables: number
  diasLaborablesAno: number
} {
  // Default full-year values
  const fullYear = {
    diasTrabajo: 225,
    horasAnuales: 1800,
    diasVacaciones: 30,
    diasLibreSemanal: 90,
    diasBonificables: 20,
    diasLaborablesAno: 365,
  }

  // Parse start date
  const start = new Date(startDate)
  const yearStart = new Date(year, 0, 1) // January 1st of the year
  const yearEnd = new Date(year, 11, 31) // December 31st of the year

  // If start date is before year start, use full year values
  if (start <= yearStart) {
    return fullYear
  }

  // If start date is after year end, return zeros
  if (start > yearEnd) {
    return {
      diasTrabajo: 0,
      horasAnuales: 0,
      diasVacaciones: 0,
      diasLibreSemanal: 0,
      diasBonificables: 0,
      diasLaborablesAno: 0,
    }
  }

  // Calculate days from year start to start date (exclusive)
  const daysBeforeStart = Math.floor(
    (start.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Calculate remaining days in the year
  const remainingDays = 365 - daysBeforeStart

  // Calculate proportion (remaining days / total days)
  const proportion = remainingDays / 365

  // Calculate proportional values (rounded to nearest integer)
  return {
    diasTrabajo: Math.round(fullYear.diasTrabajo * proportion),
    horasAnuales: Math.round(fullYear.horasAnuales * proportion),
    diasVacaciones: Math.round(fullYear.diasVacaciones * proportion),
    diasLibreSemanal: Math.round(fullYear.diasLibreSemanal * proportion),
    diasBonificables: Math.round(fullYear.diasBonificables * proportion),
    diasLaborablesAno: remainingDays,
  }
}

/**
 * Initialize a single contract for an employee with optional start date
 * @param employeeId The employee ID
 * @param year The contract year
 * @param startDate Optional start date for proportional calculation (YYYY-MM-DD)
 * @param createdBy User who created the contract
 * @returns The created contract ID or null if already exists
 */
export async function initializeContractForEmployee(
  employeeId: string,
  year: number,
  startDate?: string,
  createdBy?: string
): Promise<number | null> {
  const existing = await getContractByEmployeeYear(employeeId, year)
  if (existing) {
    return null // Already exists
  }

  // Calculate values based on start date
  const values = startDate
    ? calculateProportionalContract(year, startDate)
    : {
        dias_trabajo: 225,
        horas_anuales: 1800,
        dias_vacaciones: 30,
        dias_libre_semanal: 90,
        dias_bonificables: 20,
        dias_laborables_ano: 365,
      }

  // Build observaciones with start date info
  const observaciones = startDate ? `Inicio: ${startDate}` : null

  return await createContract({
    employee_id: employeeId,
    year,
    dias_trabajo: 'diasTrabajo' in values ? values.diasTrabajo : values.dias_trabajo,
    horas_anuales: 'horasAnuales' in values ? values.horasAnuales : values.horas_anuales,
    dias_vacaciones: 'diasVacaciones' in values ? values.diasVacaciones : values.dias_vacaciones,
    dias_libre_semanal:
      'diasLibreSemanal' in values ? values.diasLibreSemanal : values.dias_libre_semanal,
    dias_bonificables:
      'diasBonificables' in values ? values.diasBonificables : values.dias_bonificables,
    dias_laborables_ano:
      'diasLaborablesAno' in values ? values.diasLaborablesAno : values.dias_laborables_ano,
    observaciones,
    created_by: createdBy,
  })
}

/**
 * Initialize default contracts for all schedulable employees for a given year
 * Only creates contracts if they don't already exist
 */
export async function initializeContractsForYear(
  year: number,
  createdBy?: string
): Promise<number> {
  const schedulableEmployees = await getSchedulableEmployees()
  let created = 0

  for (const emp of schedulableEmployees) {
    const existing = await getContractByEmployeeYear(emp.id, year)
    if (!existing) {
      await createContract({
        employee_id: emp.id,
        year,
        created_by: createdBy,
      })
      created++
    }
  }

  return created
}

// ============================================
// ANNUAL TOTALS CALCULATION
// ============================================

/**
 * Get shift hours from the shifts table
 */
async function getShiftHoursMap(): Promise<Record<string, number>> {
  const shifts = await getAllShifts()
  const map: Record<string, number> = {}
  shifts.forEach((s) => {
    map[s.code] = parseFloat(s.hours as unknown as string) || 0
  })
  return map
}

/**
 * Calculate annual totals for all employees for a given year
 * Only considers PUBLISHED months
 */
export async function calculateAnnualTotals(year: number): Promise<EmployeeAnnualTotals[]> {
  // Get published months for this year
  const publishedMonths = await getAllMonths({ year, status: 'published' })

  if (publishedMonths.length === 0) {
    // Return empty totals with just contract data
    const contracts = await getContractsByYear(year)
    return contracts.map((c) => createEmptyTotals(c, year))
  }

  // Get contracts for the year
  const contracts = await getContractsByYear(year)
  const contractMap = new Map(contracts.map((c) => [c.employee_id, c]))

  // Get shift hours
  const shiftHours = await getShiftHoursMap()

  // Get all schedulable employees
  const employees = await getSchedulableEmployees()

  // Calculate totals per employee
  const results: EmployeeAnnualTotals[] = []

  for (const emp of employees) {
    const contract = contractMap.get(emp.id)

    // Initialize disfrutados counters
    const disfrutados = {
      diasTrabajados: 0,
      horasTrabajadas: 0,
      diasVacaciones: 0,
      diasLibreSemanal: 0,
      diasIt: 0,
      diasBonificables: 0,
      total: 0,
      M: 0,
      T: 0,
      N: 0,
      PI: 0,
      P: 0,
      FO: 0,
      E: 0,
      A: 0,
    }

    // Aggregate from all published months
    for (const month of publishedMonths) {
      const assignments = await getAssignmentsByEmployee(month.id, emp.id)

      for (const a of assignments) {
        const code = a.shift_code
        const hours = shiftHours[code] || 0

        // Count by shift type
        switch (code) {
          case 'M':
            disfrutados.M++
            disfrutados.diasTrabajados++
            disfrutados.horasTrabajadas += hours
            break
          case 'T':
            disfrutados.T++
            disfrutados.diasTrabajados++
            disfrutados.horasTrabajadas += hours
            break
          case 'N':
            disfrutados.N++
            disfrutados.diasTrabajados++
            disfrutados.horasTrabajadas += hours
            break
          case 'PI':
            disfrutados.PI++
            disfrutados.diasTrabajados++
            disfrutados.horasTrabajadas += hours
            break
          case 'P':
            disfrutados.P++
            disfrutados.diasTrabajados++
            disfrutados.horasTrabajadas += hours
            break
          case 'FO':
            disfrutados.FO++
            disfrutados.horasTrabajadas += hours
            break
          case 'V':
            disfrutados.diasVacaciones++
            break
          case 'L':
            disfrutados.diasLibreSemanal++
            break
          case 'B':
            disfrutados.diasBonificables++
            break
          case 'IT':
            disfrutados.diasIt++
            break
          case 'E':
            disfrutados.E++
            break
          case 'A':
            disfrutados.A++
            break
        }
      }
    }

    // Calculate total disfrutados
    disfrutados.total =
      disfrutados.diasTrabajados +
      disfrutados.diasVacaciones +
      disfrutados.diasLibreSemanal +
      disfrutados.diasIt +
      disfrutados.diasBonificables

    // Build convenio from contract (or defaults)
    const convenio = contract
      ? {
          diasTrabajo: contract.dias_trabajo,
          horasAnuales: contract.horas_anuales,
          diasVacaciones: contract.dias_vacaciones,
          diasLibreSemanal: contract.dias_libre_semanal,
          diasBonificables: contract.dias_bonificables,
          diasIt: contract.dias_it,
          diasLaborablesAno: contract.dias_laborables_ano,
          observaciones: contract.observaciones,
        }
      : {
          diasTrabajo: 225,
          horasAnuales: 1800,
          diasVacaciones: 30,
          diasLibreSemanal: 90,
          diasBonificables: 20,
          diasIt: 0,
          diasLaborablesAno: 365,
          observaciones: null,
        }

    // Calculate pendiente (remaining until year end)
    // IMPORTANT: IT days reduce the required work days
    // If someone has 225 work days by contract and 2 IT days, they only need to work 223 days
    const diasTrabajoAjustado = convenio.diasTrabajo - disfrutados.diasIt
    const horasAnualesAjustadas = convenio.horasAnuales - disfrutados.diasIt * 8 // Assuming 8h per IT day

    const pendiente = {
      diasATrabaja: diasTrabajoAjustado - disfrutados.diasTrabajados,
      horasATrabaja: horasAnualesAjustadas - disfrutados.horasTrabajadas,
      diasVacaciones: convenio.diasVacaciones - disfrutados.diasVacaciones,
      diasLibreSemanal: convenio.diasLibreSemanal - disfrutados.diasLibreSemanal,
      diasIt: convenio.diasIt - disfrutados.diasIt, // This will typically be negative (IT days taken beyond expected)
      diasBonificables: convenio.diasBonificables - disfrutados.diasBonificables,
      total: convenio.diasLaborablesAno - disfrutados.total,
    }

    // Get last published month
    const lastMonth = publishedMonths.reduce((latest, m) => {
      if (!latest) return m
      if (m.year > latest.year || (m.year === latest.year && m.month > latest.month)) return m
      return latest
    }, publishedMonths[0])

    results.push({
      employeeId: emp.id,
      employeeName: emp.username,
      year,
      convenio,
      disfrutados,
      pendiente,
      mesesIncluidos: publishedMonths.length,
      ultimoMesCalculado: lastMonth ? { year: lastMonth.year, month: lastMonth.month } : null,
    })
  }

  return results
}

function createEmptyTotals(
  contract: SchedulingEmployeeContractWithEmployee,
  year: number
): EmployeeAnnualTotals {
  return {
    employeeId: contract.employee_id,
    employeeName: contract.employee_name,
    year,
    convenio: {
      diasTrabajo: contract.dias_trabajo,
      horasAnuales: contract.horas_anuales,
      diasVacaciones: contract.dias_vacaciones,
      diasLibreSemanal: contract.dias_libre_semanal,
      diasBonificables: contract.dias_bonificables,
      diasIt: contract.dias_it,
      diasLaborablesAno: contract.dias_laborables_ano,
      observaciones: contract.observaciones,
    },
    disfrutados: {
      diasTrabajados: 0,
      horasTrabajadas: 0,
      diasVacaciones: 0,
      diasLibreSemanal: 0,
      diasIt: 0,
      diasBonificables: 0,
      total: 0,
      M: 0,
      T: 0,
      N: 0,
      PI: 0,
      P: 0,
      FO: 0,
      E: 0,
      A: 0,
    },
    pendiente: {
      diasATrabaja: contract.dias_trabajo,
      horasATrabaja: contract.horas_anuales,
      diasVacaciones: contract.dias_vacaciones,
      diasLibreSemanal: contract.dias_libre_semanal,
      diasIt: contract.dias_it,
      diasBonificables: contract.dias_bonificables,
      total: contract.dias_laborables_ano,
    },
    mesesIncluidos: 0,
    ultimoMesCalculado: null,
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
