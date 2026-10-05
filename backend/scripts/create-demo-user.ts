/**
 * create-demo-user.ts
 *
 * Crea o actualiza la cuenta demo pública (ADR-038): usuario `demo`, rol admin,
 * `is_demo = 1`. Su contraseña es aleatoria y no se guarda en ningún sitio: a
 * la cuenta solo se entra por POST /api/auth/demo, y el login con contraseña la
 * rechaza. Si ya existe un usuario `demo` (el antiguo, con rol demo-admin), lo
 * convierte.
 *
 * Necesita la columna users.is_demo (db-mysql/scripts/20261005_add_is_demo_to_users.sql).
 *
 * Uso:
 *   pnpm demo:user               (BD local)
 *   pnpm demo:user:aiven         (Aiven)
 */

import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import type { RowDataPacket } from 'mysql2'
import db from '../config/db.js'
import { SALT_ROUNDS } from '../config/config.js'

const USERNAME = 'demo'
const EMAIL = 'demo@example.com'

async function main(): Promise<void> {
  const [roles] = await db.query<RowDataPacket[]>("SELECT id FROM roles WHERE name = 'admin'")
  if (roles.length === 0) throw new Error("No existe el rol 'admin'")
  const roleId = roles[0].id as number

  const password = await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), SALT_ROUNDS)

  const [existing] = await db.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [
    USERNAME,
  ])

  if (existing.length > 0) {
    await db.query(
      `UPDATE users
       SET role_id = ?, password = ?, email = ?, is_active = 1, is_demo = 1, avatar_url = NULL,
           avatar_public_id = NULL
       WHERE id = ?`,
      [roleId, password, EMAIL, existing[0].id]
    )
    console.log(`Cuenta demo actualizada: ${USERNAME} (${existing[0].id})`)
  } else {
    const id = crypto.randomUUID()
    await db.query(
      `INSERT INTO users (id, username, email, password, role_id, created_at, is_active, is_demo)
       VALUES (?, ?, ?, ?, ?, NOW(), 1, 1)`,
      [id, USERNAME, EMAIL, password, roleId]
    )
    console.log(`Cuenta demo creada: ${USERNAME} (${id})`)
  }

  const [demo] = await db.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM users WHERE is_demo = 1 AND is_active = 1'
  )
  console.log(`Cuentas demo activas: ${demo[0].n}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => db.end())
