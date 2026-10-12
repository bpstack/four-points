// tests/scheduling/month-scope.test.ts
// Regression tests: the bulk edits of a month accepted day ids of any other
// month. PUT /months/141/assignments with a day of month 140 rewrote that
// cell (uk_day_employee), so a published month could be edited through any
// draft month. Resetting a month deleted its cells and seeded them again in
// separate statements: a failure in between left the month without its
// locked cells. Both now check the days and write in one transaction.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const EMPLOYEE = '11111111-1111-4111-8111-111111111111'

vi.mock('../../repositories/scheduling/scheduling-repository.js', () => ({
  getMonthById: vi.fn(),
  countDaysInMonth: vi.fn(),
  bulkUpdateDays: vi.fn(async () => 1),
  bulkUpsertAssignments: vi.fn(async () => ({ locked: false })),
  getAllShifts: vi.fn(async () => [{ code: 'M' }, { code: 'L' }]),
  recalculateLibreNumbers: vi.fn(),
  resetMonthAssignments: vi.fn(async () => 31),
  createAssignmentsBulk: vi.fn(),
  createHistory: vi.fn(),
  // initializeMonthGrid (in the controller) seeds an L for every day and employee
  getDaysByMonth: vi.fn(async () => [{ id: 7, date: '2026-11-01' }]),
  getConstraintsByMonth: vi.fn(async () => []),
  getSchedulableEmployees: vi.fn(async () => [{ id: EMPLOYEE }]),
}))

const controller = await import('../../controllers/scheduling/scheduling-controller.js')
const repo = await import('../../repositories/scheduling/scheduling-repository.js')

function call(
  handler: (req: Request, res: Response) => Promise<void>,
  params: object,
  body: object
) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  const req = { user: { id: 'u1' }, params, body } as unknown as Request
  return handler(req, res as unknown as Response).then(() => res)
}

const assignments = {
  assignments: [
    { day_id: 7, employee_id: EMPLOYEE, shift_code: 'M' },
    { day_id: 8, employee_id: EMPLOYEE, shift_code: 'L' },
  ],
}
const days = {
  days: [
    { day_id: 7, is_holiday: true },
    { day_id: 8, is_holiday: false },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(repo.getMonthById).mockResolvedValue({
    id: 141,
    year: 2026,
    month: 11,
    status: 'draft',
  } as never)
})

describe('bulk edits only touch days of their month', () => {
  it('assignments with a day of another month answer 400 and write nothing', async () => {
    vi.mocked(repo.countDaysInMonth).mockResolvedValue(1)
    const res = await call(controller.bulkUpdateAssignments, { id: '141' }, assignments)
    expect(repo.countDaysInMonth).toHaveBeenCalledWith(141, [7, 8])
    expect(res.status).toHaveBeenCalledWith(400)
    expect(repo.bulkUpsertAssignments).not.toHaveBeenCalled()
  })

  it('days of another month answer 400 and write nothing', async () => {
    vi.mocked(repo.countDaysInMonth).mockResolvedValue(1)
    const res = await call(controller.bulkUpdateDays, { id: '141' }, days)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(repo.bulkUpdateDays).not.toHaveBeenCalled()
  })

  it('assignments of the month are written in one transactional call', async () => {
    vi.mocked(repo.countDaysInMonth).mockResolvedValue(2)
    const res = await call(controller.bulkUpdateAssignments, { id: '141' }, assignments)
    expect(res.status).not.toHaveBeenCalled()
    expect(repo.bulkUpsertAssignments).toHaveBeenCalledWith(141, assignments.assignments)
  })

  it('a locked cell, checked inside the transaction, answers 409', async () => {
    vi.mocked(repo.countDaysInMonth).mockResolvedValue(2)
    vi.mocked(repo.bulkUpsertAssignments).mockResolvedValueOnce({ locked: true })
    const res = await call(controller.bulkUpdateAssignments, { id: '141' }, assignments)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(repo.createHistory).not.toHaveBeenCalled()
  })

  it('the same day twice counts once', async () => {
    vi.mocked(repo.countDaysInMonth).mockResolvedValue(1)
    const twice = {
      assignments: [
        { day_id: 7, employee_id: EMPLOYEE, shift_code: 'M' },
        { day_id: 7, employee_id: '22222222-2222-4222-8222-222222222222', shift_code: 'L' },
      ],
    }
    const res = await call(controller.bulkUpdateAssignments, { id: '141' }, twice)
    expect(repo.countDaysInMonth).toHaveBeenCalledWith(141, [7])
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('resetting a month', () => {
  it('deletes and seeds the cells in one transactional call', async () => {
    const res = await call(controller.resetMonth, { id: '141' }, {})
    expect(res.status).not.toHaveBeenCalled()
    expect(repo.resetMonthAssignments).toHaveBeenCalledWith(141, 2026, 11, [
      { day_id: 7, employee_id: EMPLOYEE, shift_code: 'L', source_constraint_id: null },
    ])
    expect(repo.createAssignmentsBulk).not.toHaveBeenCalled()
  })
})
