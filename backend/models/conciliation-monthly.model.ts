// models/conciliation-monthly.model.ts

// =========================================================
// MODELS - RESUMEN MENSUAL DE CONCILIACIÓN
// =========================================================

/**
 * Metadata del resumen mensual (tabla conciliation_monthly_summary)
 */
export interface IMonthlySummaryMeta {
  id?: number
  year: number
  month: number // 1-12
  status: 'draft' | 'confirmed' | 'closed'
  closed_by?: string | null
  closed_at?: Date | null
  created_at?: Date
  updated_at?: Date
}

/**
 * Resumen por reason (calculado dinámicamente)
 */
export interface IReasonSummary {
  reason: string
  label: string
  total: number // Ya considera direction (suma algebraica)
}

/**
 * Totales globales del mes
 */
export interface IMonthlySummaryTotals {
  total_reception: number
  total_housekeeping: number
  difference: number // reception - housekeeping
}

/**
 * Respuesta completa del endpoint GET /monthly-summary/:year/:month
 */
export interface IMonthlySummaryResponse {
  metadata: IMonthlySummaryMeta
  period: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
    total_days: number
    conciliations_count: number
    missing_days: number // Días sin conciliación
  }
  reception_summary: IReasonSummary[]
  housekeeping_summary: IReasonSummary[]
  totals: IMonthlySummaryTotals
  can_close: boolean // true si todas las conciliaciones están closed y no faltan días
  validation_errors: string[] // Mensajes de error si no se puede cerrar
}

/**
 * Request para actualizar status del resumen mensual
 */
export interface IUpdateMonthlySummaryStatusRequest {
  status: 'draft' | 'confirmed' | 'closed'
}

/**
 * Validación de cierre mensual
 */
export interface IMonthlyCloseValidation {
  can_close: boolean
  errors: string[]
  warnings: string[]
  stats: {
    total_days_in_month: number
    conciliations_count: number
    closed_conciliations: number
    missing_days: number
    unclosed_conciliations: number
  }
}
