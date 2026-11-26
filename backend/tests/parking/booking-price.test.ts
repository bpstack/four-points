// tests/parking/booking-price.test.ts
// The price of a booking is typed by hand (decided on 2026-11-26): there are
// no automatic rates any more. Regression tests: a price of 0 was replaced by
// the rate of parking_rates, because the controller and the repository took
// 0 for "no price", and creating refused 0 while editing accepted it.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

vi.mock('../../repositories/parking/bookings.repository.js', () => ({
  default: { create: vi.fn(async () => ({ id: 1 })) },
}))

const { default: controller } = await import('../../controllers/parking/bookings.controller.js')
const { default: repository } = await import('../../repositories/parking/bookings.repository.js')

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
const body = {
  spot_number: 1,
  level_code: '-3',
  vehicle_id: 1,
  expected_checkin: `${tomorrow}T10:00:00`,
  expected_checkout: `${tomorrow}T18:00:00`,
}

function create(extra: object) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  const req = { user: { id: 'u1' }, body: { ...body, ...extra } } as unknown as Request
  return controller.createBooking(req, res as unknown as Response).then(() => res)
}

function sentAmount() {
  return vi.mocked(repository.create).mock.calls[0][0].total_amount
}

describe('booking price', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the price typed, 0 included', async () => {
    for (const [typed, stored] of [
      [45.5, 45.5],
      ['45.50', 45.5],
      [0, 0],
      ['0', 0],
    ] as const) {
      vi.clearAllMocks()
      const res = await create({ total_amount: typed })
      expect(res.status, String(typed)).toHaveBeenCalledWith(201)
      expect(sentAmount(), String(typed)).toBe(stored)
    }
  })

  it('without a price it sends none, so the booking is stored without one', async () => {
    for (const extra of [{}, { total_amount: '' }, { total_amount: null }]) {
      vi.clearAllMocks()
      const res = await create(extra)
      expect(res.status, JSON.stringify(extra)).toHaveBeenCalledWith(201)
      expect(sentAmount(), JSON.stringify(extra)).toBeUndefined()
    }
  })

  it('refuses negative, non-numeric and oversized prices', async () => {
    for (const total_amount of [-1, 'abc', 100_000_000]) {
      const res = await create({ total_amount })
      expect(res.status, String(total_amount)).toHaveBeenCalledWith(400)
    }
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('the repository no longer looks up a rate', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(
      join(here, '../../repositories/parking/bookings.repository.ts'),
      'utf8'
    )
    expect(source).not.toContain('parking_rates')
    expect(source).not.toContain('_calculateBookingDays')
  })
})
