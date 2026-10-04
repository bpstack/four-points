import pool from '../../config/db.js'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import type {
  FnbCategory,
  FnbDailyRevenue,
  FnbMonthlyRow,
  FnbTotals,
} from '../../models/fnb/fnb.models.js'

function fmtDate(d: Date | string): string {
  if (!(d instanceof Date)) return d
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Round to 2 decimals to avoid JS float drift (0.1 + 0.2 = 0.30000000000000004)
const r2 = (n: number): number => Math.round(n * 100) / 100

// Column-shape map for getMonthlyData pivot. These code→column bindings are stable
// and define the wire format consumed by the frontend. Adding a new category in
// fnb_category requires updating this map + frontend types together.
// For dynamic code lists (validators, parser tracking) see services/fnb/fnb-categories.cache.ts
const CATEGORY_CODES = {
  breakfast_included: '21110',
  breakfast_excluded: '21124',
  breakfast_directo: '21120',
  lunch_food: '21111',
  lunch_bev: '21267',
  dinner_food: '21112',
  dinner_bev: '21307',
} as const

export async function getCategories(): Promise<FnbCategory[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT code, name, group_type, display_order FROM fnb_category ORDER BY display_order'
  )
  return rows as FnbCategory[]
}

function buildEmptyRow(date: string): FnbMonthlyRow {
  return {
    date,
    breakfast_included: 0,
    breakfast_excluded: 0,
    breakfast_directo: 0,
    lunch_food: 0,
    lunch_bev: 0,
    dinner_food: 0,
    dinner_bev: 0,
    breakfast_total: 0,
    lunch_total: 0,
    dinner_total: 0,
    la_caseta_total: 0,
    fnb_total: 0,
  }
}

export async function getMonthlyData(year: number, month: number): Promise<FnbMonthlyRow[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       d.date,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS breakfast_included,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS breakfast_excluded,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS breakfast_directo,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS lunch_food,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS lunch_bev,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS dinner_food,
       COALESCE(MAX(CASE WHEN d.category_code = ? THEN d.amount END), 0) AS dinner_bev
     FROM fnb_daily_revenue d
     WHERE YEAR(d.date) = ? AND MONTH(d.date) = ?
     GROUP BY d.date
     ORDER BY d.date`,
    [
      CATEGORY_CODES.breakfast_included,
      CATEGORY_CODES.breakfast_excluded,
      CATEGORY_CODES.breakfast_directo,
      CATEGORY_CODES.lunch_food,
      CATEGORY_CODES.lunch_bev,
      CATEGORY_CODES.dinner_food,
      CATEGORY_CODES.dinner_bev,
      year,
      month,
    ]
  )

  // Build lookup from DB results
  const dbMap = new Map<string, FnbMonthlyRow>()
  for (const r of rows) {
    const bi = parseFloat(r.breakfast_included) || 0
    const be = parseFloat(r.breakfast_excluded) || 0
    const bd = parseFloat(r.breakfast_directo) || 0
    const lf = parseFloat(r.lunch_food) || 0
    const lb = parseFloat(r.lunch_bev) || 0
    const df = parseFloat(r.dinner_food) || 0
    const db = parseFloat(r.dinner_bev) || 0
    const breakfast_total = r2(bi + be + bd)
    const lunch_total = r2(lf + lb)
    const dinner_total = r2(df + db)
    const la_caseta_total = r2(lunch_total + dinner_total)
    const fnb_total = r2(breakfast_total + la_caseta_total)
    const dateStr = fmtDate(r.date)
    dbMap.set(dateStr, {
      date: dateStr,
      breakfast_included: r2(bi),
      breakfast_excluded: r2(be),
      breakfast_directo: r2(bd),
      lunch_food: r2(lf),
      lunch_bev: r2(lb),
      dinner_food: r2(df),
      dinner_bev: r2(db),
      breakfast_total,
      lunch_total,
      dinner_total,
      la_caseta_total,
      fnb_total,
    })
  }

  // Generate full calendar for the month — every day appears even without DB rows
  const daysInMonth = new Date(year, month, 0).getDate()
  const result: FnbMonthlyRow[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push(dbMap.get(dateStr) ?? buildEmptyRow(dateStr))
  }
  return result
}

export async function getDailyEntries(from?: string, to?: string): Promise<FnbDailyRevenue[]> {
  let sql = 'SELECT id, date, category_code, amount, created_at, updated_at FROM fnb_daily_revenue'
  const params: (string | number)[] = []
  const conditions: string[] = []
  if (from) {
    conditions.push('date >= ?')
    params.push(from)
  }
  if (to) {
    conditions.push('date <= ?')
    params.push(to)
  }
  if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`
  sql += ' ORDER BY date DESC, category_code'
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params)
  return rows.map((r) => ({
    ...r,
    date: fmtDate(r.date),
    amount: parseFloat(r.amount as string),
  })) as FnbDailyRevenue[]
}

export async function upsertMany(
  date: string,
  entries: { code: string; amount: number }[]
): Promise<void> {
  if (!entries.length) return
  const values = entries.map((e) => [date, e.code, e.amount])
  await pool.execute(
    `INSERT INTO fnb_daily_revenue (date, category_code, amount)
     VALUES ${values.map(() => '(?, ?, ?)').join(', ')}
     ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP`,
    values.flat()
  )
}

export async function deleteDay(date: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM fnb_daily_revenue WHERE date = ?',
    [date]
  )
  return result.affectedRows ?? 0
}

export function computeTotals(entries: { code: string; amount: number }[]): FnbTotals {
  const get = (code: string) => entries.find((e) => e.code === code)?.amount ?? 0
  const breakfast = r2(
    get(CATEGORY_CODES.breakfast_included) +
      get(CATEGORY_CODES.breakfast_excluded) +
      get(CATEGORY_CODES.breakfast_directo)
  )
  const lunch = r2(get(CATEGORY_CODES.lunch_food) + get(CATEGORY_CODES.lunch_bev))
  const dinner = r2(get(CATEGORY_CODES.dinner_food) + get(CATEGORY_CODES.dinner_bev))
  const la_caseta = r2(lunch + dinner)
  return { breakfast, lunch, dinner, la_caseta, fnb_total: r2(breakfast + la_caseta) }
}
