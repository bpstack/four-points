// services/logbook/logbookHistory-service.ts

import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'
import * as logbookHistoryRepo from '../../repositories/logbook/logbookHistory-repository.js'
import { withTransaction } from '../../config/transaction.js'
import type {
  LogActionParams,
  DeleteLogbookHistoryParams,
  HistoryRecord,
  UpdateLogbookDTO,
} from '../../models/logbook/index.js'

// ============================================
// LOG ACTION
// ============================================

export async function logAction({
  logbook_id,
  editor_id,
  action,
  previous_content = null,
  new_content = null,
  department_id = null,
}: LogActionParams): Promise<HistoryRecord> {
  if (!logbook_id) throw new Error('logAction: logbook_id es requerido')
  if (!editor_id) throw new Error('logAction: editor_id es requerido')
  if (!action) throw new Error('logAction: action es requerido')

  return await logbookHistoryRepo.addHistory(
    logbook_id,
    editor_id,
    'logbook',
    action,
    previous_content,
    new_content,
    null,
    department_id
  )
}

// ============================================
// UPDATE LOGBOOK WITH HISTORY
// ============================================

export async function updateLogbookHistory(
  logbookId: number | string,
  editorId: string,
  updates: UpdateLogbookDTO
): Promise<HistoryRecord> {
  // The update and its history row commit together
  return withTransaction(() => updateWithHistory(logbookId, editorId, updates))
}

async function updateWithHistory(
  logbookId: number | string,
  editorId: string,
  updates: UpdateLogbookDTO
): Promise<HistoryRecord> {
  // 1. Get current logbook
  const logbook = await logbookRepo.getById(logbookId)
  if (!logbook) throw new Error('Logbook no encontrado')

  // 2. Verify editor is the author
  if (logbook.author_id !== editorId) {
    throw new Error('Solo el autor puede actualizar este logbook')
  }

  // 3. Save previous content
  const previousContent = {
    message: logbook.message,
    importance_level: logbook.importance_level,
    department_id: logbook.department_id,
  }

  // 4. Update the logbook
  const updated = await logbookRepo.updateLogbook(logbookId, updates)
  if (!updated) throw new Error('No se pudo actualizar el logbook')

  // 5. Save history record
  const historyRecord = await logbookHistoryRepo.addHistory(
    Number(logbookId),
    editorId,
    'logbook',
    'update',
    JSON.stringify(previousContent),
    JSON.stringify(updates),
    null,
    updates.department_id ?? logbook.department_id
  )

  return historyRecord
}

// ============================================
// DELETE LOGBOOK WITH HISTORY
// ============================================

export async function deleteLogbookHistory({
  logbook_id,
  editor_id,
  previous_content,
  department_id = null,
}: DeleteLogbookHistoryParams): Promise<HistoryRecord> {
  return await logbookHistoryRepo.addHistory(
    logbook_id,
    editor_id,
    'logbook',
    'delete',
    JSON.stringify(previous_content),
    null,
    null,
    department_id
  )
}
