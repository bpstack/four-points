// tests/cron/cron-schedule.test.ts
// When each scheduled job is due, in Madrid wall time. Render's free plan
// sleeps, so the backend catches up on start; these periods decide what it
// runs. Madrid is UTC+2 until 2026-10-25 03:00 and UTC+1 after it.

import { describe, it, expect } from 'vitest'
import { batchPaymentTarget, duePeriod, madridTime } from '../../services/cron/cron-schedule.js'

const utc = (iso: string) => new Date(iso)

describe('madridTime', () => {
  it('reads the Madrid wall clock and weekday, not the UTC one', () => {
    // Saturday 2026-10-31 23:30 UTC is Sunday 2026-11-01 00:30 in Madrid
    expect(madridTime(utc('2026-10-31T23:30:00Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 1,
      weekday: 6,
      minutes: 30,
    })
  })
})

describe('daily jobs', () => {
  it('notifications are due from 07:00, before the change of hour', () => {
    expect(duePeriod('notifications', utc('2026-10-14T04:59:00Z'))).toBeNull()
    expect(duePeriod('notifications', utc('2026-10-14T05:00:00Z'))).toBe('2026-10-14')
  })

  it('the checklist reset is due from 06:30, before and after the change of hour', () => {
    expect(duePeriod('checklist-reset', utc('2026-10-14T04:29:00Z'))).toBeNull()
    expect(duePeriod('checklist-reset', utc('2026-10-14T04:30:00Z'))).toBe('2026-10-14')
    expect(duePeriod('checklist-reset', utc('2026-10-26T05:29:00Z'))).toBeNull()
    expect(duePeriod('checklist-reset', utc('2026-10-26T05:30:00Z'))).toBe('2026-10-26')
    expect(duePeriod('checklist-reset', utc('2026-03-30T04:30:00Z'))).toBe('2026-03-30')
  })

  it('start a new day at midnight in Madrid, not in UTC', () => {
    expect(duePeriod('notifications', utc('2026-10-14T21:59:00Z'))).toBe('2026-10-14')
    expect(duePeriod('notifications', utc('2026-10-14T22:00:00Z'))).toBeNull()
  })
})

describe('the weekly checklist purge', () => {
  it('is due from Monday 04:00 and keeps that Monday as its period all week', () => {
    expect(duePeriod('checklist-purge', utc('2026-10-12T01:59:00Z'))).toBeNull()
    expect(duePeriod('checklist-purge', utc('2026-10-12T02:00:00Z'))).toBe('2026-10-12')
    expect(duePeriod('checklist-purge', utc('2026-10-18T20:00:00Z'))).toBe('2026-10-12')
  })

  it('counts Monday 04:00 in winter time too', () => {
    expect(duePeriod('checklist-purge', utc('2026-10-26T02:59:00Z'))).toBeNull()
    expect(duePeriod('checklist-purge', utc('2026-10-26T03:00:00Z'))).toBe('2026-10-26')
  })

  it('finds the Monday across a change of year', () => {
    expect(duePeriod('checklist-purge', utc('2026-01-01T10:00:00Z'))).toBe('2025-12-29')
  })
})

describe('the monthly batch payment', () => {
  it('takes the month as its period from day 10 at 23:59', () => {
    expect(duePeriod('batch-payment', utc('2026-10-10T21:58:00Z'))).toBe('2026-09')
    expect(duePeriod('batch-payment', utc('2026-10-10T21:59:00Z'))).toBe('2026-10')
    expect(duePeriod('batch-payment', utc('2026-10-31T12:00:00Z'))).toBe('2026-10')
  })

  it('still owes the previous period on the first days of a month', () => {
    expect(duePeriod('batch-payment', utc('2026-10-09T12:00:00Z'))).toBe('2026-09')
    // 2026-10-31 23:30 UTC is already 1 November in Madrid
    expect(duePeriod('batch-payment', utc('2026-10-31T23:30:00Z'))).toBe('2026-10')
    expect(duePeriod('batch-payment', utc('2027-01-05T12:00:00Z'))).toBe('2026-12')
  })

  it('pays the month before its period, across a change of year', () => {
    expect(batchPaymentTarget('2026-10')).toEqual({ year: 2026, month: 9 })
    expect(batchPaymentTarget('2027-01')).toEqual({ year: 2026, month: 12 })
  })
})
