// tests/maintenance/maintenance-validation.test.ts
// Regression tests for maintenance input validation: blank texts stored
// empty, texts too long for their TEXT column, and unchecked route params.
// No database: the schemas and the param guard run against a real Express app.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  createReportSchema,
  updateReportSchema,
  updateStatusSchema,
  addResolutionNotesSchema,
  MAINTENANCE_PARAM_RULES,
} from '../../validations/maintenance/schemas.js'
import { validateParams } from '../../middlewares/validateParams.js'

const report = {
  title: 'Grifo gotea',
  description: 'El grifo del lavabo gotea sin parar',
  location_type: 'room',
  location_description: 'Baño',
  room_number: '204',
}

describe('blank texts', () => {
  it('rejects a title, description or location made only of spaces', () => {
    expect(createReportSchema.safeParse({ ...report, title: '      ' }).success).toBe(false)
    expect(createReportSchema.safeParse({ ...report, description: ' '.repeat(20) }).success).toBe(
      false
    )
    expect(createReportSchema.safeParse({ ...report, location_description: '     ' }).success).toBe(
      false
    )
    expect(updateReportSchema.safeParse({ title: '    ' }).success).toBe(false)
    expect(addResolutionNotesSchema.safeParse({ notes: '        ' }).success).toBe(false)
  })

  it('still stores texts trimmed', () => {
    expect(createReportSchema.parse({ ...report, title: '  Grifo gotea  ' }).title).toBe(
      'Grifo gotea'
    )
  })
})

describe('long texts', () => {
  const long = 'a'.repeat(16001)
  const fits = 'a'.repeat(16000)

  it('rejects texts longer than their TEXT column holds', () => {
    expect(createReportSchema.safeParse({ ...report, description: long }).success).toBe(false)
    expect(updateReportSchema.safeParse({ resolution_notes: long }).success).toBe(false)
    expect(updateStatusSchema.safeParse({ status: 'completed', notes: long }).success).toBe(false)
    expect(addResolutionNotesSchema.safeParse({ notes: long }).success).toBe(false)
  })

  it('accepts texts up to 16,000 characters', () => {
    expect(createReportSchema.safeParse({ ...report, description: fits }).success).toBe(true)
    expect(addResolutionNotesSchema.safeParse({ notes: fits }).success).toBe(true)
  })
})

describe('route params', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const router = express.Router()
    validateParams(router, MAINTENANCE_PARAM_RULES)
    const ok = (_req: express.Request, res: express.Response) => {
      res.json({ ok: true })
    }
    // Same paths as routes/maintenance/maintenance-routes.ts
    router.get('/stats', ok)
    router.get('/:id', ok)
    router.delete('/:id/images/:imageId', ok)

    const app = express()
    app.use('/api/maintenance', router)
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/maintenance`
  })

  afterAll(() => {
    server.close()
  })

  const status = async (method: string, path: string) =>
    (await fetch(`${base}${path}`, { method })).status

  it('lets valid ids through', async () => {
    expect(await status('GET', '/stats')).toBe(200)
    expect(await status('GET', '/280926-001')).toBe(200)
    expect(await status('DELETE', '/280926-001/images/15')).toBe(200)
  })

  it('answers 400 for invalid ids', async () => {
    expect(await status('GET', '/abc')).toBe(400)
    expect(await status('DELETE', '/abc/images/15')).toBe(400)
    expect(await status('DELETE', '/280926-001/images/abc')).toBe(400)
    expect(await status('DELETE', '/280926-001/images/0')).toBe(400)
  })
})
