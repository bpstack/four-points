// tests/config/hotel-clock.test.ts
// "Today" and "now" are the hotel's (Madrid), not UTC's (ADR-047). At 00:30 in
// Madrid it is still yesterday in UTC: CURDATE(), NOW() and toISOString() gave
// the wrong day, and parking showed every booking time two hours late.

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getHotelNowDate,
  getTodayMadrid,
  parseHotelTime,
  toHotelTime,
} from '../../config/date-utils.js'
import { sqlHotelNow, sqlHotelToday } from '../../repositories/shared/hotel-clock.js'

afterEach(() => vi.useRealTimers())

describe('at 00:30 in Madrid', () => {
  it('summer: today is already the 15th', () => {
    vi.useFakeTimers({ now: new Date('2026-10-14T22:30:00Z') })
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-14')
    expect(getTodayMadrid()).toBe('2026-10-15')
    expect(sqlHotelToday()).toBe("'2026-10-15'")
    expect(sqlHotelNow()).toBe("'2026-10-15 00:30:00'")
  })

  it('winter: the offset is one hour', () => {
    vi.useFakeTimers({ now: new Date('2026-12-14T23:30:00Z') })
    expect(getTodayMadrid()).toBe('2026-12-15')
    expect(sqlHotelNow()).toBe("'2026-12-15 00:30:00'")
  })

  it('the wall-clock now is stored as the Madrid time', () => {
    vi.useFakeTimers({ now: new Date('2026-10-14T22:30:00Z') })
    expect(getHotelNowDate().toISOString()).toBe('2026-10-15T00:30:00.000Z')
  })
})

describe('parking wall-clock times', () => {
  it('stores what the user typed, with or without the T', () => {
    expect(parseHotelTime('2026-10-14T12:00').toISOString()).toBe('2026-10-14T12:00:00.000Z')
    expect(parseHotelTime('2026-10-14 12:00:00').toISOString()).toBe('2026-10-14T12:00:00.000Z')
  })

  it('answers the stored time without Z, so the browser reads 12:00', () => {
    // mysql2 (timezone Z) reads the stored 12:00:00 as this Date
    expect(toHotelTime(new Date('2026-10-14T12:00:00.000Z'))).toBe('2026-10-14T12:00:00')
    expect(toHotelTime('2026-10-14 12:00:00')).toBe('2026-10-14T12:00:00')
    expect(toHotelTime(null)).toBeNull()
  })
})
