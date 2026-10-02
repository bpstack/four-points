// tests/security/no-store.test.ts
// Regression test: API responses (blacklist, cashier, invoice PDFs) must
// tell browsers and proxies not to store them. Real Express app, mounted
// the same way as index.ts.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { noStore } from '../../middlewares/noStore.js'

let server: Server
let base: string

beforeAll(async () => {
  const app = express()
  app.use('/api', noStore)
  app.get('/api/blacklist', (_req, res) => {
    res.json([{ guest_name: 'Juan Pérez' }])
  })
  app.get('/api/backoffice/pdf', (_req, res) => {
    res.setHeader('Content-Type', 'application/pdf')
    res.send(Buffer.from('%PDF-1.4'))
  })
  app.get('/api/missing', (_req, res) => {
    res.status(404).json({ error: 'not found' })
  })
  app.get('/', (_req, res) => {
    res.send('ok')
  })
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

const cacheControl = async (path: string) =>
  (await fetch(`${base}${path}`)).headers.get('cache-control')

describe('noStore', () => {
  it('marks JSON, file and error responses under /api as no-store', async () => {
    expect(await cacheControl('/api/blacklist')).toBe('no-store')
    expect(await cacheControl('/api/backoffice/pdf')).toBe('no-store')
    expect(await cacheControl('/api/missing')).toBe('no-store')
  })

  it('leaves routes outside /api alone', async () => {
    expect(await cacheControl('/')).toBeNull()
  })
})
