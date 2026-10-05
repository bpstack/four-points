/**
 * setup-local.ts — `pnpm setup:local`
 *
 * Monta una BD local desde cero para probar la aplicación con un admin
 * completo (ADR-038):
 * 1. tablas: MASTER_INSTALL.sql y las migraciones posteriores a su baseline;
 * 2. departamentos que usan los módulos y el mock;
 * 3. el admin local `admin` / `fourpoints-local`, público y documentado en el
 *    README: solo puede existir en una BD local;
 * 4. la base de horarios de la demo (scheduling-seed.sql): empleados, contratos
 *    y meses ficticios;
 * 5. datos ficticios del resto de módulos (mock-data.sql).
 *
 * MASTER_INSTALL.sql borra y crea `hotel_db`: el script se niega a seguir si
 * la BD no es local, si no se llama hotel_db o si ya tiene tablas (salvo
 * --force).
 *
 * Uso:
 *   pnpm setup:local                    # admin `admin` / `fourpoints-local`
 *   pnpm setup:local -- --admin maria   # otro nombre
 *   pnpm setup:local -- --force         # borra una hotel_db que ya exista
 */

import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2/promise'
import { dbConfig } from '../config/db-config.js'
import { SALT_ROUNDS } from '../config/config.js'
import { readSqlScript } from '../services/db/sql-script.js'

const DB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'db-mysql')
const DATABASE = 'hotel_db' // fixed in MASTER_INSTALL.sql

// MASTER_INSTALL.sql is the baseline frozen on 2026-05-20; later changes are
// the incremental scripts from this date on (db-mysql/INDEX.md)
const FIRST_SCRIPT_AFTER_BASELINE = '20260521'

// Used by the modules and by mock-data.sql, which looks them up by name
const DEPARTMENTS = [
  'pisos',
  'mantenimiento',
  'reservas',
  'parking',
  'clientes',
  'backoffice',
  'blacklist',
  'grupos',
]

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export const LOCAL_ADMIN_PASSWORD = 'fourpoints-local'

// Bugs of the frozen baseline (aiven/NN, ADR-021) that stop a fresh install;
// on Aiven those tables were created another way. Fixed here, in memory, as
// exact replacements: if the text no longer matches, the setup stops instead
// of guessing. scripts/20261005_complete_fresh_install.sql completes the same
// tables for an install made by hand with the mysql client.
const BASELINE_FIXES: Array<{ file: string; from: string; to: string; why: string }> = [
  {
    file: '11_cashier.sql',
    from: 'CONSTRAINT fk_history_user FOREIGN KEY (changed_by)',
    to: 'CONSTRAINT fk_cashier_history_user FOREIGN KEY (changed_by)',
    why: 'fk_history_user already belongs to logbook_history; Aiven uses this name',
  },
  {
    file: '11_cashier.sql',
    from: 'CONSTRAINT fk_history_shift FOREIGN KEY (shift_id)',
    to: 'CONSTRAINT fk_cashier_history_shift FOREIGN KEY (shift_id)',
    why: 'same name as on Aiven',
  },
  {
    file: '19_scheduling.sql',
    from: 'DROP TABLE IF EXISTS scheduling_config;\n\nSET FOREIGN_KEY_CHECKS = 1;',
    to: 'DROP TABLE IF EXISTS scheduling_config;\n\nSET FOREIGN_KEY_CHECKS = 0;',
    why: 'scheduling_assignments references scheduling_constraints, created after it',
  },
]

function fixBaseline(path: string, text: string): string {
  for (const fix of BASELINE_FIXES.filter((f) => path.endsWith(f.file))) {
    if (text.split(fix.from).length !== 2) {
      throw new Error(`El baseline ${fix.file} ha cambiado; revisa BASELINE_FIXES (${fix.why})`)
    }
    text = text.replace(fix.from, fix.to)
  }
  return text
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main(): Promise<void> {
  if ((process.env.DB_ENVIRONMENT || 'local') !== 'local' || !LOCAL_HOSTS.has(dbConfig.host)) {
    throw new Error('Solo para una BD local (DB_ENVIRONMENT=local y LOCAL_DB_HOST=localhost)')
  }
  if (dbConfig.database !== DATABASE) {
    throw new Error(`MASTER_INSTALL.sql crea "${DATABASE}": pon LOCAL_DB_NAME=${DATABASE}`)
  }

  const adminName = arg('admin') ?? 'admin'
  // Public on purpose (README): this script only runs against a local database
  const password = LOCAL_ADMIN_PASSWORD
  const { database: _db, ...server } = dbConfig
  const conn = await mysql.createConnection({ ...server, multipleStatements: true })

  try {
    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?',
      [DATABASE]
    )
    if (Number(existing[0].n) > 0 && !process.argv.includes('--force')) {
      throw new Error(
        `"${DATABASE}" ya tiene tablas y MASTER_INSTALL.sql la borraría. ` +
          'Si es lo que quieres: pnpm setup:local -- --force'
      )
    }

    console.log('1/5 Tablas (MASTER_INSTALL.sql)')
    await conn.query(await readSqlScript(join(DB_DIR, 'MASTER_INSTALL.sql'), DB_DIR, fixBaseline))
    await conn.query(`USE \`${DATABASE}\``)

    const scripts = (await readdir(join(DB_DIR, 'scripts')))
      .filter((f) => f.endsWith('.sql') && f.slice(0, 8) >= FIRST_SCRIPT_AFTER_BASELINE)
      .sort()
    for (const file of scripts) {
      console.log(`    + scripts/${file}`)
      await conn.query(await readSqlScript(join(DB_DIR, 'scripts', file)))
    }

    console.log('2/5 Departamentos')
    await conn.query('INSERT IGNORE INTO departments (name) VALUES ?', [
      DEPARTMENTS.map((name) => [name]),
    ])

    console.log('3/5 Admin')
    const [roles] = await conn.query<RowDataPacket[]>("SELECT id FROM roles WHERE name = 'admin'")
    await conn.query(
      `INSERT INTO users (id, username, email, password, role_id, created_at, is_active)
       VALUES (?, ?, ?, ?, ?, NOW(), 1)`,
      [
        crypto.randomUUID(),
        adminName,
        `${adminName}@example.com`,
        await bcrypt.hash(password, SALT_ROUNDS),
        roles[0].id,
      ]
    )

    console.log('4/5 Horarios (scheduling-seed.sql)')
    await conn.query(await readSqlScript(join(DB_DIR, 'scheduling-seed.sql')))

    console.log('5/5 Datos ficticios (mock-data.sql)')
    // MASTER_INSTALL.sql leaves safe updates on for this session; the mock empties whole tables
    await conn.query('SET SQL_SAFE_UPDATES = 0')
    await conn.query(await readSqlScript(join(DB_DIR, 'mock-data.sql')))

    console.log('\nListo. Entra en http://localhost:3000 con:')
    console.log(`  usuario:    ${adminName}`)
    console.log(`  contraseña: ${password}`)
    console.log('Es la contraseña pública del README: cámbiala en Perfil si quieres.')
  } finally {
    await conn.end()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  })
