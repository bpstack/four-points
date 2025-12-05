// repositories/conciliation/conciliation-monthly.repository.ts

// =========================================================
// REPOSITORY - RESUMEN MENSUAL DE CONCILIACIÓN (VERSIÓN CORREGIDA)
// =========================================================

import pool from '../../config/db.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import {
  IMonthlySummaryMeta,
  IMonthlySummaryResponse,
  IReasonSummary,
  IMonthlyCloseValidation,
} from '../../models/conciliation-monthly.model.js'
import {
  RECEPTION_REASONS_ORDERED,
  HOUSEKEEPING_REASONS_ORDERED,
  RECEPTION_CONFIG,
  HOUSEKEEPING_CONFIG,
} from '../../models/conciliation.config.js'

// =========================================================
// HELPER FUNCTIONS
// =========================================================

/**
 * Convierte seguro cualquier valor a número
 * Maneja null, undefined, strings vacíos, etc.
 */
const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  const num = Number(value)
  return isNaN(num) ? 0 : num
}

/**
 * Obtiene el número de días en un mes específico
 */
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate()
}

export class ConciliationMonthlyRepository {
  // =========================================================
  // METADATA - Obtener o crear registro del mes
  // =========================================================

  /**
   * Obtener metadata del resumen mensual
   * Si no existe, lo crea automáticamente en status 'draft'
   */
  async getOrCreateMonthlySummaryMeta(
    year: number,
    month: number
  ): Promise<IMonthlySummaryMeta> {
    // Intentar obtener
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM conciliation_monthly_summary 
      WHERE year = ? AND month = ?`,
      [year, month]
    )

    if (rows.length > 0) {
      return rows[0] as IMonthlySummaryMeta
    }

    // Si no existe, crear
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO conciliation_monthly_summary (year, month, status) 
      VALUES (?, ?, 'draft')`,
      [year, month]
    )

    // Retornar el recién creado
    const [newRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM conciliation_monthly_summary WHERE id = ?`,
      [result.insertId]
    )

    return newRows[0] as IMonthlySummaryMeta
  }

  // =========================================================
  // CÁLCULO - Totales dinámicos del mes (VERSIÓN CORREGIDA)
  // =========================================================

  /**
   * Calcular totales del mes completo
   * Suma todas las conciliaciones del mes (todos los status)
   */
  async calculateMonthlySummary(
    year: number,
    month: number
  ): Promise<IMonthlySummaryResponse> {
    // 1. Obtener metadata del mes
    const metadata = await this.getOrCreateMonthlySummaryMeta(year, month)

    // 2. Calcular fechas del período
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Último día del mes
    const totalDays = endDate.getDate()

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // 3. Contar conciliaciones del mes
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
      FROM conciliation_summary 
      WHERE YEAR(date) = ? AND MONTH(date) = ? 
        AND deleted_at IS NULL`,
      [year, month]
    )
    const conciliationsCount = safeNumber(countRows[0]?.count)

    // 4. Calcular totales de RECEPTION por reason (VERSIÓN CORREGIDA)
    const receptionSummary: IReasonSummary[] = []

    for (const reason of RECEPTION_REASONS_ORDERED) {
      const config = RECEPTION_CONFIG[reason]

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(
          CASE 
            WHEN direction = 'add' THEN value 
            ELSE -value 
          END
        ), 0) as total
        FROM conciliation_reception cr
        INNER JOIN conciliation_summary cs ON cr.conciliation_id = cs.id
        WHERE YEAR(cs.date) = ? 
          AND MONTH(cs.date) = ? 
          AND cr.reason = ?
          AND cr.deleted_at IS NULL
          AND cs.deleted_at IS NULL`,
        [year, month, reason]
      )

      const totalValue = safeNumber(rows[0]?.total)

      receptionSummary.push({
        reason,
        label: config.label,
        total: totalValue,
      })
    }

    // 5. Calcular totales de HOUSEKEEPING por reason (VERSIÓN CORREGIDA)
    const housekeepingSummary: IReasonSummary[] = []

    for (const reason of HOUSEKEEPING_REASONS_ORDERED) {
      const config = HOUSEKEEPING_CONFIG[reason]

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(
          CASE 
            WHEN direction = 'add' THEN value 
            ELSE -value 
          END
        ), 0) as total
        FROM conciliation_housekeeping ch
        INNER JOIN conciliation_summary cs ON ch.conciliation_id = cs.id
        WHERE YEAR(cs.date) = ? 
          AND MONTH(cs.date) = ? 
          AND ch.reason = ?
          AND ch.deleted_at IS NULL
          AND cs.deleted_at IS NULL`,
        [year, month, reason]
      )

      const totalValue = safeNumber(rows[0]?.total)

      housekeepingSummary.push({
        reason,
        label: config.label,
        total: totalValue,
      })
    }

    // 6. Calcular totales globales (VERSIÓN CORREGIDA)
    const totalReception = receptionSummary.reduce(
      (sum, item) => sum + item.total,
      0
    )
    const totalHousekeeping = housekeepingSummary.reduce(
      (sum, item) => sum + item.total,
      0
    )
    const difference = totalReception - totalHousekeeping

    // 7. Validar si se puede cerrar
    const validation = await this.validateMonthlyClose(year, month)

    // 8. Construir respuesta (VERSIÓN CORREGIDA)
    return {
      metadata,
      period: {
        start: startDateStr,
        end: endDateStr,
        total_days: totalDays,
        conciliations_count: conciliationsCount,
        missing_days: totalDays - conciliationsCount,
      },
      reception_summary: receptionSummary,
      housekeeping_summary: housekeepingSummary,
      totals: {
        total_reception: totalReception,
        total_housekeeping: totalHousekeeping,
        difference: difference,
      },
      can_close: validation.can_close,
      validation_errors: validation.errors,
    }
  }

  // =========================================================
  // VALIDACIÓN - Verificar si se puede cerrar el mes
  // =========================================================

  /**
   * Validar si el resumen mensual puede cerrarse
   * Requisitos:
   * 1. TODAS las conciliaciones del mes deben estar 'closed'
   * 2. NO deben faltar días (deben existir todos los días del mes)
   */
  async validateMonthlyClose(
    year: number,
    month: number
  ): Promise<IMonthlyCloseValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. Calcular total de días del mes
    const lastDay = getDaysInMonth(year, month)

    // 2. Obtener todas las conciliaciones del mes
    const [conciliations] = await pool.query<RowDataPacket[]>(
      `SELECT date, status 
      FROM conciliation_summary 
      WHERE YEAR(date) = ? AND MONTH(date) = ? 
        AND deleted_at IS NULL
      ORDER BY date ASC`,
      [year, month]
    )

    const conciliationsCount = conciliations.length

    // 3. Verificar que existan TODOS los días
    if (conciliationsCount < lastDay) {
      const missingDays = lastDay - conciliationsCount
      errors.push(
        `Faltan ${missingDays} día(s) sin conciliación. Deben existir conciliaciones para los ${lastDay} días del mes.`
      )
    }

    // 4. Verificar que TODAS estén cerradas
    const closedCount = conciliations.filter(
      (c) => c.status === 'closed'
    ).length
    const unclosedCount = conciliationsCount - closedCount

    if (unclosedCount > 0) {
      errors.push(
        `Hay ${unclosedCount} conciliación(es) sin cerrar. Todas las conciliaciones deben estar en estado "closed".`
      )
    }

    // 5. Verificar fechas consecutivas (opcional, pero recomendado)
    const existingDays = conciliations.map((c) => new Date(c.date).getDate())
    const missingDaysList: number[] = []

    for (let day = 1; day <= lastDay; day++) {
      if (!existingDays.includes(day)) {
        missingDaysList.push(day)
      }
    }

    if (missingDaysList.length > 0) {
      warnings.push(`Días sin conciliación: ${missingDaysList.join(', ')}`)
    }

    return {
      can_close: errors.length === 0,
      errors,
      warnings,
      stats: {
        total_days_in_month: lastDay,
        conciliations_count: conciliationsCount,
        closed_conciliations: closedCount,
        missing_days: lastDay - conciliationsCount,
        unclosed_conciliations: unclosedCount,
      },
    }
  }

  // =========================================================
  // UPDATE - Actualizar status del resumen mensual
  // =========================================================

  /**
   * Actualizar el status del resumen mensual
   * Si se intenta cerrar, valida antes
   */
  async updateMonthlySummaryStatus(
    year: number,
    month: number,
    status: 'draft' | 'confirmed' | 'closed',
    userId?: string
  ): Promise<void> {
    // Si se intenta cerrar, validar primero
    if (status === 'closed') {
      const validation = await this.validateMonthlyClose(year, month)
      if (!validation.can_close) {
        throw new Error(
          `No se puede cerrar el resumen mensual: ${validation.errors.join(
            ', '
          )}`
        )
      }
    }

    // Obtener o crear metadata
    const metadata = await this.getOrCreateMonthlySummaryMeta(year, month)

    // Actualizar status
    if (status === 'closed') {
      await pool.query(
        `UPDATE conciliation_monthly_summary 
        SET status = ?, closed_by = ?, closed_at = NOW() 
        WHERE id = ?`,
        [status, userId || null, metadata.id]
      )
    } else {
      await pool.query(
        `UPDATE conciliation_monthly_summary 
        SET status = ?, closed_by = NULL, closed_at = NULL 
        WHERE id = ?`,
        [status, metadata.id]
      )
    }
  }

  // =========================================================
  // HELPERS - Días faltantes
  // =========================================================

  /**
   * Obtener lista de días que faltan en el mes
   */
  async getMissingDaysInMonth(year: number, month: number): Promise<number[]> {
    const lastDay = getDaysInMonth(year, month)

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT DAY(date) as day 
      FROM conciliation_summary 
      WHERE YEAR(date) = ? AND MONTH(date) = ? 
        AND deleted_at IS NULL`,
      [year, month]
    )

    const existingDays = rows.map((r) => safeNumber(r.day))
    const missingDays: number[] = []

    for (let day = 1; day <= lastDay; day++) {
      if (!existingDays.includes(day)) {
        missingDays.push(day)
      }
    }

    return missingDays
  }

  // =========================================================
  // MÉTODOS ADICIONALES PARA DEBUG
  // =========================================================

  /**
   * Método para debug: obtener datos crudos del mes
   */
  async getRawMonthlyData(year: number, month: number): Promise<any> {
    // Recepción cruda
    const [receptionRaw] = await pool.query<RowDataPacket[]>(
      `SELECT cs.date, cr.reason, cr.direction, cr.value
      FROM conciliation_reception cr
      INNER JOIN conciliation_summary cs ON cr.conciliation_id = cs.id
      WHERE YEAR(cs.date) = ? AND MONTH(cs.date) = ?
        AND cr.deleted_at IS NULL AND cs.deleted_at IS NULL
      ORDER BY cs.date, cr.reason`,
      [year, month]
    )

    // Housekeeping crudo
    const [housekeepingRaw] = await pool.query<RowDataPacket[]>(
      `SELECT cs.date, ch.reason, ch.direction, ch.value
      FROM conciliation_housekeeping ch
      INNER JOIN conciliation_summary cs ON ch.conciliation_id = cs.id
      WHERE YEAR(cs.date) = ? AND MONTH(cs.date) = ?
        AND ch.deleted_at IS NULL AND cs.deleted_at IS NULL
      ORDER BY cs.date, ch.reason`,
      [year, month]
    )

    return {
      reception: receptionRaw,
      housekeeping: housekeepingRaw,
    }
  }
}

// =========================================================
// EXPORTAR INSTANCIA ÚNICA
// =========================================================
export const conciliationMonthlyRepo = new ConciliationMonthlyRepository()
