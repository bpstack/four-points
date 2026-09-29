// tests/scheduling/employee-requests-repository.test.ts
// Integration test for employee-requests-repository.
// Requires DB_ENVIRONMENT=local and a running local MySQL instance.
// Tests are skipped gracefully when no DB is available.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import db from '../../config/db.js'

// Only run integration tests when DB is available
let dbAvailable = false

beforeAll(async () => {
  try {
    await db.query('SELECT 1')
    dbAvailable = true
  } catch {
    dbAvailable = false
  }
})

afterAll(async () => {
  if (dbAvailable) {
    // Clean up any test rows inserted by these tests
    await db.query(`DELETE FROM scheduling_employee_requests WHERE notes = 'test-integration-row'`)
  }
})

describe('scheduling_employee_requests — integration', () => {
  it('table exists and is queryable', async () => {
    if (!dbAvailable) {
      console.warn('Skipping: no DB connection available (set DB_ENVIRONMENT=local)')
      return
    }

    const [rows] = await db.query('SELECT * FROM scheduling_employee_requests LIMIT 1')
    expect(Array.isArray(rows)).toBe(true)
  })

  it('findByMonth returns rows overlapping the month interval', async () => {
    if (!dbAvailable) {
      console.warn('Skipping: no DB connection available')
      return
    }

    // Insert a test row and verify findByMonth retrieves it
    const [users]: any = await db.query(`SELECT id FROM users LIMIT 1`)
    if (!users.length) {
      console.warn('Skipping: no users found in local DB')
      return
    }

    const employeeId = users[0].id

    // Insert a request spanning January 2026
    await db.query(
      `INSERT INTO scheduling_employee_requests
        (employee_id, date_from, date_to, request_type, status, notes)
       VALUES (?, '2026-01-10', '2026-01-15', 'shift_preference', 'pending', 'test-integration-row')`,
      [employeeId]
    )

    const { findByMonth } =
      await import('../../repositories/scheduling/employee-requests-repository.js')

    const results = await findByMonth(2026, 1)
    const testRow = results.find((r) => r.notes === 'test-integration-row')

    expect(testRow).toBeDefined()
    expect(testRow?.employee_id).toBe(employeeId)
    expect(testRow?.request_type).toBe('shift_preference')
    expect(testRow?.status).toBe('pending')

    // Verify it does NOT appear in a different month
    const feb = await findByMonth(2026, 2)
    const absent = feb.find((r) => r.notes === 'test-integration-row')
    expect(absent).toBeUndefined()
  })
})
