/**
 * export-scheduling-seed.ts — `pnpm seed:scheduling:export`
 *
 * Writes db-mysql/scheduling-seed.sql from the demo's scheduling base (the
 * demo_snapshot_scheduling_* tables saved with «Guardar horarios actuales como
 * base»). pnpm setup:local loads that file, so a local install gets the same
 * fictitious employees, contracts and months as the public demo.
 *
 * Only reads: SELECTs on the database of DB_ENVIRONMENT (aiven by default).
 * The employees are users: they are exported with a bcrypt hash of a random
 * password nobody knows, so they show in the grid but cannot sign in. Rows of
 * people no longer in the grid are left out, and every other reference to a
 * user (who created or published a month...) points to the local admin.
 *
 * Uso:
 *   pnpm seed:scheduling:export
 */

import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { dbConfig } from '../config/db-config.js'
import { SALT_ROUNDS } from '../config/config.js'
import { SNAPSHOT_TABLES } from '../services/demo/snapshot-tables.js'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'db-mysql', 'scheduling-seed.sql')

// Columns that hold a user id; the employee ones keep it, the rest become the admin
const USER_COLUMNS = new Set([
  'employee_id',
  'added_by',
  'created_by',
  'approved_by',
  'changed_by',
  'published_by',
  'generated_by',
])
const ADMIN = '@seed_admin_id'

function value(v: unknown, column: string, employees: Set<string>): string {
  if (USER_COLUMNS.has(column) && typeof v === 'string' && !employees.has(v)) return ADMIN
  // JSON columns come back parsed
  if (v !== null && typeof v === 'object' && !Buffer.isBuffer(v))
    return mysql.escape(JSON.stringify(v))
  return mysql.escape(v)
}

async function main(): Promise<void> {
  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    ssl: dbConfig.ssl,
    dateStrings: true,
  })
  try {
    const rows: Record<string, RowDataPacket[]> = {}
    for (const table of SNAPSHOT_TABLES) {
      const [r] = await conn.query<RowDataPacket[]>(`SELECT * FROM demo_snapshot_${table}`)
      rows[table] = r
    }
    if (rows.scheduling_employees.length === 0) {
      throw new Error('No hay base guardada (demo_snapshot_scheduling_employees vacía)')
    }

    const employees = new Set(rows.scheduling_employees.map((r) => String(r.employee_id)))
    // Rows of people no longer in the grid (old contracts...) would point to the admin
    const dropped: string[] = []
    for (const table of SNAPSHOT_TABLES) {
      const kept = rows[table].filter(
        (r) =>
          !('employee_id' in r) || r.employee_id === null || employees.has(String(r.employee_id))
      )
      if (kept.length < rows[table].length)
        dropped.push(`${table}: ${rows[table].length - kept.length}`)
      rows[table] = kept
    }
    const [users] = await conn.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, r.name AS role, u.is_active
         FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.id IN (?) ORDER BY u.username`,
      [[...employees]]
    )
    if (users.length !== employees.size) throw new Error('Faltan usuarios de algún empleado')

    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS)
    const out: string[] = [
      '-- =========================================================',
      '-- SCHEDULING SEED - Four-Points',
      '-- =========================================================',
      '-- Base de horarios ficticia de la demo pública: empleados, contratos,',
      '-- reglas, turnos, configuración y meses ya generados por el solver.',
      '-- La carga pnpm setup:local después de mock-data.sql.',
      '--',
      '-- BORRA todo el módulo de horarios (scheduling_*) antes de cargarla: solo',
      '-- para una BD local recién instalada.',
      '--',
      '-- Los empleados son usuarios inventados con una contraseña aleatoria que',
      '-- nadie conoce: salen en el cuadrante pero no pueden entrar. Lo que en la',
      '-- demo apunta a otro usuario (quién creó o publicó un mes) apunta aquí al',
      '-- primer admin activo.',
      '--',
      '-- Generado con: pnpm seed:scheduling:export (scripts/export-scheduling-seed.ts)',
      '-- =========================================================',
      '',
      "SET @seed_admin_id = (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'admin' AND u.is_active = 1 AND u.is_demo = 0 ORDER BY u.created_at LIMIT 1);",
      '',
      '-- Los DELETE vacían tablas enteras',
      'SET SQL_SAFE_UPDATES = 0;',
      'SET FOREIGN_KEY_CHECKS = 0;',
      'START TRANSACTION;',
      '',
    ]
    for (const table of [...SNAPSHOT_TABLES].reverse()) out.push(`DELETE FROM ${table};`)
    out.push('')

    out.push('-- Empleados (usuarios inventados)')
    for (const u of users) {
      out.push(
        `INSERT IGNORE INTO users (id, username, email, password, role_id, is_active) SELECT ${mysql.escape(u.id)}, ${mysql.escape(u.username)}, ${mysql.escape(u.email)}, ${mysql.escape(hash)}, r.id, ${Number(u.is_active)} FROM roles r WHERE r.name = ${mysql.escape(u.role)};`
      )
    }
    out.push('')

    for (const table of SNAPSHOT_TABLES) {
      const r = rows[table]
      if (r.length === 0) continue
      const cols = Object.keys(r[0])
      out.push(`-- ${table} (${r.length})`)
      out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES`)
      out.push(
        r.map((row) => `(${cols.map((c) => value(row[c], c, employees)).join(', ')})`).join(',\n') +
          ';'
      )
      out.push('')
    }
    out.push('COMMIT;', 'SET FOREIGN_KEY_CHECKS = 1;', '')

    await writeFile(OUT, out.join('\n'))
    console.log(`${OUT}`)
    console.log(`  empleados: ${users.map((u) => u.username).join(', ')}`)
    for (const table of SNAPSHOT_TABLES) console.log(`  ${table}: ${rows[table].length}`)
    if (dropped.length)
      console.log(`  fuera (de quien ya no está en el cuadrante): ${dropped.join(', ')}`)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
