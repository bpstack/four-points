// tests/security/setup-local.test.ts
// pnpm setup:local (ADR-038) installs from the frozen baseline and fixes, in
// memory, the bugs that stop a fresh install. Each fix is an exact
// replacement: these tests fail as soon as the baseline text changes, and keep
// the guards that stop MASTER_INSTALL.sql (it drops hotel_db) from running
// anywhere but a local, empty database. Reads the sources; no database needed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(backend, ...p), 'utf8').replace(/\r\n/g, '\n')
const setup = read('scripts', 'setup-local.ts')

// The fixes, as written in the script (file, from)
const fixes = [...setup.matchAll(/file: '([^']+)',\s*from: '([^']+)'/g)].map((m) => ({
  file: m[1],
  // The source writes newlines as the two characters \ and n
  from: m[2].split(String.raw`\n`).join('\n'),
}))

describe('setup:local baseline fixes', () => {
  it('lists the known fixes', () => {
    expect(fixes.map((f) => f.file)).toEqual([
      '11_cashier.sql',
      '11_cashier.sql',
      '19_scheduling.sql',
    ])
  })

  it.each(fixes)('$file still has the text it replaces, exactly once', ({ file, from }) => {
    expect(read('db-mysql', 'aiven', file).split(from)).toHaveLength(2)
  })
})

describe('setup:local guards', () => {
  it('runs only on a local database host', () => {
    expect(setup).toContain("new Set(['localhost', '127.0.0.1', '::1'])")
    expect(setup).toMatch(/DB_ENVIRONMENT \|\| 'local'\) !== 'local'/)
  })

  it('refuses a database that already has tables unless --force', () => {
    expect(setup).toContain("process.argv.includes('--force')")
    expect(setup.indexOf("includes('--force')")).toBeLessThan(
      setup.indexOf("MASTER_INSTALL.sql'), DB_DIR")
    )
  })

  it('uses the public local admin password documented in the README', () => {
    const readme = readFileSync(join(backend, '..', 'README.md'), 'utf8')
    expect(setup).toContain("LOCAL_ADMIN_PASSWORD = 'fourpoints-local'")
    expect(readme).toContain('fourpoints-local')
  })
})
