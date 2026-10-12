// tests/scheduling/published-month.test.ts
// Regression tests: a published month could still be changed. Editing cells
// and days and creating, editing, approving or deleting constraints did not
// look at the month status, and PUT /months/:id went back to draft without
// the unpublish endpoint. A published month is now read-only: 409 until it
// is unpublished.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

const EMPLOYEE = '11111111-1111-4111-8111-111111111111'

vi.mock('../../repositories/scheduling/scheduling-repository.js', () => ({
  getMonthById: vi.fn(),
  getDayById: vi.fn(async () => ({ id: 7, month_id: 140 })),
  getAssignmentById: vi.fn(async () => ({ id: 9, month_id: 140, shift_code: 'M' })),
  getConstraintById: vi.fn(async () => ({ id: 3, month_id: 140, status: 'pending' })),
  updateMonth: vi.fn(),
  updateDay: vi.fn(),
  bulkUpdateDays: vi.fn(),
  updateAssignment: vi.fn(),
  bulkUpsertAssignments: vi.fn(),
  createConstraint: vi.fn(),
  updateConstraint: vi.fn(),
  deleteConstraint: vi.fn(),
  createHistory: vi.fn(),
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

const writes = [
  'updateMonth',
  'updateDay',
  'bulkUpdateDays',
  'updateAssignment',
  'bulkUpsertAssignments',
  'createConstraint',
  'updateConstraint',
  'deleteConstraint',
] as const

const cases: Array<[string, () => ReturnType<typeof call>]> = [
  ['updateDay', () => call(controller.updateDay, { dayId: '7' }, { is_holiday: true })],
  [
    'bulkUpdateDays',
    () =>
      call(controller.bulkUpdateDays, { id: '140' }, { days: [{ day_id: 7, is_holiday: true }] }),
  ],
  [
    'updateAssignment',
    () => call(controller.updateAssignment, { assignmentId: '9' }, { shift_code: 'T' }),
  ],
  [
    'bulkUpdateAssignments',
    () =>
      call(
        controller.bulkUpdateAssignments,
        { id: '140' },
        { assignments: [{ day_id: 7, employee_id: EMPLOYEE, shift_code: 'T' }] }
      ),
  ],
  [
    'createConstraint',
    () =>
      call(
        controller.createConstraint,
        {},
        {
          month_id: 140,
          employee_id: EMPLOYEE,
          constraint_type: 'vacation',
          start_date: '2026-10-05',
          end_date: '2026-10-06',
        }
      ),
  ],
  [
    'updateConstraint',
    () => call(controller.updateConstraint, { constraintId: '3' }, { priority: 2 }),
  ],
  [
    'approveConstraint',
    () => call(controller.approveConstraint, { constraintId: '3' }, { status: 'approved' }),
  ],
  ['deleteConstraint', () => call(controller.deleteConstraint, { constraintId: '3' }, {})],
  [
    'updateMonth back to draft',
    () => call(controller.updateMonth, { id: '140' }, { status: 'draft' }),
  ],
]

describe('a published month is read-only', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(repo.getMonthById).mockResolvedValue({ id: 140, status: 'published' } as never)
  })

  it.each(cases)('%s answers 409 and writes nothing', async (_name, run) => {
    const res = await run()
    expect(res.status).toHaveBeenCalledWith(409)
    for (const write of writes) expect(repo[write], write).not.toHaveBeenCalled()
  })

  it('notes can still be edited on a published month', async () => {
    const res = await call(controller.updateMonth, { id: '140' }, { notes: 'Cerrado' })
    expect(res.status).not.toHaveBeenCalledWith(409)
    expect(repo.updateMonth).toHaveBeenCalledOnce()
  })
})
