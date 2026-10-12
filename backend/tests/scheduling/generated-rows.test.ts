// tests/scheduling/generated-rows.test.ts
// Regression tests: generating a month skipped every locked cell when
// inserting, while the delete before it only spares cells stored with
// source_constraint_id. Fixed days and approved requests are locked but not
// stored that way, so their cells ended empty (seen in the solver-generated
// months: the fixed-days employees had 0 cells).

import { describe, it, expect } from 'vitest'
import { generatedRows } from '../../services/scheduling/generated-rows.js'

const dayIdByNumber = new Map([
  [1, 101],
  [2, 102],
  [3, 103],
])

describe('generatedRows', () => {
  it('inserts the locked cells that are not stored, with their locked value', () => {
    const rows = generatedRows(
      { fixed: { '1': 'P', '2': 'P', '3': 'L' }, other: { '1': 'M', '2': 'T', '3': 'N' } },
      { fixed: { '1': 'P', '2': 'P', '3': 'L' }, other: { '2': 'V' } },
      dayIdByNumber,
      new Set()
    )
    const cell = (emp: string, day: number) =>
      rows.find((r) => r.employee_id === emp && r.day_id === day)?.shift_code
    expect(rows).toHaveLength(6)
    expect([cell('fixed', 101), cell('fixed', 102), cell('fixed', 103)]).toEqual(['P', 'P', 'L'])
    expect(cell('other', 102)).toBe('V') // the approved request wins over the matrix
  })

  it('skips the cells stored with source_constraint_id, which the delete keeps', () => {
    const rows = generatedRows(
      { e: { '1': 'V', '2': 'M' } },
      { e: { '1': 'V' } },
      dayIdByNumber,
      new Set(['e:101'])
    )
    expect(rows).toEqual([
      { day_id: 102, employee_id: 'e', shift_code: 'M', source_constraint_id: null },
    ])
  })

  it('ignores the virtual days of the previous month', () => {
    const rows = generatedRows({ e: { '-1': 'N', '1': 'L' } }, {}, dayIdByNumber, new Set())
    expect(rows.map((r) => r.day_id)).toEqual([101])
  })
})
