// tests/group/group-validation.test.ts
// Regression tests for the groups SQL injection and mass assignment fixes.

import { describe, it, expect } from 'vitest'
import {
  groupListQuerySchema,
  createGroupSchema,
  updateGroupSchema,
  createPaymentSchema,
  updatePaymentSchema,
  amountPaidSchema,
  createContactSchema,
  updateRoomSchema,
  bookingSchema,
  roomingSchema,
  groupHistoryQuerySchema,
} from '../../validations/group/group-schemas.js'
import { buildSetClause } from '../../repositories/group/update-columns.js'

describe('group list query (ORDER BY injection)', () => {
  it('rejects a sort field outside the allow-list', () => {
    const r = groupListQuerySchema.safeParse({ sort: 'id,(SELECT password FROM users LIMIT 1)' })
    expect(r.success).toBe(false)
  })

  it('rejects an order that is not ASC or DESC', () => {
    expect(groupListQuerySchema.safeParse({ order: 'ASC; DROP TABLE users' }).success).toBe(false)
  })

  it('accepts allowed sort and normalises order', () => {
    const r = groupListQuerySchema.safeParse({ sort: 'name', order: 'desc', limit: '20' })
    expect(r.success && r.data).toEqual({ sort: 'name', order: 'DESC', limit: 20 })
  })
})

describe('group create/update (mass assignment)', () => {
  const frontendPayload = {
    name: 'Grupo Test',
    agency: undefined,
    arrival_date: '2026-10-01',
    departure_date: '2026-10-05',
    status: 'pending',
    total_amount: 1500,
    currency: 'EUR',
    notes: undefined,
  }

  it('accepts what CreateGroupPanel sends', () => {
    expect(createGroupSchema.safeParse(frontendPayload).success).toBe(true)
  })

  it('accepts total_amount null (empty number field serialises NaN as null)', () => {
    expect(createGroupSchema.safeParse({ ...frontendPayload, total_amount: null }).success).toBe(
      true
    )
  })

  it('strips created_by, updated_by and id from the body', () => {
    const r = updateGroupSchema.safeParse({
      name: 'X',
      created_by: 'evil',
      updated_by: 'evil',
      id: 9,
    })
    expect(r.success && r.data).toEqual({ name: 'X' })
  })

  it('rejects negative amounts, unknown status and departure before arrival', () => {
    expect(updateGroupSchema.safeParse({ total_amount: -1 }).success).toBe(false)
    expect(updateGroupSchema.safeParse({ status: 'hacked' }).success).toBe(false)
    expect(
      updateGroupSchema.safeParse({ arrival_date: '2026-10-05', departure_date: '2026-10-01' })
        .success
    ).toBe(false)
  })
})

describe('payments', () => {
  it('accepts what PaymentPanel sends', () => {
    const r = createPaymentSchema.safeParse({
      payment_name: 'Depósito',
      payment_order: 1,
      percentage: 30,
      amount: undefined,
      amount_paid: 0,
      due_date: '2026-09-30',
      status: 'pending',
      notes: undefined,
    })
    expect(r.success).toBe(true)
  })

  it('cannot move a payment to another group', () => {
    const r = updatePaymentSchema.safeParse({ group_id: 999, amount: 10 })
    expect(r.success && r.data).toEqual({ amount: 10 })
  })

  it('rejects an update left empty after stripping unknown keys', () => {
    expect(updatePaymentSchema.safeParse({ group_id: 999 }).success).toBe(false)
    expect(updateRoomSchema.safeParse({ group_id: 5 }).success).toBe(false)
  })

  it('rejects negative amount_paid and non-numeric values', () => {
    expect(amountPaidSchema.safeParse({ amount_paid: -50 }).success).toBe(false)
    expect(amountPaidSchema.safeParse({ amount_paid: '100' }).success).toBe(false)
    expect(updatePaymentSchema.safeParse({ amount: -1 }).success).toBe(false)
  })
})

describe('contacts, rooms and status', () => {
  it('accepts an empty contact email, rejects a malformed one', () => {
    expect(createContactSchema.safeParse({ contact_name: 'Ana', contact_email: '' }).success).toBe(
      true
    )
    expect(
      createContactSchema.safeParse({ contact_name: 'Ana', contact_email: 'nope' }).success
    ).toBe(false)
  })

  it('strips group_id from room updates and rejects unknown room types', () => {
    const r = updateRoomSchema.safeParse({ quantity: 2, group_id: 5 })
    expect(r.success && r.data).toEqual({ quantity: 2 })
    expect(updateRoomSchema.safeParse({ room_type: 'suite' }).success).toBe(false)
  })

  it('validates booking and rooming payloads', () => {
    expect(bookingSchema.safeParse({ confirmed: true, date: '2026-09-29' }).success).toBe(true)
    expect(bookingSchema.safeParse({ confirmed: 'yes' }).success).toBe(false)
    expect(
      roomingSchema.safeParse({
        rooming_status: 'requested',
        rooming_requested_date: '2026-09-29',
        rooming_received_date: undefined,
      }).success
    ).toBe(true)
  })

  it('caps the history limit', () => {
    expect(groupHistoryQuerySchema.safeParse({ limit: '100000' }).success).toBe(false)
  })
})

describe('buildSetClause', () => {
  it('ignores keys outside the allow-list, so they never reach the SQL', () => {
    const { fields, values } = buildSetClause(
      { name: 'A', 'status = 1, created_by': 'x', group_id: 2, notes: undefined },
      ['name', 'notes']
    )
    expect(fields).toEqual(['name = ?'])
    expect(values).toEqual(['A'])
  })
})
