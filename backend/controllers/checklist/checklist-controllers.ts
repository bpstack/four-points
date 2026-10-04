// controllers/checklist/checklist-controllers.ts
// Route params (:id, :stepId) arrive validated by validateChecklistParams in
// routes/checklist/checklist-routes.ts

import { Request, Response } from 'express'
import * as checklistService from '../../services/checklist/checklist.service.js'
import {
  toggleStepSchema,
  historyQuerySchema,
} from '../../validations/checklist/checklist-schemas.js'
import { logger } from '../../config/logger.js'

// GET /api/checklists/:id/run
export async function getRunController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const state = await checklistService.getRunState(id)
    res.json(state)
  } catch (err) {
    logger.error({ err }, '[checklist] getRunController')
    res.status(500).json({ error: 'Error al obtener el estado del checklist' })
  }
}

// PATCH /api/checklists/:id/steps/:stepId
export async function toggleStepController(req: Request, res: Response): Promise<void> {
  try {
    const { id, stepId } = req.params
    const userId = req.user!.id
    const { done } = toggleStepSchema.parse(req.body)

    const state = await checklistService.toggleStep(id, stepId, done, userId)
    res.json(state)
  } catch (err) {
    const error = err as Error & { name?: string; issues?: unknown[] }
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', details: error.issues })
      return
    }
    logger.error({ err }, '[checklist] toggleStepController')
    res.status(500).json({ error: 'Error al actualizar el paso' })
  }
}

// POST /api/checklists/:id/reset
export async function resetRunController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const state = await checklistService.resetRun(id, userId)
    res.json(state)
  } catch (err) {
    logger.error({ err }, '[checklist] resetRunController')
    res.status(500).json({ error: 'Error al resetear el checklist' })
  }
}

// GET /api/checklists/:id/history?limit=N&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
export async function getHistoryController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const parsed = historyQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.issues })
      return
    }
    const { limit, date_from: dateFrom, date_to: dateTo } = parsed.data
    const history = await checklistService.getHistory(id, limit, dateFrom, dateTo)
    res.json(history)
  } catch (err) {
    logger.error({ err }, '[checklist] getHistoryController')
    res.status(500).json({ error: 'Error al obtener el historial' })
  }
}
