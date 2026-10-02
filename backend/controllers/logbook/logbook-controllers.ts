// controllers/logbook/logbook-controllers.ts
// Route params (:id, :logbookId, :day...) arrive validated by validateParams in
// routes/logbook/logbook-routes.ts

import { Request, Response } from 'express'
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'
import * as historyService from '../../services/logbook/logbookHistory-service.js'
import * as historyRepo from '../../repositories/logbook/logbookHistory-repository.js'
import {
  createLogbookSchema,
  updateLogbookSchema,
  logbookListQuerySchema,
  type LogbookListQuery,
} from '../../validations/logbook/logbook-schemas.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import { sendLogbookError } from './logbook-errors.js'

// Validates limit, offset and filters; answers 400 and returns null when invalid
export function parseListQuery(req: Request, res: Response): LogbookListQuery | null {
  const parsed = logbookListQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: ERROR_CODES.INVALID_DATA,
      code: ERROR_CODES.INVALID_DATA,
      details: parsed.error.issues,
    })
    return null
  }
  return parsed.data
}

// ============================================
// CREATE LOGBOOK
// ============================================

export async function createLogbook(req: Request, res: Response): Promise<void> {
  try {
    const validatedData = createLogbookSchema.parse(req.body)
    const authorId = req.user!.id
    const logbook = await logbookRepo.createLogbook({ ...validatedData, author_id: authorId })

    await historyService.logAction({
      logbook_id: logbook.id,
      editor_id: authorId,
      action: 'create',
      new_content: validatedData.message,
      department_id: validatedData.department_id,
    })

    res.status(201).json(logbook)
  } catch (err) {
    const error = err as Error & { name?: string; issues?: unknown[] }
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_DATA,
        code: ERROR_CODES.INVALID_DATA,
        details: error.issues,
      })
      return
    }

    logger.error({ err }, 'Error en createLogbook')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_CREATE_ERROR,
      code: ERROR_CODES.LOGBOOK_CREATE_ERROR,
    })
  }
}

// ============================================
// UPDATE LOGBOOK
// ============================================

export async function updateLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const logbookId = req.params.id
    const editorId = req.user!.id

    const validatedData = updateLogbookSchema.parse(req.body)

    const historyRecord = await historyService.updateLogbookHistory(
      logbookId,
      editorId,
      validatedData
    )

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.LOGBOOK_UPDATED,
      code: SUCCESS_CODES.LOGBOOK_UPDATED,
      history: historyRecord,
    })
  } catch (err) {
    const error = err as Error & { name?: string; issues?: unknown[] }
    if (error.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_DATA,
        code: ERROR_CODES.INVALID_DATA,
        details: error.issues,
      })
      return
    }

    // Editing someone else's entry is a 403, a missing one a 404
    sendLogbookError(res, error, ERROR_CODES.LOGBOOK_FETCH_ERROR)
  }
}

// ============================================
// GET LOGBOOK HISTORY
// ============================================

export async function getLogbookHistory(req: Request, res: Response): Promise<void> {
  const logbookId = Number(req.params.logbookId)

  try {
    const data = await historyRepo.getHistoryByLogbookId(logbookId)

    if (!data || !Array.isArray(data.history) || data.history.length === 0) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_NOT_FOUND,
        code: ERROR_CODES.LOGBOOK_NOT_FOUND,
      })
      return
    }

    res.json(data)
  } catch (err) {
    logger.error({ err }, 'Error en getLogbookHistory')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_ERROR,
    })
  }
}

// ============================================
// GET ALL LOGBOOKS
// ============================================

export async function getAllLogbooks(req: Request, res: Response): Promise<void> {
  try {
    const query = parseListQuery(req, res)
    if (!query) return
    const { limit, offset, date_from, date_to, importance_level } = query
    const include_trashed = query.include_trashed === 'true'

    const hasFilters = date_from || date_to || importance_level || include_trashed
    const logbooks = hasFilters
      ? await logbookRepo.getLogbooksFiltered({
          limit,
          offset,
          date_from,
          date_to,
          importance_level,
          include_trashed,
        })
      : await logbookRepo.getAllLogbooks({ limit, offset })

    res.json(logbooks)
  } catch (err) {
    logger.error({ err }, 'Error al obtener logbooks')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOKS BY DEPARTMENT
// ============================================

export async function getLogbooksByDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { departmentId } = req.params
    const query = parseListQuery(req, res)
    if (!query) return
    const { limit, offset } = query

    const logbooks = await logbookRepo.getLogbooksByDepartment(departmentId, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    logger.error({ err }, 'Error al obtener logbooks por departamento')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_BY_DEPARTMENT_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_BY_DEPARTMENT_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOKS BY AUTHOR
// ============================================

export async function getLogbooksByAuthor(req: Request, res: Response): Promise<void> {
  try {
    const { authorId } = req.params
    const query = parseListQuery(req, res)
    if (!query) return
    const { limit, offset } = query

    const logbooks = await logbookRepo.getLogbooksByAuthor(authorId, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    logger.error({ err }, 'Error al obtener logbooks por autor')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_BY_AUTHOR_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_BY_AUTHOR_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOKS BY IMPORTANCE
// ============================================

export async function getLogbooksByImportance(req: Request, res: Response): Promise<void> {
  try {
    const importance = req.params.importance.trim().toLowerCase()

    const allowedLevels = ['baja', 'media', 'alta', 'urgente']
    if (!allowedLevels.includes(importance)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_INVALID_IMPORTANCE,
        code: ERROR_CODES.LOGBOOK_INVALID_IMPORTANCE,
      })
      return
    }

    const query = parseListQuery(req, res)
    if (!query) return
    const { limit, offset } = query

    const logbooks = await logbookRepo.getLogbooksByImportance(importance, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    logger.error({ err }, 'Error al obtener logbooks por importancia')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_BY_IMPORTANCE_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_BY_IMPORTANCE_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOKS BY DAY
// ============================================

export async function getLogbooksByDay(req: Request, res: Response): Promise<void> {
  try {
    const { day } = req.params

    const query = parseListQuery(req, res)
    if (!query) return
    const { limit, offset } = query

    const logbooks = await logbookRepo.getLogbooksByDay(day, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    logger.error({ err }, 'Error al obtener logbooks por día')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_BY_DAY_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_BY_DAY_ERROR,
    })
  }
}

// ============================================
// DELETE LOGBOOK (soft-delete)
// ============================================

export async function deleteLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const logbookId = req.params.id
    const editorId = req.user!.id

    const logbook = await logbookRepo.getById(logbookId)
    if (!logbook) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_NOT_FOUND,
        code: ERROR_CODES.LOGBOOK_NOT_FOUND,
      })
      return
    }

    if (logbook.author_id !== editorId) {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_ONLY_AUTHOR_DELETE,
        code: ERROR_CODES.LOGBOOK_ONLY_AUTHOR_DELETE,
      })
      return
    }

    const historyRecord = await historyService.deleteLogbookHistory({
      logbook_id: Number(logbookId),
      editor_id: editorId,
      previous_content: logbook,
      department_id: logbook.department_id,
    })

    const deleted = await logbookRepo.softDeleteLogbook(logbookId)
    if (!deleted) {
      res.status(500).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_DELETE_ERROR,
        code: ERROR_CODES.LOGBOOK_DELETE_ERROR,
      })
      return
    }

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.LOGBOOK_DELETED,
      code: SUCCESS_CODES.LOGBOOK_DELETED,
      history: historyRecord,
    })
  } catch (err) {
    logger.error({ err }, 'Delete Logbook error')
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_DELETE_ERROR,
      code: ERROR_CODES.LOGBOOK_DELETE_ERROR,
    })
  }
}
