// repositories/checklist/checklist-repository.ts

import db from '../../config/db.js'
import { getTodayMadrid } from '../../config/date-utils.js'
import type { ChecklistRun, StepState, ResultSetHeader } from '../../models/checklist/index.js'

// ──────────────────────────────────────────────────────────
// RUNS
// ──────────────────────────────────────────────────────────

export async function findActiveRun(checklistId: string, hotelDate: string): Promise<ChecklistRun | null> {
  const [rows] = await db.execute<ChecklistRun[]>(
    `SELECT * FROM checklist_runs
     WHERE checklist_id = ? AND hotel_id = 1 AND hotel_date = ? AND reset_at IS NULL
     LIMIT 1`,
    [checklistId, hotelDate]
  )
  return rows[0] ?? null
}

export async function createRun(checklistId: string, hotelDate: string): Promise<ChecklistRun> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO checklist_runs (checklist_id, hotel_id, hotel_date) VALUES (?, 1, ?)`,
    [checklistId, hotelDate]
  )
  const [rows] = await db.execute<ChecklistRun[]>(
    `SELECT * FROM checklist_runs WHERE id = ?`,
    [(result as unknown as ResultSetHeader).insertId]
  )
  return rows[0]
}

export async function getOrCreateRun(checklistId: string): Promise<ChecklistRun> {
  const today = getTodayMadrid()
  const existing = await findActiveRun(checklistId, today)
  if (existing) return existing
  try {
    return await createRun(checklistId, today)
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      const retry = await findActiveRun(checklistId, today)
      if (retry) return retry
      const [rows] = await db.execute<ChecklistRun[]>(
        `SELECT * FROM checklist_runs WHERE checklist_id = ? AND hotel_id = 1 AND hotel_date = ? ORDER BY reset_at ASC LIMIT 1`,
        [checklistId, today]
      )
      return rows[0]
    }
    throw err
  }
}

export async function closeRun(runId: number, userId: string, reason: 'cron' | 'manual'): Promise<void> {
  await db.execute(
    `UPDATE checklist_runs SET reset_at = NOW(), reset_by_user_id = ?, reset_reason = ? WHERE id = ?`,
    [userId, reason, runId]
  )
}

// Closes all runs from previous hotel dates (called by cron at 06:30)
export async function closeStaleRuns(): Promise<number> {
  const today = getTodayMadrid()
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE checklist_runs SET reset_at = NOW(), reset_by_user_id = 'system-cron', reset_reason = 'cron'
     WHERE hotel_id = 1 AND hotel_date < ? AND reset_at IS NULL`,
    [today]
  )
  return (result as unknown as ResultSetHeader).affectedRows
}

// ──────────────────────────────────────────────────────────
// STEP STATES
// ──────────────────────────────────────────────────────────

export async function getStepStates(runId: number): Promise<StepState[]> {
  const [rows] = await db.execute<StepState[]>(
    `SELECT css.*, u.username AS done_by_username
     FROM checklist_step_state css
     LEFT JOIN users u ON u.id = css.done_by_user_id
     WHERE css.run_id = ?`,
    [runId]
  )
  return rows
}

export async function upsertStepState(
  runId: number,
  stepId: string,
  done: boolean,
  userId: string
): Promise<void> {
  if (done) {
    await db.execute(
      `INSERT INTO checklist_step_state (run_id, step_id, done, done_by_user_id, done_at)
       VALUES (?, ?, 1, ?, NOW())
       ON DUPLICATE KEY UPDATE done = 1, done_by_user_id = ?, done_at = NOW()`,
      [runId, stepId, userId, userId]
    )
  } else {
    await db.execute(
      `INSERT INTO checklist_step_state (run_id, step_id, done, done_by_user_id, done_at)
       VALUES (?, ?, 0, NULL, NULL)
       ON DUPLICATE KEY UPDATE done = 0, done_by_user_id = NULL, done_at = NULL`,
      [runId, stepId]
    )
  }
}

export async function deleteStepStates(runId: number): Promise<void> {
  await db.execute(`DELETE FROM checklist_step_state WHERE run_id = ?`, [runId])
}

// ──────────────────────────────────────────────────────────
// EVENT LOG
// ──────────────────────────────────────────────────────────

export async function logEvent(
  runId: number,
  stepId: string | null,
  userId: string,
  action: string,
  payload?: Record<string, unknown>
): Promise<void> {
  await db.execute(
    `INSERT INTO checklist_event_log (run_id, step_id, user_id, action, payload_json)
     VALUES (?, ?, ?, ?, ?)`,
    [runId, stepId, userId, action, payload ? JSON.stringify(payload) : null]
  )
}
