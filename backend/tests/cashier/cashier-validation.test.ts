// tests/cashier/cashier-validation.test.ts
// Regression tests for the cashier ORDER BY injection and missing validation.

import { describe, it, expect } from 'vitest'
import {
  SORT_FIELDS,
  safeSort,
  safeOrder,
  shiftListQuerySchema,
  dailyListQuerySchema,
  historyListQuerySchema,
  initializeDaySchema,
  updateShiftSchema,
  replaceDenominationsSchema,
  replacePaymentsSchema,
  paymentSchema,
  createVoucherSchema,
  justifyVoucherSchema,
  dateParam,
  idParam,
} from '../../validations/cashier/cashier-validation.js'

const uuid = '550e8400-e29b-41d4-a716-446655440001'

describe('ORDER BY allow-list', () => {
  it('query schemas reject sort values outside the allow-list', () => {
    expect(shiftListQuerySchema.safeParse({ sort: 'id,(SELECT 1)' }).success).toBe(false)
    expect(dailyListQuerySchema.safeParse({ sort: 'password' }).success).toBe(false)
    expect(historyListQuerySchema.safeParse({ order: 'DESC,id' }).success).toBe(false)
  })

  it('repository guards fall back to safe defaults', () => {
    expect(safeSort('id,(SELECT 1)', SORT_FIELDS.shifts, 'shift_date')).toBe('shift_date')
    expect(safeSort('created_at', SORT_FIELDS.shifts, 'shift_date')).toBe('created_at')
    expect(safeOrder('ASC; DROP TABLE x', 'DESC')).toBe('DESC')
    expect(safeOrder('asc', 'DESC')).toBe('ASC')
  })
})

describe('bodies sent by the frontend are accepted', () => {
  it('initialize day (opened_by now comes from the session and is stripped)', () => {
    const r = initializeDaySchema.safeParse({
      opened_by: 'someone-else',
      primary_user_id: uuid,
      secondary_user_ids: [],
    })
    expect(r.success && r.data).toEqual({ primary_user_id: uuid, secondary_user_ids: [] })
  })

  it('shift income, denominations, payments and voucher', () => {
    expect(updateShiftSchema.safeParse({ income: 350.5 }).success).toBe(true)
    expect(
      replaceDenominationsSchema.safeParse({
        denominations: [
          { denomination: 500, quantity: 0 },
          { denomination: 0.05, quantity: 3 },
        ],
      }).success
    ).toBe(true)
    expect(
      replacePaymentsSchema.safeParse({ payments: [{ payment_method_id: 1, amount: 0 }] }).success
    ).toBe(true)
    const v = createVoucherSchema.safeParse({ amount: 20, reason: 'Taxi', created_by: 'x' })
    expect(v.success && v.data).toEqual({ amount: 20, reason: 'Taxi' })
    expect(justifyVoucherSchema.safeParse({ shift_id: 12 }).success).toBe(true)
  })
})

describe('invalid money and structure are rejected', () => {
  it('negative or absurd amounts', () => {
    expect(updateShiftSchema.safeParse({ income: -100 }).success).toBe(false)
    expect(paymentSchema.safeParse({ payment_method_id: 1, amount: -5 }).success).toBe(false)
    expect(paymentSchema.safeParse({ payment_method_id: 1, amount: 1e12 }).success).toBe(false)
    expect(createVoucherSchema.safeParse({ amount: 0, reason: 'x' }).success).toBe(false)
  })

  it('unknown denominations and fractional quantities', () => {
    expect(
      replaceDenominationsSchema.safeParse({ denominations: [{ denomination: 7, quantity: 1 }] })
        .success
    ).toBe(false)
    expect(
      replaceDenominationsSchema.safeParse({ denominations: [{ denomination: 10, quantity: 1.5 }] })
        .success
    ).toBe(false)
  })

  it('payment body cannot carry its own shift_id into the result', () => {
    const r = paymentSchema.safeParse({ payment_method_id: 1, amount: 10, shift_id: 999 })
    expect(r.success && r.data).toEqual({ payment_method_id: 1, amount: 10 })
  })

  it('empty shift update and malformed route params', () => {
    expect(updateShiftSchema.safeParse({}).success).toBe(false)
    expect(dateParam.safeParse('2026-02-3').success).toBe(false)
    expect(idParam.safeParse('abc').success).toBe(false)
    expect(idParam.safeParse('0').success).toBe(false)
  })
})
