// controllers/checklist/checklist-controllers.ts

import { Request, Response } from 'express'
import * as checklistService from '../../services/checklist/checklist.service.js'
import { toggleStepSchema } from '../../validations/checklist/checklist-schemas.js'

// GET /api/checklists/:id/run
export async function getRunController(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const state = await checklistService.getRunState(id)
    res.json(state)
  } catch (err) {
    console.error('[checklist] getRunController:', err)
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
    console.error('[checklist] toggleStepController:', err)
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
    console.error('[checklist] resetRunController:', err)
    res.status(500).json({ error: 'Error al resetear el checklist' })
  }
}
