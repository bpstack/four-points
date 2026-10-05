// tests/security/demo-reset.test.ts
// The demo reset (ADR-038) wipes every module: its routes exist only with
// DEMO_MODE=true and only for admins that are not the demo account. The mock
// file is sent as one multi-statement query, so its DELIMITER blocks must turn
// into plain SQL. Reads the sources; no database needed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { toMultiStatement } from '../../services/db/sql-script.js'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(backend, ...p), 'utf8')

describe('toMultiStatement', () => {
  it('drops DELIMITER lines and ends the block with ;', () => {
    const sql = [
      'SET @a := 1;',
      'DELIMITER $$',
      'CREATE PROCEDURE p()',
      'BEGIN',
      '  SELECT 1;',
      'END$$',
      'DELIMITER ;',
      'CALL p();',
    ].join('\r\n')
    expect(toMultiStatement(sql)).toBe(
      ['SET @a := 1;', 'CREATE PROCEDURE p()', 'BEGIN', '  SELECT 1;', 'END;', 'CALL p();'].join(
        '\n'
      )
    )
  })

  it('leaves mock-data.sql without DELIMITER and with its procedure closed', () => {
    const out = toMultiStatement(read('db-mysql', 'mock-data.sql'))
    expect(out).not.toMatch(/^\s*DELIMITER/im)
    expect(out).not.toContain('$$')
    expect(out).toMatch(/END;\s*\nCALL mock_require_admin\(\);/)
  })
})

describe('demo reset routes', () => {
  const routes = read('routes', 'demo', 'demo-reset-routes.ts')

  it('answer 404 unless DEMO_MODE is on, before anything else', () => {
    const gate = routes.indexOf('isDemoMode()')
    expect(gate).toBeGreaterThan(-1)
    expect(gate).toBeLessThan(routes.indexOf('router.use(authenticateToken)'))
  })

  it('block the demo account before checking the admin role', () => {
    const auth = routes.indexOf('router.use(authenticateToken)')
    const deny = routes.indexOf('router.use(denyDemo)')
    const admin = routes.indexOf('router.use(isRealAdmin)')
    expect(auth).toBeGreaterThan(-1)
    expect(deny).toBeGreaterThan(auth)
    expect(admin).toBeGreaterThan(deny)
  })

  it('reset only with DEMO_MODE exactly "true"', () => {
    expect(read('services', 'demo', 'demo-reset.service.ts')).toContain(
      "process.env.DEMO_MODE === 'true'"
    )
  })
})
