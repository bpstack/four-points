// tests/conciliation/conciliation-validation.test.ts
// Regression tests for conciliation input validation: negative or fractional
// values, unknown or repeated reasons, impossible dates and route params.
// No database: the schemas and the param guard run against a real Express app.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  RECEPTION_REASONS,
  HOUSEKEEPING_REASONS,
  createConciliationSchema,
  updateFormSchema,
  updateStatusSchema,
  CONCILIATION_PARAM_RULES,
} from '../../validations/conciliation/conciliation-schemas.js'
import { validateParams } from '../../middlewares/validateParams.js'

// Same shape as handleSave in frontend/app/components/conciliation/ConciliationForm.tsx
const form = () => ({
  reception: RECEPTION_REASONS.map((reason) => ({ reason, value: 0, room_number: '', notes: '' })),
  housekeeping: HOUSEKEEPING_REASONS.map((reason) => ({
    reason,
    value: 0,
    room_number: '',
    notes: '',
  })),
  notes: JSON.stringify([]),
})

describe('updateFormSchema', () => {
  it('accepts what the form sends', () => {
    const body = form()
    body.reception[0].value = 112
    body.housekeeping[0].room_number = '101, 102'
    expect(updateFormSchema.safeParse(body).success).toBe(true)
  })

  it('rejects negative, fractional and huge values', () => {
    for (const value of [-1, 2.5, 10_000, NaN]) {
      const body = form()
      body.reception[1].value = value
      expect(updateFormSchema.safeParse(body).success).toBe(false)
    }
    const body = form() as { housekeeping: { value: unknown }[] }
    body.housekeeping[0].value = '5'
    expect(updateFormSchema.safeParse(body).success).toBe(false)
  })

  it('rejects an unknown reason instead of skipping it silently', () => {
    const body = form() as { reception: { reason: string }[] }
    body.reception[4].reason = 'otro'
    const parsed = updateFormSchema.safeParse(body)
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0].path[0]).toBe('reception')
  })

  it('rejects a repeated reason that leaves another one out', () => {
    const body = form()
    body.housekeeping[6].reason = 'cleaned'
    const parsed = updateFormSchema.safeParse(body)
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0].path[0]).toBe('housekeeping')
  })

  it('rejects missing or extra lines', () => {
    const short = form()
    short.reception.pop()
    expect(updateFormSchema.safeParse(short).success).toBe(false)
    expect(updateFormSchema.safeParse({ reception: form().reception }).success).toBe(false)
  })
})

describe('createConciliationSchema', () => {
  it('accepts a real day', () => {
    expect(createConciliationSchema.safeParse({ date: '2026-09-28' }).success).toBe(true)
  })

  it('rejects a missing, malformed or impossible date', () => {
    for (const date of [undefined, '', '28/09/2026', '2026-02-30']) {
      expect(createConciliationSchema.safeParse({ date }).success).toBe(false)
    }
  })
})

describe('updateStatusSchema', () => {
  it('only accepts the three statuses', () => {
    expect(updateStatusSchema.safeParse({ status: 'confirmed' }).success).toBe(true)
    expect(updateStatusSchema.safeParse({ status: 'deleted' }).success).toBe(false)
    expect(updateStatusSchema.safeParse({}).success).toBe(false)
  })
})

describe('route params', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const router = express.Router()
    validateParams(router, CONCILIATION_PARAM_RULES)
    const ok = (_req: express.Request, res: express.Response) => {
      res.json({ ok: true })
    }
    // Same paths as routes/conciliation/conciliation.routes.ts
    router.get('/day/:date', ok)
    router.get('/:id', ok)
    router.put('/:id/form', ok)
    router.delete('/:id', ok)

    const app = express()
    app.use('/api/conciliations', router)
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/conciliations`
  })

  afterAll(() => {
    server.close()
  })

  const status = async (method: string, path: string) =>
    (await fetch(`${base}${path}`, { method })).status

  it('lets valid params through', async () => {
    expect(await status('GET', '/day/2026-09-28')).toBe(200)
    expect(await status('GET', '/7')).toBe(200)
    expect(await status('PUT', '/7/form')).toBe(200)
  })

  it('answers 400 for invalid params', async () => {
    expect(await status('GET', '/day/2026-02-31')).toBe(400)
    expect(await status('GET', '/day/hoy')).toBe(400)
    expect(await status('GET', '/abc')).toBe(400)
    expect(await status('PUT', '/-3/form')).toBe(400)
    expect(await status('DELETE', '/1.5')).toBe(400)
  })
})
