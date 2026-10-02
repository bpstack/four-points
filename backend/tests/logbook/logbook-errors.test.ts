// tests/logbook/logbook-errors.test.ts
// Regression tests for logbook update errors: editing someone else's entry
// answered 500 instead of 403. No database: a real Express app throws the
// errors, and the messages are checked against the service source.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  LOGBOOK_DOMAIN_ERRORS,
  sendLogbookError,
} from '../../controllers/logbook/logbook-errors.js'

const here = dirname(fileURLToPath(import.meta.url))

describe('LOGBOOK_DOMAIN_ERRORS', () => {
  it('only lists messages the history service really throws', () => {
    const source = readFileSync(
      join(here, '../../services/logbook/logbookHistory-service.ts'),
      'utf8'
    )
    for (const message of Object.keys(LOGBOOK_DOMAIN_ERRORS)) {
      expect(source, message).toContain(`throw new Error('${message}')`)
    }
  })

  it('uses codes the frontend translates', () => {
    for (const lang of ['es', 'en']) {
      const errors = JSON.parse(
        readFileSync(join(here, `../../../frontend/messages/${lang}/errors.json`), 'utf8')
      )
      const text = JSON.stringify(errors)
      for (const { code } of Object.values(LOGBOOK_DOMAIN_ERRORS)) {
        expect(text, `${lang}: ${code}`).toContain(`"${code}"`)
      }
    }
  })
})

describe('sendLogbookError', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.get('/throw', (req, res) => {
      sendLogbookError(res, new Error(String(req.query.msg)), 'LOGBOOK_FETCH_ERROR')
    })
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
  })

  const call = async (msg: string) => {
    const res = await fetch(`${base}/throw?msg=${encodeURIComponent(msg)}`)
    return { status: res.status, body: await res.json() }
  }

  it("answers 403 for someone else's entry", async () => {
    expect(await call('Solo el autor puede actualizar este logbook')).toEqual({
      status: 403,
      body: {
        success: false,
        error: 'LOGBOOK_ONLY_AUTHOR_UPDATE',
        code: 'LOGBOOK_ONLY_AUTHOR_UPDATE',
      },
    })
  })

  it('answers 404 for a missing entry', async () => {
    expect((await call('Logbook no encontrado')).status).toBe(404)
  })

  it('keeps any other error a generic 500', async () => {
    expect(await call("Unknown column 'x'")).toEqual({
      status: 500,
      body: { success: false, error: 'LOGBOOK_FETCH_ERROR', code: 'LOGBOOK_FETCH_ERROR' },
    })
  })
})
