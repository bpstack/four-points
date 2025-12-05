// src/controllers/logbook/logbookReads-controllers.js
import {
  logBookReadByUser,
  logbookSolvedByUser,
  getUsersWhoReadLogbook,
  getUsersWhoSolvedLogbook,
  markLogbookPending,
  unmarkLogbookRead,
} from '../../repositories/logbook/logbookReads-repository.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

/**
 * POST /logbooks/:logbookId/read
 * Registra que el usuario autenticado ha leído ese logbook
 */
export async function readLogbookController(req, res) {
  try {
    const { logbookId } = req.params
    const userId = req.user.id // `authenticateToken` lo coloca en `req.user`

    const read = await logBookReadByUser({ logbookId, userId })

    res.status(201).json(read)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

/**
 * PUT /logbooks/:logbookId/solve
 * Registra que el usuario autenticado ha “resuelto” el logbook
 */
export async function solveLogbookController(req, res) {
  try {
    const { logbookId } = req.params
    const userId = req.user.id

    const solved = await logbookSolvedByUser({ logbookId, userId })

    // 200 = OK (no se crea un nuevo recurso)
    res.status(200).json(solved)
  } catch (err) {
    console.error(err)
    res.status(err.status ?? 500).json({ error: err.message })
  }
}

/**
 * PUT /logbooks/:logbookId/pending
 * Registra que el usuario autenticado ha “marcado” el logbook como pendiente
 */

export async function reopenLogbookController(req, res) {
  try {
    const { logbookId } = req.params
    const userId = req.user.id

    const pending = await markLogbookPending({ logbookId, userId })
    res.json(pending)
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message })
  }
}

/**
 * GET /logbooks/:logbookId/readers
 * Devuelve los usuarios que han leído un logbook específico
 */
export async function getLogbookReadersController(req, res) {
  try {
    const { logbookId } = req.params
    const readers = await getUsersWhoReadLogbook(logbookId)
    res.json(readers)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

/**
 * GET /logbooks/:logbookId/solved
 * Devuelve el usuario que ha solucionado un logbook específico
 */
export async function getLogbookSolvedController(req, res) {
  try {
    const { logbookId } = req.params

    // Convertir a número y validar
    const id = Number(logbookId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res
        .status(400)
        .json({ error: 'logbookId debe ser un entero positivo' })
    }

    const solved = await getUsersWhoSolvedLogbook(id)

    // No se encontró, es “no resuelto” o el logbook no existe
    if (solved.length === 0) {
      return res
        .status(404)
        .json({ error: 'Logbook no solucionado o inexistente' })
    }

    // Devuelve el único usuario que resolvió (en nuestro esquema solo existe uno)
    res.json(solved[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

/**
 * ✅ NUEVO: DELETE /logbooks/:logbookId/read
 * Desmarca que el usuario autenticado ha leído ese logbook
 */
export async function unreadLogbookController(req, res) {
  try {
    const { logbookId } = req.params
    const userId = req.user.id

    const unread = await unmarkLogbookRead({ logbookId, userId })

    res.status(200).json(unread)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
