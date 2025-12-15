// controllers/conciliation/conciliation.controller.ts

// =========================================================
// CONTROLLER - SISTEMA DE CONCILIACIÓN (Form-based)
// =========================================================

import { Request, Response } from 'express'
import { conciliationRepo } from '../../repositories/conciliation/conciliation.repository.js'
import { IUpdateFormRequest } from '../../models/conciliation.model.js'

/**
 * GET /api/conciliations
 * Listar todas las conciliaciones
 */
export async function getAll(_req: Request, res: Response): Promise<void> {
  try {
    const conciliations = await conciliationRepo.getAll()
    res.status(200).json(conciliations)
  } catch (error) {
    console.error('Error en getAll conciliations:', error)
    res.status(500).json({ error: 'Error al obtener conciliaciones' })
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
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const conciliation = await conciliationRepo.getById(id)
    res.status(200).json(conciliation)
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({ error: error.message })
      return
    }
    console.error('Error en getById conciliation:', error)
    res.status(500).json({ error: 'Error al obtener conciliación' })
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
      res.status(400).json({ error: 'Fecha requerida' })
      return
    }

    // Obtener por fecha
    const summary = await conciliationRepo.getByDate(date)

    if (!summary || !summary.id) {
      // ✅ NO es un error, simplemente no existe todavía
      res.status(200).json(null)
      return
    }

    // Obtener detalles completos con entries
    const conciliation = await conciliationRepo.getById(summary.id)
    res.status(200).json(conciliation)
  } catch (error) {
    console.error('Error en getByDay conciliation:', error)
    res.status(500).json({ error: 'Error al obtener conciliación' })
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
      res.status(400).json({ error: 'La fecha es obligatoria' })
      return
    }

    // Verificar si ya existe una conciliación para esa fecha
    const existing = await conciliationRepo.getByDate(date)
    if (existing) {
      res.status(409).json({
        error: 'Ya existe una conciliación para esta fecha',
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
      message: 'Conciliación creada exitosamente',
      id: conciliation.id,
      conciliation,
    })
  } catch (error) {
    console.error('Error en create conciliation:', error)
    res.status(500).json({ error: 'Error al crear conciliación' })
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
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    // Validar que vengan los datos requeridos
    if (!formData.reception || !formData.housekeeping) {
      res.status(400).json({
        error: 'Datos incompletos. Se requieren reception y housekeeping',
      })
      return
    }

    // Validar que vengan todas las entries (5 reception + 7 housekeeping)
    if (formData.reception.length !== 5) {
      res.status(400).json({
        error: 'Se requieren exactamente 5 entries de recepción',
      })
      return
    }

    if (formData.housekeeping.length !== 7) {
      res.status(400).json({
        error: 'Se requieren exactamente 7 entries de pisos',
      })
      return
    }

    // Verificar que la conciliación no esté cerrada
    const conciliation = await conciliationRepo.getById(id)
    if (conciliation.status === 'closed') {
      res.status(403).json({
        error: 'No se puede modificar una conciliación cerrada',
      })
      return
    }

    // Actualizar el formulario
    await conciliationRepo.updateForm(id, formData, userId)

    // Obtener la conciliación actualizada con totales
    const updated = await conciliationRepo.getById(id)

    res.status(200).json({
      message: 'Formulario actualizado exitosamente',
      totals: {
        total_reception: updated.total_reception,
        total_housekeeping: updated.total_housekeeping,
        difference: updated.difference,
      },
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({ error: error.message })
      return
    }
    console.error('Error en updateForm:', error)
    res.status(500).json({ error: 'Error al actualizar formulario' })
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
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    if (!status || !['draft', 'confirmed', 'closed'].includes(status)) {
      res.status(400).json({
        error: 'Status inválido. Debe ser: draft, confirmed o closed',
      })
      return
    }

    const conciliation = await conciliationRepo.getById(id)

    // Solo admin puede marcar como 'closed'
    if (status === 'closed' && userRole !== 'admin') {
      res.status(403).json({
        error: 'Solo administradores pueden cerrar conciliaciones',
      })
      return
    }

    // No se puede modificar una conciliación cerrada (excepto admin)
    if (conciliation.status === 'closed' && userRole !== 'admin') {
      res.status(403).json({
        error: 'No se puede modificar una conciliación cerrada',
      })
      return
    }

    await conciliationRepo.updateStatus(id, status, userId)

    res.status(200).json({
      message: `Conciliación marcada como ${status}`,
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({ error: error.message })
      return
    }
    console.error('Error en updateStatus:', error)
    res.status(500).json({ error: 'Error al actualizar estado' })
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
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    // Verificar que la conciliación no esté cerrada
    const conciliation = await conciliationRepo.getById(id)
    if (conciliation.status === 'closed') {
      res.status(403).json({
        error: 'No se puede modificar una conciliación cerrada',
      })
      return
    }

    await conciliationRepo.recalculateTotals(id)

    // Obtener los totales actualizados
    const updated = await conciliationRepo.getById(id)

    res.status(200).json({
      message: 'Totales recalculados exitosamente',
      totals: {
        total_reception: updated.total_reception,
        total_housekeeping: updated.total_housekeeping,
        difference: updated.difference,
      },
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({ error: error.message })
      return
    }
    console.error('Error en recalculateTotals:', error)
    res.status(500).json({ error: 'Error al recalcular totales' })
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
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    // Verificar que existe
    await conciliationRepo.getById(id)

    await conciliationRepo.delete(id)

    res.status(200).json({
      message: 'Conciliación eliminada exitosamente',
    })
  } catch (error: any) {
    if (error.message === 'Conciliación no encontrada') {
      res.status(404).json({ error: error.message })
      return
    }
    console.error('Error en delete conciliation:', error)
    res.status(500).json({ error: 'Error al eliminar conciliación' })
  }
}
