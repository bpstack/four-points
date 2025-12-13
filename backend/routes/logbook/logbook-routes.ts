// routes/logbook/logbook-routes.ts

import express, { Router, Request, Response } from 'express'

// Controllers
import {
  createLogbook,
  updateLogbookController,
  getAllLogbooks,
  getLogbooksByDepartment,
  getLogbooksByAuthor,
  getLogbooksByImportance,
  getLogbooksByDay,
  getLogbookHistory,
  deleteLogbookController,
} from '../../controllers/logbook/logbook-controllers.js'

import {
  createCommentController,
  updateCommentController,
  deleteCommentController,
  getCommentsByLogbookController,
  getCommentHistoryController,
} from '../../controllers/logbook/logbookComments-controllers.js'

import {
  readLogbookController,
  solveLogbookController,
  getLogbookReadersController,
  getLogbookSolvedController,
  reopenLogbookController,
  unreadLogbookController,
} from '../../controllers/logbook/logbookReads-controllers.js'

// Middlewares
import { authenticateToken } from '../../middlewares/authenticateToken.js'

// Repository (for trashed route)
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'

const router: Router = express.Router()

// ========================================
// SPECIAL ROUTES (before :id params)
// ========================================

router.get('/trashed', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const trashed = await logbookRepo.getAllTrashedLogbooks()
    res.json(trashed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los borrados' })
  }
})

// ========================================
// REGULAR ROUTES
// ========================================

// POST - Create logbook
router.post('/', createLogbook)

// PUT - Update logbook
router.put('/:id', authenticateToken, updateLogbookController)

// GET - Logbook history
router.get('/:logbookId/history', getLogbookHistory)

// GET - All logbooks
router.get('/all', getAllLogbooks)

// GET - By department
router.get('/department/:departmentId', getLogbooksByDepartment)

// GET - By author
router.get('/author/:authorId', getLogbooksByAuthor)

// GET - By importance
router.get('/priority/:importance', getLogbooksByImportance)

// GET - By day
router.get('/day/:day', getLogbooksByDay)

// DELETE - Soft delete
router.delete('/:id', authenticateToken, deleteLogbookController)

// ========================================
// COMMENT ROUTES
// ========================================

// POST - Create comment
router.post('/:logbookId/comments', authenticateToken, createCommentController)

// GET - List comments by logbook
router.get(
  '/:logbookId/comments',
  authenticateToken,
  getCommentsByLogbookController
)

// PUT - Update comment
router.put(
  '/:logbookId/comments/:id',
  authenticateToken,
  updateCommentController
)

// DELETE - Soft delete comment
router.delete(
  '/:logbookId/comments/:id',
  authenticateToken,
  deleteCommentController
)

// GET - Comment history
router.get(
  '/:logbookId/comments/:commentId/history',
  getCommentHistoryController
)

// ========================================
// READS & SOLVE ROUTES
// ========================================

// POST - Mark as read
router.post('/:logbookId/read', authenticateToken, readLogbookController)

// DELETE - Unmark as read
router.delete('/:logbookId/read', authenticateToken, unreadLogbookController)

// PUT - Mark as solved
router.put('/:logbookId/solve', authenticateToken, solveLogbookController)

// PUT - Mark as pending (reopen)
router.put('/:logbookId/pending', authenticateToken, reopenLogbookController)

// GET - Get readers
router.get(
  '/:logbookId/readers',
  authenticateToken,
  getLogbookReadersController
)

// GET - Get solver
router.get('/:logbookId/solved', authenticateToken, getLogbookSolvedController)

export default router
