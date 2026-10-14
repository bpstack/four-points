// repositories/cron/cron-job-runs-repository.ts
// One row per scheduled job with the last period it ran for (cron_job_runs,
// 20261014_cron_catch_up.sql). claimRun is what keeps a job from running twice
// in the same period when the start-up catch-up and node-cron meet.

import type { ResultSetHeader } from 'mysql2'
import db from '../../config/db.js'

// A run left as 'running' this long ago died with its process: it can be retried
const STALE_RUNNING_MINUTES = 15

/**
 * Takes the job for `period` if nobody has: true when this caller must run it.
 * It can be taken when its last period is another one, when the last run
 * failed, or when a run of this period was left unfinished. The UPDATE locks
 * the row, so two concurrent callers cannot both get true.
 */
export async function claimRun(job: string, period: string): Promise<boolean> {
  await db.execute(
    `INSERT IGNORE INTO cron_job_runs (job, last_period, last_status, last_run_at)
     VALUES (?, '', 'ok', NOW())`,
    [job]
  )
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE cron_job_runs
        SET last_period = ?, last_status = 'running', last_run_at = NOW(), last_error = NULL
      WHERE job = ?
        AND (last_period <> ?
             OR last_status = 'error'
             OR (last_status = 'running' AND last_run_at < NOW() - INTERVAL ${STALE_RUNNING_MINUTES} MINUTE))`,
    [period, job, period]
  )
  return result.affectedRows === 1
}

export async function finishRun(job: string, error?: unknown): Promise<void> {
  const message =
    error === undefined ? null : String(error instanceof Error ? error.message : error)
  await db.execute(`UPDATE cron_job_runs SET last_status = ?, last_error = ? WHERE job = ?`, [
    message === null ? 'ok' : 'error',
    message?.slice(0, 500) ?? null,
    job,
  ])
}
