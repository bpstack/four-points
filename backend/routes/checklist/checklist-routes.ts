// routes/checklist/checklist-routes.ts

import express, { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { excludeMantenimiento, canResetChecklist } from '../../middlewares/roleCheck.js'
import { singleImage } from '../../middlewares/imageUpload.js'
import {
  getRunController,
  toggleStepController,
  resetRunController,
  getHistoryController,
} from '../../controllers/checklist/checklist-controllers.js'
import {
  getCommentsController,
  addCommentController,
  deleteCommentController,
  getAttachmentsController,
  addAttachmentController,
  deleteAttachmentController,
} from '../../controllers/checklist/checklist-comments-controllers.js'

const router: Router = express.Router()

router.use(authenticateToken)
router.use(excludeMantenimiento)

// ── Run & steps ───────────────────────────────────────────
// GET  /api/checklists/:id/run
router.get('/:id/run', getRunController)

// GET  /api/checklists/:id/history?limit=N
router.get('/:id/history', getHistoryController)

// PATCH /api/checklists/:id/steps/:stepId
router.patch('/:id/steps/:stepId', toggleStepController)

// POST /api/checklists/:id/reset
router.post('/:id/reset', canResetChecklist, resetRunController)

// ── Comments ──────────────────────────────────────────────
// GET  /api/checklists/:id/steps/:stepId/comments
router.get('/:id/steps/:stepId/comments', getCommentsController)

// POST /api/checklists/:id/steps/:stepId/comments
router.post('/:id/steps/:stepId/comments', addCommentController)

// DELETE /api/checklists/:id/steps/:stepId/comments/:commentId
router.delete('/:id/steps/:stepId/comments/:commentId', deleteCommentController)

// ── Attachments ───────────────────────────────────────────
// GET  /api/checklists/:id/steps/:stepId/attachments
router.get('/:id/steps/:stepId/attachments', getAttachmentsController)

// POST /api/checklists/:id/steps/:stepId/attachments
router.post('/:id/steps/:stepId/attachments', singleImage('file'), addAttachmentController)

// DELETE /api/checklists/:id/steps/:stepId/attachments/:attachmentId
router.delete('/:id/steps/:stepId/attachments/:attachmentId', deleteAttachmentController)

export default router
