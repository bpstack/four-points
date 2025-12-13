// repositories/logbook/logbookCommentsHistory-repository.ts

import db from '../../config/db.js'
import type {
  CommentHistoryParams,
  LogbookHistoryRow,
  ResultSetHeader,
} from '../../models/logbook/index.js'

// ============================================
// CREATE COMMENT HISTORY
// ============================================

export async function createCommentAction({
  logbook_id,
  comment_id,
  editor_id,
  action,
  previous_content,
  current_content,
}: CommentHistoryParams): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO logbook_history
      (logbook_id, comment_id, editor_id, type, action,
        previous_content, new_content, created_at)
    VALUES (?, ?, ?, 'comment', ?, ?, ?, NOW())`,
    [
      logbook_id,
      comment_id,
      editor_id,
      action,
      JSON.stringify(previous_content),
      JSON.stringify(current_content),
    ]
  )
  return result.insertId
}

// ============================================
// GET COMMENT HISTORY
// ============================================

export async function getHistoryByCommentId(
  comment_id: number | string
): Promise<LogbookHistoryRow[]> {
  const [rows] = await db.query<LogbookHistoryRow[]>(
    `SELECT *
      FROM logbook_history
      WHERE comment_id = ?
        AND type = 'comment'
      ORDER BY created_at DESC`,
    [comment_id]
  )
  return rows
}
