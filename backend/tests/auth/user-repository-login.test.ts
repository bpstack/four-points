// tests/auth/user-repository-login.test.ts
// Integration tests for UserRepository.login.
// Requires a reachable MySQL (local or aiven). Skipped gracefully otherwise.
// Inserts a throwaway user, exercises the 4 outcomes, removes it.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import bcrypt from 'bcrypt'
import db from '../../config/db.js'
import { UserRepository } from '../../repositories/auth/user-repository.js'

const TEST_USERNAME = 'authtest_user_h115'
const TEST_PASSWORD = 'CorrectHorseBattery42!'
const TEST_EMAIL = 'authtest-h115@four-points.test'
const TEST_USER_ID = 'auth-test-0000-0000-000000000001'

let dbAvailable = false
let inactiveUserId: string | null = null

beforeAll(async () => {
  try {
    await db.query('SELECT 1')
    dbAvailable = true
  } catch {
    dbAvailable = false
    return
  }

  // Asegura el rol admin (id=2) y un usuario activo de prueba.
  const hash = await bcrypt.hash(TEST_PASSWORD, 10)
  await db.query(
    `INSERT INTO users (id, username, email, password, role_id, is_active)
     VALUES (?, ?, ?, ?, 2, 1)
     ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1, email = VALUES(email)`,
    [TEST_USER_ID, TEST_USERNAME, TEST_EMAIL, hash]
  )

  // Usuario inactivo: reusa el demo si existe y is_active=0 (caso real tras H1-12).
  const [rows] = await db.query<any[]>(
    `SELECT id FROM users WHERE username = 'demo' AND is_active = 0 LIMIT 1`
  )
  inactiveUserId = rows[0]?.id ?? null
})

afterAll(async () => {
  if (dbAvailable) {
    await db.query(`DELETE FROM users WHERE id = ?`, [TEST_USER_ID])
  }
})

describe('UserRepository.login — integration', () => {
  it('returns the user (without password) when credentials are valid', async () => {
    if (!dbAvailable) return
    const user = await UserRepository.login({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    })
    expect(user.username).toBe(TEST_USERNAME)
    expect(user.email).toBe(TEST_EMAIL)
    expect(user.role).toBe('admin')
    expect((user as any).password).toBeUndefined()
  })

  it('rejects with "Credenciales inválidas" when password is wrong', async () => {
    if (!dbAvailable) return
    await expect(
      UserRepository.login({ username: TEST_USERNAME, password: 'wrong-pwd' })
    ).rejects.toThrow(/credenciales/i)
  })

  it('rejects with "Credenciales inválidas" when username does not exist', async () => {
    if (!dbAvailable) return
    await expect(
      UserRepository.login({
        username: 'definitely-not-a-real-user-h115',
        password: 'anything',
      })
    ).rejects.toThrow(/credenciales/i)
  })

  it('rejects with "Usuario inactivo" for an existing user with is_active=0', async () => {
    if (!dbAvailable || !inactiveUserId) {
      // Skipped silently if demo is not present (e.g. fresh local DB without seed).
      return
    }
    await expect(UserRepository.login({ username: 'demo', password: 'whatever' })).rejects.toThrow(
      /inactivo/i
    )
  })
})
