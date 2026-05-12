// tests/scheduling-corpus/loader.ts
// Loads corpus fixtures from the fixtures/ directory.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CorpusFixture } from './_schema.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, 'fixtures')

/**
 * Load all corpus fixtures from fixtures/*.json, sorted by filename.
 */
export function loadAllFixtures(): CorpusFixture[] {
  const files = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()

  return files.map((file) => loadFixtureFile(join(FIXTURES_DIR, file)))
}

/**
 * Load a single fixture by id (e.g. 'F01-empty-month').
 * Throws if not found.
 */
export function loadFixture(id: string): CorpusFixture {
  const path = join(FIXTURES_DIR, `${id}.json`)
  return loadFixtureFile(path)
}

function loadFixtureFile(path: string): CorpusFixture {
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw) as CorpusFixture
}
