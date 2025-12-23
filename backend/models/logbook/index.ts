// models/logbook/index.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'

// ============================================
// ENUMS
// ============================================

export type ImportanceLevel = 'baja' | 'media' | 'alta' | 'urgente'

export type HistoryAction = 'create' | 'update' | 'delete' | 'read' | 'unread' | 'solve' | 'reopen'

export type HistoryType = 'logbook' | 'comment'

// ============================================
// DATABASE MODELS (RowDataPacket for queries)
// ============================================

export interface LogbookRow extends RowDataPacket {
  id: number
  message: string
  importance_level: ImportanceLevel
  department_id: number
  author_id: string
  date: string | null
  is_solved: number
  solved_at: Date | null
  solved_by: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface LogbookWithAuthor extends LogbookRow {
  author_name: string
  author_email: string
  department_name?: string
}

export interface LogbookCommentRow extends RowDataPacket {
  id: number
  logbook_id: number
  user_id: string
  comment: string
  department_id: number | null
  importance_level: ImportanceLevel | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export interface LogbookCommentWithAuthor extends LogbookCommentRow {
  author_name: string
}

export interface LogbookHistoryRow extends RowDataPacket {
  id: number
  logbook_id: number
  editor_id: string
  type: HistoryType
  action: HistoryAction
  previous_content: string | null
  new_content: string | null
  comment_id: number | null
  department_id: number | null
  created_at: Date
}

export interface LogbookReadRow extends RowDataPacket {
  id: number
  logbook_id: number
  user_id: string
  read_at: Date
}

export interface LogbookReadWithUser extends LogbookReadRow {
  username: string
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface CreateLogbookDTO {
  message: string
  importance_level: ImportanceLevel
  department_id: number
  author_id: string
  date?: string
}

export interface UpdateLogbookDTO {
  message?: string
  importance_level?: ImportanceLevel
  department_id?: number
}

export interface CreateCommentDTO {
  logbook_id: number
  user_id: string
  comment: string
  department_id?: number
  importance_level?: ImportanceLevel
}

export interface UpdateCommentDTO {
  comment?: string
  department_id?: number
  importance_level?: ImportanceLevel
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface CreatedLogbook {
  id: number
  message: string
  importance_level: ImportanceLevel
  department_id: number
  author_id: string
  created_at: Date
  updated_at: Date
  comments: []
  date: string
}

export interface CreatedComment {
  id: number
  logbook_id: number
  user_id: string
  comment: string
  department_id?: number
  importance_level?: ImportanceLevel
}

export interface LogbookReadRecord {
  id?: number
  logbook_id: number
  user_id: string
  read_at: Date
}

export interface LogbookSolvedRecord {
  logbook_id: number
  user_id: string
  solved_at: Date
  is_solved: number
}

export interface LogbookPendingRecord {
  logbook_id: number
  user_id: string
  is_solved: number
}

// ============================================
// HISTORY TYPES
// ============================================

export interface HistoryRecord {
  id: number
  logbook_id: number
  editor_id: string
  type: HistoryType
  action: HistoryAction
  previous_content: string | null
  new_content: string | null
  comment_id: number | null
  department_id: number | null
  created_at: Date
}

export interface LogActionParams {
  logbook_id: number
  editor_id: string
  action: HistoryAction
  previous_content?: string | null
  new_content?: string | null
  department_id?: number | null
}

export interface DeleteLogbookHistoryParams {
  logbook_id: number
  editor_id: string
  previous_content: object
  department_id?: number | null
}

export interface CommentHistoryParams {
  logbook_id: number
  comment_id: number
  editor_id: string
  action: 'create' | 'update' | 'delete'
  previous_content: object | null
  current_content: object | null
}

// ============================================
// HISTORY RESPONSE (formatted)
// ============================================

export interface HistoryEditor {
  id: string
  username: string
  email: string
}

export interface HistoryLogbookInfo {
  id: number
  authorId: string
  message: string
  importance: ImportanceLevel
  isSolved: boolean
  solvedAt: string | null
  solvedBy: string | null
  departmentId: number
}

export interface FormattedHistoryEntry {
  id: number
  type: HistoryType
  action: HistoryAction
  department: number | null
  editor: HistoryEditor | null
  previousContent: unknown
  newContent: unknown
  createdAt: string
  logbook: HistoryLogbookInfo
}

export interface HistoryByLogbookResponse {
  logbookId: number
  history: FormattedHistoryEntry[]
}

// ============================================
// READER/SOLVER RESPONSE
// ============================================

export interface LogbookReader {
  user_id: string
  username: string
  read_at: Date
}

export interface LogbookSolver {
  user_id: string
  solved_at: Date
}

// ============================================
// MYSQL RESULT TYPES
// ============================================

export { ResultSetHeader }
