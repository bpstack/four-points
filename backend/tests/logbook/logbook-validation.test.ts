// tests/logbook/logbook-validation.test.ts
// Regression tests for logbook input validation: blank messages, impossible
// dates, negative offsets and unchecked route params.
// No database: the schemas and the param guard run against a real Express app.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  createLogbookSchema,
  updateLogbookSchema,
  createCommentSchema,
  logbookListQuerySchema,
  LOGBOOK_PARAM_RULES,
} from '../../validations/logbook/logbook-schemas.js'
import { validateParams } from '../../middlewares/validateParams.js'

const author = '550e8400-e29b-41d4-a716-446655440001'
const entry = {
  message: 'Cliente de la 204 pide almohada',
  importance_level: 'media',
  department_id: 1,
  author_id: author,
}

describe('messages and comments', () => {
  it('rejects a message made only of spaces instead of storing it empty', () => {
    expect(createLogbookSchema.safeParse({ ...entry, message: '     ' }).success).toBe(false)
    expect(updateLogbookSchema.safeParse({ message: '  \n\t  ' }).success).toBe(false)
    expect(createCommentSchema.safeParse({ comment: '      ' }).success).toBe(false)
  })

  it('stores the message trimmed', () => {
    const parsed = createLogbookSchema.parse({ ...entry, message: '  Llamar a recepción  ' })
    expect(parsed.message).toBe('Llamar a recepción')
  })
})

describe('authorship', () => {
  it('drops an author_id sent by the client; the controller uses req.user.id', () => {
    const parsed = createLogbookSchema.parse({ ...entry, author_id: author })
    expect(parsed).not.toHaveProperty('author_id')
  })
})

describe('dates', () => {
  it('accepts real days, including 29 February of a leap year', () => {
    expect(createLogbookSchema.safeParse({ ...entry, date: '2026-09-28' }).success).toBe(true)
    expect(createLogbookSchema.safeParse({ ...entry, date: '2028-02-29' }).success).toBe(true)
  })

  it('rejects days that do not exist', () => {
    for (const date of ['2026-02-31', '2026-02-29', '2026-13-01', '2026-00-10', '2026-04-31']) {
      expect(createLogbookSchema.safeParse({ ...entry, date }).success).toBe(false)
    }
  })
})

describe('list query', () => {
  it('accepts what the reports screen sends', () => {
    const query = {
      limit: '50',
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      include_trashed: 'true',
      importance_level: 'alta',
    }
    expect(logbookListQuerySchema.parse(query)).toMatchObject({ limit: 50 })
    expect(logbookListQuerySchema.safeParse({}).success).toBe(true)
  })

  it('rejects a negative offset, a bad limit and impossible dates', () => {
    const bad = [
      { offset: '-5' },
      { limit: '0' },
      { limit: '501' },
      { limit: 'abc' },
      { limit: ['10', '20'] },
      { date_from: '2026-02-31' },
      { importance_level: 'critica' },
      { include_trashed: 'yes' },
    ]
    for (const query of bad) {
      expect(logbookListQuerySchema.safeParse(query).success).toBe(false)
    }
  })
})

describe('route params', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const router = express.Router()
    validateParams(router, LOGBOOK_PARAM_RULES)
    const ok = (_req: express.Request, res: express.Response) => {
      res.json({ ok: true })
    }
    // Same paths as routes/logbook/logbook-routes.ts
    router.get('/:logbookId/history', ok)
    router.get('/department/:departmentId', ok)
    router.get('/author/:authorId', ok)
    router.get('/day/:day', ok)
    router.delete('/:id', ok)
    router.put('/:logbookId/comments/:id', ok)
    router.get('/:logbookId/comments/:commentId/history', ok)

    const app = express()
    app.use('/api/logbooks', router)
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/logbooks`
  })

  afterAll(() => {
    server.close()
  })

  const status = async (method: string, path: string) =>
    (await fetch(`${base}${path}`, { method })).status

  it('lets valid params through', async () => {
    expect(await status('GET', '/12/history')).toBe(200)
    expect(await status('GET', '/department/3')).toBe(200)
    expect(await status('GET', `/author/${author}`)).toBe(200)
    expect(await status('GET', '/day/2026-09-28')).toBe(200)
    expect(await status('DELETE', '/12')).toBe(200)
    expect(await status('PUT', '/12/comments/7')).toBe(200)
    expect(await status('GET', '/12/comments/7/history')).toBe(200)
  })

  it('answers 400 for invalid params', async () => {
    expect(await status('GET', '/abc/history')).toBe(400)
    expect(await status('GET', '/department/-1')).toBe(400)
    expect(await status('GET', '/author/not-a-uuid')).toBe(400)
    expect(await status('GET', '/day/2026-02-31')).toBe(400)
    expect(await status('DELETE', '/0')).toBe(400)
    expect(await status('PUT', '/12/comments/1.5')).toBe(400)
    expect(await status('GET', '/12/comments/x/history')).toBe(400)
  })

  it('names the error code', async () => {
    const res = await fetch(`${base}/day/2026-02-31`)
    expect(await res.json()).toEqual({
      success: false,
      error: 'INVALID_DATE_FORMAT',
      code: 'INVALID_DATE_FORMAT',
    })
  })
})
