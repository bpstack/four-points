// routes/checklist/checklist-routes.ts

import express, { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { excludeMantenimiento, canResetChecklist } from '../../middlewares/roleCheck.js'
import {
  getRunController,
  toggleStepController,
  resetRunController,
} from '../../controllers/checklist/checklist-controllers.js'

const router: Router = express.Router()

router.use(authenticateToken)
router.use(excludeMantenimiento)

// GET  /api/checklists/:id/run   — estado actual del día
router.get('/:id/run', getRunController)

// PATCH /api/checklists/:id/steps/:stepId — marcar/desmarcar paso
router.patch('/:id/steps/:stepId', toggleStepController)

// POST  /api/checklists/:id/reset — reset manual
router.post('/:id/reset', canResetChecklist, resetRunController)

export default router
