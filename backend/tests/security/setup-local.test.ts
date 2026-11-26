// tests/security/setup-local.test.ts
// pnpm setup:local (ADR-038, ADR-050) installs from the snapshot of the remote
// structure (db-mysql/schema.sql) and its catalogs. The repository is public:
// these tests keep server details out of the snapshot, and keep the guards that
// stop the install (it drops hotel_db) from running anywhere but a local, empty
// database. Reads the sources; no database needed.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(backend, ...p), 'utf8').replace(/\r\n/g, '\n')
const setup = read('scripts', 'setup-local.ts')
const schema = read('db-mysql', 'schema.sql')
const catalogs = read('db-mysql', 'catalogs.sql')

describe('setup:local snapshot', () => {
  it.each([
    ['schema.sql', schema],
    ['catalogs.sql', catalogs],
  ])('%s carries no definer, host or address of the server', (_file, sql) => {
    expect(sql).not.toMatch(/DEFINER\s*=/i)
    expect(sql).not.toMatch(/\b(\d{1,3}\.){3}\d{1,3}\b/)
    expect(sql).not.toMatch(/cmp_prod|cmp_repo/)
  })

  it('schema.sql has structure only: no rows, counters or runtime demo tables', () => {
    expect(schema).not.toMatch(/^INSERT/m)
    expect(schema).not.toMatch(/AUTO_INCREMENT=\d/)
    expect(schema).not.toContain('demo_snapshot_')
  })

  it('catalogs.sql has rows only', () => {
    expect(catalogs).not.toMatch(/^(CREATE|DROP|ALTER)\b/im)
  })
})

describe('setup:local guards', () => {
  it('runs only on a local database host', () => {
    expect(setup).toContain("new Set(['localhost', '127.0.0.1', '::1'])")
    expect(setup).toMatch(/DB_ENVIRONMENT \|\| 'local'\) !== 'local'/)
  })

  it('refuses a database that already has tables unless --force', () => {
    expect(setup).toContain("process.argv.includes('--force')")
    expect(setup.indexOf("includes('--force')")).toBeLessThan(setup.indexOf('DROP DATABASE'))
  })

  it('uses the public local admin password documented in the README', () => {
    const readme = readFileSync(join(backend, '..', 'README.md'), 'utf8')
    expect(setup).toContain("LOCAL_ADMIN_PASSWORD = 'fourpoints-local'")
    expect(readme).toContain('fourpoints-local')
  })
})
