// src/models/blacklist/index.ts
/**
 * Tipos TypeScript para el módulo Blacklist
 * Sistema de gestión de huéspedes con mala conducta
 */

// ========================================
// TIPOS BASE (coinciden con la BD)
// ========================================

export type DocumentType = 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type EntryStatus = 'ACTIVE' | 'DELETED'
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'

// ========================================
// ENTIDAD PRINCIPAL
// ========================================

export interface BlacklistEntry {
  id: number
  guest_name: string
  document_type: DocumentType
  document_number: string
  check_in_date: string // ISO date string
  check_out_date: string // ISO date string
  reason: string
  severity: SeverityLevel
  comments: string
  images: string[] // URLs de Cloudinary
  status: EntryStatus
  deleted_at: string | null
  deleted_by: string | null
  created_by: string // UUID del usuario
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
  audit_trail: AuditEntry[] | null

  // Campos JOIN con users (no en BD, vienen del query)
  created_by_username?: string
  deleted_by_username?: string
}

// ========================================
// AUDIT TRAIL (almacenado como JSON)
// ========================================

export interface AuditEntry {
  id: string // UUID único para React keys
  action: AuditAction
  changed_by: string // UUID
  changed_by_username: string
  timestamp: string // ISO timestamp
  changes: Record<string, { old: unknown; new: unknown }> | null
}

// ========================================
// DTOs - CREATE
// ========================================

export interface CreateBlacklistDTO {
  guest_name: string
  document_type: DocumentType
  document_number: string
  check_in_date: string // YYYY-MM-DD
  check_out_date: string // YYYY-MM-DD
  reason: string
  severity: SeverityLevel
  comments: string
  images: string[] // URLs ya subidas a Cloudinary
}

// ========================================
// DTOs - UPDATE
// ========================================

export interface UpdateBlacklistDTO {
  guest_name?: string
  document_type?: DocumentType
  document_number?: string
  check_in_date?: string
  check_out_date?: string
  reason?: string
  severity?: SeverityLevel
  comments?: string
  images?: string[] // URLs (puede agregar/quitar)
}

// ========================================
// FILTROS DE BÚSQUEDA
// ========================================

export interface BlacklistFilters {
  q?: string // Búsqueda general (nombre, documento)
  document?: string // Filtrar por documento específico
  severity?: SeverityLevel
  status?: EntryStatus | 'ALL'
  created_by?: string // UUID del usuario creador
  from_date?: string // Rango fecha inicio (check_in)
  to_date?: string // Rango fecha fin (check_in)
  page?: number
  limit?: number
}

// ========================================
// RESPUESTAS API
// ========================================

export interface PaginationInfo {
  current_page: number
  total_pages: number
  total_entries: number
  per_page: number
  has_next: boolean
  has_prev: boolean
}

// ========================================
// ESTADÍSTICAS
// ========================================

export interface BlacklistStats {
  total_entries: number
  active_entries: number
  deleted_entries: number
  by_severity: Record<SeverityLevel, number>
  recent_entries: BlacklistEntry[]
}

// ========================================
// UPLOAD DE IMÁGENES (para cuando implementemos Cloudinary)
// ========================================

export interface ImageUploadResponse {
  url: string
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
}

// ========================================
// VALORES POR DEFECTO
// ========================================

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 100
