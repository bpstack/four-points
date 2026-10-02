// tests/security/like-patterns.test.ts
// Searches built '%' + text + '%' by hand, so a search for "%" or "_" matched
// every row. Every LIKE pattern from user text now goes through likeContains.
// Reads the sources; no database needed.

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

const files = ['controllers', 'repositories', 'services']
  .flatMap((d) => listTs(join(backend, d)))
  .map((f) => relative(backend, f).replaceAll('\\', '/'))
  .filter((f) => f !== 'repositories/shared/like.ts')

describe('LIKE patterns', () => {
  it('scans the sources', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(files)('%s escapes user text with likeContains', (file) => {
    const source = readFileSync(join(backend, file), 'utf8')
    expect(source).not.toMatch(/`%\$\{/)
    expect(source).not.toMatch(/CONCAT\('%'/)
  })
})
