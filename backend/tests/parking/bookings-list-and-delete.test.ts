// tests/parking/bookings-list-and-delete.test.ts
// GET /bookings took any page and limit (a non-number or a negative one broke
// the SQL with a 500), and deleting a booking left its days blocked in
// parking_availability: the foreign key only sets booking_id to NULL.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bookingsPageSchema } from '../../validations/parking/booking-validation.js'

describe('bookingsPageSchema', () => {
  it('defaults to page 1 of 50', () => {
    expect(bookingsPageSchema.parse({})).toEqual({ page: 1, limit: 50 })
  })

  it('takes query strings within range', () => {
    expect(bookingsPageSchema.parse({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 500 })
  })

  it.each([
    { page: 'abc' },
    { page: '0' },
    { page: '-1' },
    { limit: 'abc' },
    { limit: '0' },
    { limit: '-5' },
    { limit: '501' },
    { limit: '2.5' },
  ])('rejects %o', (query) => {
    expect(bookingsPageSchema.safeParse(query).success).toBe(false)
  })
})

describe('deleting a booking', () => {
  it('frees its days before removing the row, in the same transaction', () => {
    const repo = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../repositories/parking/bookings.repository.ts'
      ),
      'utf8'
    )
    const start = repo.indexOf('async delete(id: number)')
    const body = repo.slice(start, repo.indexOf('connection.release()', start))
    const release = body.indexOf(
      'UPDATE parking_availability SET is_available = TRUE, booking_id = NULL WHERE booking_id = ?'
    )
    const del = body.indexOf('DELETE FROM parking_bookings WHERE id = ?')
    expect(body).toContain('beginTransaction()')
    expect(release).toBeGreaterThan(-1)
    expect(del).toBeGreaterThan(release)
  })
})
