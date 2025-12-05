// src/repositories/logbook/logbookReads-repository.js
import db from '../../config/db.js'
import * as logbookHistoryRepo from './logbookHistory-repository.js'

/**
 * Registra la lectura de un logbook por parte de un usuario
 */
export async function logBookReadByUser({ logbookId, userId }) {
  if (logbookId == null || userId == null) {
    throw new Error('logbookId y userId no pueden ser undefined o null')
  }

  // 1️⃣ Graba la lectura
  const [result] = await db.execute(
    `INSERT INTO logbook_reads (logbook_id, user_id, read_at)
    VALUES (?, ?, NOW())
		ON DUPLICATE KEY UPDATE read_at = NOW()`,
    [logbookId, userId]
  )

  // 2️⃣ Registra en historial (tipo logbook, acción read)
  await logbookHistoryRepo.addHistory(
    logbookId, // logbook_id
    userId, // editor_id
    'logbook', // type
    'read', // action
    null, // previous_content
    null, // new_content
    null, // comment_id
    null // department_id
  )

  return {
    id: result.insertId,
    logbook_id: logbookId,
    user_id: userId,
    read_at: new Date(),
  }
}

/**
 * Registra la solución de un logbook por parte de un usuario
 */
export async function logbookSolvedByUser({ logbookId, userId }) {
  if (logbookId == null || userId == null) {
    throw new Error('logbookId y userId no pueden ser undefined o null')
  }

  const [result] = await db.execute(
    `UPDATE logbooks
    SET is_solved = 1,
        solved_at  = NOW(),
        solved_by  = ?
    WHERE id = ?`,
    [userId, logbookId]
  )

  if (result.affectedRows === 0) {
    const err = new Error('Logbook no encontrado')
    err.status = 404
    throw err
  }

  await logbookHistoryRepo.addHistory(
    logbookId,
    userId,
    'logbook',
    'solve',
    null,
    null,
    null,
    null
  )

  return {
    logbook_id: logbookId,
    user_id: userId,
    solved_at: new Date(),
    is_solved: 1,
  }
}

// Marcamos un logbook como no resuelto - pending

export async function markLogbookPending({ logbookId, userId }) {
  const [result] = await db.execute(
    `UPDATE logbooks
    SET is_solved = 0,
        solved_at  = NULL,
        solved_by  = NULL,
        updated_at = NOW()
    WHERE id = ?`,
    [logbookId]
  )

  if (result.affectedRows === 0) {
    const err = new Error('Logbook no encontrado')
    err.status = 404
    throw err
  }

  await logbookHistoryRepo.addHistory(
    logbookId,
    userId,
    'logbook',
    'reopen',
    null,
    null,
    null,
    null
  )

  return {
    logbook_id: logbookId,
    user_id: userId,
    is_solved: 0,
  }
}

/**
 * Obtiene los usuarios que han leído un logbook específico
 * ✅ MODIFICADO: Ahora trae también el username
 */
export async function getUsersWhoReadLogbook(logbookId) {
  if (logbookId == null) {
    throw new Error('logbookId no puede ser undefined o null')
  }

  const [rows] = await db.execute(
    `SELECT 
      lr.user_id, 
      lr.read_at,
      u.username    -- ✅ NUEVO: Traer el nombre de usuario
    FROM logbook_reads lr
    JOIN users u ON u.id = lr.user_id  -- ✅ NUEVO: JOIN con users
    WHERE lr.logbook_id = ?
    ORDER BY lr.read_at ASC`, // ✅ NUEVO: Ordenar por fecha
    [logbookId]
  )

  return rows.map((row) => ({
    user_id: row.user_id,
    username: row.username, // ✅ NUEVO
    read_at: row.read_at,
  }))
}

// ** Obtiene el usuario que ha solucionado un logbook específico

export async function getUsersWhoSolvedLogbook(logbookId) {
  if (logbookId == null) {
    throw new Error('logbookId no puede ser undefined o null')
  }

  // Usamos `logbooks` porque en mi esquema la información de “solución”
  // se guarda en: is_solved, solved_at, solved_by  esto es importante
  const [rows] = await db.execute(
    `
    SELECT
      l.solved_by   AS user_id,          -- el usuario que resolvió
      l.solved_at   AS solved_at        -- fecha/hora de la solución
    FROM logbooks l
    WHERE l.id = ?                 -- id del logbook buscado
      AND l.is_solved = 1           -- solo si ya está resuelto
      AND l.deleted_at IS NULL      -- no soft‑deleted
    LIMIT 1
    `,
    [logbookId]
  )

  return rows.map((row) => ({
    user_id: row.user_id,
    solved_at: row.solved_at,
  }))
}

/**  ✅ NUEVO: Elimina la lectura de un logbook por parte de un usuario
 */
export async function unmarkLogbookRead({ logbookId, userId }) {
  if (logbookId == null || userId == null) {
    throw new Error('logbookId y userId no pueden ser undefined o null')
  }

  const [result] = await db.execute(
    `DELETE FROM logbook_reads 
    WHERE logbook_id = ? AND user_id = ?`,
    [logbookId, userId]
  )

  // Registrar en historial
  await logbookHistoryRepo.addHistory(
    logbookId,
    userId,
    'logbook',
    'unread', // ✅ Nueva acción
    null,
    null,
    null,
    null
  )

  return {
    logbook_id: logbookId,
    user_id: userId,
    unread_at: new Date(),
  }
}
