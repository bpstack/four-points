// tests/blacklist/blacklist-validation.test.ts
// Regression tests for blacklist input validation: blank texts stored empty
// and impossible dates (Date.parse accepts 2026-02-31) that reached MySQL.

import { describe, it, expect } from 'vitest'
import {
  createBlacklistSchema,
  updateBlacklistSchema,
} from '../../validations/blacklist/schemas.js'

const entry = {
  guest_name: 'Juan Pérez',
  document_type: 'DNI',
  document_number: '12345678z',
  check_in_date: '2026-09-20',
  check_out_date: '2026-09-22',
  reason: 'Daños en la habitación',
  severity: 'HIGH',
  comments: 'Rompió el espejo del baño',
}

describe('createBlacklistSchema', () => {
  it('accepts a normal entry, trimmed and with the document uppercased', () => {
    const parsed = createBlacklistSchema.parse({ ...entry, guest_name: '  Juan Pérez  ' })
    expect(parsed.guest_name).toBe('Juan Pérez')
    expect(parsed.document_number).toBe('12345678Z')
  })

  it('rejects a name, reason or comments made only of spaces', () => {
    expect(createBlacklistSchema.safeParse({ ...entry, guest_name: '     ' }).success).toBe(false)
    expect(createBlacklistSchema.safeParse({ ...entry, reason: ' '.repeat(12) }).success).toBe(
      false
    )
    expect(createBlacklistSchema.safeParse({ ...entry, comments: ' '.repeat(12) }).success).toBe(
      false
    )
  })

  it('rejects days that do not exist', () => {
    for (const date of ['2026-02-31', '2026-02-29', '2026-04-31']) {
      expect(
        createBlacklistSchema.safeParse({
          ...entry,
          check_in_date: date,
          check_out_date: '2026-05-10',
        }).success
      ).toBe(false)
    }
  })
})

describe('updateBlacklistSchema', () => {
  it('rejects blank texts and impossible dates', () => {
    expect(updateBlacklistSchema.safeParse({ reason: ' '.repeat(15) }).success).toBe(false)
    expect(updateBlacklistSchema.safeParse({ check_out_date: '2026-02-30' }).success).toBe(false)
  })

  it('accepts a partial update', () => {
    expect(updateBlacklistSchema.safeParse({ severity: 'LOW' }).success).toBe(true)
  })
})
