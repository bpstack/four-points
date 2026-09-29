// backend/models/maintenance/index.ts
/**
 * Tipos e interfaces para el módulo de Maintenance
 * Basado en la estructura del frontend y el esquema SQL
 */

// ========================================
// ENUMS / TIPOS LITERALES
// ========================================

export type LocationType = 'room' | 'common_area' | 'exterior' | 'facilities' | 'other'

export type ReportStatus =
  'reported' | 'assigned' | 'in_progress' | 'waiting' | 'completed' | 'closed' | 'canceled'

export type ReportPriority = 'low' | 'medium' | 'high' | 'urgent'

export type AssignedType = 'internal' | 'external'

export type HistoryAction =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'updated'
  | 'assigned'
  | 'resolved'
  | 'closed'
  | 'deleted'
  | 'restored'

// ========================================
// INTERFACES PRINCIPALES
// ========================================

/**
 * Reporte de mantenimiento (tabla maintenance_reports)
 */
export interface MaintenanceReport {
  id: string // UUID
  report_date: string // ISO datetime
  title: string
  description: string

  // Ubicación
  location_type: LocationType
  location_description: string
  room_number: string | null
  room_out_of_service: boolean

  // Estado y prioridad
  priority: ReportPriority
  status: ReportStatus

  // Asignación
  assigned_to: string | null // UUID del usuario
  assigned_type: AssignedType | null
  external_company_name: string | null
  external_contact: string | null

  // Timestamps de flujo
  started_at: string | null
  resolved_at: string | null
  closed_at: string | null
  resolution_notes: string | null

  // Soft delete
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null

  // Auditoría
  created_by: string // UUID
  created_at: string
  updated_by: string | null
  updated_at: string
}

/**
 * Imagen asociada a un reporte (tabla maintenance_images)
 */
export interface MaintenanceImage {
  id: number
  report_id: string
  file_name: string
  file_path: string // URL de Cloudinary
  file_size: number // bytes
  mime_type: string
  public_id: string | null // Cloudinary public_id
  auto_delete_on_close: boolean
  uploaded_by: string // UUID
  uploaded_at: string
}

/**
 * Entrada de historial (tabla maintenance_history)
 */
export interface MaintenanceHistory {
  id: number
  report_id: string
  action: HistoryAction
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  changed_by: string // UUID
  changed_at: string
  // Campos adicionales (JOINs)
  user_name?: string
}

// ========================================
// INTERFACES EXTENDIDAS
// ========================================

/**
 * Reporte con detalles completos (para vista de detalle)
 */
export interface ReportWithDetails extends MaintenanceReport {
  images: MaintenanceImage[]
  history: MaintenanceHistory[]
  // Nombres obtenidos por JOIN
  created_by_name?: string
  assigned_to_name?: string
  updated_by_name?: string
}

/**
 * Reporte para listado (con campos adicionales de JOIN)
 */
export interface ReportListItem extends MaintenanceReport {
  created_by_name?: string
  assigned_to_name?: string
  image_count?: number
}

// ========================================
// INTERFACES DE INPUT (para crear/actualizar)
// ========================================

/**
 * Datos para crear un reporte
 */
export interface CreateReportInput {
  title: string
  description: string
  location_type: LocationType
  location_description: string
  room_number?: string | null
  room_out_of_service?: boolean
  priority?: ReportPriority
  assigned_to?: string | null
  assigned_type?: AssignedType | null
  external_company_name?: string | null
  external_contact?: string | null
}

/**
 * Datos para actualizar un reporte (todos opcionales)
 */
export interface UpdateReportInput {
  title?: string
  description?: string
  location_type?: LocationType
  location_description?: string
  room_number?: string | null
  room_out_of_service?: boolean
  priority?: ReportPriority
  status?: ReportStatus
  assigned_to?: string | null
  assigned_type?: AssignedType | null
  external_company_name?: string | null
  external_contact?: string | null
  resolution_notes?: string | null
}

/**
 * Datos para cambiar estado
 */
export interface UpdateStatusInput {
  status: ReportStatus
  notes?: string
}

/**
 * Datos para cambiar prioridad
 */
export interface UpdatePriorityInput {
  priority: ReportPriority
}

/**
 * Datos para agregar imagen
 */
export interface AddImageInput {
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  public_id?: string
  auto_delete_on_close?: boolean
}

// ========================================
// INTERFACES DE FILTROS Y PAGINACIÓN
// ========================================

/**
 * Filtros para búsqueda de reportes
 */
export interface ReportFilters {
  status?: ReportStatus
  priority?: ReportPriority
  location_type?: LocationType
  assigned_to?: string
  created_by?: string
  room_number?: string
  search?: string // Búsqueda en title, description, location
  date?: string // YYYY-MM-DD (single day filter)
  date_from?: string // YYYY-MM-DD
  date_to?: string // YYYY-MM-DD
  include_deleted?: boolean
  page?: number
  limit?: number
}

/**
 * Información de paginación
 */
export interface Pagination {
  total: number
  page: number
  limit: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// ========================================
// INTERFACES DE RESPUESTA
// ========================================

/**
 * Respuesta de listado de reportes
 */
export interface ReportListResponse {
  reports: ReportListItem[]
  pagination: Pagination
  filters_applied: ReportFilters
}

/**
 * Respuesta de detalle de reporte
 */
export interface ReportDetailResponse {
  report: ReportWithDetails
}

/**
 * Respuesta de subida de imagen
 */
export interface ImageUploadResponse {
  id: number
  url: string
  secure_url: string
  public_id: string
  file_name: string
  file_size: number
  mime_type: string
}

// ========================================
// CONSTANTES
// ========================================

export const LOCATION_TYPES: LocationType[] = [
  'room',
  'common_area',
  'exterior',
  'facilities',
  'other',
]

export const REPORT_STATUSES: ReportStatus[] = [
  'reported',
  'assigned',
  'in_progress',
  'waiting',
  'completed',
  'closed',
  'canceled',
]

export const REPORT_PRIORITIES: ReportPriority[] = ['low', 'medium', 'high', 'urgent']

export const ASSIGNED_TYPES: AssignedType[] = ['internal', 'external']

export const HISTORY_ACTIONS: HistoryAction[] = [
  'created',
  'status_changed',
  'priority_changed',
  'updated',
  'assigned',
  'resolved',
  'closed',
  'deleted',
  'restored',
]

// Labels para UI
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  room: 'Habitación',
  common_area: 'Área común',
  exterior: 'Exterior',
  facilities: 'Instalaciones',
  other: 'Otro',
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  reported: 'Reportado',
  assigned: 'Asignado',
  in_progress: 'En progreso',
  waiting: 'En espera',
  completed: 'Completado',
  closed: 'Cerrado',
  canceled: 'Cancelado',
}

export const PRIORITY_LABELS: Record<ReportPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}
