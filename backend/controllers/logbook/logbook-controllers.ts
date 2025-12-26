// controllers/logbook/logbook-controllers.ts

import { Request, Response } from 'express'
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'
import * as historyService from '../../services/logbook/logbookHistory-service.js'
import * as historyRepo from '../../repositories/logbook/logbookHistory-repository.js'
import {
  createLogbookSchema,
  updateLogbookSchema,
} from '../../validations/logbook/logbook-schemas.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'

// ============================================
// CREATE LOGBOOK
// ============================================

export async function createLogbook(req: Request, res: Response): Promise<void> {
  try {
    const validatedData = createLogbookSchema.parse(req.body)
    const logbook = await logbookRepo.createLogbook(validatedData)

    await historyService.logAction({
      logbook_id: logbook.id,
      editor_id: validatedData.author_id,
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

    console.error(err)
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

    console.error('Error updating logbook:', error)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_ERROR,
    })
  }
}

// ============================================
// GET LOGBOOK HISTORY
// ============================================

export async function getLogbookHistory(req: Request, res: Response): Promise<void> {
  const logbookIdRaw = req.params.logbookId
  const logbookId = Number(logbookIdRaw)

  if (!Number.isInteger(logbookId)) {
    res.status(400).json({
      success: false,
      error: ERROR_CODES.INVALID_ID,
      code: ERROR_CODES.INVALID_ID,
    })
    return
  }

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
    console.error(err)
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined
    
    const logbooks = await logbookRepo.getAllLogbooks({ limit, offset })
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks:', err)
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined
    
    const logbooks = await logbookRepo.getLogbooksByDepartment(departmentId, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por departamento:', err)
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined
    
    const logbooks = await logbookRepo.getLogbooksByAuthor(authorId, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por autor:', err)
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
    let importance = req.params.importance.trim().toLowerCase()

    const allowedLevels = ['baja', 'media', 'alta', 'urgente']
    if (!allowedLevels.includes(importance)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_INVALID_IMPORTANCE,
        code: ERROR_CODES.LOGBOOK_INVALID_IMPORTANCE,
      })
      return
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined

    const logbooks = await logbookRepo.getLogbooksByImportance(importance, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por importancia:', err)
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.INVALID_DATE_FORMAT,
        code: ERROR_CODES.INVALID_DATE_FORMAT,
      })
      return
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined

    const logbooks = await logbookRepo.getLogbooksByDay(day, { limit, offset })
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por día:', err)
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
    console.error('Delete Logbook error:', err)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_DELETE_ERROR,
      code: ERROR_CODES.LOGBOOK_DELETE_ERROR,
    })
  }
}
