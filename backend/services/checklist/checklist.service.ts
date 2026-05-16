// services/checklist/checklist.service.ts

import * as repo from '../../repositories/checklist/checklist-repository.js'
import * as commentsRepo from '../../repositories/checklist/checklist-comments.repository.js'
import { getTodayMadrid } from '../../config/date-utils.js'
import type { ChecklistRunWithSteps } from '../../models/checklist/index.js'

async function buildRunState(run: Awaited<ReturnType<typeof repo.getOrCreateRun>>): Promise<ChecklistRunWithSteps> {
  const [steps, counts] = await Promise.all([
    repo.getStepStates(run.id),
    commentsRepo.getStepCounts(run.id),
  ])

  // Build map from existing step states
  const stepMap = new Map(steps.map((s) => [s.step_id, s]))

  // Include steps that have comments/attachments but were never toggled
  for (const stepId of counts.keys()) {
    if (!stepMap.has(stepId)) {
      stepMap.set(stepId, {
        run_id: run.id,
        step_id: stepId,
        done: false,
        done_by_user_id: null,
        done_at: null,
        done_by_username: null,
      } as Awaited<ReturnType<typeof repo.getStepStates>>[number])
    }
  }

  const enriched = Array.from(stepMap.values()).map((s) => ({
    ...s,
    comment_count: counts.get(s.step_id)?.comments ?? 0,
    attachment_count: counts.get(s.step_id)?.attachments ?? 0,
  }))

  return { run, steps: enriched }
}

export async function getRunState(checklistId: string): Promise<ChecklistRunWithSteps> {
  // Auto-close lazy: si el cron 06:30 Madrid no disparó (Render free tier dormido),
  // cerrar aquí los runs con hotel_date < today. UPDATE indexed, noop tras la primera del día.
  await repo.closeStaleRuns()
  const run = await repo.getOrCreateRun(checklistId)
  return buildRunState(run)
}

export async function toggleStep(
  checklistId: string,
  stepId: string,
  done: boolean,
  userId: string
): Promise<ChecklistRunWithSteps> {
  const run = await repo.getOrCreateRun(checklistId)
  await repo.upsertStepState(run.id, stepId, done, userId)
  await repo.logEvent(run.id, stepId, userId, done ? 'check' : 'uncheck')
  return buildRunState(run)
}

export async function resetRun(
  checklistId: string,
  userId: string
): Promise<ChecklistRunWithSteps> {
  const today = getTodayMadrid()
  const currentRun = await repo.findActiveRun(checklistId, today)
  if (currentRun) {
    await repo.logEvent(currentRun.id, null, userId, 'reset_manual')
    await repo.closeRun(currentRun.id, userId, 'manual')
  }
  const newRun = await repo.createRun(checklistId, today)
  await repo.logEvent(newRun.id, null, userId, 'reset_manual')
  return { run: newRun, steps: [] }
}

// Called by cron at 06:30
export async function dailyReset(): Promise<number> {
  return repo.closeStaleRuns()
}
