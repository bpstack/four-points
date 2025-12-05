// src/repositories/logbook/logbookCommentsHistory-repository.js
import db from '../../config/db.js'

/**
 * Guarda la acción de un comentario en logbook_history.
 *
 * @param {Object} params
 * @param {Number} params.logbook_id   // ❗️ Requerido
 * @param {Number} params.comment_id
 * @param {Number} params.editor_id
 * @param {String} params.action      // 'create' | 'update' | 'delete'
 * @param {Object|null} params.previous_content
 * @param {Object|null} params.current_content
 */

export async function createCommentAction({
  logbook_id,
  comment_id,
  editor_id,
  action,
  previous_content,
  current_content,
}) {
  const [res] = await db.execute(
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
  return res.insertId
}

/* ──  CONSULTAS (OPCIONALES) ────────────────────────────────────── */
export async function getHistoryByCommentId(comment_id) {
  const [rows] = await db.query(
    `SELECT *
      FROM logbook_history
      WHERE comment_id = ?
        AND type = 'comment'
      ORDER BY created_at DESC`,
    [comment_id]
  )
  return rows
}

/* Tengo que ver si quiero también guardar la acción por logbook:
export async function getHistoryByLogbookId(logbook_id) { … }
*/
