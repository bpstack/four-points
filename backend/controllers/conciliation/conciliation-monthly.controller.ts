// controllers/conciliation/conciliation-monthly.controller.ts

// =========================================================
// CONTROLLER - RESUMEN MENSUAL DE CONCILIACIÓN
// =========================================================

import { Request, Response } from 'express'
import { conciliationMonthlyRepo } from '../../repositories/conciliation/conciliation-monthly.repository.js'
import { ERROR_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

/**
 * GET /api/conciliations/monthly-summary/:year/:month
 * Obtener resumen mensual completo con totales calculados
 */
export async function getMonthlySummary(req: Request, res: Response): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
      })
      return
    }

    if (year < 2000 || year > 2100) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_YEAR,
        code: ERROR_CODES.CONCILIATION_INVALID_YEAR,
      })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_MONTH,
      })
      return
    }

    // Calcular resumen
    const summary = await conciliationMonthlyRepo.calculateMonthlySummary(year, month)

    res.status(200).json({ success: true, data: summary })
  } catch (error) {
    logger.error({ err: error }, 'Error en getMonthlySummary')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_MONTHLY_FETCH_ERROR,
      code: ERROR_CODES.CONCILIATION_MONTHLY_FETCH_ERROR,
    })
  }
}

/**
 * GET /api/conciliations/monthly-summary/:year/:month/validation
 * Validar si el resumen mensual puede cerrarse
 */
export async function validateMonthlySummary(req: Request, res: Response): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
      })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_MONTH,
      })
      return
    }

    // Validar
    const validation = await conciliationMonthlyRepo.validateMonthlyClose(year, month)

    res.status(200).json({ success: true, data: validation })
  } catch (error) {
    logger.error({ err: error }, 'Error en validateMonthlySummary')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_MONTHLY_VALIDATE_ERROR,
      code: ERROR_CODES.CONCILIATION_MONTHLY_VALIDATE_ERROR,
    })
  }
}

/**
 * PATCH /api/conciliations/monthly-summary/:year/:month/status
 * Actualizar el estado del resumen mensual
 * Solo ADMIN puede cerrar (status = 'closed')
 */
export async function updateMonthlySummaryStatus(req: Request, res: Response): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)
    const { status } = req.body
    const userId = req.user?.id

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
      })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_MONTH,
      })
      return
    }

    if (!status || !['draft', 'confirmed', 'closed'].includes(status)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_STATUS,
        code: ERROR_CODES.CONCILIATION_INVALID_STATUS,
      })
      return
    }

    // // Solo admin puede cerrar
    // if (status === 'closed' && userRole !== 'admin') {
    //   res.status(403).json({
    //     error: 'Solo administradores pueden cerrar resúmenes mensuales',
    //   })
    //   return
    // }

    // Actualizar status (valida automáticamente si es 'closed')
    await conciliationMonthlyRepo.updateMonthlySummaryStatus(year, month, status, userId)

    res.status(200).json({
      success: true,
      year,
      month,
      status,
    })
  } catch (error: any) {
    // Error de validación al intentar cerrar
    if (error.message?.includes('No se puede cerrar')) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
        code: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
      })
      return
    }

    logger.error({ err: error }, 'Error en updateMonthlySummaryStatus')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_MONTHLY_UPDATE_STATUS_ERROR,
      code: ERROR_CODES.CONCILIATION_MONTHLY_UPDATE_STATUS_ERROR,
    })
  }
}

/**
 * GET /api/conciliations/monthly-summary/:year/:month/missing-days
 * Obtener lista de días faltantes en el mes
 */
export async function getMissingDays(req: Request, res: Response): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_YEAR_MONTH,
      })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_MONTH,
        code: ERROR_CODES.CONCILIATION_INVALID_MONTH,
      })
      return
    }

    // Obtener días faltantes
    const missingDays = await conciliationMonthlyRepo.getMissingDaysInMonth(year, month)

    res.status(200).json({
      success: true,
      data: {
        year,
        month,
        missing_days: missingDays,
        count: missingDays.length,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Error en getMissingDays')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_MONTHLY_MISSING_DAYS_ERROR,
      code: ERROR_CODES.CONCILIATION_MONTHLY_MISSING_DAYS_ERROR,
    })
  }
}
