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
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

// ============================================
// CUSTOM ERROR TYPE
// ============================================

interface CustomError extends Error {
  status?: number
}

// ============================================
// READ LOGBOOK
// ============================================

export async function readLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const read = await logBookReadByUser({ logbookId, userId })
    res.status(201).json({
      success: true,
      data: read,
      message: SUCCESS_CODES.LOGBOOK_READ_SUCCESS,
      code: SUCCESS_CODES.LOGBOOK_READ_SUCCESS,
    })
  } catch (err) {
    const error = err as CustomError
    logger.error({ err }, 'Error en readLogbook')
    res.status(error.status ?? 500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_READ_ERROR,
      code: ERROR_CODES.LOGBOOK_READ_ERROR,
    })
  }
}

// ============================================
// UNREAD LOGBOOK
// ============================================

export async function unreadLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const unread = await unmarkLogbookRead({ logbookId, userId })
    res.status(200).json({
      success: true,
      data: unread,
      message: SUCCESS_CODES.LOGBOOK_UNREAD_SUCCESS,
      code: SUCCESS_CODES.LOGBOOK_UNREAD_SUCCESS,
    })
  } catch (err) {
    logger.error({ err }, 'Error en unreadLogbook')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_UNREAD_ERROR,
      code: ERROR_CODES.LOGBOOK_UNREAD_ERROR,
    })
  }
}

// ============================================
// SOLVE LOGBOOK
// ============================================

export async function solveLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const solved = await logbookSolvedByUser({ logbookId, userId })
    res.status(200).json({
      success: true,
      data: solved,
      message: SUCCESS_CODES.LOGBOOK_SOLVED_SUCCESS,
      code: SUCCESS_CODES.LOGBOOK_SOLVED_SUCCESS,
    })
  } catch (err) {
    const error = err as CustomError
    logger.error({ err }, 'Error en solveLogbook')
    res.status(error.status ?? 500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_SOLVE_ERROR,
      code: ERROR_CODES.LOGBOOK_SOLVE_ERROR,
    })
  }
}

// ============================================
// REOPEN LOGBOOK (mark as pending)
// ============================================

export async function reopenLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const userId = req.user!.id

    const pending = await markLogbookPending({ logbookId, userId })
    res.json({
      success: true,
      data: pending,
      message: SUCCESS_CODES.LOGBOOK_REOPENED_SUCCESS,
      code: SUCCESS_CODES.LOGBOOK_REOPENED_SUCCESS,
    })
  } catch (err) {
    const error = err as CustomError
    logger.error({ err }, 'Error en reopenLogbook')
    res.status(error.status || 500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_REOPEN_ERROR,
      code: ERROR_CODES.LOGBOOK_REOPEN_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOK READERS
// ============================================

export async function getLogbookReadersController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const readers = await getUsersWhoReadLogbook(logbookId)
    res.json({ success: true, data: readers })
  } catch (err) {
    logger.error({ err }, 'Error en getLogbookReaders')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_READERS_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_READERS_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOK SOLVER
// ============================================

export async function getLogbookSolvedController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params

    const id = Number(logbookId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_ID,
        code: ERROR_CODES.INVALID_ID,
      })
      return
    }

    const solved = await getUsersWhoSolvedLogbook(id)

    if (solved.length === 0) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_NOT_SOLVED,
        code: ERROR_CODES.LOGBOOK_NOT_SOLVED,
      })
      return
    }

    res.json({ success: true, data: solved[0] })
  } catch (err) {
    logger.error({ err }, 'Error en getLogbookSolved')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_SOLVER_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_SOLVER_ERROR,
    })
  }
}
