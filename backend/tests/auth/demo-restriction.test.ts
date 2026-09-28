// tests/auth/demo-restriction.test.ts
// Regression tests for demoRestriction middleware — pure logic against mocked req/res.
// Locks the positive-list of routes a demo-admin can mutate.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Mute the async write to demo_activity_log: we are not testing logging here,
// just whether the middleware calls next() or returns 403.
vi.mock('../../repositories/demo/demo-activity-repository.js', () => ({
  DemoActivityRepository: {
    logActivity: vi.fn().mockResolvedValue(undefined),
  },
}))

const { demoRestriction } = await import('../../middlewares/demoRestriction.js')
const { DemoActivityRepository } = await import('../../repositories/demo/demo-activity-repository.js')

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/',
    body: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as any,
    get: () => undefined,
    user: undefined,
    ...overrides,
  } as unknown as Request
}

function buildRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as Response
}

const next: NextFunction = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('demoRestriction — pass-through cases', () => {
  it('lets through requests without an authenticated user (handled upstream)', () => {
    const req = buildReq()
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('lets through any non-demo role (admin, recepcionista, etc.)', () => {
    const req = buildReq({
      user: { id: 'u1', role: 'admin' } as any,
      method: 'DELETE',
      originalUrl: '/api/parking/bookings/123',
    })
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('lets demo-admin perform any GET', () => {
    const req = buildReq({
      user: { id: 'demo', role: 'demo-admin' } as any,
      method: 'GET',
      originalUrl: '/api/scheduling/months/77',
    })
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('demoRestriction — demo whitelist (POSTs allowed)', () => {
  const allowed: Array<[string, string]> = [
    ['POST', '/api/auth/logout'],
    ['POST', '/api/parking/bookings'],
    ['POST', '/api/logbooks/42/comments'],
    ['POST', '/api/maintenance'],
  ]

  for (const [method, url] of allowed) {
    it(`allows demo-admin: ${method} ${url}`, () => {
      const req = buildReq({
        user: { id: 'demo', role: 'demo-admin' } as any,
        method,
        originalUrl: url,
      })
      const res = buildRes()
      demoRestriction(req, res, next)
      expect(next).toHaveBeenCalledOnce()
      expect(res.status).not.toHaveBeenCalled()
    })
  }

  it('also matches the whitelist with a query string appended', () => {
    const req = buildReq({
      user: { id: 'demo', role: 'demo-admin' } as any,
      method: 'POST',
      originalUrl: '/api/parking/bookings?foo=bar',
    })
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('demoRestriction — demo writes blocked (deny-by-default)', () => {
  const blocked: Array<[string, string]> = [
    ['POST', '/api/scheduling/months'],
    ['POST', '/api/scheduling/months/77/generate'],
    ['DELETE', '/api/parking/bookings/123'],
    ['PATCH', '/api/maintenance/abc'],
    ['PUT', '/api/users/123'],
    ['POST', '/api/auth/register'],
    ['POST', '/api/logbooks'], // logbook root, not /:id/comments
  ]

  for (const [method, url] of blocked) {
    it(`blocks demo-admin: ${method} ${url}`, () => {
      const req = buildReq({
        user: { id: 'demo', role: 'demo-admin' } as any,
        method,
        originalUrl: url,
      })
      const res = buildRes()
      demoRestriction(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      const payload = (res.json as any).mock.calls[0][0]
      expect(payload.demo).toBe(true)
    })
  }
})

describe('demoRestriction — blocked-attempt log', () => {
  it('redacts password fields from the logged body preview', () => {
    const req = buildReq({
      user: { id: 'demo', role: 'demo-admin' } as any,
      method: 'PATCH',
      originalUrl: '/api/auth/me/password',
      body: { currentPassword: 'old-secret-1', newPassword: 'new-secret-2', confirmPassword: 'new-secret-2', note: 'keep' },
    })
    demoRestriction(req, buildRes(), next)
    const logged = (DemoActivityRepository.logActivity as any).mock.calls[0][0].body_preview as string
    expect(logged).not.toMatch(/secret/)
    expect(JSON.parse(logged)).toEqual({
      currentPassword: '[REDACTED]',
      newPassword: '[REDACTED]',
      confirmPassword: '[REDACTED]',
      note: 'keep',
    })
  })
})
