// tests/fnb/repository.test.ts
// Integration tests for fnb repository.
// Requires MySQL with fnb_category + fnb_daily_revenue tables. Skipped if unreachable.
// Uses a dedicated test date (year 2099) that won't collide with real data.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import db from '../../config/db.js'
import * as repo from '../../repositories/fnb/fnb.repository.js'

const TEST_YEAR = 2099
const TEST_MONTH = 1
const TEST_DATE = `${TEST_YEAR}-01-15`
const TEST_DATE_2 = `${TEST_YEAR}-01-16`

let dbAvailable = false

beforeAll(async () => {
  try {
    await db.query('SELECT 1')
    dbAvailable = true
  } catch {
    dbAvailable = false
  }
})

beforeEach(async () => {
  if (!dbAvailable) return
  await db.execute('DELETE FROM fnb_daily_revenue WHERE YEAR(date) = ?', [TEST_YEAR])
})

afterAll(async () => {
  if (!dbAvailable) return
  await db.execute('DELETE FROM fnb_daily_revenue WHERE YEAR(date) = ?', [TEST_YEAR])
})

describe('fnb repository', () => {
  it('getCategories returns the 7 seeded categories', async () => {
    if (!dbAvailable) return
    const cats = await repo.getCategories()
    expect(cats.length).toBeGreaterThanOrEqual(7)
    const codes = cats.map(c => c.code)
    for (const c of ['21110','21124','21120','21111','21267','21112','21307']) {
      expect(codes).toContain(c)
    }
  })

  it('upsertMany inserts new rows and updates existing on conflict', async () => {
    if (!dbAvailable) return

    // First insert
    await repo.upsertMany(TEST_DATE, [
      { code: '21110', amount: 100 },
      { code: '21111', amount: 200 },
    ])
    let rows = await repo.getDailyEntries(TEST_DATE, TEST_DATE)
    expect(rows).toHaveLength(2)

    // Update via UPSERT — same date+code, new amount
    await repo.upsertMany(TEST_DATE, [
      { code: '21110', amount: 999 },
    ])
    rows = await repo.getDailyEntries(TEST_DATE, TEST_DATE)
    const r21110 = rows.find(r => r.category_code === '21110')
    expect(r21110?.amount).toBe(999)
    // Other code untouched
    const r21111 = rows.find(r => r.category_code === '21111')
    expect(r21111?.amount).toBe(200)
  })

  it('getMonthlyData returns full calendar (all days of month, even empty)', async () => {
    if (!dbAvailable) return
    await repo.upsertMany(TEST_DATE, [{ code: '21110', amount: 50 }])

    const result = await repo.getMonthlyData(TEST_YEAR, TEST_MONTH)
    // January has 31 days
    expect(result).toHaveLength(31)

    // Day 15 should have the value
    const day15 = result.find(r => r.date === TEST_DATE)
    expect(day15?.breakfast_included).toBe(50)
    expect(day15?.breakfast_total).toBe(50)

    // Day 1 should be empty zeros
    const day1 = result.find(r => r.date === `${TEST_YEAR}-01-01`)
    expect(day1?.fnb_total).toBe(0)
  })

  it('computeTotals rounds aggregates to 2 decimals (no float drift)', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS native
    const totals = repo.computeTotals([
      { code: '21110', amount: 0.1 },
      { code: '21124', amount: 0.2 },
    ])
    expect(totals.breakfast).toBe(0.3)
    expect(totals.fnb_total).toBe(0.3)
  })

  it('getMonthlyData computes totals without float drift', async () => {
    if (!dbAvailable) return
    await repo.upsertMany(TEST_DATE, [
      { code: '21110', amount: 100.10 },
      { code: '21124', amount: 200.20 },
      { code: '21120', amount: 300.30 },
    ])
    const result = await repo.getMonthlyData(TEST_YEAR, TEST_MONTH)
    const day15 = result.find(r => r.date === TEST_DATE)!
    expect(day15.breakfast_total).toBe(600.6)
  })

  it('getMonthlyData preserves negative amounts (no MAX-with-0 corruption)', async () => {
    if (!dbAvailable) return
    // Regression: MAX(CASE WHEN code=? THEN amount ELSE 0 END) returned 0 for
    // negative-only rows. Fixed via MAX(CASE WHEN ... END) + COALESCE.
    await repo.upsertMany(TEST_DATE, [
      { code: '21124', amount: -59.09 }, // Excel had real negative values
    ])
    const result = await repo.getMonthlyData(TEST_YEAR, TEST_MONTH)
    const day = result.find(r => r.date === TEST_DATE)!
    expect(day.breakfast_excluded).toBe(-59.09)
    expect(day.breakfast_total).toBe(-59.09)
  })

  it('deleteDay removes all 7 codes for a date', async () => {
    if (!dbAvailable) return
    await repo.upsertMany(TEST_DATE_2, [
      { code: '21110', amount: 1 },
      { code: '21111', amount: 2 },
      { code: '21112', amount: 3 },
    ])
    const deleted = await repo.deleteDay(TEST_DATE_2)
    expect(deleted).toBe(3)
    const rows = await repo.getDailyEntries(TEST_DATE_2, TEST_DATE_2)
    expect(rows).toHaveLength(0)
  })
})
