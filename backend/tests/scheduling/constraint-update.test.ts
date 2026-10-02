// tests/scheduling/constraint-update.test.ts
// Regression test: PUT /constraints/:id accepted status 'approved' without
// requiring admin, so a receptionist could approve their own request.
// Approval belongs to PUT /constraints/:id/approve, which requires admin.

import { describe, it, expect } from 'vitest'
import {
  updateConstraintSchema,
  approveConstraintSchema,
} from '../../validations/scheduling/scheduling-schemas.js'

describe('updateConstraintSchema', () => {
  it('accepts what the requests tab sends', () => {
    expect(
      updateConstraintSchema.parse({
        constraint_type: 'vacation',
        start_date: '2026-10-05',
        end_date: '2026-10-09',
        notes: 'Viaje',
      })
    ).toEqual({
      constraint_type: 'vacation',
      start_date: '2026-10-05',
      end_date: '2026-10-09',
      notes: 'Viaje',
    })
  })

  it('never passes a status on to the repository', () => {
    const parsed = updateConstraintSchema.parse({ notes: 'x', status: 'approved' })
    expect(parsed).not.toHaveProperty('status')
  })

  it('treats a body with only a status as empty', () => {
    expect(updateConstraintSchema.safeParse({ status: 'approved' }).success).toBe(false)
  })
})

describe('approveConstraintSchema', () => {
  it('is still where approval happens', () => {
    expect(approveConstraintSchema.safeParse({ status: 'approved' }).success).toBe(true)
  })
})
