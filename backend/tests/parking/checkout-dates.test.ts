// tests/parking/checkout-dates.test.ts
// Regression tests for PUT /api/parking/bookings/:code/checkout: the real
// check-out date was only checked for being readable, so a check-out earlier
// than its check-in was stored. It is now refused with PARKING_INVALID_DATES.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
}

vi.mock('../../config/db.js', () => ({
  default: { getConnection: vi.fn(async () => connection), query: vi.fn() },
}))

const { default: repository } = await import('../../repositories/parking/bookings.repository.js')
const { ERROR_CODES } = await import('../../config/error-codes.js')

const checkin = new Date('2026-10-10T12:00:00Z')
const booked = [[{ id: 7, status: 'checked_in', actual_checkin: checkin }]]

describe('checkOut dates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockReset()
    vi.restoreAllMocks()
  })

  it('refuses a check-out earlier than the check-in and writes nothing', async () => {
    connection.query.mockResolvedValueOnce(booked)

    await expect(
      repository.checkOut(7, { actual_checkout: new Date('2026-10-10T11:59:00Z') })
    ).rejects.toThrow(ERROR_CODES.PARKING_INVALID_DATES)
    expect(connection.query).toHaveBeenCalledOnce() // only the SELECT
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).not.toHaveBeenCalled()
  })

  it('accepts a check-out equal to or later than the check-in', async () => {
    vi.spyOn(repository, 'findById').mockResolvedValue(null)
    for (const at of ['2026-10-10T12:00:00Z', '2026-10-12T09:00:00Z']) {
      connection.query.mockResolvedValueOnce(booked).mockResolvedValueOnce([{ affectedRows: 1 }])
      await repository.checkOut(7, { actual_checkout: new Date(at) })
    }
    expect(connection.commit).toHaveBeenCalledTimes(2)
    expect(connection.rollback).not.toHaveBeenCalled()
  })
})
