// tests/fnb/fnb-validation.test.ts
// Regression tests for the manual entry amounts (negative or out of range).

import { describe, it, expect } from 'vitest'
import { fnbManualEntrySchema, FNB_MAX_AMOUNT } from '../../validations/fnb/fnb.validations.js'

const body = (amount: number) => ({ date: '2026-09-28', values: { '10001': amount } })

describe('fnbManualEntrySchema', () => {
  it('accepts the amounts the manual entry form sends', () => {
    expect(fnbManualEntrySchema.safeParse(body(0)).success).toBe(true)
    expect(fnbManualEntrySchema.safeParse(body(1234.56)).success).toBe(true)
    expect(fnbManualEntrySchema.safeParse(body(FNB_MAX_AMOUNT)).success).toBe(true)
  })

  it('rejects negative amounts', () => {
    expect(fnbManualEntrySchema.safeParse(body(-0.01)).success).toBe(false)
    expect(fnbManualEntrySchema.safeParse(body(-500)).success).toBe(false)
  })

  it('rejects amounts that do not fit DECIMAL(10,2)', () => {
    expect(fnbManualEntrySchema.safeParse(body(100_000_000)).success).toBe(false)
    expect(fnbManualEntrySchema.safeParse(body(1e300)).success).toBe(false)
  })

  it('rejects non-finite and non-numeric amounts', () => {
    expect(fnbManualEntrySchema.safeParse(body(Infinity)).success).toBe(false)
    expect(fnbManualEntrySchema.safeParse(body(NaN)).success).toBe(false)
    expect(
      fnbManualEntrySchema.safeParse({ date: '2026-09-28', values: { '10001': '12' } }).success
    ).toBe(false)
  })
})
