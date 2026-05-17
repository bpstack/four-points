// tests/checklist/checklist.test.ts
// Integration tests for checklist repository + service.
// Requires a reachable MySQL (local or aiven). Skipped gracefully otherwise.
// Each test runs against a dedicated checklist_id that is cleaned up in beforeEach/afterAll.

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import db from '../../config/db.js'
import * as repo from '../../repositories/checklist/checklist-repository.js'
import * as service from '../../services/checklist/checklist.service.js'
import { getTodayMadrid } from '../../config/date-utils.js'
import { createCommentSchema } from '../../validations/checklist/checklist-schemas.js'

const TEST_CHECKLIST_ID = 'vitest-integration-checklist'
const TEST_STEP_ID = 'vitest-step-1'
// CHAR(36) — no FK to users table, any stable string works
const TEST_USER_ID = 'vitest-user-0000-0000-000000000001'
// Fixed past date — always stale, avoids timezone edge cases in closeStaleRuns tests
const STALE_DATE = '2026-01-01'

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
    await db.query(`DELETE FROM checklist_runs WHERE checklist_id = ?`, [TEST_CHECKLIST_ID])
  }
})

// Clean slate before each test — CASCADE DELETE removes step_state + event_log rows
beforeEach(async () => {
  if (!dbAvailable) return
  await db.query(`DELETE FROM checklist_runs WHERE checklist_id = ?`, [TEST_CHECKLIST_ID])
})

// ──────────────────────────────────────────────────────────
// closeStaleRuns
// ──────────────────────────────────────────────────────────

describe('closeStaleRuns', () => {
  it('does not close a run created for today', async () => {
    if (!dbAvailable) return
    const today = getTodayMadrid()
    await db.query(
      `INSERT INTO checklist_runs (checklist_id, hotel_id, hotel_date) VALUES (?, 1, ?)`,
      [TEST_CHECKLIST_ID, today]
    )

    await repo.closeStaleRuns()

    const [rows]: any = await db.query(
      `SELECT reset_at FROM checklist_runs WHERE checklist_id = ? AND hotel_date = ?`,
      [TEST_CHECKLIST_ID, today]
    )
    expect(rows[0].reset_at).toBeNull()
  })

  it('closes run with hotel_date < today and sets cron fields', async () => {
    if (!dbAvailable) return
    await db.query(
      `INSERT INTO checklist_runs (checklist_id, hotel_id, hotel_date) VALUES (?, 1, ?)`,
      [TEST_CHECKLIST_ID, STALE_DATE]
    )

    const affected = await repo.closeStaleRuns()
    expect(affected).toBeGreaterThanOrEqual(1)

    const [rows]: any = await db.query(
      `SELECT reset_at, reset_reason, reset_by_user_id
       FROM checklist_runs WHERE checklist_id = ? AND hotel_date = ?`,
      [TEST_CHECKLIST_ID, STALE_DATE]
    )
    expect(rows[0].reset_at).not.toBeNull()
    expect(rows[0].reset_reason).toBe('cron')
    expect(rows[0].reset_by_user_id).toBe('system-cron')
  })
})

// ──────────────────────────────────────────────────────────
// getRunState
// ──────────────────────────────────────────────────────────

describe('getRunState', () => {
  it('creates a new run for today when none exists', async () => {
    if (!dbAvailable) return
    const today = getTodayMadrid()

    const state = await service.getRunState(TEST_CHECKLIST_ID)

    // mysql2 returns DATE columns as JS Date objects (UTC midnight).
    // Use Intl to format in Madrid timezone before comparing.
    const runDateMadrid = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(
      new Date(state.run.hotel_date)
    )
    expect(state.run.checklist_id).toBe(TEST_CHECKLIST_ID)
    expect(runDateMadrid).toBe(today)
    expect(state.run.reset_at).toBeNull()
    expect(Array.isArray(state.steps)).toBe(true)
  })

  it('idempotent — returns the same run on a second call', async () => {
    if (!dbAvailable) return

    const first = await service.getRunState(TEST_CHECKLIST_ID)
    const second = await service.getRunState(TEST_CHECKLIST_ID)

    expect(second.run.id).toBe(first.run.id)
  })

  it('auto-closes stale runs on first call of the day (lazy close)', async () => {
    if (!dbAvailable) return
    await db.query(
      `INSERT INTO checklist_runs (checklist_id, hotel_id, hotel_date) VALUES (?, 1, ?)`,
      [TEST_CHECKLIST_ID, STALE_DATE]
    )

    await service.getRunState(TEST_CHECKLIST_ID)

    const [rows]: any = await db.query(
      `SELECT reset_at FROM checklist_runs WHERE checklist_id = ? AND hotel_date = ?`,
      [TEST_CHECKLIST_ID, STALE_DATE]
    )
    expect(rows[0].reset_at).not.toBeNull()
  })
})

// ──────────────────────────────────────────────────────────
// toggleStep
// ──────────────────────────────────────────────────────────

describe('toggleStep', () => {
  it('done=true inserts step state with done_by_user_id and done_at', async () => {
    if (!dbAvailable) return

    await service.toggleStep(TEST_CHECKLIST_ID, TEST_STEP_ID, true, TEST_USER_ID)

    const [rows]: any = await db.query(
      `SELECT css.done, css.done_by_user_id, css.done_at
       FROM checklist_step_state css
       JOIN checklist_runs cr ON cr.id = css.run_id
       WHERE cr.checklist_id = ? AND css.step_id = ?`,
      [TEST_CHECKLIST_ID, TEST_STEP_ID]
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].done).toBe(1)
    expect(rows[0].done_by_user_id).toBe(TEST_USER_ID)
    expect(rows[0].done_at).not.toBeNull()
  })

  it('done=false clears done_by_user_id and done_at', async () => {
    if (!dbAvailable) return

    await service.toggleStep(TEST_CHECKLIST_ID, TEST_STEP_ID, true, TEST_USER_ID)
    await service.toggleStep(TEST_CHECKLIST_ID, TEST_STEP_ID, false, TEST_USER_ID)

    const [rows]: any = await db.query(
      `SELECT css.done, css.done_by_user_id, css.done_at
       FROM checklist_step_state css
       JOIN checklist_runs cr ON cr.id = css.run_id
       WHERE cr.checklist_id = ? AND css.step_id = ?`,
      [TEST_CHECKLIST_ID, TEST_STEP_ID]
    )
    expect(rows[0].done).toBe(0)
    expect(rows[0].done_by_user_id).toBeNull()
    expect(rows[0].done_at).toBeNull()
  })

  it('logs "check" event for done=true', async () => {
    if (!dbAvailable) return

    await service.toggleStep(TEST_CHECKLIST_ID, TEST_STEP_ID, true, TEST_USER_ID)

    const [rows]: any = await db.query(
      `SELECT cel.action FROM checklist_event_log cel
       JOIN checklist_runs cr ON cr.id = cel.run_id
       WHERE cr.checklist_id = ? AND cel.step_id = ?
       ORDER BY cel.at ASC`,
      [TEST_CHECKLIST_ID, TEST_STEP_ID]
    )
    expect(rows[0].action).toBe('check')
  })

  it('logs "uncheck" event for done=false', async () => {
    if (!dbAvailable) return

    await service.toggleStep(TEST_CHECKLIST_ID, TEST_STEP_ID, true, TEST_USER_ID)
    await service.toggleStep(TEST_CHECKLIST_ID, TEST_STEP_ID, false, TEST_USER_ID)

    const [rows]: any = await db.query(
      `SELECT cel.action FROM checklist_event_log cel
       JOIN checklist_runs cr ON cr.id = cel.run_id
       WHERE cr.checklist_id = ? AND cel.step_id = ?
       ORDER BY cel.at ASC`,
      [TEST_CHECKLIST_ID, TEST_STEP_ID]
    )
    const actions = rows.map((r: any) => r.action)
    expect(actions).toEqual(['check', 'uncheck'])
  })
})

// ──────────────────────────────────────────────────────────
// createCommentSchema — Zod only, no DB needed
// ──────────────────────────────────────────────────────────

describe('createCommentSchema', () => {
  it('rejects whitespace-only body after trim (regression 2026-05-15)', () => {
    expect(createCommentSchema.safeParse({ body: '   ' }).success).toBe(false)
    expect(createCommentSchema.safeParse({ body: '\t\n' }).success).toBe(false)
  })

  it('accepts a valid non-empty body', () => {
    const result = createCommentSchema.safeParse({ body: 'Todo correcto' })
    expect(result.success).toBe(true)
    expect(result.data?.body).toBe('Todo correcto')
  })

  it('rejects body exceeding 500 characters', () => {
    expect(createCommentSchema.safeParse({ body: 'a'.repeat(501) }).success).toBe(false)
  })

  it('accepts body of exactly 500 characters', () => {
    expect(createCommentSchema.safeParse({ body: 'a'.repeat(500) }).success).toBe(true)
  })
})
