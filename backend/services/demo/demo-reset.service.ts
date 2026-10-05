// services/demo/demo-reset.service.ts
/**
 * Reinicio diario de la demo pública (ADR-038).
 *
 * Un reinicio:
 * 1. vuelve a cargar db-mysql/mock-data.sql (datos de los módulos, con fechas
 *    relativas a hoy; no toca usuarios ni horarios);
 * 2. restaura la base de horarios guardada en las tablas demo_snapshot_*.
 *
 * Se lanza solo con la primera entrada a la demo de cada día (Render gratuito
 * se duerme, así que un cron a hora fija podría no ejecutarse) o a mano desde
 * Configuración → Demo. La base de horarios la guarda un admin, también desde
 * ahí, después de generar los meses con el solver.
 *
 * Todo corre en una conexión propia: GET_LOCK evita dos reinicios a la vez y
 * multipleStatements permite enviar el mock entero, que es un fichero del
 * repositorio y nunca lleva datos de la petición.
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import type { Connection, RowDataPacket } from 'mysql2/promise'
import db, { dbConfig } from '../../config/db.js'
import { formatDateMadrid, getTodayMadrid } from '../../config/date-utils.js'
import { logger } from '../../config/logger.js'
import { readSqlScript } from '../db/sql-script.js'

const MOCK_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'db-mysql',
  'mock-data.sql'
)

const LOCK_NAME = 'four_points_demo_reset'

// Every scheduling table: the base is the whole module, configuration included
export const SNAPSHOT_TABLES = [
  'scheduling_config',
  'scheduling_shifts',
  'scheduling_employees',
  'scheduling_employee_contracts',
  'scheduling_employee_rules',
  'scheduling_employee_requests',
  'scheduling_months',
  'scheduling_days',
  'scheduling_constraints',
  'scheduling_assignments',
  'scheduling_history',
  'scheduling_solver_runs',
] as const

const snapshotName = (table: string) => `demo_snapshot_${table}`

export type DemoTrigger = 'auto' | 'manual'

export interface DemoResetResult {
  status: 'done' | 'busy' | 'failed'
  scheduling?: 'restored' | 'no-snapshot'
}

export const isDemoMode = (): boolean => process.env.DEMO_MODE === 'true'

async function openConnection(): Promise<Connection> {
  return mysql.createConnection({ ...dbConfig, multipleStatements: true })
}

async function startLog(
  action: 'reset' | 'snapshot',
  trigger: DemoTrigger,
  userId?: string
): Promise<number> {
  const [result] = await db.query<mysql.ResultSetHeader>(
    'INSERT INTO demo_reset_log (action, trigger_type, user_id) VALUES (?, ?, ?)',
    [action, trigger, userId ?? null]
  )
  return result.insertId
}

async function finishLog(id: number, ok: boolean, details: string): Promise<void> {
  await db.query(
    'UPDATE demo_reset_log SET finished_at = NOW(), ok = ?, details = ? WHERE id = ?',
    [ok ? 1 : 0, details.slice(0, 500), id]
  )
}

async function snapshotExists(conn: Connection): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name IN (?)`,
    [SNAPSHOT_TABLES.map(snapshotName)]
  )
  return Number(rows[0].n) === SNAPSHOT_TABLES.length
}

async function restoreScheduling(conn: Connection): Promise<void> {
  await conn.query('START TRANSACTION')
  try {
    // Foreign keys off: the tables are emptied and refilled as a whole
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of SNAPSHOT_TABLES) {
      await conn.query(`DELETE FROM \`${table}\``)
      await conn.query(`INSERT INTO \`${table}\` SELECT * FROM \`${snapshotName(table)}\``)
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')
    await conn.query('COMMIT')
  } catch (error) {
    await conn.query('ROLLBACK')
    await conn.query('SET FOREIGN_KEY_CHECKS = 1')
    throw error
  }
}

async function withLock<T>(
  work: (conn: Connection) => Promise<T>
): Promise<{ busy: true } | { busy: false; value: T }> {
  const conn = await openConnection()
  try {
    const [rows] = await conn.query<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS got', [LOCK_NAME])
    if (Number(rows[0].got) !== 1) return { busy: true }
    try {
      return { busy: false, value: await work(conn) }
    } finally {
      await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME])
    }
  } finally {
    await conn.end()
  }
}

/**
 * Reloads the mock data and restores the scheduling base, if one was saved
 */
export async function resetDemoData(
  trigger: DemoTrigger,
  userId?: string
): Promise<DemoResetResult> {
  const startedAt = Date.now()
  // Logged only once the lock is held: a reset that finds another running leaves no row
  let logId: number | undefined

  try {
    const result = await withLock(async (conn) => {
      logId = await startLog('reset', trigger, userId)
      const mock = await readSqlScript(MOCK_FILE)
      try {
        await conn.query(mock)
      } catch (error) {
        // The mock opens its own transaction: undo whatever it left half done
        await conn.query('ROLLBACK').catch(() => undefined)
        throw error
      }

      if (!(await snapshotExists(conn))) return 'no-snapshot' as const
      await restoreScheduling(conn)
      return 'restored' as const
    })

    if (result.busy) return { status: 'busy' }

    const ms = Date.now() - startedAt
    await finishLog(logId!, true, `scheduling=${result.value}; ${ms} ms`)
    logger.info({ event: 'demo_reset', trigger, scheduling: result.value, ms }, '[DEMO] reset')
    return { status: 'done', scheduling: result.value }
  } catch (error) {
    logger.error({ err: error, trigger }, '[DEMO] reset failed')
    // A code, never the SQL text (it names tables and columns)
    const code = (error as { code?: string }).code ?? 'ERROR'
    if (logId) await finishLog(logId, false, `failed: ${code}`).catch(() => undefined)
    return { status: 'failed' }
  }
}

/**
 * Saves the current scheduling tables as the base the daily reset restores
 */
export async function saveSchedulingSnapshot(userId: string): Promise<DemoResetResult> {
  let logId: number | undefined
  try {
    const result = await withLock(async (conn) => {
      logId = await startLog('snapshot', 'manual', userId)
      for (const table of SNAPSHOT_TABLES) {
        const snapshot = snapshotName(table)
        await conn.query(`DROP TABLE IF EXISTS \`${snapshot}\``)
        await conn.query(`CREATE TABLE \`${snapshot}\` LIKE \`${table}\``)
        await conn.query(`INSERT INTO \`${snapshot}\` SELECT * FROM \`${table}\``)
      }
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS n FROM \`${snapshotName('scheduling_months')}\``
      )
      return Number(rows[0].n)
    })

    if (result.busy) return { status: 'busy' }
    await finishLog(logId!, true, `months=${result.value}`)
    logger.info({ event: 'demo_snapshot', months: result.value }, '[DEMO] scheduling base saved')
    return { status: 'done' }
  } catch (error) {
    logger.error({ err: error }, '[DEMO] saving the scheduling base failed')
    const code = (error as { code?: string }).code ?? 'ERROR'
    if (logId) await finishLog(logId, false, `failed: ${code}`).catch(() => undefined)
    return { status: 'failed' }
  }
}

/**
 * Resets once a day: only when there is no successful reset since midnight
 * (Madrid). Called on each demo entry; never throws, so the entry goes on.
 */
export async function resetIfStale(): Promise<void> {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT started_at FROM demo_reset_log
       WHERE action = 'reset' AND ok = 1
       ORDER BY started_at DESC LIMIT 1`
    )
    const last = rows[0]?.started_at as Date | undefined
    if (last && formatDateMadrid(last) === getTodayMadrid()) return
    await resetDemoData('auto')
  } catch (error) {
    logger.error({ err: error }, '[DEMO] daily reset check failed')
  }
}

export interface DemoStatus {
  lastReset: { startedAt: Date; ok: boolean; trigger: DemoTrigger; details: string | null } | null
  snapshot: { savedAt: Date; details: string | null } | null
}

export async function getDemoStatus(): Promise<DemoStatus> {
  const [resets] = await db.query<RowDataPacket[]>(
    `SELECT started_at, ok, trigger_type, details FROM demo_reset_log
     WHERE action = 'reset' ORDER BY started_at DESC, id DESC LIMIT 1`
  )
  const [snapshots] = await db.query<RowDataPacket[]>(
    `SELECT started_at, details FROM demo_reset_log
     WHERE action = 'snapshot' AND ok = 1 ORDER BY started_at DESC, id DESC LIMIT 1`
  )
  const reset = resets[0]
  const snapshot = snapshots[0]
  return {
    lastReset: reset
      ? {
          startedAt: reset.started_at,
          ok: Boolean(reset.ok),
          trigger: reset.trigger_type,
          details: reset.details,
        }
      : null,
    snapshot: snapshot ? { savedAt: snapshot.started_at, details: snapshot.details } : null,
  }
}
