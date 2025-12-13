// repositories/logbook/logbookHistory-repository.ts
// CRUD simple sobre logbook_history

import db from '../../config/db.js'
import type {
  HistoryAction,
  HistoryType,
  HistoryRecord,
  HistoryByLogbookResponse,
  FormattedHistoryEntry,
  ResultSetHeader,
} from '../../models/logbook/index.js'
import { RowDataPacket } from 'mysql2'

// ============================================
// HELPERS
// ============================================

const safeJSON = (val: unknown): unknown => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }
  return val
}

// ============================================
// CREATE HISTORY
// ============================================

export async function addHistory(
  logbook_id: number,
  editor_id: string,
  type: HistoryType,
  action: HistoryAction,
  previous_content: string | null = null,
  new_content: string | null = null,
  comment_id: number | null = null,
  department_id: number | null = null
): Promise<HistoryRecord> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO logbook_history 
      (logbook_id, editor_id, type, action, previous_content, new_content, comment_id, department_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      logbook_id,
      editor_id,
      type,
      action,
      previous_content,
      new_content,
      comment_id,
      department_id,
    ]
  )

  return {
    id: result.insertId,
    logbook_id,
    editor_id,
    type,
    action,
    previous_content,
    new_content,
    comment_id,
    department_id,
    created_at: new Date(),
  }
}

// ============================================
// GET HISTORY
// ============================================

interface HistoryJoinRow extends RowDataPacket {
  id: number
  type: HistoryType
  action: HistoryAction
  previous_content: string | null
  new_content: string | null
  created_at: Date
  comment_id: number | null
  department_id: number | null
  editor_id: string | null
  editor_name: string | null
  editor_email: string | null
  author_id: string | null
  message: string | null
  importance_level: string | null
  is_solved: number | null
  solved_at: Date | null
  solved_by: string | null
  logbook_department: number | null
}

export async function getHistoryByLogbookId(
  logbookId: number
): Promise<HistoryByLogbookResponse> {
  const [rows] = await db.execute<HistoryJoinRow[]>(
    `SELECT
        lh.id,
        lh.type,
        lh.action,
        lh.previous_content,
        lh.new_content,
        lh.created_at,
        lh.comment_id,
        lh.department_id,
        /* editor */
        u.id   AS editor_id,
        u.username AS editor_name,
        u.email    AS editor_email,
        /* info opcional de logbook */
        l.author_id,
        l.message,
        l.importance_level,
        l.is_solved,
        l.solved_at,
        l.solved_by,
        l.department_id AS logbook_department
    FROM logbook_history lh
    LEFT JOIN users  u ON u.id = lh.editor_id
    LEFT JOIN logbooks l ON l.id = lh.logbook_id
    WHERE lh.logbook_id = ?
    ORDER BY lh.created_at DESC`,
    [logbookId]
  )

  const history: FormattedHistoryEntry[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    action: row.action,
    department: row.department_id ?? null,
    editor: row.editor_id
      ? {
          id: row.editor_id,
          username: row.editor_name || '',
          email: row.editor_email || '',
        }
      : null,
    previousContent: safeJSON(row.previous_content),
    newContent: safeJSON(row.new_content),
    createdAt: row.created_at.toISOString(),
    logbook: {
      id: logbookId,
      authorId: row.author_id || '',
      message: row.message || '',
      importance: (row.importance_level as FormattedHistoryEntry['logbook']['importance']) || 'baja',
      isSolved: !!row.is_solved,
      solvedAt: row.solved_at ? new Date(row.solved_at).toISOString() : null,
      solvedBy: row.solved_by || null,
      departmentId: row.logbook_department || 0,
    },
  }))

  return { logbookId, history }
}
