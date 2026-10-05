// tests/auth/demo-password-login.test.ts
// The demo account is entered only through POST /api/auth/demo: the password
// login rejects it even with the right password (ADR-038).

import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcrypt'

const PASSWORD = 'CorrectPassword123!'
const hash = await bcrypt.hash(PASSWORD, 4)

const query = vi.fn()
vi.mock('../../config/db.js', () => ({ default: { query } }))

const { UserRepository } = await import('../../repositories/auth/user-repository.js')

const row = (is_demo: number) => [
  [{ id: 'u1', username: 'someone', password: hash, is_active: 1, is_demo, role: 'admin' }],
]

describe('password login and the demo account', () => {
  it('rejects the demo account with the right password', async () => {
    query.mockResolvedValueOnce(row(1))
    await expect(UserRepository.login({ username: 'someone', password: PASSWORD })).rejects.toThrow(
      /credenciales/i
    )
  })

  it('still accepts any other account with the right password', async () => {
    query.mockResolvedValueOnce(row(0))
    await expect(
      UserRepository.login({ username: 'someone', password: PASSWORD })
    ).resolves.toMatchObject({ id: 'u1' })
  })
})
