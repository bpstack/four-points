// tests/security/env-example.test.ts
// Keeps backend/.env.example in sync with the variables the code reads, and
// makes sure it never carries real hosts or passwords again (it held the
// Aiven host, user and passwords until 2026-10-02).

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const example = readFileSync(join(backend, '.env.example'), 'utf8')

const SKIP = new Set(['node_modules', 'tests', 'scheduling-solver', 'db-mysql'])
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return SKIP.has(name) ? [] : sources(path)
    return name.endsWith('.ts') ? [path] : []
  })
}

// process.env.X outside comments
const used = new Set(
  sources(backend).flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .flatMap((line) => [...line.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]))
  )
)
const declared = new Map(
  [...example.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map((m) => [m[1], m[2].trim()])
)

describe('backend/.env.example', () => {
  it('declares every variable the code reads', () => {
    expect([...used].filter((v) => !declared.has(v)).sort()).toEqual([])
  })

  it('declares nothing the code no longer reads', () => {
    expect([...declared.keys()].filter((v) => !used.has(v)).sort()).toEqual([])
  })

  it('carries no real hosts or passwords', () => {
    for (const key of ['LOCAL_DB_PASSWORD', 'AIVEN_PASSWORD', 'AIVEN_DB_HOST', 'AIVEN_DB_USER']) {
      expect(declared.get(key), key).toBe('')
    }
    expect(example).not.toMatch(/aivencloud\.com/)
  })
})
