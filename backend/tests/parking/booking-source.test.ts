// tests/parking/booking-source.test.ts
// Regression tests: creating a booking always stored booking_source 'direct'
// and dropped the external reference (the controller handed them to Zod under
// other names), and the forms offered phone, email and walk-in, which the
// parking_bookings.booking_source ENUM does not hold. Decided on 2026-10-11:
// the forms offer the ENUM values only.

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
const { BOOKING_SOURCES, createBookingSchema, updateBookingBodySchema } =
  await import('../../validations/parking/booking-validation.js')

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

describe('booking source', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create keeps the source and the external reference the form sends', async () => {
    const res = await create({ booking_source: 'airbnb', external_booking_id: 'HM-123' })

    expect(res.status).toHaveBeenCalledWith(201)
    expect(vi.mocked(repository.create).mock.calls[0][0]).toMatchObject({
      booking_source: 'airbnb',
      external_booking_id: 'HM-123',
    })
  })

  it('create defaults to direct and refuses a value outside the ENUM', async () => {
    await create({})
    expect(vi.mocked(repository.create).mock.calls[0][0]).toMatchObject({
      booking_source: 'direct',
    })

    const res = await create({ booking_source: 'phone' })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(repository.create).toHaveBeenCalledOnce()
  })

  it('both schemas take exactly the ENUM values', () => {
    for (const source of BOOKING_SOURCES) {
      expect(createBookingSchema.safeParse({ ...body, booking_source: source }).success).toBe(true)
      expect(updateBookingBodySchema.safeParse({ booking_source: source }).success).toBe(true)
    }
    for (const source of ['phone', 'email', 'walkin', 'booking', 'other']) {
      expect(updateBookingBodySchema.safeParse({ booking_source: source }).success).toBe(false)
    }
  })

  it('the forms offer the ENUM values only', () => {
    const frontend = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'frontend')
    for (const file of [
      ['booking', 'BookingWizard', 'steps', 'DateOnlyStep.tsx'],
      ['booking', 'BookingWizard', 'steps', 'DateSpotStep.tsx'],
      ['parking', 'bookings', 'EditBookingModal.tsx'],
    ]) {
      const src = readFileSync(join(frontend, 'app', 'components', ...file), 'utf8')
      const name = file.at(-1)
      for (const source of BOOKING_SOURCES) {
        expect(src, `${name} offers ${source}`).toMatch(new RegExp(`value(=|: )["']${source}["']`))
      }
      expect(src, name).not.toMatch(/value(=|: )["'](booking|phone|email|walkin|other)["']/)
    }
  })
})
