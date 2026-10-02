// models/conciliation.model.ts

// =========================================================
// ENUMS - Reasons disponibles
// =========================================================

/**
 * Reasons para entradas de RECEPCIÓN
 * Para añadir nuevos: agregar aquí + actualizar BD + config
 */
export type ReceptionReason = 'base_rooms' | 'no_show' | 'room_change' | 'gratuity' | 'other'

/**
 * Reasons para entradas de PISOS (Housekeeping)
 * Para añadir nuevos: agregar aquí + actualizar BD + config
 */
export type HousekeepingReason =
  | 'cleaned'
  | 'do_not_disturb'
  | 'ooo_cleaned'
  | 'pending_cleaned'
  | 'pending_to_clean'
  | 'room_clean'
  | 'other'

/**
 * Dirección del cálculo (sumar o restar)
 */
export type Direction = 'add' | 'subtract'

/**
 * Estados de una conciliación
 */
export type ConciliationStatus = 'draft' | 'confirmed' | 'closed'

// =========================================================
// INTERFACES - Entidades base de BD
// =========================================================

/**
 * Resumen principal de una conciliación
 */
export interface IConciliationSummary {
  id?: number
  date: string
  total_reception: number
  total_housekeeping: number
  difference?: number // Calculado automáticamente por BD
  notes?: string | null
  status: ConciliationStatus

  created_by?: string | null
  updated_by?: string | null
  department_id?: number | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

/**
 * Entry individual de RECEPCIÓN
 */
export interface IReceptionEntry {
  id?: number
  conciliation_id: number
  reason: ReceptionReason
  direction: Direction
  value: number
  room_number: string | null
  notes: string | null

  created_by?: string | null
  updated_by?: string | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

/**
 * Entry individual de PISOS (Housekeeping)
 */
export interface IHousekeepingEntry {
  id?: number
  conciliation_id: number
  reason: HousekeepingReason
  direction: Direction
  value: number
  room_number: string | null
  notes: string | null

  created_by?: string | null
  updated_by?: string | null

  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

/**
 * Conciliación completa con todas sus entries
 */
export interface IConciliationDetail extends IConciliationSummary {
  reception_entries: IReceptionEntry[]
  housekeeping_entries: IHousekeepingEntry[]
}

// =========================================================
// INTERFACES - DTOs para operaciones
// =========================================================

/**
 * DTO para actualizar el formulario completo
 * Contiene TODAS las entries (incluso las de valor 0)
 */
export interface IUpdateFormRequest {
  reception: Array<{
    reason: ReceptionReason
    value: number
    room_number?: string
    notes?: string
  }>
  housekeeping: Array<{
    reason: HousekeepingReason
    value: number
    room_number?: string
    notes?: string
  }>
  notes?: string // Notas generales de la conciliación
}
