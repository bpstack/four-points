// tests/security/access-log.test.ts
// Regression tests for the log (ASVS 7.1 and 7.2). The SQL of a failed
// db.query went to the log with its values interpolated (texts, plates,
// hashes), and `*.password` only hid the field one level down. No 403 left a
// trace, nor did an admin reading or deleting messages of a conversation they
// are not in.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { Writable } from 'node:stream'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pino from 'pino'
import type { Request, Response } from 'express'

vi.mock('../../config/logger.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/logger.js')>()
  return { ...actual, logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() } }
})

const { logger, redact } = await import('../../config/logger.js')
const { logAccessDenied } = await import('../../middlewares/accessLog.js')

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(backend, ...p), 'utf8')

// One line written by a pino logger with the app's redaction
function logged(obj: Record<string, unknown>): Record<string, unknown> {
  let line = ''
  const out = new Writable({
    write(chunk, _enc, done) {
      line += chunk.toString()
      done()
    },
  })
  pino({ redact }, out).error(obj, 'test')
  return JSON.parse(line)
}

describe('log redaction', () => {
  it('hides the SQL of a mysql2 error, which carries the values', () => {
    const err = Object.assign(new Error("Duplicate entry '1234-ABC'"), {
      code: 'ER_DUP_ENTRY',
      sql: "INSERT INTO t VALUES ('1234-ABC', 'nota privada')",
    })
    const line = JSON.stringify(logged({ err }))
    expect(line).not.toContain('nota privada')
    expect(line).toContain('ER_DUP_ENTRY')
  })

  it('hides passwords and tokens at any of the first three levels', () => {
    const line = JSON.stringify(
      logged({
        password: 'p0',
        body: { newPassword: 'p1', token: 't1' },
        req: { body: { password: 'p2', currentPassword: 'p3', refreshToken: 't2' } },
      })
    )
    for (const secret of ['p0', 'p1', 'p2', 'p3', 't1', 't2']) {
      expect(line, secret).not.toContain(`"${secret}"`)
    }
  })
})

describe('403 responses are logged', () => {
  beforeEach(() => vi.clearAllMocks())

  function respond(status: number, user?: { id: string; role: string }) {
    const res = Object.assign(new EventEmitter(), { statusCode: status })
    const req = { method: 'DELETE', originalUrl: '/api/cashier/daily/3?x=secret', user }
    const next = vi.fn()
    logAccessDenied(req as unknown as Request, res as unknown as Response, next)
    expect(next).toHaveBeenCalledOnce()
    res.emit('finish')
  }

  it('logs who was refused what, without the query string', () => {
    respond(403, { id: 'u1', role: 'recepcionista' })
    expect(logger.warn).toHaveBeenCalledWith(
      {
        event: 'access_denied',
        userId: 'u1',
        role: 'recepcionista',
        method: 'DELETE',
        path: '/api/cashier/daily/3',
      },
      '[SECURITY] access denied'
    )
  })

  it('ignores every other status', () => {
    for (const status of [200, 201, 400, 401, 404, 500]) respond(status)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('runs for the whole API, before the routes', () => {
    const index = read('index.ts')
    const at = index.indexOf("app.use('/api', logAccessDenied)")
    expect(at).toBeGreaterThan(-1)
    expect(at).toBeLessThan(index.indexOf("app.use('/api/auth', authRoutes)"))
  })
})

describe('admins acting on conversations they are not in are logged', () => {
  const conversations = read('controllers', 'messages', 'conversation-controller.ts')
  const messages = read('controllers', 'messages', 'message-controller.ts')

  // Body of `static async name(` up to the next static method
  function method(source: string, name: string): string {
    const start = source.indexOf(`static async ${name}(`)
    expect(start, name).toBeGreaterThan(-1)
    const next = source.indexOf('static async ', start + 1)
    return source.slice(start, next === -1 ? undefined : next)
  }

  it.each([
    [conversations, 'getConversation', 'isParticipant', 'read_conversation'],
    [conversations, 'deleteConversation', 'isConversationAdmin', 'delete_conversation'],
    [messages, 'getMessages', 'isParticipant', 'read_messages'],
    [messages, 'deleteMessage', 'isSender', 'delete_message'],
  ])('%#: %s logs the override', (source, name, own, action) => {
    expect(method(source, name)).toMatch(
      new RegExp(`if \\(!${own}\\) logAdminOverride\\(req, '${action}', \\{`)
    )
  })

  it('the moderation list of every conversation is logged', () => {
    expect(method(conversations, 'getAllConversations')).toContain(
      "logAdminOverride(req, 'list_all_conversations'"
    )
  })
})
