// controllers/demo/demo-reset-controller.ts
/**
 * Configuración → Demo (ADR-038): estado, reinicio a mano y guardar la base de
 * horarios. Solo existe con DEMO_MODE=true y solo para admins que no son la
 * cuenta demo (demo-reset-routes.ts).
 */

import type { Request, Response } from 'express'
import {
  getDemoStatus,
  resetDemoData,
  saveSchedulingSnapshot,
  type DemoResetResult,
} from '../../services/demo/demo-reset.service.js'
import { ERROR_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

function answer(res: Response, result: DemoResetResult): void {
  if (result.status === 'busy') {
    res.status(409).json({ success: false, error: 'Ya hay un reinicio de la demo en marcha' })
    return
  }
  if (result.status === 'failed') {
    res.status(500).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR })
    return
  }
  res.status(200).json({ success: true, data: result })
}

export async function getStatus(_req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({ success: true, data: await getDemoStatus() })
  } catch (error) {
    logger.error({ err: error }, '[DEMO] status error')
    res.status(500).json({ success: false, error: ERROR_CODES.INTERNAL_ERROR })
  }
}

export async function resetNow(req: Request, res: Response): Promise<void> {
  answer(res, await resetDemoData('manual', req.user!.id))
}

export async function saveSnapshot(req: Request, res: Response): Promise<void> {
  answer(res, await saveSchedulingSnapshot(req.user!.id))
}
