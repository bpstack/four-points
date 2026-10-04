// repositories/logbook/logbookReads-repository.ts

import { dbx } from '../../config/transaction.js'
import * as logbookHistoryRepo from './logbookHistory-repository.js'
import type {
  LogbookReadRecord,
  LogbookSolvedRecord,
  LogbookPendingRecord,
  LogbookReader,
  LogbookSolver,
  ResultSetHeader,
} from '../../models/logbook/index.js'
import { RowDataPacket } from 'mysql2'

// ============================================
// INTERFACES FOR QUERIES
// ============================================

interface ReaderRow extends RowDataPacket {
  user_id: string
  read_at: Date
  username: string
}

interface SolverRow extends RowDataPacket {
  user_id: string
  solved_at: Date
}

// ============================================
// READ OPERATIONS
// ============================================

export async function logBookReadByUser({
  logbookId,
  userId,
}: {
  logbookId: number | string
  userId: string
}): Promise<LogbookReadRecord> {
  if (logbookId == null || userId == null) {
    throw new Error('logbookId y userId no pueden ser undefined o null')
  }

  // Record the read, only for an entry that exists and is not deleted
  const [result] = await dbx().execute<ResultSetHeader>(
    `INSERT INTO logbook_reads (logbook_id, user_id, read_at)
    SELECT l.id, ?, NOW() FROM logbooks l WHERE l.id = ? AND l.deleted_at IS NULL
    ON DUPLICATE KEY UPDATE read_at = NOW()`,
    [userId, logbookId]
  )

  if (result.affectedRows === 0) {
    const err: CustomError = new Error('Logbook no encontrado')
    err.status = 404
    throw err
  }

  // Log to history
  await logbookHistoryRepo.addHistory(
    Number(logbookId),
    userId,
    'logbook',
    'read',
    null,
    null,
    null,
    null
  )

  return {
    id: result.insertId,
    logbook_id: Number(logbookId),
    user_id: userId,
    read_at: new Date(),
  }
}

export async function unmarkLogbookRead({
  logbookId,
  userId,
}: {
  logbookId: number | string
  userId: string
}): Promise<{ logbook_id: number; user_id: string; unread_at: Date }> {
  if (logbookId == null || userId == null) {
    throw new Error('logbookId y userId no pueden ser undefined o null')
  }

  await dbx().execute<ResultSetHeader>(
    `DELETE FROM logbook_reads 
    WHERE logbook_id = ? AND user_id = ?`,
    [logbookId, userId]
  )

  // Log to history
  await logbookHistoryRepo.addHistory(
    Number(logbookId),
    userId,
    'logbook',
    'unread',
    null,
    null,
    null,
    null
  )

  return {
    logbook_id: Number(logbookId),
    user_id: userId,
    unread_at: new Date(),
  }
}

export async function getUsersWhoReadLogbook(logbookId: number | string): Promise<LogbookReader[]> {
  if (logbookId == null) {
    throw new Error('logbookId no puede ser undefined o null')
  }

  const [rows] = await dbx().execute<ReaderRow[]>(
    `SELECT 
      lr.user_id, 
      lr.read_at,
      u.username
    FROM logbook_reads lr
    JOIN users u ON u.id = lr.user_id
    WHERE lr.logbook_id = ?
    ORDER BY lr.read_at ASC`,
    [logbookId]
  )

  return rows.map((row) => ({
    user_id: row.user_id,
    username: row.username,
    read_at: row.read_at,
  }))
}

// ============================================
// SOLVE OPERATIONS
// ============================================

interface CustomError extends Error {
  status?: number
}

export async function logbookSolvedByUser({
  logbookId,
  userId,
}: {
  logbookId: number | string
  userId: string
}): Promise<LogbookSolvedRecord> {
  if (logbookId == null || userId == null) {
    throw new Error('logbookId y userId no pueden ser undefined o null')
  }

  const [result] = await dbx().execute<ResultSetHeader>(
    `UPDATE logbooks
    SET is_solved = 1,
        solved_at  = NOW(),
        solved_by  = ?
    WHERE id = ? AND deleted_at IS NULL`,
    [userId, logbookId]
  )

  if (result.affectedRows === 0) {
    const err: CustomError = new Error('Logbook no encontrado')
    err.status = 404
    throw err
  }

  await logbookHistoryRepo.addHistory(
    Number(logbookId),
    userId,
    'logbook',
    'solve',
    null,
    null,
    null,
    null
  )

  return {
    logbook_id: Number(logbookId),
    user_id: userId,
    solved_at: new Date(),
    is_solved: 1,
  }
}

export async function markLogbookPending({
  logbookId,
  userId,
}: {
  logbookId: number | string
  userId: string
}): Promise<LogbookPendingRecord> {
  const [result] = await dbx().execute<ResultSetHeader>(
    `UPDATE logbooks
    SET is_solved = 0,
        solved_at  = NULL,
        solved_by  = NULL,
        updated_at = NOW()
    WHERE id = ? AND deleted_at IS NULL`,
    [logbookId]
  )

  if (result.affectedRows === 0) {
    const err: CustomError = new Error('Logbook no encontrado')
    err.status = 404
    throw err
  }

  await logbookHistoryRepo.addHistory(
    Number(logbookId),
    userId,
    'logbook',
    'reopen',
    null,
    null,
    null,
    null
  )

  return {
    logbook_id: Number(logbookId),
    user_id: userId,
    is_solved: 0,
  }
}

export async function getUsersWhoSolvedLogbook(logbookId: number): Promise<LogbookSolver[]> {
  if (logbookId == null) {
    throw new Error('logbookId no puede ser undefined o null')
  }

  const [rows] = await dbx().execute<SolverRow[]>(
    `SELECT
      l.solved_by   AS user_id,
      l.solved_at   AS solved_at
    FROM logbooks l
    WHERE l.id = ?
      AND l.is_solved = 1
      AND l.deleted_at IS NULL
    LIMIT 1`,
    [logbookId]
  )

  return rows.map((row) => ({
    user_id: row.user_id,
    solved_at: row.solved_at,
  }))
}
