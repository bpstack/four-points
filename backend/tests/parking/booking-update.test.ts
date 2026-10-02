// tests/parking/booking-update.test.ts
// Regression tests for PUT /api/parking/bookings/:code: the body reached
// MySQL unchecked, so a negative payment was stored and a non-numeric
// amount, an unknown payment method or an oversized text ended in a 500.

import { describe, it, expect } from 'vitest'
import { updateBookingBodySchema } from '../../validations/parking/booking-validation.js'

describe('updateBookingBodySchema', () => {
  it('accepts what the edit and payment forms send', () => {
    expect(
      updateBookingBodySchema.parse({
        expected_checkout: '2026-10-05T10:00:00',
        notes: 'Llega tarde',
        external_booking_id: '',
      })
    ).toMatchObject({ notes: 'Llega tarde' })
    expect(
      updateBookingBodySchema.parse({
        payment_amount: '45.50',
        payment_method: 'agency',
        payment_reference: 'TPV-1234',
      })
    ).toEqual({ payment_amount: 45.5, payment_method: 'agency', payment_reference: 'TPV-1234' })
    expect(updateBookingBodySchema.parse({ payment_amount: null, payment_method: null })).toEqual({
      payment_amount: null,
      payment_method: null,
    })
  })

  it('rejects negative, non-numeric and oversized amounts', () => {
    for (const body of [
      { payment_amount: -10 },
      { payment_amount: 'abc' },
      { payment_amount: 100_000_000 },
      { total_amount: -1 },
      { total_amount: 'NaN' },
    ]) {
      expect(updateBookingBodySchema.safeParse(body).success, JSON.stringify(body)).toBe(false)
    }
  })

  it('rejects values the columns cannot hold', () => {
    for (const body of [
      { payment_method: 'pending' },
      { payment_method: 'bizum' },
      { payment_reference: 'x'.repeat(101) },
      { external_booking_id: 'x'.repeat(65) },
      { level_code: '-1' },
      { spot_number: 0 },
      { vehicle_id: 'abc' },
    ]) {
      expect(updateBookingBodySchema.safeParse(body).success, JSON.stringify(body)).toBe(false)
    }
  })
})
