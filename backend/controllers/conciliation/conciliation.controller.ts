// controllers/conciliation/conciliation.controller.ts

// =========================================================
// CONTROLLER - SISTEMA DE CONCILIACIÓN (Form-based)
// =========================================================

import { Request, Response } from 'express'
import { conciliationRepo } from '../../repositories/conciliation/conciliation.repository.js'
import { IUpdateFormRequest } from '../../models/conciliation.model.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

/**
 * GET /api/conciliations
 * Listar todas las conciliaciones
 */
export async function getAll(_req: Request, res: Response): Promise<void> {
  try {
    const conciliations = await conciliationRepo.getAll()
    res.status(200).json({ success: true, data: conciliations })
  } catch (error) {
    logger.error({ err: error }, 'Error en getAll conciliations')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_FETCH_ERROR,
      code: ERROR_CODES.CONCILIATION_FETCH_ERROR,
    })
  }
}

/**
 * GET /api/conciliations/:id
 * Obtener una conciliación por ID con TODAS sus entries
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        code: ERROR_CODES.INVALID_ID,
      })
      return
    }

    const conciliation = await conciliationRepo.getById(id)
    res.status(200).json({ success: true, data: conciliation })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_NOT_FOUND,
        code: ERROR_CODES.CONCILIATION_NOT_FOUND,
      })
      return
    }
    logger.error({ err: error }, 'Error en getById conciliation')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_FETCH_ONE_ERROR,
      code: ERROR_CODES.CONCILIATION_FETCH_ONE_ERROR,
    })
  }
}

/**
 * GET /api/conciliations/day/:date
 * Obtener conciliación por fecha (igual que logbooks)
 */
export async function getByDay(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.params

    if (!date) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_DATE_REQUIRED,
        code: ERROR_CODES.CONCILIATION_DATE_REQUIRED,
      })
      return
    }

    // Obtener por fecha
    const summary = await conciliationRepo.getByDate(date)

    if (!summary || !summary.id) {
      // ✅ NO es un error, simplemente no existe todavía
      res.status(200).json({ success: true, data: null })
      return
    }

    // Obtener detalles completos con entries
    const conciliation = await conciliationRepo.getById(summary.id)
    res.status(200).json({ success: true, data: conciliation })
  } catch (error) {
    logger.error({ err: error }, 'Error en getByDay conciliation')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_FETCH_ONE_ERROR,
      code: ERROR_CODES.CONCILIATION_FETCH_ONE_ERROR,
    })
  }
}

/**
 * POST /api/conciliations
 * Crear nueva conciliación + inicializar TODAS las entries en 0
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { date, notes, department_id } = req.body
    const userId = req.user?.id

    if (!date) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_DATE_REQUIRED,
        code: ERROR_CODES.CONCILIATION_DATE_REQUIRED,
      })
      return
    }

    // Verificar si ya existe una conciliación para esa fecha
    const existing = await conciliationRepo.getByDate(date)
    if (existing) {
      res.status(409).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_ALREADY_EXISTS,
        code: ERROR_CODES.CONCILIATION_ALREADY_EXISTS,
        data: existing,
      })
      return
    }

    // Crear conciliación + inicializar todas las entries
    const conciliation = await conciliationRepo.createWithAllEntries({
      date,
      notes: notes || null,
      department_id: department_id || null,
      created_by: userId || null,
    })

    res.status(201).json({
      success: true,
      message: SUCCESS_CODES.CONCILIATION_CREATED,
      code: SUCCESS_CODES.CONCILIATION_CREATED,
      data: conciliation,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error en create conciliation')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_CREATE_ERROR,
      code: ERROR_CODES.CONCILIATION_CREATE_ERROR,
    })
  }
}

/**
 * PUT /api/conciliations/:id/form
 * Actualizar el formulario completo (TODAS las entries)
 */
export async function updateForm(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const formData: IUpdateFormRequest = req.body
    const userId = req.user?.id

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        code: ERROR_CODES.INVALID_ID,
      })
      return
    }

    // Validar que vengan los datos requeridos
    if (!formData.reception || !formData.housekeeping) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INCOMPLETE_DATA,
        code: ERROR_CODES.CONCILIATION_INCOMPLETE_DATA,
      })
      return
    }

    // Validar que vengan todas las entries (5 reception + 7 housekeeping)
    if (formData.reception.length !== 5) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_RECEPTION_ENTRIES,
        code: ERROR_CODES.CONCILIATION_INVALID_RECEPTION_ENTRIES,
      })
      return
    }

    if (formData.housekeeping.length !== 7) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_INVALID_HOUSEKEEPING_ENTRIES,
        code: ERROR_CODES.CONCILIATION_INVALID_HOUSEKEEPING_ENTRIES,
      })
      return
    }

    // Verificar que la conciliación no esté cerrada
    const conciliation = await conciliationRepo.getById(id)
    if (conciliation.status === 'closed') {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
        code: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
      })
      return
    }

    // Actualizar el formulario
    await conciliationRepo.updateForm(id, formData, userId)

    // Obtener la conciliación actualizada con totales
    const updated = await conciliationRepo.getById(id)

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.CONCILIATION_FORM_UPDATED,
      code: SUCCESS_CODES.CONCILIATION_FORM_UPDATED,
      data: {
        total_reception: updated.total_reception,
        total_housekeeping: updated.total_housekeeping,
        difference: updated.difference,
      },
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_NOT_FOUND,
        code: ERROR_CODES.CONCILIATION_NOT_FOUND,
      })
      return
    }
    logger.error({ err: error }, 'Error en updateForm')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_UPDATE_FORM_ERROR,
      code: ERROR_CODES.CONCILIATION_UPDATE_FORM_ERROR,
    })
  }
}

/**
 * PATCH /api/conciliations/:id/status
 * Cambiar el estado de una conciliación (draft/confirmed/closed)
 */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const { status } = req.body
    const userId = req.user?.id
    const userRole = req.user?.role?.toLowerCase()

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        code: ERROR_CODES.INVALID_ID,
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

    const conciliation = await conciliationRepo.getById(id)

    // Solo admin puede marcar como 'closed'
    if (status === 'closed' && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_ADMIN_ONLY_CLOSE,
        code: ERROR_CODES.CONCILIATION_ADMIN_ONLY_CLOSE,
      })
      return
    }

    // No se puede modificar una conciliación cerrada (excepto admin)
    if (conciliation.status === 'closed' && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
        code: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
      })
      return
    }

    await conciliationRepo.updateStatus(id, status, userId)

    res.status(200).json({
      success: true,
      status,
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_NOT_FOUND,
        code: ERROR_CODES.CONCILIATION_NOT_FOUND,
      })
      return
    }
    logger.error({ err: error }, 'Error en updateStatus')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_UPDATE_STATUS_ERROR,
      code: ERROR_CODES.CONCILIATION_UPDATE_STATUS_ERROR,
    })
  }
}

/**
 * POST /api/conciliations/:id/recalculate
 * Recalcular totales de una conciliación
 */
export async function recalculateTotals(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        code: ERROR_CODES.INVALID_ID,
      })
      return
    }

    // Verificar que la conciliación no esté cerrada
    const conciliation = await conciliationRepo.getById(id)
    if (conciliation.status === 'closed') {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
        code: ERROR_CODES.CONCILIATION_CLOSED_CANNOT_MODIFY,
      })
      return
    }

    await conciliationRepo.recalculateTotals(id)

    // Obtener los totales actualizados
    const updated = await conciliationRepo.getById(id)

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.CONCILIATION_TOTALS_RECALCULATED,
      code: SUCCESS_CODES.CONCILIATION_TOTALS_RECALCULATED,
      data: {
        total_reception: updated.total_reception,
        total_housekeeping: updated.total_housekeeping,
        difference: updated.difference,
      },
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_NOT_FOUND,
        code: ERROR_CODES.CONCILIATION_NOT_FOUND,
      })
      return
    }
    logger.error({ err: error }, 'Error en recalculateTotals')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_RECALCULATE_ERROR,
      code: ERROR_CODES.CONCILIATION_RECALCULATE_ERROR,
    })
  }
}

/**
 * DELETE /api/conciliations/:id
 * Eliminar (soft delete) una conciliación
 * Solo administradores
 */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        code: ERROR_CODES.INVALID_ID,
      })
      return
    }

    // Verificar que existe
    await conciliationRepo.getById(id)

    await conciliationRepo.delete(id)

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.CONCILIATION_DELETED,
      code: SUCCESS_CODES.CONCILIATION_DELETED,
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.CONCILIATION_NOT_FOUND,
        code: ERROR_CODES.CONCILIATION_NOT_FOUND,
      })
      return
    }
    logger.error({ err: error }, 'Error en delete conciliation')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.CONCILIATION_DELETE_ERROR,
      code: ERROR_CODES.CONCILIATION_DELETE_ERROR,
    })
  }
}
