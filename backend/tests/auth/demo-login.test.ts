// tests/auth/demo-login.test.ts
// POST /api/auth/demo (ADR-038): exists only with DEMO_MODE=true, enters the
// active demo account and marks its tokens as demo, so demoRestriction limits it.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response } from 'express'

process.env.SECRET_JWT_KEY ??= 'test-secret-key-for-vitest-only-not-prod'

vi.mock('../../repositories/auth/user-repository.js', () => ({
  UserRepository: { getDemoUser: vi.fn() },
}))

const { UserRepository } = await import('../../repositories/auth/user-repository.js')
const { demoLogin } = await import('../../controllers/auth/auth-controllers.js')
const { verifyToken } = await import('../../services/auth/tokenService.js')

function fakeRes() {
  const res = {
    statusCode: 0,
    cookies: {} as Record<string, string>,
    status: vi.fn((code: number) => {
      res.statusCode = code
      return res
    }),
    json: vi.fn(() => res),
    cookie: vi.fn((name: string, value: string) => {
      res.cookies[name] = value
      return res
    }),
  }
  return res
}

const req = {} as Request
const DEMO = { id: 'd1', username: 'demo', role: 'admin', is_demo: 1, is_active: 1 }

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  delete process.env.DEMO_MODE
})

describe('demoLogin', () => {
  it.each([undefined, 'false', '1', 'TRUE'])('answers 404 with DEMO_MODE=%s', async (mode) => {
    if (mode !== undefined) process.env.DEMO_MODE = mode
    const res = fakeRes()
    await demoLogin(req, res as unknown as Response)
    expect(res.statusCode).toBe(404)
    expect(res.cookie).not.toHaveBeenCalled()
    expect(UserRepository.getDemoUser).not.toHaveBeenCalled()
  })

  it('answers 503 without an active demo account', async () => {
    process.env.DEMO_MODE = 'true'
    vi.mocked(UserRepository.getDemoUser).mockResolvedValueOnce(null)
    const res = fakeRes()
    await demoLogin(req, res as unknown as Response)
    expect(res.statusCode).toBe(503)
    expect(res.cookie).not.toHaveBeenCalled()
  })

  it('enters the demo account with tokens marked as demo', async () => {
    process.env.DEMO_MODE = 'true'
    vi.mocked(UserRepository.getDemoUser).mockResolvedValueOnce(DEMO as never)
    const res = fakeRes()
    await demoLogin(req, res as unknown as Response)
    expect(res.statusCode).toBe(200)

    const access = verifyToken(res.cookies.access_token)
    const refresh = verifyToken(res.cookies.refresh_token)
    expect(access).toMatchObject({ id: 'd1', role: 'admin', demo: true, type: 'access' })
    expect(refresh).toMatchObject({ id: 'd1', demo: true, type: 'refresh' })
  })

  it('answers 500 without the error text when the database fails', async () => {
    process.env.DEMO_MODE = 'true'
    vi.mocked(UserRepository.getDemoUser).mockRejectedValueOnce(new Error('ER_SECRET_TABLE'))
    const res = fakeRes()
    await demoLogin(req, res as unknown as Response)
    expect(res.statusCode).toBe(500)
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('ER_SECRET_TABLE')
  })
})
