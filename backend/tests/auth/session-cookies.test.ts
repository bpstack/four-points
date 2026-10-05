// tests/auth/session-cookies.test.ts
// The session cookies a sign-in sets in production: not readable by scripts
// (XSS cannot steal them), only over HTTPS, and SameSite=Lax so a POST from
// another site does not carry them (CSRF). What res.cookie actually receives.

import { describe, it, expect, vi, afterAll } from 'vitest'
import type { Request, Response } from 'express'

const original = { NODE_ENV: process.env.NODE_ENV, DEMO_MODE: process.env.DEMO_MODE }
process.env.NODE_ENV = 'production'
process.env.SECRET_JWT_KEY ??= 'test-secret-key-for-vitest-only-not-prod'
process.env.DEMO_MODE = 'true'

vi.mock('../../repositories/auth/user-repository.js', () => ({
  UserRepository: {
    login: vi.fn().mockResolvedValue({ id: 'u1', username: 'someone', role: 'admin' }),
    getDemoUser: vi.fn().mockResolvedValue({ id: 'd1', username: 'demo', role: 'admin' }),
  },
}))
vi.mock('../../services/demo/demo-reset.service.js', () => ({ resetIfStale: vi.fn() }))

const { login, demoLogin } = await import('../../controllers/auth/auth-controllers.js')
// The cookie options are read at import; put the environment back for other files
process.env.NODE_ENV = original.NODE_ENV
afterAll(() => {
  if (original.DEMO_MODE === undefined) delete process.env.DEMO_MODE
  else process.env.DEMO_MODE = original.DEMO_MODE
})

function fakeRes() {
  const cookies: Array<{ name: string; options: Record<string, unknown> }> = []
  const res = {
    cookies,
    status: vi.fn(() => res),
    json: vi.fn(() => res),
    cookie: vi.fn((name: string, _value: string, options: Record<string, unknown>) => {
      cookies.push({ name, options })
      return res
    }),
  }
  return res
}

describe.each([
  [
    'password login',
    (res: Response) =>
      login({ body: { username: 'someone', password: 'CorrectPassword123!' } } as Request, res),
  ],
  ['demo entry', (res: Response) => demoLogin({} as Request, res)],
])('%s in production', (_name, signIn) => {
  it('sets both session cookies HttpOnly, Secure, SameSite=Lax on the shared domain', async () => {
    const res = fakeRes()
    await signIn(res as unknown as Response)
    expect(res.cookies.map((c) => c.name).sort()).toEqual(['access_token', 'refresh_token'])
    for (const { options } of res.cookies) {
      expect(options).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        domain: '.four-points.stackbp.es',
      })
    }
  })
})
