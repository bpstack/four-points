// repositories/logbook/logbook-repository.ts
// CRUD + soft-delete + filtros

import db from '../../config/db.js'
import { getTodayMadrid } from '../../config/date-utils.js'
import type {
  LogbookWithAuthor,
  CreateLogbookDTO,
  UpdateLogbookDTO,
  CreatedLogbook,
  ResultSetHeader,
} from '../../models/logbook/index.js'

// ============================================
// PAGINATION DEFAULTS
// ============================================
const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

interface PaginationOptions {
  limit?: number
  offset?: number
}

function sanitizeLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT
  return Math.min(limit, MAX_LIMIT)
}

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

  const today = getTodayMadrid() // YYYY-MM-DD en Europe/Madrid (hotel_date)

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
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE l.id = ? AND l.deleted_at IS NULL`,
    [id]
  )
  return rows[0]
}

export async function getAllLogbooks(options: PaginationOptions = {}): Promise<LogbookWithAuthor[]> {
  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0
  
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE l.deleted_at IS NULL 
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?`,
    [limit, offset]
  )
  return rows
}

export async function getLogbooksByDepartment(
  departmentId: number | string,
  options: PaginationOptions = {}
): Promise<LogbookWithAuthor[]> {
  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0
  
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE l.department_id = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?`,
    [departmentId, limit, offset]
  )
  return rows
}

export async function getLogbooksByAuthor(
  authorId: string,
  options: PaginationOptions = {}
): Promise<LogbookWithAuthor[]> {
  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0
  
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE l.author_id = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?`,
    [authorId, limit, offset]
  )
  return rows
}

export async function getLogbooksByImportance(
  importance: string,
  options: PaginationOptions = {}
): Promise<LogbookWithAuthor[]> {
  const allowed = ['baja', 'media', 'alta', 'urgente']
  if (!allowed.includes(importance)) {
    throw new Error('Nivel de importancia no válido')
  }

  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0

  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE l.importance_level = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?`,
    [importance, limit, offset]
  )
  return rows
}

export async function getLogbooksByDay(
  day: string,
  options: PaginationOptions = {}
): Promise<LogbookWithAuthor[]> {
  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0
  
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE (l.date = ? OR (l.date IS NULL AND DATE(l.created_at) = ?))
      AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?`,
    [day, day, limit, offset]
  )
  return rows
}

export async function getAllTrashedLogbooks(options: PaginationOptions = {}): Promise<LogbookWithAuthor[]> {
  const limit = sanitizeLimit(options.limit)
  const offset = options.offset || 0
  
  const [rows] = await db.query<LogbookWithAuthor[]>(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email,
      d.name as department_name
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    LEFT JOIN departments d ON l.department_id = d.id
    WHERE l.deleted_at IS NOT NULL 
    ORDER BY l.deleted_at DESC
    LIMIT ? OFFSET ?`,
    [limit, offset]
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
