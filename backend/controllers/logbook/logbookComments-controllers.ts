// controllers/logbook/logbookComments-controllers.ts

import { Request, Response } from 'express'
import * as commentRepo from '../../repositories/logbook/logbookComments-repository.js'
import * as commentHistoryRepo from '../../repositories/logbook/logbookCommentsHistory-repository.js'
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'
import * as logbookHistoryService from '../../services/logbook/logbookHistory-service.js'
import {
  createCommentSchema,
  updateCommentSchema,
} from '../../validations/logbook/logbook-schemas.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'

// ============================================
// CREATE COMMENT
// ============================================

export async function createCommentController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const editorId = req.user!.id

    const validatedData = createCommentSchema.parse(req.body)

    const logbook = await logbookRepo.getById(logbookId)
    if (!logbook) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_NOT_FOUND,
        code: ERROR_CODES.LOGBOOK_NOT_FOUND,
      })
      return
    }

    const newComment = await commentRepo.createComment({
      logbook_id: Number(logbookId),
      user_id: editorId,
      comment: validatedData.comment,
      department_id: validatedData.department_id,
      importance_level: validatedData.importance_level,
    })

    // Update logbook if department/importance changed
    if (validatedData.department_id !== undefined || validatedData.importance_level !== undefined) {
      await logbookRepo.updateLogbook(logbookId, {
        department_id: validatedData.department_id,
        importance_level: validatedData.importance_level,
      })
    }

    // Comment history
    await commentHistoryRepo.createCommentAction({
      logbook_id: Number(logbookId),
      comment_id: newComment.id,
      editor_id: editorId,
      action: 'create',
      previous_content: null,
      current_content: newComment,
    })

    // General history
    await logbookHistoryService.logAction({
      logbook_id: Number(logbookId),
      editor_id: editorId,
      action: 'create',
      department_id: validatedData.department_id ?? null,
      new_content: `Comentario: ${validatedData.comment}`,
    })

    res.status(201).json(newComment)
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
      error: ERROR_CODES.LOGBOOK_COMMENT_CREATE_ERROR,
      code: ERROR_CODES.LOGBOOK_COMMENT_CREATE_ERROR,
    })
  }
}

// ============================================
// UPDATE COMMENT
// ============================================

export async function updateCommentController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId, id: commentId } = req.params
    const editorId = req.user!.id

    const validatedData = updateCommentSchema.parse(req.body)

    const oldComment = await commentRepo.getById(commentId)
    if (!oldComment) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_NOT_FOUND,
        code: ERROR_CODES.LOGBOOK_COMMENT_NOT_FOUND,
      })
      return
    }

    if (Number(oldComment.logbook_id) !== Number(logbookId)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_NOT_IN_LOGBOOK,
        code: ERROR_CODES.LOGBOOK_COMMENT_NOT_IN_LOGBOOK,
      })
      return
    }

    // Check permissions
    const isAdmin = (req.user as { isAdmin?: boolean })?.isAdmin
    if (oldComment.user_id !== editorId && !isAdmin) {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_NO_PERMISSION,
        code: ERROR_CODES.LOGBOOK_COMMENT_NO_PERMISSION,
      })
      return
    }

    const updated = await commentRepo.updateComment(commentId, validatedData)
    if (!updated) {
      res.status(500).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_UPDATE_ERROR,
        code: ERROR_CODES.LOGBOOK_COMMENT_UPDATE_ERROR,
      })
      return
    }

    // Update logbook if department/importance changed
    if (validatedData.department_id !== undefined || validatedData.importance_level !== undefined) {
      await logbookRepo.updateLogbook(logbookId, {
        department_id: validatedData.department_id,
        importance_level: validatedData.importance_level,
      })
    }

    const newComment = await commentRepo.getById(commentId)

    await commentHistoryRepo.createCommentAction({
      logbook_id: Number(logbookId),
      comment_id: Number(commentId),
      editor_id: editorId,
      action: 'update',
      previous_content: oldComment,
      current_content: newComment || null,
    })

    res.json({
      success: true,
      message: SUCCESS_CODES.LOGBOOK_COMMENT_UPDATED,
      code: SUCCESS_CODES.LOGBOOK_COMMENT_UPDATED,
      newComment,
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

    console.error(err)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_COMMENT_UPDATE_ERROR,
      code: ERROR_CODES.LOGBOOK_COMMENT_UPDATE_ERROR,
    })
  }
}

// ============================================
// DELETE COMMENT
// ============================================

export async function deleteCommentController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId, id: commentId } = req.params
    const editorId = req.user!.id

    const comment = await commentRepo.getById(commentId)
    if (!comment) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_NOT_FOUND,
        code: ERROR_CODES.LOGBOOK_COMMENT_NOT_FOUND,
      })
      return
    }

    if (Number(comment.logbook_id) !== Number(logbookId)) {
      res.status(400).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_NOT_IN_LOGBOOK,
        code: ERROR_CODES.LOGBOOK_COMMENT_NOT_IN_LOGBOOK,
      })
      return
    }

    const isAdmin = (req.user as { isAdmin?: boolean })?.isAdmin
    if (comment.user_id !== editorId && !isAdmin) {
      res.status(403).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_NO_PERMISSION,
        code: ERROR_CODES.LOGBOOK_COMMENT_NO_PERMISSION,
      })
      return
    }

    const deleted = await commentRepo.softDeleteComment(commentId)
    if (!deleted) {
      res.status(500).json({
        success: false,
        error: ERROR_CODES.LOGBOOK_COMMENT_DELETE_ERROR,
        code: ERROR_CODES.LOGBOOK_COMMENT_DELETE_ERROR,
      })
      return
    }

    await commentHistoryRepo.createCommentAction({
      logbook_id: Number(logbookId),
      comment_id: Number(commentId),
      editor_id: editorId,
      action: 'delete',
      previous_content: comment,
      current_content: null,
    })

    res.json({
      success: true,
      message: SUCCESS_CODES.LOGBOOK_COMMENT_DELETED,
      code: SUCCESS_CODES.LOGBOOK_COMMENT_DELETED,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_COMMENT_DELETE_ERROR,
      code: ERROR_CODES.LOGBOOK_COMMENT_DELETE_ERROR,
    })
  }
}

// ============================================
// GET COMMENTS BY LOGBOOK
// ============================================

export async function getCommentsByLogbookController(req: Request, res: Response): Promise<void> {
  try {
    const { logbookId } = req.params
    const comments = await commentRepo.getCommentByLogbookId(logbookId)
    res.json({ logbookId, comments })
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
// GET COMMENT HISTORY
// ============================================

export async function getCommentHistoryController(req: Request, res: Response): Promise<void> {
  try {
    const { commentId } = req.params
    const history = await commentHistoryRepo.getHistoryByCommentId(commentId)
    res.json({ commentId, history })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.LOGBOOK_FETCH_ERROR,
      code: ERROR_CODES.LOGBOOK_FETCH_ERROR,
    })
  }
}
