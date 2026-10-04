// tests/scheduling/bulk-limits.test.ts
// Regression tests for scheduling bulk inputs: bulk edits had no size
// limit and employee lists were checked by hand (any array was accepted).

import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  bulkUpdateDaysSchema,
  bulkUpdateAssignmentsSchema,
  schedulableEmployeesSchema,
  schedulableEmployeesOrderSchema,
} from '../../validations/scheduling/scheduling-schemas.js'

const ids = (n: number) => Array.from({ length: n }, () => randomUUID())

describe('bulk edits are bounded', () => {
  it('days: a month at most', () => {
    const day = (i: number) => ({ day_id: i + 1, occupancy_pct: 80 })
    expect(
      bulkUpdateDaysSchema.safeParse({ days: Array.from({ length: 31 }, (_, i) => day(i)) }).success
    ).toBe(true)
    expect(
      bulkUpdateDaysSchema.safeParse({ days: Array.from({ length: 32 }, (_, i) => day(i)) }).success
    ).toBe(false)
  })

  it('assignments: up to 5000', () => {
    const employee = randomUUID()
    const a = (i: number) => ({ day_id: i + 1, employee_id: employee, shift_code: 'M' })
    expect(
      bulkUpdateAssignmentsSchema.safeParse({
        assignments: Array.from({ length: 5000 }, (_, i) => a(i)),
      }).success
    ).toBe(true)
    expect(
      bulkUpdateAssignmentsSchema.safeParse({
        assignments: Array.from({ length: 5001 }, (_, i) => a(i)),
      }).success
    ).toBe(false)
  })
})

describe('employee lists', () => {
  it('accept unique user ids, as the config screen sends them', () => {
    expect(schedulableEmployeesSchema.safeParse({ employeeIds: ids(12) }).success).toBe(true)
    expect(schedulableEmployeesSchema.safeParse({ employeeIds: [] }).success).toBe(true)
    expect(schedulableEmployeesOrderSchema.safeParse({ orderedIds: ids(12) }).success).toBe(true)
  })

  it('reject repeated, malformed or missing ids', () => {
    const [a] = ids(1)
    for (const body of [
      { employeeIds: [a, a] },
      { employeeIds: ['1', '2'] },
      { employeeIds: [{ id: a }] },
      { employeeIds: a },
      {},
    ]) {
      expect(schedulableEmployeesSchema.safeParse(body).success, JSON.stringify(body)).toBe(false)
    }
    expect(schedulableEmployeesOrderSchema.safeParse({ orderedIds: [a, a] }).success).toBe(false)
    expect(schedulableEmployeesSchema.safeParse({ employeeIds: ids(501) }).success).toBe(false)
  })
})

describe('solverErrorMessage', () => {
  it('tells a timeout apart and never echoes solver internals', async () => {
    const { solverErrorMessage } = await import('../../services/scheduling/solver-errors.js')
    expect(solverErrorMessage('TIMEOUT')).toMatch(/tiempo límite/)
    expect(solverErrorMessage('INTERNAL')).toBe('Error interno del solver al generar el horario')
    expect(solverErrorMessage(undefined)).toBe('Error interno del solver al generar el horario')
  })
})
