// controllers/checklist/checklist-comments-controllers.ts

import { Request, Response } from 'express'
import * as commentsService from '../../services/checklist/checklist-comments.service.js'
import { createCommentSchema } from '../../validations/checklist/checklist-schemas.js'
import { logger } from '../../config/logger.js'
import { fetchStoredFile, sendPrivateFile } from '../../services/uploads/private-files.js'

function isAdmin(req: Request): boolean {
  return req.user?.role?.toLowerCase() === 'admin'
}

// ── Comments ──────────────────────────────────────────────

// GET /api/checklists/:id/steps/:stepId/comments
export async function getCommentsController(req: Request, res: Response): Promise<void> {
  try {
    const { id, stepId } = req.params
    const comments = await commentsService.getComments(id, stepId)
    res.json(comments)
  } catch (err) {
    logger.error({ err }, '[checklist] getComments')
    res.status(500).json({ error: 'Error al obtener comentarios' })
  }
}

// POST /api/checklists/:id/steps/:stepId/comments
export async function addCommentController(req: Request, res: Response): Promise<void> {
  try {
    const { id, stepId } = req.params
    const { body } = createCommentSchema.parse(req.body)
    const comment = await commentsService.addComment(id, stepId, req.user!.id, body)
    res.status(201).json(comment)
  } catch (err) {
    const error = err as Error & { name?: string; issues?: unknown[] }
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Datos inválidos', details: error.issues })
      return
    }
    logger.error({ err }, '[checklist] addComment')
    res.status(500).json({ error: 'Error al crear comentario' })
  }
}

// DELETE /api/checklists/:id/steps/:stepId/comments/:commentId
export async function deleteCommentController(req: Request, res: Response): Promise<void> {
  try {
    const { id, commentId } = req.params
    const deleted = await commentsService.removeComment(
      id,
      Number(commentId),
      req.user!.id,
      isAdmin(req)
    )
    if (!deleted) {
      res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    logger.error({ err }, '[checklist] deleteComment')
    res.status(500).json({ error: 'Error al eliminar comentario' })
  }
}

// ── Attachments ───────────────────────────────────────────

// GET /api/checklists/:id/steps/:stepId/attachments
export async function getAttachmentsController(req: Request, res: Response): Promise<void> {
  try {
    const { id, stepId } = req.params
    const attachments = await commentsService.getAttachments(id, stepId)
    res.json(attachments)
  } catch (err) {
    logger.error({ err }, '[checklist] getAttachments')
    res.status(500).json({ error: 'Error al obtener adjuntos' })
  }
}

// POST /api/checklists/:id/steps/:stepId/attachments
export async function addAttachmentController(req: Request, res: Response): Promise<void> {
  try {
    const { id, stepId } = req.params
    if (!req.file) {
      res.status(400).json({ error: 'No se envió ningún archivo' })
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(req.file.mimetype)) {
      res.status(400).json({ error: 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)' })
      return
    }
    if (req.file.size > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Máximo 5MB por archivo' })
      return
    }
    const attachment = await commentsService.addAttachment(
      id,
      stepId,
      req.user!.id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    )
    res.status(201).json(attachment)
  } catch (err) {
    logger.error({ err }, '[checklist] addAttachment')
    res.status(500).json({ error: 'Error al subir adjunto' })
  }
}

// DELETE /api/checklists/:id/steps/:stepId/attachments/:attachmentId
export async function deleteAttachmentController(req: Request, res: Response): Promise<void> {
  try {
    const { id, attachmentId } = req.params
    const deleted = await commentsService.removeAttachment(
      id,
      Number(attachmentId),
      req.user!.id,
      isAdmin(req)
    )
    if (!deleted) {
      res.status(403).json({ error: 'No tienes permiso para eliminar este adjunto' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    logger.error({ err }, '[checklist] deleteAttachment')
    res.status(500).json({ error: 'Error al eliminar adjunto' })
  }
}

// GET /api/checklists/attachments/:attachmentId/file
// Private file: the API downloads it and serves it, the signed URL stays here
export async function getAttachmentFileController(req: Request, res: Response): Promise<void> {
  try {
    const storedUrl = await commentsService.getAttachmentStoredUrl(Number(req.params.attachmentId))
    if (!storedUrl) {
      res.status(404).json({ error: 'Adjunto no encontrado' })
      return
    }
    sendPrivateFile(res, await fetchStoredFile(storedUrl))
  } catch (err) {
    logger.error({ err }, '[checklist] getAttachmentFile')
    res.status(500).json({ error: 'Error al obtener el adjunto' })
  }
}
