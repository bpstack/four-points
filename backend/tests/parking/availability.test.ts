// tests/parking/availability.test.ts
// Regression tests for parking double bookings:
// - PUT only checked availability when the spot changed, so moving the dates
//   onto another booking's days went through.
// - The checks were plain reads: two requests at the same time both passed.
// - They read parking_availability, which ran out on 2026-12-26 and nothing
//   extended, so after that date any booking passed.
// - The status and date triggers freed or took days of other bookings.
// Reads the sources; no database.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')
const bookings = read('repositories', 'parking', 'bookings.repository.ts')
const parking = read('repositories', 'parking', 'parking.repository.ts')
const cron = read('services', 'cron', 'cron-service.ts')
const migration = read('db-mysql', 'scripts', '20261004_fix_parking_availability_triggers.sql')

// Body of `  async name(` up to the next method
function method(name: string): string {
  const start = bookings.indexOf(`  async ${name}(`)
  expect(start, name).toBeGreaterThan(-1)
  const next = bookings.indexOf('\n  async ', start + 1)
  return bookings.slice(start, next === -1 ? undefined : next)
}

describe('_assertSpotFree', () => {
  const body = method('_assertSpotFree')

  it('locks the spot row before checking', () => {
    expect(body.indexOf('FOR UPDATE')).toBeGreaterThan(-1)
    expect(body.indexOf('FOR UPDATE')).toBeLessThan(body.indexOf('FROM parking_bookings'))
  })

  it('checks the bookings, not the calendar, with the calendar day semantics', () => {
    expect(body).not.toContain('parking_availability')
    expect(body).toContain("status IN ('reserved', 'checked_in')")
    expect(body).toContain('DATE(expected_checkin) < DATE(?)')
    expect(body).toContain('DATE(expected_checkout) > DATE(?)')
    expect(body).toContain('id <> ?')
  })

  it('counts with a locking read, not the snapshot taken before the lock', () => {
    expect(body).toMatch(/DATE\(expected_checkout\) > DATE\(\?\)\s*FOR SHARE/)
  })
})

describe('create, update and check-in', () => {
  it('create uses _assertSpotFree', () => {
    expect(method('create')).toContain('await this._assertSpotFree(connection, spot_id,')
  })

  it('update checks when the spot or the dates change on an active booking', () => {
    const body = method('update')
    expect(body).toContain('(spotChanged || datesChanged)')
    expect(body).toContain('await this._assertSpotFree(')
  })

  it('check-in locks the spot before counting who occupies it', () => {
    const body = method('checkIn')
    expect(body.indexOf('FOR UPDATE')).toBeGreaterThan(-1)
    expect(body.indexOf('FOR UPDATE')).toBeLessThan(body.indexOf("status = 'checked_in'"))
    expect(body).toContain('FOR SHARE')
  })
})

describe('availability calendar', () => {
  it('extendAvailability inserts only missing days and blocks active bookings', () => {
    expect(parking).toContain('INSERT IGNORE INTO parking_availability')
    expect(parking).toContain("pb.status IN ('reserved', 'checked_in')")
    expect(parking).toContain('AND pa.booking_id IS NULL')
  })

  it('runs at start and every day', () => {
    expect(cron).toContain('void this.runParkingCalendarNow()')
    expect(cron).toContain("cron.schedule('0 3 * * *', () => void this.runParkingCalendarNow()")
  })
})

describe('trigger migration', () => {
  it('only frees the days of the booking itself', () => {
    expect(migration.match(/AND booking_id = OLD\.id;/g)?.length).toBe(2)
  })

  it('only takes days that are free or already its own', () => {
    expect(migration).toContain('AND (booking_id IS NULL OR booking_id = NEW.id);')
  })
})
