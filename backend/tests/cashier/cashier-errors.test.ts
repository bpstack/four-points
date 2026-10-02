// tests/cashier/cashier-errors.test.ts
// Regression tests for cashier error responses: known domain errors answer
// 4xx with their message, anything else a generic 500 without SQL details.
// No database: a real Express app throws the errors.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import {
  CASHIER_DOMAIN_ERRORS,
  sendCashierError,
} from '../../controllers/cashier/cashier-errors.js'

const reposDir = join(dirname(fileURLToPath(import.meta.url)), '../../repositories/cashier')

describe('CASHIER_DOMAIN_ERRORS', () => {
  it('only lists messages the cashier repositories really throw', () => {
    const sources = readdirSync(reposDir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => readFileSync(join(reposDir, f), 'utf8'))
      .join('\n')
    for (const message of Object.keys(CASHIER_DOMAIN_ERRORS)) {
      expect(sources, message).toContain(`throw new Error('${message}')`)
    }
  })
})

describe('sendCashierError', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    const app = express()
    app.get('/throw', (req, res) => {
      sendCashierError(res, new Error(String(req.query.msg)), 'Error al cerrar turno')
    })
    app.get('/throw-value', (_req, res) => {
      sendCashierError(res, 'not an Error', 'Error al cerrar turno')
    })
    server = app.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => {
    server.close()
  })

  const call = async (path: string) => {
    const res = await fetch(`${base}${path}`)
    return { status: res.status, body: await res.json() }
  }

  it('answers known errors with their status and message', async () => {
    expect(await call('/throw?msg=Turno no encontrado')).toEqual({
      status: 404,
      body: { error: 'Turno no encontrado' },
    })
    expect(await call('/throw?msg=El turno ya está cerrado')).toEqual({
      status: 409,
      body: { error: 'El turno ya está cerrado' },
    })
    expect((await call('/throw?msg=No hay campos para actualizar')).status).toBe(400)
  })

  it('hides a MySQL message behind the generic text', async () => {
    const mysql = "Unknown column 'updated_at' in 'field list'"
    expect(await call(`/throw?msg=${encodeURIComponent(mysql)}`)).toEqual({
      status: 500,
      body: { error: 'Error al cerrar turno' },
    })
  })

  it('handles values that are not Error objects', async () => {
    expect(await call('/throw-value')).toEqual({
      status: 500,
      body: { error: 'Error al cerrar turno' },
    })
  })
})
