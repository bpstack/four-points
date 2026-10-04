// tests/calendar-dates.test.ts
// Regression tests for date params and fields across modules: the format
// check alone (and Date.parse / new Date) accepts 2026-02-31, which then
// reached MySQL. Every schema below must reject days that do not exist.

import { describe, it, expect } from 'vitest'
import { isCalendarDate } from '../validations/common/calendar-date.js'
import { createEmployeeRequestSchema } from '../validations/scheduling/employee-request.js'
import { createConstraintSchema } from '../validations/scheduling/scheduling-schemas.js'
import { groupListQuerySchema } from '../validations/group/group-schemas.js'
import { reportFiltersSchema } from '../validations/maintenance/schemas.js'
import { blacklistFiltersSchema } from '../validations/blacklist/schemas.js'
import { dateParam } from '../validations/cashier/cashier-validation.js'

const IMPOSSIBLE = ['2026-02-31', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10']

describe('isCalendarDate', () => {
  it('accepts real days, including 29 February of leap years', () => {
    for (const d of ['2026-01-01', '2026-12-31', '2028-02-29', '2000-02-29']) {
      expect(isCalendarDate(d)).toBe(true)
    }
  })

  it('rejects days that do not exist and other formats', () => {
    for (const d of [...IMPOSSIBLE, '1900-02-29', '2026-9-1', '01/09/2026', '']) {
      expect(isCalendarDate(d)).toBe(false)
    }
  })

  it('is stricter than Date.parse and new Date, which roll over', () => {
    expect(Number.isNaN(Date.parse('2026-02-31'))).toBe(false)
    expect(Number.isNaN(new Date('2026-02-31T00:00:00Z').getTime())).toBe(false)
    expect(isCalendarDate('2026-02-31')).toBe(false)
  })
})

describe('schemas reject impossible days', () => {
  const employee = '550e8400-e29b-41d4-a716-446655440001'

  it.each(IMPOSSIBLE)('%s', (day) => {
    expect(
      createEmployeeRequestSchema.safeParse({
        employee_id: employee,
        date_from: day,
        date_to: '2026-12-31',
        request_type: 'bonificable',
      }).success
    ).toBe(false)
    expect(
      createConstraintSchema.safeParse({
        month_id: 1,
        employee_id: employee,
        constraint_type: 'vacation',
        start_date: day,
        end_date: '2026-12-31',
      }).success
    ).toBe(false)
    expect(groupListQuerySchema.safeParse({ arrival_from: day }).success).toBe(false)
    expect(groupListQuerySchema.safeParse({ arrival_from: `${day}T10:00:00Z` }).success).toBe(false)
    expect(reportFiltersSchema.safeParse({ date: day }).success).toBe(false)
    expect(blacklistFiltersSchema.safeParse({ from_date: day }).success).toBe(false)
    expect(dateParam.safeParse(day).success).toBe(false)
  })

  it('still accepts real days', () => {
    // Positive controls: the same bodies pass with a real day, so the
    // rejections above come from the date
    expect(
      createEmployeeRequestSchema.safeParse({
        employee_id: employee,
        date_from: '2026-09-28',
        date_to: '2026-12-31',
        request_type: 'bonificable',
      }).success
    ).toBe(true)
    expect(
      createConstraintSchema.safeParse({
        month_id: 1,
        employee_id: employee,
        constraint_type: 'vacation',
        start_date: '2026-09-28',
        end_date: '2026-12-31',
      }).success
    ).toBe(true)
    expect(groupListQuerySchema.safeParse({ arrival_from: '2026-09-28' }).success).toBe(true)
    expect(groupListQuerySchema.safeParse({ arrival_from: '2026-09-28T10:00:00Z' }).success).toBe(
      true
    )
    expect(reportFiltersSchema.safeParse({ date: '2026-09-28' }).success).toBe(true)
    expect(blacklistFiltersSchema.safeParse({ from_date: '2026-09-28' }).success).toBe(true)
    expect(dateParam.safeParse('2026-09-28').success).toBe(true)
  })
})
