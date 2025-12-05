// app/api/conciliation/route.ts

// =========================================================
// TYPES BASE (del backend)
// =========================================================

export type ReceptionReason = 'base_rooms' | 'gratuity' | 'no_show' | 'room_change' | 'other'

export type HousekeepingReason =
  | 'cleaned'
  | 'do_not_disturb'
  | 'ooo_cleaned'
  | 'pending_cleaned'
  | 'pending_to_clean'
  | 'room_clean'
  | 'other'

export type Direction = 'add' | 'subtract'
export type ConciliationStatus = 'draft' | 'confirmed' | 'closed'

// =========================================================
// INTERFACES BASE
// =========================================================

export interface ConciliationSummary {
  id?: number
  date: string
  total_reception: number
  total_housekeeping: number
  difference?: number
  notes?: string | null
  status: ConciliationStatus
  created_by?: string | null
  updated_by?: string | null
  department_id?: number | null
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ReceptionEntryWithReason {
  id?: number
  conciliation_id: number
  reason: ReceptionReason
  direction: Direction
  value: number
  room_number: string | null
  notes: string | null
}

export interface HousekeepingEntryWithReason {
  id?: number
  conciliation_id: number
  reason: HousekeepingReason
  direction: Direction
  value: number
  room_number: string | null
  notes: string | null
}

// =========================================================
// TYPES EXTENDIDOS PARA UI
// =========================================================

export interface ConciliationDetail extends ConciliationSummary {
  reception_entries?: ReceptionEntryWithReason[]
  housekeeping_entries?: HousekeepingEntryWithReason[]
}
export interface Props {
  conciliation: ConciliationDetail | null
  loading: boolean
  dayStatusMessage: string
  onUpdate: () => void
}

export interface EntryForm {
  value: number
  room_number: string
  notes: string
}

export interface Note {
  id: string
  text: string
  author: string
  timestamp: string
  author_id: string
}

// =========================================================
// RESUMEN MENSUAL
// =========================================================

export interface MonthlySummary {
  metadata: {
    year: number
    month: number
    status: 'draft' | 'confirmed' | 'closed'
  }
  period: {
    start: string
    end: string
    total_days: number
    conciliations_count: number
    missing_days: number
  }
  reception_summary: Array<{
    reason: string
    label: string
    total: number
  }>
  housekeeping_summary: Array<{
    reason: string
    label: string
    total: number
  }>
  totals: {
    total_reception: number
    total_housekeeping: number
    difference: number
  }
  can_close: boolean
  validation_errors: string[]
}

// =========================================================
// DTOs PARA FORMULARIO
// =========================================================

export interface FormData {
  reception: Array<{
    reason: ReceptionReason
    value: number
    room_number: string
    notes: string
  }>
  housekeeping: Array<{
    reason: HousekeepingReason
    value: number
    room_number: string
    notes: string
  }>
  notes?: string
}

// =========================================================
// CONFIGURACIONES
// =========================================================

interface ReasonConfig {
  label: string
  direction: Direction
  order: number
}

export const RECEPTION_CONFIG: Record<ReceptionReason, ReasonConfig> = {
  base_rooms: {
    label: 'Número de hab. Facturadas',
    direction: 'add',
    order: 1,
  },
  gratuity: {
    label: 'Gratuitas',
    direction: 'add',
    order: 2,
  },
  no_show: {
    label: 'NO SHOW',
    direction: 'subtract',
    order: 3,
  },
  room_change: {
    label: 'Hab sucia por cambio hab',
    direction: 'add',
    order: 4,
  },
  other: {
    label: 'Otros',
    direction: 'add',
    order: 5,
  },
}

export const HOUSEKEEPING_CONFIG: Record<HousekeepingReason, ReasonConfig> = {
  cleaned: {
    label: 'Total hab realmente limpiadas',
    direction: 'add',
    order: 1,
  },
  do_not_disturb: {
    label: 'No limpiadas por NO MOLESTEN',
    direction: 'add',
    order: 2,
  },
  ooo_cleaned: {
    label: 'Limpiadas que estaban OOO',
    direction: 'subtract',
    order: 3,
  },
  pending_cleaned: {
    label: 'Limpiadas que estaban LS día anterior',
    direction: 'subtract',
    order: 4,
  },
  pending_to_clean: {
    label: 'Hab. LS que se dejan pendientes',
    direction: 'add',
    order: 5,
  },
  room_clean: {
    label: 'Habitación encontrada limpia',
    direction: 'add',
    order: 6,
  },
  other: {
    label: 'Otros',
    direction: 'add',
    order: 7,
  },
}

export const RECEPTION_REASONS_ORDERED: ReceptionReason[] = (
  Object.entries(RECEPTION_CONFIG) as [ReceptionReason, ReasonConfig][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

export const HOUSEKEEPING_REASONS_ORDERED: HousekeepingReason[] = (
  Object.entries(HOUSEKEEPING_CONFIG) as [HousekeepingReason, ReasonConfig][]
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([key]) => key)

// =========================================================
// API CLIENT
// =========================================================

import { apiClient } from '@/app/lib/apiClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const conciliationApi = {
  /**
   * Listar todas las conciliaciones
   */
  async getAll(): Promise<ConciliationSummary[]> {
    return apiClient.get(`${API_URL}/api/conciliations`)
  },

  /**
   * Obtener conciliación por fecha específica (igual que logbooks)
   */
  async getByDay(date: string): Promise<ConciliationDetail | null> {
    const result = await apiClient.get(`${API_URL}/api/conciliations/day/${date}`)
    return result
  },

  /**
   * Obtener una conciliación con sus entries
   */
  async getById(id: number): Promise<ConciliationDetail> {
    return apiClient.get(`${API_URL}/api/conciliations/${id}`)
  },

  /**
   * Crear nueva conciliación
   */
  async create(data: { date: string; notes?: string }): Promise<ConciliationDetail> {
    return apiClient.post(`${API_URL}/api/conciliations`, data)
  },

  /**
   * Actualizar formulario completo (todas las entries)
   */
  async updateForm(id: number, formData: FormData): Promise<ConciliationDetail> {
    return apiClient.put(`${API_URL}/api/conciliations/${id}/form`, formData)
  },

  /**
   * Actualizar estado
   */
  async updateStatus(id: number, status: ConciliationStatus): Promise<ConciliationSummary> {
    return apiClient.patch(`${API_URL}/api/conciliations/${id}/status`, { status })
  },

  /**
   * Recalcular totales
   */
  async recalculate(id: number): Promise<ConciliationSummary> {
    return apiClient.post(`${API_URL}/api/conciliations/${id}/recalculate`)
  },

  /**
   * Eliminar conciliación (soft delete)
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`${API_URL}/api/conciliations/${id}`)
  },

  // =========================================================
  // RESUMEN MENSUAL
  // =========================================================

  /**
   * Obtener resumen mensual completo
   */
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    return apiClient.get(`${API_URL}/api/conciliations/monthly-summary/${year}/${month}`)
  },

  /**
   * Validar si el resumen mensual puede cerrarse
   */
  async validateMonthlySummary(
    year: number,
    month: number
  ): Promise<{ can_close: boolean; errors: string[] }> {
    return apiClient.get(`${API_URL}/api/conciliations/monthly-summary/${year}/${month}/validation`)
  },

  /**
   * Obtener lista de días faltantes en el mes
   */
  async getMissingDays(year: number, month: number): Promise<string[]> {
    return apiClient.get(
      `${API_URL}/api/conciliations/monthly-summary/${year}/${month}/missing-days`
    )
  },

  /**
   * Actualizar el estado del resumen mensual (solo admin)
   */
  async updateMonthlySummaryStatus(
    year: number,
    month: number,
    status: 'draft' | 'confirmed' | 'closed'
  ): Promise<{ success: boolean }> {
    return apiClient.patch(`${API_URL}/api/conciliations/monthly-summary/${year}/${month}/status`, {
      status,
    })
  },
}
