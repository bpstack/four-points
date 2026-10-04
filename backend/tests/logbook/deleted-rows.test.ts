// tests/logbook/deleted-rows.test.ts
// A deleted entry could still be solved, reopened and marked as read, and a
// deleted comment edited and deleted again: the statements did not filter
// deleted_at. Reads the repository SQL; no database needed.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'repositories', 'logbook')
const sources = readdirSync(dir).map((f) => [f, readFileSync(join(dir, f), 'utf8')] as const)

// Template or quoted SQL strings
function statements(re: RegExp): [string, string][] {
  return sources.flatMap(([file, src]) =>
    [...src.matchAll(/`([^`]*)`|'([^'\n]*)'/g)]
      .map((m) => m[1] ?? m[2])
      .filter((sql) => re.test(sql))
      .map((sql) => [file, sql.replace(/\s+/g, ' ')] as [string, string])
  )
}

describe('logbook SQL skips deleted rows', () => {
  const updates = statements(/^\s*UPDATE (logbooks|logbook_comments)\b/)

  it('finds the updates of entries and comments', () => {
    expect(updates.length).toBeGreaterThanOrEqual(6)
  })

  it.each(updates)('%s: %s', (_file, sql) => {
    expect(sql).toMatch(/WHERE .*deleted_at IS NULL/)
  })

  it('reads a comment only while it is not deleted', () => {
    const select = statements(/SELECT \* FROM logbook_comments WHERE id = \?/)
    expect(select).toHaveLength(1)
    expect(select[0][1]).toContain('deleted_at IS NULL')
  })

  it('records a read only for an entry that is not deleted', () => {
    const insert = statements(/INSERT INTO logbook_reads/)
    expect(insert).toHaveLength(1)
    expect(insert[0][1]).toMatch(/SELECT .* FROM logbooks l WHERE .*l\.deleted_at IS NULL/)
  })
})
