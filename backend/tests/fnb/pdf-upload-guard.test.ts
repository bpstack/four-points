// tests/fnb/pdf-upload-guard.test.ts
// Regression tests for uploads that are not a PDF or never finish parsing.
// No DB needed: every case is rejected before the tracked codes are loaded.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  FnbPdfError,
  isPdfBuffer,
  parseOperaPdf,
  withTimeout,
} from '../../services/fnb/pdf-parser.service.js'

// The categories cache imports the DB pool; none of these cases reach it
vi.mock('../../services/fnb/fnb-categories.cache.js', () => ({
  trackedCodesSet: async () => new Set<string>(),
}))

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE = join(__dirname, 'fixtures', 'OperaPrint-sample.pdf')

describe('isPdfBuffer', () => {
  it('accepts the Opera sample', () => {
    expect(isPdfBuffer(readFileSync(FIXTURE))).toBe(true)
  })

  it('rejects files without the %PDF- header', () => {
    expect(isPdfBuffer(Buffer.from('<html><body>not a pdf</body></html>'))).toBe(false)
    expect(isPdfBuffer(Buffer.alloc(0))).toBe(false)
  })
})

describe('parseOperaPdf', () => {
  it('still parses the Opera sample', async () => {
    const result = await parseOperaPdf(readFileSync(FIXTURE))
    expect(result.date).toBe('2026-05-09')
  })

  it('answers 422 for a file that is not a PDF', async () => {
    const err = await parseOperaPdf(Buffer.from('MZ fake executable')).catch((e) => e)
    expect(err).toBeInstanceOf(FnbPdfError)
    expect(err.status).toBe(422)
  })

  it('answers 422 for a malformed PDF instead of a raw parser error', async () => {
    const err = await parseOperaPdf(Buffer.from('%PDF-1.4\ngarbage')).catch((e) => e)
    expect(err).toBeInstanceOf(FnbPdfError)
    expect(err.status).toBe(422)
  })
})

describe('withTimeout', () => {
  it('rejects with 422 when the work does not finish in time', async () => {
    const never = new Promise<never>(() => {})
    const err = await withTimeout(never, 10).catch((e) => e)
    expect(err).toBeInstanceOf(FnbPdfError)
    expect(err.status).toBe(422)
  })

  it('returns the result when the work finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42)
  })
})
