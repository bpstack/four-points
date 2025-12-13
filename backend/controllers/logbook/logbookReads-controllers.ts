// controllers/logbook/logbookReads-controllers.ts

import { Request, Response } from 'express'
import {
  logBookReadByUser,
  logbookSolvedByUser,
  getUsersWhoReadLogbook,
  getUsersWhoSolvedLogbook,
  markLogbookPending,
  unmarkLogbookRead,
} from '../../repositories/logbook/logbookReads-repository.js'

// ============================================
// CUSTOM ERROR TYPE
// ============================================

interface CustomError extends Error {
  status?: number
}

// ============================================
// READ LOGBOOK
// ============================================

export async function readLogbookController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const read = await logBookReadByUser({ logbookId, userId })
    res.status(201).json(read)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: (err as Error).message })
  }
}

// ============================================
// UNREAD LOGBOOK
// ============================================

export async function unreadLogbookController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const unread = await unmarkLogbookRead({ logbookId, userId })
    res.status(200).json(unread)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: (err as Error).message })
  }
}

// ============================================
// SOLVE LOGBOOK
// ============================================

export async function solveLogbookController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const solved = await logbookSolvedByUser({ logbookId, userId })
    res.status(200).json(solved)
  } catch (err) {
    const error = err as CustomError
    console.error(err)
    res.status(error.status ?? 500).json({ error: error.message })
  }
}

// ============================================
// REOPEN LOGBOOK (mark as pending)
// ============================================

export async function reopenLogbookController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const pending = await markLogbookPending({ logbookId, userId })
    res.json(pending)
  } catch (err) {
    const error = err as CustomError
    console.error(err)
    res.status(error.status || 500).json({ error: error.message })
  }
}

// ============================================
// GET LOGBOOK READERS
// ============================================

export async function getLogbookReadersController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { logbookId } = req.params
    const readers = await getUsersWhoReadLogbook(logbookId)
    res.json(readers)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: (err as Error).message })
  }
}

// ============================================
// GET LOGBOOK SOLVER
// ============================================

export async function getLogbookSolvedController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { logbookId } = req.params

    const id = Number(logbookId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      res
        .status(400)
        .json({ error: 'logbookId debe ser un entero positivo' })
      return
    }

    const solved = await getUsersWhoSolvedLogbook(id)

    if (solved.length === 0) {
      res
        .status(404)
        .json({ error: 'Logbook no solucionado o inexistente' })
      return
    }

    res.json(solved[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: (err as Error).message })
  }
}
