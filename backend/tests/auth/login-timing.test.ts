// tests/auth/login-timing.test.ts
// A failed login answers no sooner than LOGIN_FAILURE_MIN_MS, whatever failed
// (unknown user, wrong password, inactive user), so the response time does not
// tell whether the username exists. A successful login is not delayed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response } from 'express'

vi.mock('../../repositories/auth/user-repository.js', () => ({
  UserRepository: { login: vi.fn() },
}))
// The demo reset opens its own database connection: not part of this test
vi.mock('../../services/demo/demo-reset.service.js', () => ({ resetIfStale: vi.fn() }))

const { UserRepository } = await import('../../repositories/auth/user-repository.js')
const { login, LOGIN_FAILURE_MIN_MS } = await import('../../controllers/auth/auth-controllers.js')

function fakeRes() {
  const res = {
    statusCode: 0,
    status: vi.fn((code: number) => {
      res.statusCode = code
      return res
    }),
    json: vi.fn(() => res),
    cookie: vi.fn(() => res),
  }
  return res
}

const req = { body: { username: 'someone', password: 'WrongPass123!' } } as Request

describe('login response time', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('a failed login waits until the floor before answering 401', async () => {
    vi.mocked(UserRepository.login).mockRejectedValueOnce(new Error('Credenciales inválidas'))
    const res = fakeRes()
    const done = login(req, res as unknown as Response)

    await vi.advanceTimersByTimeAsync(LOGIN_FAILURE_MIN_MS - 1)
    expect(res.status).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await done
    expect(res.statusCode).toBe(401)
  })

  it('a successful login answers without waiting', async () => {
    vi.mocked(UserRepository.login).mockResolvedValueOnce({
      id: 'u1',
      username: 'someone',
      role: 'admin',
    } as never)
    const res = fakeRes()
    await login(req, res as unknown as Response)
    expect(res.statusCode).toBe(200)
  })
})
