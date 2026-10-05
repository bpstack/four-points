// tests/security/scheduling-seed.test.ts
// db-mysql/scheduling-seed.sql is published with the repo and loaded by
// pnpm setup:local. Whatever re-exports it, it must only carry made-up users,
// and every employee the grid uses must be one the seed creates.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const seed = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'db-mysql', 'scheduling-seed.sql'),
  'utf8'
)

const users = [
  ...seed.matchAll(/^INSERT IGNORE INTO users \([^)]*\) SELECT '([^']+)', '([^']+)', '([^']+)'/gm),
].map((m) => ({ id: m[1], username: m[2], email: m[3] }))

function rowsOf(table: string): string[] {
  const block = seed.split(`INSERT INTO ${table} (`)[1]?.split(';\n')[0] ?? ''
  return block.split('\n').slice(1)
}

describe('scheduling seed', () => {
  it('creates made-up employees only', () => {
    expect(users.length).toBeGreaterThan(0)
    for (const u of users) {
      expect(u.username).toMatch(/^empleado\d+$/)
      expect(u.email).toMatch(/@example\.com$/)
    }
  })

  it('has no e-mail address outside example.com', () => {
    const emails = seed.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []
    expect(emails.filter((e) => !e.endsWith('@example.com'))).toEqual([])
  })

  it('every grid row and assignment belongs to an employee the seed creates', () => {
    const ids = new Set(users.map((u) => u.id))
    const used = [...rowsOf('scheduling_employees'), ...rowsOf('scheduling_assignments')]
      .map((row) => [...row.matchAll(/'([0-9a-f-]{36})'/g)].map((m) => m[1]))
      .flat()
    expect(used.length).toBeGreaterThan(0)
    expect(used.filter((id) => !ids.has(id))).toEqual([])
  })
})
