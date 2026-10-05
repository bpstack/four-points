// tests/auth/demo-restriction.test.ts
// Regression tests for the demo account guards (users.is_demo, ADR-038) —
// pure logic against mocked req/res.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// Mute the async write to demo_activity_log: we are not testing logging here,
// just whether the middleware calls next() or returns 403.
vi.mock('../../repositories/demo/demo-activity-repository.js', () => ({
  DemoActivityRepository: {
    logActivity: vi.fn().mockResolvedValue(undefined),
  },
}))

const { demoRestriction, denyDemo, denyDemoWrites } =
  await import('../../middlewares/demoRestriction.js')
const { DemoActivityRepository } =
  await import('../../repositories/demo/demo-activity-repository.js')

function buildReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/',
    headers: {},
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

// The public demo account (users.is_demo) is a real admin: only what is
// declared here or on the route is blocked
const DEMO_USER = { id: 'd1', username: 'demo', role: 'admin', isDemo: true } as any
const OWNER = { id: 'a1', username: 'admin', role: 'admin' } as any

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
})

describe('demoRestriction — blocked-attempt log', () => {
  it('redacts password fields from the logged body preview', () => {
    const req = buildReq({
      user: DEMO_USER,
      method: 'PATCH',
      originalUrl: '/api/auth/me/password',
      body: {
        currentPassword: 'old-secret-1',
        newPassword: 'new-secret-2',
        confirmPassword: 'new-secret-2',
        note: 'keep',
      },
    })
    denyDemo(req, buildRes(), next)
    const logged = (DemoActivityRepository.logActivity as any).mock.calls[0][0]
      .body_preview as string
    expect(logged).not.toMatch(/secret/)
    expect(JSON.parse(logged)).toEqual({
      currentPassword: '[REDACTED]',
      newPassword: '[REDACTED]',
      confirmPassword: '[REDACTED]',
      note: 'keep',
    })
  })
})

describe('demoRestriction — demo account (is_demo)', () => {
  it.each(['multipart/form-data; boundary=x', 'Multipart/Form-Data', 'multipart/mixed'])(
    'blocks any upload (content-type %s)',
    (contentType) => {
      const req = buildReq({
        user: DEMO_USER,
        method: 'POST',
        originalUrl: '/api/maintenance/1/images',
        headers: { 'content-type': contentType } as any,
      })
      const res = buildRes()
      demoRestriction(req, res, next)
      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(DemoActivityRepository.logActivity).toHaveBeenCalledOnce()
    }
  )

  it('lets JSON writes through (the route decides)', () => {
    const req = buildReq({
      user: DEMO_USER,
      method: 'DELETE',
      originalUrl: '/api/parking/bookings/ABC',
      headers: { 'content-type': 'application/json' } as any,
    })
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('lets the owner upload', () => {
    const req = buildReq({
      user: OWNER,
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x' } as any,
    })
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('denyDemo', () => {
  it.each(['GET', 'POST', 'DELETE'])('blocks the demo account on %s', (method) => {
    const res = buildRes()
    denyDemo(buildReq({ user: DEMO_USER, method }), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('lets the owner through', () => {
    const res = buildRes()
    denyDemo(buildReq({ user: OWNER, method: 'POST' }), res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('denyDemoWrites', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('lets the demo account %s', (method) => {
    const res = buildRes()
    denyDemoWrites(buildReq({ user: DEMO_USER, method }), res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('blocks the demo account on %s', (method) => {
    const res = buildRes()
    denyDemoWrites(buildReq({ user: DEMO_USER, method }), res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('lets the owner write', () => {
    const res = buildRes()
    denyDemoWrites(buildReq({ user: OWNER, method: 'DELETE' }), res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('blocking a request without a JSON body', () => {
  it.each(['DELETE', 'POST'])('answers 403 on %s with req.body undefined', (method) => {
    const res = buildRes()
    denyDemo(buildReq({ user: DEMO_USER, method, body: undefined }), res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(DemoActivityRepository.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ body_preview: 'null' })
    )
  })

  it('answers 403 on an upload before multer reads the body', () => {
    const req = buildReq({
      user: DEMO_USER,
      method: 'POST',
      body: undefined,
      headers: { 'content-type': 'multipart/form-data; boundary=x' } as any,
    })
    const res = buildRes()
    demoRestriction(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
