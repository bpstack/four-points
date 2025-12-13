// repositories/logbook/logbookComments-repository.ts

import db from '../../config/db.js'
import type {
  LogbookCommentRow,
  LogbookCommentWithAuthor,
  CreateCommentDTO,
  UpdateCommentDTO,
  CreatedComment,
  ResultSetHeader,
} from '../../models/logbook/index.js'

// ============================================
// CREATE
// ============================================

export async function createComment({
  logbook_id,
  user_id,
  comment,
  department_id,
  importance_level,
}: CreateCommentDTO): Promise<CreatedComment> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO logbook_comments
    (logbook_id, user_id, comment, department_id, importance_level, created_at, updated_at)
    VALUES (?,?,?,?,?,NOW(),NOW())`,
    [logbook_id, user_id, comment, department_id ?? null, importance_level ?? null]
  )

  return {
    id: result.insertId,
    logbook_id,
    user_id,
    comment,
    department_id,
    importance_level,
  }
}

export async function addComment(
  logbookId: number,
  userId: string,
  comment: string
): Promise<CreatedComment> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO logbook_comments (logbook_id, user_id, comment, created_at)
    VALUES (?, ?, ?, NOW())`,
    [logbookId, userId, comment]
  )

  return {
    id: result.insertId,
    logbook_id: logbookId,
    user_id: userId,
    comment,
  }
}

// ============================================
// READ
// ============================================

export async function getById(
  id: number | string
): Promise<LogbookCommentRow | undefined> {
  const [rows] = await db.query<LogbookCommentRow[]>(
    'SELECT * FROM logbook_comments WHERE id = ?',
    [id]
  )
  return rows[0]
}

export async function getCommentByLogbookId(
  logbookId: number | string
): Promise<LogbookCommentWithAuthor[]> {
  const [rows] = await db.query<LogbookCommentWithAuthor[]>(
    `SELECT c.id,
            c.logbook_id,
            c.user_id,
            c.comment,
            c.department_id,
            c.importance_level,
            c.created_at,
            c.updated_at,
            u.username AS author_name
    FROM logbook_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.logbook_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC`,
    [logbookId]
  )
  return rows
}

// ============================================
// UPDATE
// ============================================

export async function updateComment(
  id: number | string,
  { comment, department_id, importance_level }: UpdateCommentDTO
): Promise<boolean> {
  const updates: string[] = []
  const params: (string | number | null)[] = []

  if (comment !== undefined) {
    updates.push('comment = ?')
    params.push(comment)
  }
  if (department_id !== undefined) {
    updates.push('department_id = ?')
    params.push(department_id)
  }
  if (importance_level !== undefined) {
    updates.push('importance_level = ?')
    params.push(importance_level)
  }

  // Always update timestamp
  updates.push('updated_at = NOW()')

  // If no fields were sent (only timestamp), return true
  if (updates.length === 1) return true

  const sql = `UPDATE logbook_comments SET ${updates.join(', ')} WHERE id = ?`
  params.push(id as number)

  const [result] = await db.execute<ResultSetHeader>(sql, params)
  return result.affectedRows > 0
}

// ============================================
// DELETE (soft-delete)
// ============================================

export async function softDeleteComment(id: number | string): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE logbook_comments SET deleted_at = NOW() WHERE id = ?`,
    [id]
  )
  return result.affectedRows > 0
}
