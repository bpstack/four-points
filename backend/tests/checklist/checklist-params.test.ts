// tests/checklist/checklist-params.test.ts
// Regression tests for checklist route params: invented checklist ids (which
// created rows in checklist_runs), path-like ids, and steps that do not
// belong to the checklist. Uses the real JSON definitions in
// backend/content/checklist/tasks and a real Express app; no database.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { validateChecklistParams } from '../../middlewares/checklistParams.js'
import { getValidStepIds, isKnownChecklist } from '../../services/checklist/checklist-content.js'

describe('isKnownChecklist', () => {
  it('knows the three checklists the frontend uses', () => {
    for (const id of ['cl-morning-shift', 'cl-afternoon-shift', 'cl-night-audit']) {
      expect(isKnownChecklist(id)).toBe(true)
    }
  })

  it('rejects invented and path-like ids', () => {
    for (const id of [
      'cl-invented',
      'cl-../../package',
      'cl-..%2F..%2Fpackage',
      'morning-shift',
      'cl-Morning-Shift',
      'cl-',
      '',
    ]) {
      expect(isKnownChecklist(id)).toBe(false)
    }
  })

  it('never reads outside the tasks folder', () => {
    // backend/package.json exists, but the id is rejected before any read
    expect(getValidStepIds('cl-../../../package')).toBeNull()
  })
})

describe('checklist route params', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const router = express.Router()
    validateChecklistParams(router)
    const ok = (_req: express.Request, res: express.Response) => {
      res.json({ ok: true })
    }
    // Same paths as routes/checklist/checklist-routes.ts
    router.get('/:id/run', ok)
    router.patch('/:id/steps/:stepId', ok)
    router.post('/:id/steps/:stepId/comments', ok)
    router.delete('/:id/steps/:stepId/comments/:commentId', ok)
    router.post('/:id/steps/:stepId/attachments', ok)
    router.delete('/:id/steps/:stepId/attachments/:attachmentId', ok)

    const app = express()
    app.use('/api/checklists', router)
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/checklists`
  })

  afterAll(() => {
    server.close()
  })

  const call = async (method: string, path: string) => {
    const res = await fetch(`${base}${path}`, { method })
    return { status: res.status, body: await res.json() }
  }

  it('lets real checklists and steps through', async () => {
    expect((await call('GET', '/cl-morning-shift/run')).status).toBe(200)
    expect((await call('PATCH', '/cl-morning-shift/steps/s5-2')).status).toBe(200)
    expect((await call('POST', '/cl-night-audit/steps/s1-6/comments')).status).toBe(200)
    expect((await call('DELETE', '/cl-night-audit/steps/s1-6/comments/42')).status).toBe(200)
    expect((await call('DELETE', '/cl-night-audit/steps/s1-1/attachments/7')).status).toBe(200)
  })

  it('answers 404 for a checklist that does not exist', async () => {
    expect(await call('GET', '/cl-invented/run')).toEqual({
      status: 404,
      body: { error: 'Checklist no encontrado' },
    })
    expect((await call('GET', '/cl-..%2F..%2Fpackage/run')).status).toBe(404)
  })

  it('answers 400 for a step of another checklist or an invented one', async () => {
    // s6-1 exists in night-audit but not in morning-shift
    expect(await call('POST', '/cl-morning-shift/steps/s6-1/comments')).toEqual({
      status: 400,
      body: { error: 'Paso no válido' },
    })
    expect((await call('POST', '/cl-night-audit/steps/s99-1/attachments')).status).toBe(400)
  })

  it('answers 400 for record ids that are not positive integers', async () => {
    expect((await call('DELETE', '/cl-night-audit/steps/s1-1/comments/abc')).status).toBe(400)
    expect((await call('DELETE', '/cl-night-audit/steps/s1-1/attachments/0')).status).toBe(400)
  })
})
