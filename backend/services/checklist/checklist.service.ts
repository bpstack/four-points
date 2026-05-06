// services/checklist/checklist.service.ts

import * as repo from '../../repositories/checklist/checklist-repository.js'
import type { ChecklistRunWithSteps } from '../../models/checklist/index.js'

export async function getRunState(checklistId: string): Promise<ChecklistRunWithSteps> {
  const run = await repo.getOrCreateRun(checklistId)
  const steps = await repo.getStepStates(run.id)
  return { run, steps }
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
  const steps = await repo.getStepStates(run.id)
  return { run, steps }
}

export async function resetRun(
  checklistId: string,
  userId: string
): Promise<ChecklistRunWithSteps> {
  const today = repo.getHotelDate()
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
