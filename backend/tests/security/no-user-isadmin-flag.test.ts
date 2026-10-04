// tests/security/no-user-isadmin-flag.test.ts
// `authenticateToken` fills req.user with id, username, email and role only:
// a check on `req.user.isAdmin` is always false and hides who may really act.
// Reads the sources; no database or server needed.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listTs(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []
  )
}

const files = ['controllers', 'routes', 'services', 'middlewares'].flatMap((d) =>
  listTs(join(backend, d))
)

describe('req.user.isAdmin', () => {
  it('is not set by authenticateToken', () => {
    const auth = readFileSync(join(backend, 'middlewares', 'authenticateToken.ts'), 'utf8')
    const assigned = auth.match(/req\.user = \{([\s\S]*?)\}/)?.[1] ?? ''
    expect(assigned).toContain('role')
    expect(assigned).not.toContain('isAdmin')
  })

  it.each(files.map((f) => relative(backend, f).replaceAll('\\', '/')))(
    '%s does not read it',
    (file) => {
      const source = readFileSync(join(backend, file), 'utf8')
      expect(source).not.toMatch(/\buser\b[^\n;]*\.isAdmin\b/)
    }
  )
})
