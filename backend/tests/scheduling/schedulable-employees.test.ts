// tests/scheduling/schedulable-employees.test.ts
// Regression tests: saving the list of schedulable employees cleared
// scheduling_employees and filled it again, so everyone lost start_date,
// end_date, display_order and added_by. Now only the ones left out are
// removed and only the new ones are added, in one transaction.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(async () => [{}]),
}

vi.mock('../../config/db.js', () => ({
  default: { getConnection: vi.fn(async () => connection), query: vi.fn(), execute: vi.fn() },
}))

const { setSchedulableEmployees } =
  await import('../../repositories/scheduling/scheduling-repository.js')

const sql = () => connection.query.mock.calls.map((c) => String(c[0]).replace(/\s+/g, ' '))

describe('setSchedulableEmployees', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the rows of the employees that stay', async () => {
    await setSchedulableEmployees(['a', 'b'], 'admin')

    expect(sql()).toEqual([
      'DELETE FROM scheduling_employees WHERE employee_id NOT IN (?)',
      'INSERT INTO scheduling_employees (employee_id, added_by) VALUES ? ON DUPLICATE KEY UPDATE employee_id = employee_id',
    ])
    expect(connection.query.mock.calls[0][1]).toEqual([['a', 'b']])
    expect(connection.commit).toHaveBeenCalledOnce()
  })

  it('an empty list clears the table', async () => {
    await setSchedulableEmployees([])
    expect(sql()).toEqual(['DELETE FROM scheduling_employees'])
  })

  it('rolls back when the insert fails', async () => {
    connection.query.mockResolvedValueOnce([{}]).mockRejectedValueOnce(new Error('fk'))
    await expect(setSchedulableEmployees(['x'])).rejects.toThrow('fk')
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).not.toHaveBeenCalled()
  })
})
