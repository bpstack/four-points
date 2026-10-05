// tests/security/csrf-origin.test.ts
// The CSRF defence is the Origin check in config/cors.ts: a write from another
// site must be refused before the route runs. A real Express server with the
// real middleware; requests as a browser would send them.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { allowedOrigins, corsMiddleware } from '../../config/cors.js'

let server: Server
let base: string
let ran = 0

beforeAll(async () => {
  const app = express()
  app.use(corsMiddleware(allowedOrigins('production', undefined)))
  app.post('/api/write', (_req, res) => {
    ran++
    res.json({ ok: true })
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => new Promise((resolve) => server.close(resolve)))

async function post(headers: Record<string, string>, body = '{}') {
  const before = ran
  const res = await fetch(`${base}/api/write`, { method: 'POST', headers, body })
  return {
    status: res.status,
    ran: ran > before,
    allow: res.headers.get('access-control-allow-origin'),
  }
}

describe('a write from another site', () => {
  it.each([
    ['a JSON request', { 'Content-Type': 'application/json' }],
    // What an HTML form on another site sends: no preflight in the browser
    ['a form post', { 'Content-Type': 'application/x-www-form-urlencoded' }],
    ['a multipart upload', { 'Content-Type': 'multipart/form-data; boundary=x' }],
    ['a text/plain post', { 'Content-Type': 'text/plain' }],
  ])('is refused before the route runs: %s', async (_name, headers) => {
    const res = await post({ ...headers, Origin: 'https://evil.example' })
    expect(res.status).toBe(403)
    expect(res.ran).toBe(false)
    expect(res.allow).toBeNull()
  })

  it.each([
    'https://four-points.stackbp.es.evil.example',
    'https://evil-four-points.stackbp.es',
    'null',
  ])('is refused for a look-alike origin: %s', async (origin) => {
    const res = await post({ 'Content-Type': 'application/json', Origin: origin })
    expect(res.status).toBe(403)
    expect(res.ran).toBe(false)
  })

  it('is refused from localhost in production', async () => {
    const res = await post({ 'Content-Type': 'application/json', Origin: 'http://localhost:3000' })
    expect(res.status).toBe(403)
    expect(res.ran).toBe(false)
  })
})

describe('a write from our own site', () => {
  it('reaches the route and may read the answer with cookies', async () => {
    const res = await fetch(`${base}/api/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://four-points.stackbp.es' },
      body: '{}',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://four-points.stackbp.es')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
  })
})

describe('allowed origins', () => {
  it('include localhost only outside production', () => {
    expect(allowedOrigins('development', undefined)).toContain('http://localhost:3000')
    expect(allowedOrigins('production', undefined)).not.toContain('http://localhost:3000')
  })

  it('add FRONTEND_URL when set', () => {
    expect(allowedOrigins('production', 'https://preview.four-points.stackbp.es')).toContain(
      'https://preview.four-points.stackbp.es'
    )
  })
})
