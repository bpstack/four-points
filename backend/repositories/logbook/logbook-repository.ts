// repositories/logbook/logbook-repository.ts
// CRUD + soft-delete + filtros

import db from '../../config/db.js'
import type {
  LogbookWithAuthor,
  CreateLogbookDTO,
  UpdateLogbookDTO,
  CreatedLogbook,
  ResultSetHeader,
} from '../../models/logbook/index.js'

// ============================================
// CREATE
// ============================================

export async function createLogbook({
  message,
  importance_level,
  department_id,
  author_id,
  date,
}: CreateLogbookDTO): Promise<CreatedLogbook> {
  if (author_id == null) {
    throw new Error('author_id no puede ser undefined o null')
  }

  const today = new Date().toISOString().split('T')[0] // yyyy-mm-dd

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO logbooks
      (message, importance_level, department_id, author_id, created_at, updated_at, date)
    VALUES (?, ?, ?, ?, NOW(), NOW(), ?)`,
    [message, importance_level, department_id, author_id, date || today]
  )

  return {
    id: result.insertId,
    message,
    importance_level,
    department_id,
    author_id,
    created_at: new Date(),
    updated_at: new Date(),
    comments: [],
    date: date || today,
  }
}

// ============================================
// READ
// ============================================

export async function getById(id: number | string): Promise<LogbookWithAuthor | undefined> {
  const [rows] = await db.execute<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.id = ? AND l.deleted_at IS NULL`,
    [id]
  )
  return rows[0]
}

export async function getAllLogbooks(): Promise<LogbookWithAuthor[]> {
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`
  )
  return rows
}

export async function getLogbooksByDepartment(
  departmentId: number | string
): Promise<LogbookWithAuthor[]> {
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.department_id = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`,
    [departmentId]
  )
  return rows
}

export async function getLogbooksByAuthor(authorId: string): Promise<LogbookWithAuthor[]> {
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.author_id = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`,
    [authorId]
  )
  return rows
}

export async function getLogbooksByImportance(importance: string): Promise<LogbookWithAuthor[]> {
  const allowed = ['baja', 'media', 'alta', 'urgente']
  if (!allowed.includes(importance)) {
    throw new Error('Nivel de importancia no válido')
  }

  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.importance_level = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`,
    [importance]
  )
  return rows
}

export async function getLogbooksByDay(day: string): Promise<LogbookWithAuthor[]> {
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE (l.date = ? OR (l.date IS NULL AND DATE(l.created_at) = ?))
      AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC`,
    [day, day]
  )
  return rows
}

export async function getAllTrashedLogbooks(): Promise<LogbookWithAuthor[]> {
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.deleted_at IS NOT NULL 
    ORDER BY l.deleted_at DESC`
  )
  return rows
}

// ============================================
// UPDATE
// ============================================

export async function updateLogbook(
  logbookId: number | string,
  { message, importance_level, department_id }: UpdateLogbookDTO
): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE logbooks
    SET message = COALESCE(?, message),
        importance_level = COALESCE(?, importance_level),
        department_id = COALESCE(?, department_id),
        updated_at = NOW()
    WHERE id = ? AND deleted_at IS NULL`,
    [message ?? null, importance_level ?? null, department_id ?? null, logbookId]
  )
  return result.affectedRows > 0
}

// ============================================
// DELETE (soft-delete)
// ============================================

export async function softDeleteLogbook(logbookId: number | string): Promise<boolean> {
  const [result] = await db.execute<ResultSetHeader>(
    'UPDATE logbooks SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [logbookId]
  )
  return result.affectedRows > 0
}
