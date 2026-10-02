// tests/security/no-console.test.ts
// Application code logs through config/logger.ts (pino, with redaction), never
// console.*, so whatever gets logged goes through the same pipeline.
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

const files = ['controllers', 'routes', 'middlewares', 'services', 'repositories']
  .flatMap((d) => listTs(join(backend, d)))
  .map((f) => relative(backend, f).replaceAll('\\', '/'))

describe('console in application code', () => {
  it('scans the sources', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(files)('%s logs through the logger', (file) => {
    expect(readFileSync(join(backend, file), 'utf8')).not.toMatch(
      /\bconsole\.(log|info|warn|error|debug)\(/
    )
  })
})
