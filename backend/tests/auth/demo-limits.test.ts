// tests/auth/demo-limits.test.ts
// Limits for the shared demo account (ADR-038): schedule generation per IP and
// in total (one 512 MB Render instance runs the solver), and writes per IP.
// Other accounts are never limited by them.

import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

const { demoGenerateLimiter, demoWriteLimiter } = await import('../../middlewares/rateLimiter.js')

const DEMO = { id: 'd1', username: 'demo', role: 'admin', isDemo: true }
const OWNER = { id: 'a1', username: 'admin', role: 'admin' }

function fakeReq(ip: string, user: object, method = 'POST'): Request {
  return {
    ip,
    method,
    user,
    headers: {},
    socket: { remoteAddress: ip },
    app: { get: () => 3 },
    get: () => undefined,
  } as unknown as Request
}

function fakeRes() {
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    append: vi.fn(),
    status: vi.fn((code: number) => {
      res.statusCode = code
      return res
    }),
    json: vi.fn(() => res),
    send: vi.fn(() => res),
    on: vi.fn(),
  }
  return res
}

// Runs a middleware chain; returns the status (200 when every step called next)
async function run(
  chain: Array<(req: Request, res: Response, next: NextFunction) => unknown>,
  req: Request
) {
  const res = fakeRes()
  for (const mw of chain) {
    let passed = false
    await mw(req, res as unknown as Response, () => {
      passed = true
    })
    if (!passed) return res.statusCode
  }
  return 200
}

describe('demo schedule generation limit', () => {
  it('allows 5 per hour per IP, then answers 429', async () => {
    const codes = []
    for (let i = 0; i < 6; i++)
      codes.push(await run(demoGenerateLimiter, fakeReq('198.51.100.1', DEMO)))
    expect(codes).toEqual([200, 200, 200, 200, 200, 429])
  })

  it('caps all visitors together at 30 per hour', async () => {
    const codes = []
    // 25 more, from other IPs, after the 5 above
    for (let i = 0; i < 26; i++)
      codes.push(await run(demoGenerateLimiter, fakeReq(`198.51.100.${10 + i}`, DEMO)))
    expect(codes.slice(0, 25).every((c) => c === 200)).toBe(true)
    expect(codes[25]).toBe(429)
  })

  it('never limits other accounts', async () => {
    for (let i = 0; i < 40; i++) {
      expect(await run(demoGenerateLimiter, fakeReq('198.51.100.1', OWNER))).toBe(200)
    }
  })
})

describe('demo write limit', () => {
  it('allows 60 writes per 15 minutes per IP, then answers 429', async () => {
    const codes = []
    for (let i = 0; i < 61; i++)
      codes.push(await run([demoWriteLimiter], fakeReq('203.0.113.1', DEMO)))
    expect(codes.filter((c) => c === 200)).toHaveLength(60)
    expect(codes[60]).toBe(429)
  })

  it('does not count reads', async () => {
    expect(await run([demoWriteLimiter], fakeReq('203.0.113.1', DEMO, 'GET'))).toBe(200)
  })

  it('never limits other accounts', async () => {
    expect(await run([demoWriteLimiter], fakeReq('203.0.113.1', OWNER))).toBe(200)
  })
})
