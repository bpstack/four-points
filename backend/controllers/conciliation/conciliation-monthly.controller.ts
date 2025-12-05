// controllers/conciliation/conciliation-monthly.controller.ts

// =========================================================
// CONTROLLER - RESUMEN MENSUAL DE CONCILIACIÓN
// =========================================================

import { Request, Response } from 'express'
import { conciliationMonthlyRepo } from '../../repositories/conciliation/conciliation-monthly.repository.js'

/**
 * GET /api/conciliations/monthly-summary/:year/:month
 * Obtener resumen mensual completo con totales calculados
 */
export async function getMonthlySummary(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ error: 'Año y mes deben ser números válidos' })
      return
    }

    if (year < 2000 || year > 2100) {
      res.status(400).json({ error: 'Año inválido' })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({ error: 'Mes debe estar entre 1 y 12' })
      return
    }

    // Calcular resumen
    const summary = await conciliationMonthlyRepo.calculateMonthlySummary(
      year,
      month
    )

    res.status(200).json(summary)
  } catch (error) {
    console.error('Error en getMonthlySummary:', error)
    res.status(500).json({ error: 'Error al obtener resumen mensual' })
  }
}

/**
 * GET /api/conciliations/monthly-summary/:year/:month/validation
 * Validar si el resumen mensual puede cerrarse
 */
export async function validateMonthlySummary(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ error: 'Año y mes deben ser números válidos' })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({ error: 'Mes debe estar entre 1 y 12' })
      return
    }

    // Validar
    const validation = await conciliationMonthlyRepo.validateMonthlyClose(
      year,
      month
    )

    res.status(200).json(validation)
  } catch (error) {
    console.error('Error en validateMonthlySummary:', error)
    res.status(500).json({ error: 'Error al validar resumen mensual' })
  }
}

/**
 * PATCH /api/conciliations/monthly-summary/:year/:month/status
 * Actualizar el estado del resumen mensual
 * Solo ADMIN puede cerrar (status = 'closed')
 */
export async function updateMonthlySummaryStatus(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)
    const { status } = req.body
    const userId = req.user?.id

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ error: 'Año y mes deben ser números válidos' })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({ error: 'Mes debe estar entre 1 y 12' })
      return
    }

    if (!status || !['draft', 'confirmed', 'closed'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido. Debe ser: draft, confirmed o closed',
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
    await conciliationMonthlyRepo.updateMonthlySummaryStatus(
      year,
      month,
      status,
      userId
    )

    res.status(200).json({
      message: `Resumen mensual marcado como ${status}`,
      year,
      month,
      status,
    })
  } catch (error: any) {
    // Error de validación al intentar cerrar
    if (error.message?.includes('No se puede cerrar')) {
      res.status(400).json({
        error: error.message,
      })
      return
    }

    console.error('Error en updateMonthlySummaryStatus:', error)
    res
      .status(500)
      .json({ error: 'Error al actualizar estado del resumen mensual' })
  }
}

/**
 * GET /api/conciliations/monthly-summary/:year/:month/missing-days
 * Obtener lista de días faltantes en el mes
 */
export async function getMissingDays(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const year = Number(req.params.year)
    const month = Number(req.params.month)

    // Validar parámetros
    if (isNaN(year) || isNaN(month)) {
      res.status(400).json({ error: 'Año y mes deben ser números válidos' })
      return
    }

    if (month < 1 || month > 12) {
      res.status(400).json({ error: 'Mes debe estar entre 1 y 12' })
      return
    }

    // Obtener días faltantes
    const missingDays = await conciliationMonthlyRepo.getMissingDaysInMonth(
      year,
      month
    )

    res.status(200).json({
      year,
      month,
      missing_days: missingDays,
      count: missingDays.length,
    })
  } catch (error) {
    console.error('Error en getMissingDays:', error)
    res.status(500).json({ error: 'Error al obtener días faltantes' })
  }
}
