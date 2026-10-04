// tests/backoffice/batch-payment.test.ts
// Regression tests for the batch payment that paid every month: year and
// month came from the body unchecked, and mysql2 turns an object into a
// column comparison, so the date filter stopped filtering.

import { describe, it, expect } from 'vitest'
import mysql from 'mysql2'
import {
  executeBatchPaymentSchema,
  revertBatchPaymentSchema,
} from '../../validations/backoffice/batch-payment.js'

describe('the original problem', () => {
  it('mysql2 formats an object as a column comparison instead of a number', () => {
    expect(mysql.format('WHERE YEAR(invoice_date) = ?', [{ invoice_date: 1 }])).toBe(
      'WHERE YEAR(invoice_date) = `invoice_date` = 1'
    )
  })
})

describe('executeBatchPaymentSchema', () => {
  it('accepts what the frontend sends', () => {
    expect(executeBatchPaymentSchema.safeParse({ year: 2026, month: 9 }).success).toBe(true)
    expect(executeBatchPaymentSchema.safeParse({}).success).toBe(true)
  })

  it('rejects objects, strings, out-of-range values and half dates', () => {
    for (const body of [
      { year: { invoice_date: 1 }, month: 9 },
      { year: 2026, month: { status: 'validated' } },
      { year: '2026', month: '9' },
      { year: 2026, month: 13 },
      { year: 2026, month: 0 },
      { year: 1999, month: 1 },
      { year: 2026.5, month: 1 },
      { year: 2026 },
      { month: 9 },
    ]) {
      expect(executeBatchPaymentSchema.safeParse(body).success, JSON.stringify(body)).toBe(false)
    }
  })
})

describe('revertBatchPaymentSchema', () => {
  it('requires a plain year and month', () => {
    expect(revertBatchPaymentSchema.safeParse({ year: 2026, month: 9 }).success).toBe(true)
    expect(revertBatchPaymentSchema.safeParse({}).success).toBe(false)
    expect(revertBatchPaymentSchema.safeParse({ year: { a: 1 }, month: 9 }).success).toBe(false)
  })
})
