// services/checklist/checklist-content.ts
//
// Loads checklist JSON definitions from backend/content/checklist/tasks/.
// Used to validate stepIds before writing to DB.
//
// ⚠️  SYNC REQUIRED: JSON files are duplicated from frontend/content/checklist/tasks/.
// When checklist content changes (steps added/removed/renamed), update BOTH locations:
//   - frontend/content/checklist/tasks/<name>.json   (UI rendering)
//   - backend/content/checklist/tasks/<name>.json    (stepId validation)
// Convention: checklist ID "cl-<name>" maps to file "<name>.json"
// Example: "cl-morning-shift" → "backend/content/checklist/tasks/morning-shift.json"

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const TASKS_DIR = join(__dirname, '../../content/checklist/tasks')

interface ChecklistJson {
  id: string
  sections: { id: string; steps: { id: string }[] }[]
}

// In-memory cache — files only change on deploy
const stepIdCache = new Map<string, Set<string>>()

// "cl-" plus lowercase words joined by hyphens: no dots or slashes, so the id
// can never point outside TASKS_DIR
const CHECKLIST_ID = /^cl-[a-z0-9]+(?:-[a-z0-9]+)*$/

function checklistIdToFilename(checklistId: string): string {
  return checklistId.replace(/^cl-/, '') + '.json'
}

// Returns the set of valid stepIds for a checklist, or null when the id is
// malformed or has no readable JSON definition.
export function getValidStepIds(checklistId: string): Set<string> | null {
  if (!CHECKLIST_ID.test(checklistId)) return null
  if (stepIdCache.has(checklistId)) return stepIdCache.get(checklistId)!

  const filePath = join(TASKS_DIR, checklistIdToFilename(checklistId))
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const json: ChecklistJson = JSON.parse(raw)
    const ids = new Set<string>()
    for (const section of json.sections) {
      for (const step of section.steps) {
        ids.add(step.id)
      }
    }
    stepIdCache.set(checklistId, ids)
    return ids
  } catch {
    // Unknown checklist or malformed JSON
    return null
  }
}

/** True when the id names a checklist with a JSON definition in TASKS_DIR. */
export function isKnownChecklist(checklistId: string): boolean {
  return getValidStepIds(checklistId) !== null
}
