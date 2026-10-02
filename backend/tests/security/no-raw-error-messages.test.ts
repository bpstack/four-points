// tests/security/no-raw-error-messages.test.ts
// Guards against 5xx responses that echo an error's message (any `x.message`,
// `x.sql` or `x.sqlMessage`): for a database failure that is MySQL's text,
// with table, column and key names; for the solver, process and daemon output.
// Reads the controller sources; no database or server needed.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const controllersDir = join(backend, 'controllers')

// Known and tracked in docs/TODO.md; add a file here only with its entry
const ALLOWED = new Set<string>([])
function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listTs(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []
  )
}

// Bodies of res.status(5xx).json({ ... }) calls
function serverErrorBodies(source: string): string[] {
  return [...source.matchAll(/status\(5\d\d\)\s*\.json\(\{([\s\S]*?)\}\)/g)].map((m) => m[1])
}

describe('5xx responses', () => {
  const files = listTs(controllersDir)
    .map((f) => relative(backend, f).replaceAll('\\', '/'))
    .filter((f) => !ALLOWED.has(f))

  it('scans the controllers', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files)('%s does not send the caught error message', (file) => {
    const leaks = serverErrorBodies(readFileSync(join(backend, file), 'utf8')).filter((body) =>
      /\b[A-Za-z_$][\w$]*\.(message|sqlMessage|sql)\b/.test(body)
    )
    expect(leaks).toEqual([])
  })
})
