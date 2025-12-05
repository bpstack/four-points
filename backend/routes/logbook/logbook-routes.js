// routes/logbook/logbook-routes.js
import express from 'express'

// ── Controladores ───────────────────────────────────────────────
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

// --- + CONTROLLERS DE COMENTARIOS (solo se añaden aquí, no se modifican las existentes)
import {
  createCommentController,
  updateCommentController,
  deleteCommentController,
  getCommentsByLogbookController,
  getCommentHistoryController,
} from '../../controllers/logbook/logbookComments-controllers.js'

// --- + CONTROLLERS DE READS AND SOLVE
import {
  readLogbookController,
  solveLogbookController,
  getLogbookReadersController,
  getLogbookSolvedController,
  reopenLogbookController,
  unreadLogbookController,
} from '../../controllers/logbook/logbookReads-controllers.js'

// ── Middlewares ────────────────────────────────────────────────────
import { authenticateToken } from '../../middlewares/authenticateToken.js'

// ── Repository (para la ruta “trashed”) ─────────────────────────────
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'

const router = express.Router()

/* ── Rutas “especiales” (antes de los parámetros :id) ────────────── */
router.get('/trashed', authenticateToken, async (req, res) => {
  try {
    const trashed = await logbookRepo.getAllTrashedLogbooks()
    res.json(trashed)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener los borrados' })
  }
})

/* ── Rutas “regulares” ─────────────────────────────────────────── */
router.post('/', createLogbook)

// PUT – Actualizar un logbook
router.put('/:id', authenticateToken, updateLogbookController)
// GET – Obtener el historial de un logbook
// (no es necesario autenticar, ya que el historial es público)
router.get('/:logbookId/history', getLogbookHistory)

router.get('/all', getAllLogbooks)
router.get('/department/:departmentId', getLogbooksByDepartment)
router.get('/author/:authorId', getLogbooksByAuthor)
router.get('/priority/:importance', getLogbooksByImportance)
router.get('/day/:day', getLogbooksByDay)

router.delete('/:id', authenticateToken, deleteLogbookController)

// -----  ── COMMENT RUTAS ───────────────────────────────────────────
// 1️⃣  Crear comentario a un logbook
router.post('/:logbookId/comments', authenticateToken, createCommentController)

// 2️⃣  Listar todos los comentarios de un logbook
router.get(
  '/:logbookId/comments',
  authenticateToken,
  getCommentsByLogbookController
)

// 3️⃣  Modificar un comentario (solo autor/admin)
router.put(
  '/:logbookId/comments/:id',
  authenticateToken,
  updateCommentController
)

// 4️⃣  Borrar (soft‑delete) un comentario
router.delete(
  '/:logbookId/comments/:id',
  authenticateToken,
  deleteCommentController
)

// 5️⃣  Historial de un comentario
router.get(
  '/:logbookId/comments/:commentId/history',
  getCommentHistoryController
)

// -----  ── READS & SOLVE RUTAS ───────────────────────────────────────────

// POST /logbooks/:logbookId/read
router.post('/:logbookId/read', authenticateToken, readLogbookController)

// DELETE /logbooks/:logbookId/unread
router.delete('/:logbookId/read', authenticateToken, unreadLogbookController)

// PUT /logbooks/:logbookId/solve
router.put('/:logbookId/solve', authenticateToken, solveLogbookController)

// PUT /logbooks/:logbookId/pending

router.put('/:logbookId/pending', authenticateToken, reopenLogbookController)

// GET /logbooks/:logbookId/readers
router.get(
  '/:logbookId/readers',
  authenticateToken,
  getLogbookReadersController
)

// GET /logbooks/:logbookId/solved
router.get('/:logbookId/solved', authenticateToken, getLogbookSolvedController)

// --------------------------------------------

export default router
