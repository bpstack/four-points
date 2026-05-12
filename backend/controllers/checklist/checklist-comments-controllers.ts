// controllers/checklist/checklist-comments-controllers.ts

import { Request, Response } from 'express'
import * as commentsService from '../../services/checklist/checklist-comments.service.js'
import { createCommentSchema } from '../../validations/checklist/checklist-schemas.js'

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
    console.error('[checklist] getComments:', err)
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
    console.error('[checklist] addComment:', err)
    res.status(500).json({ error: 'Error al crear comentario' })
  }
}

// DELETE /api/checklists/:id/steps/:stepId/comments/:commentId
export async function deleteCommentController(req: Request, res: Response): Promise<void> {
  try {
    const { id, commentId } = req.params
    const deleted = await commentsService.removeComment(
      id, Number(commentId), req.user!.id, isAdmin(req)
    )
    if (!deleted) {
      res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[checklist] deleteComment:', err)
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
    console.error('[checklist] getAttachments:', err)
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
      id, stepId, req.user!.id,
      req.file.buffer, req.file.originalname, req.file.mimetype, req.file.size
    )
    res.status(201).json(attachment)
  } catch (err) {
    console.error('[checklist] addAttachment:', err)
    res.status(500).json({ error: 'Error al subir adjunto' })
  }
}

// DELETE /api/checklists/:id/steps/:stepId/attachments/:attachmentId
export async function deleteAttachmentController(req: Request, res: Response): Promise<void> {
  try {
    const { id, attachmentId } = req.params
    const deleted = await commentsService.removeAttachment(
      id, Number(attachmentId), req.user!.id, isAdmin(req)
    )
    if (!deleted) {
      res.status(403).json({ error: 'No tienes permiso para eliminar este adjunto' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[checklist] deleteAttachment:', err)
    res.status(500).json({ error: 'Error al eliminar adjunto' })
  }
}
