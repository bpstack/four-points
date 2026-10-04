// app/lib/blacklist/types.ts
/**
 * Tipos TypeScript para el módulo Blacklist
 * Sistema de gestión de huéspedes con mala conducta
 */

// ========================================
// TIPOS PRINCIPALES
// ========================================

export interface BlacklistEntry {
  id: string // UUID
  guest_name: string // Nombre completo del huésped
  document_type: 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
  document_number: string // Número de documento
  check_in_date: string // Fecha entrada (ISO)
  check_out_date: string // Fecha salida (ISO)
  reason: string // Motivo de inclusión en blacklist
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  images: string[] // API paths /api/blacklist/images/<file> (private files)
  comments: string // Comentarios del recepcionista
  status: 'ACTIVE' | 'DELETED' // Estado del registro
  created_by: string // ID del usuario que creó
  created_by_username?: string // Username (para mostrar en tabla)
  created_at: string // Fecha creación (ISO)
  updated_at?: string // Última actualización
  deleted_at?: string | null // Fecha eliminación (soft delete)
  deleted_by?: string | null // Usuario que eliminó
}

// ========================================
// AUDIT TRAIL (Historial de cambios)
// ========================================

export interface AuditEntry {
  id: string
  blacklist_id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  changed_by: string // ID usuario
  changed_by_username: string // Username para mostrar
  changed_fields?: Record<string, { old: unknown; new: unknown }> // Campos modificados
  timestamp: string // ISO string
  ip_address?: string // IP del usuario
}

// ========================================
// FORMULARIO (create/edit)
// ========================================

export interface BlacklistFormData {
  guest_name: string
  document_type: 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
  document_number: string
  check_in_date: Date | string // Acepta ambos para flexibilidad
  check_out_date: Date | string
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  images: File[] | string[] // Files al crear, API paths al editar
  comments: string
}

// ✅ NUEVOS: Tipos específicos derivados de Zod
// Estos coinciden exactamente con lo que devuelven los schemas

// FILTROS Y BÚSQUEDA
// ========================================

export interface BlacklistFilters {
  q?: string // Búsqueda general
  document?: string // Filtrar por documento
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status?: 'ACTIVE' | 'DELETED' | 'ALL'
  from_date?: string // Rango fecha inicio
  to_date?: string // Rango fecha fin
  page?: number
  limit?: number
}

// ========================================
// RESPUESTAS API
// ========================================

export interface BlacklistResponse {
  entries: BlacklistEntry[]
  pagination: {
    current_page: number
    total_pages: number
    total_entries: number
    per_page: number
    has_next: boolean
    has_prev: boolean
  }
  filters_applied: BlacklistFilters
}

export interface BlacklistDetailResponse {
  entry: BlacklistEntry
  audit_trail: AuditEntry[]
}

// ========================================
// IMAGEN UPLOAD
// ========================================

export interface ImageUploadResponse {
  url: string // URL de Cloudinary
  public_id: string // ID para eliminar
  secure_url: string
  width: number
  height: number
  format: string
}

// ========================================
// CONSTANTES
// ========================================

export const DOCUMENT_TYPES = {
  DNI: 'DNI',
  PASSPORT: 'Pasaporte',
  NIE: 'NIE',
  OTHER: 'Otro',
} as const

export const SEVERITY_LEVELS = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
} as const

export const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  DELETED: 'bg-surface-hover text-fg',
} as const
