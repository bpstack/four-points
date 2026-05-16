// repositories/scheduling/employee-requests-repository.ts
// Repositorio mínimo para scheduling_employee_requests.
// Creado: 2026-04-25 — Fase 1 del solver.
// Endpoints CRUD son trabajo de Fase 1, aquí solo las queries del solver.

import db from '../../config/db.js'
import { getLastDayOfMonth } from '../../config/date-utils.js'
import type { SchedulingEmployeeRequestRow } from '../../models/scheduling/index.js'

/**
 * Devuelve todas las peticiones que solapan con [primer día, último día] del mes.
 * Usa lógica de intervalos: date_from <= last_day AND date_to >= first_day
 */
export async function findByMonth(
  year: number,
  month: number
): Promise<SchedulingEmployeeRequestRow[]> {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = getLastDayOfMonth(year, month)

  const [rows] = await db.query(
    `SELECT * FROM scheduling_employee_requests
     WHERE date_from <= ? AND date_to >= ?
     ORDER BY date_from ASC`,
    [lastDay, firstDay]
  )
  return rows as SchedulingEmployeeRequestRow[]
}

/**
 * Devuelve solo las peticiones con status='approved' para el solver.
 */
export async function findApprovedForSolver(
  year: number,
  month: number
): Promise<SchedulingEmployeeRequestRow[]> {
  const all = await findByMonth(year, month)
  return all.filter((r) => r.status === 'approved')
}
