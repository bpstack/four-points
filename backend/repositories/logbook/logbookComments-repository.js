// src/repositories/logbook/logbookComments-repository.js
import db from '../../config/db.js'

export async function createComment({
  logbook_id,
  user_id,
  comment,
  department_id,
  importance_level,
}) {
  const [res] = await db.execute(
    `INSERT INTO logbook_comments
    (logbook_id, user_id, comment, department_id, importance_level, created_at, updated_at)
    VALUES (?,?,?,?,?,NOW(),NOW())`,
    [logbook_id, user_id, comment, department_id, importance_level]
  )
  return {
    id: res.insertId,
    logbook_id,
    user_id,
    comment,
    department_id,
    importance_level,
  }
}

export async function updateComment(
  id,
  { comment, department_id, importance_level }
) {
  const updates = []
  const params = []

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

  // Siempre actualizamos el timestamp
  updates.push('updated_at = NOW()')

  // Si NO se envió ningún campo (solo timestamp) devolvemos true
  if (updates.length === 1) return true

  const sql = `UPDATE logbook_comments SET ${updates.join(', ')} WHERE id = ?`
  params.push(id)

  const [res] = await db.execute(sql, params)
  return res.affectedRows > 0
}

export async function softDeleteComment(id) {
  const [res] = await db.execute(
    `UPDATE logbook_comments SET deleted_at = NOW() WHERE id = ?`,
    [id]
  )
  return res.affectedRows > 0
}

/** ←←  GET by id */ // Esta id se refiere al comentario, no al logbook
export async function getById(id) {
  const [rows] = await db.query('SELECT * FROM logbook_comments WHERE id = ?', [
    id,
  ])
  return rows[0] // devuelves un objeto o `undefined`
}

/** ←←  GET por logbook  */ // Esta id se refiere al logbook, no al comentario
//🔧 Solución: enriquecer con JOIN a la tabla de usuarios
//Si en tu BD tienes la tabla users con id y username (o name), puedes modificar el repository así:

export const getCommentByLogbookId = async (logbookId) => {
  const [rows] = await db.query(
    `SELECT c.id,
            c.logbook_id,
            c.user_id,
            c.comment,
            c.department_id,
            c.importance_level,
            c.created_at,
            c.updated_at,
            u.username AS author_name   -- 👈 aquí traemos el nombre
    FROM logbook_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.logbook_id = ? AND c.deleted_at IS NULL
    ORDER BY c.created_at DESC`,
    [logbookId]
  )
  return rows
}

export const addComment = async (logbookId, userId, comment) => {
  const [result] = await db.execute(
    `INSERT INTO logbook_comments (logbook_id, user_id, comment, created_at)
    VALUES (?, ?, ?, NOW())`,
    [logbookId, userId, comment]
  )
  return {
    id: result.insertId,
    logbook_id: logbookId,
    user_id: userId,
    comment,
    created_at: new Date(),
  }
}
