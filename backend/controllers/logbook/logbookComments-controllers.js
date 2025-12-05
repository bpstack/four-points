// src/controllers/logbook/logbookComments-controllers.js
import * as commentRepo from '../../repositories/logbook/logbookComments-repository.js'
import * as commentHistoryRepo from '../../repositories/logbook/logbookCommentsHistory-repository.js'
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'
import * as logbookHistoryService from '../../services/logbookHistory-service.js'
import {
  createCommentSchema,
  updateCommentSchema,
} from '../../validations/logbook/logbook-schemas.js'

// ════════════════════════════════════════════════════════════
// CREATE COMMENT
// ════════════════════════════════════════════════════════════
export const createCommentController = async (req, res) => {
  try {
    const { logbookId } = req.params
    const editorId = req.user.id

    // ✅ Validar con Zod
    const validatedData = createCommentSchema.parse(req.body)

    /* Validar logbook */
    const logbook = await logbookRepo.getById(logbookId)
    if (!logbook)
      return res.status(404).json({ error: 'Logbook no encontrado' })

    /* Crear el comentario */
    const newComment = await commentRepo.createComment({
      logbook_id: logbookId,
      user_id: editorId,
      comment: validatedData.comment,
      department_id: validatedData.department_id,
      importance_level: validatedData.importance_level,
    })

    /* Si modifica department/importance, actualizar logbook */
    if (
      validatedData.department_id !== undefined ||
      validatedData.importance_level !== undefined
    ) {
      await logbookRepo.updateLogbook(logbookId, {
        department_id: validatedData.department_id,
        importance_level: validatedData.importance_level,
      })
    }

    /* Historial de comentarios (tabla separada) */
    await commentHistoryRepo.createCommentAction({
      logbook_id: logbookId,
      comment_id: newComment.id,
      editor_id: editorId,
      action: 'create',
      previous_content: null,
      current_content: newComment,
    })

    /* Historial general (logbook_history) */
    await logbookHistoryService.logAction({
      logbook_id: logbookId,
      editor_id: editorId,
      action: 'create',
      department_id: validatedData.department_id,
      importance_level: validatedData.importance_level,
      new_content: `Comentario: ${validatedData.comment}`,
    })

    return res.status(201).json(newComment)
  } catch (err) {
    // Capturar errores de Zod
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: err.errors,
      })
    }

    console.error(err)
    return res.status(500).json({ error: 'Error al crear el comentario' })
  }
}

// ════════════════════════════════════════════════════════════
// UPDATE COMMENT
// ════════════════════════════════════════════════════════════
export const updateCommentController = async (req, res) => {
  try {
    const { logbookId, id: commentId } = req.params
    const editorId = req.user.id

    // ✅ Validar con Zod
    const validatedData = updateCommentSchema.parse(req.body)

    /* Obtener el comentario vigente */
    const oldComment = await commentRepo.getById(commentId)
    if (!oldComment)
      return res.status(404).json({ error: 'Comentario no encontrado' })

    /* Confirmar que pertenece al logbook solicitado */
    if (Number(oldComment.logbook_id) !== Number(logbookId)) {
      return res
        .status(400)
        .json({ error: 'El comentario no pertenece a este logbook' })
    }

    /* Autor o admin solo puede cambiarlo */
    if (oldComment.user_id !== editorId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso' })
    }

    /* Actualizar el comentario */
    const updated = await commentRepo.updateComment(commentId, validatedData)
    if (!updated) return res.status(500).json({ error: 'Error al actualizar' })

    /* Actualizar el logbook si cambia department/importance */
    if (
      validatedData.department_id !== undefined ||
      validatedData.importance_level !== undefined
    ) {
      await logbookRepo.updateLogbook(logbookId, {
        department_id: validatedData.department_id,
        importance_level: validatedData.importance_level,
      })
    }

    /* Obtener el comentario actualizado (para el historial) */
    const newComment = await commentRepo.getById(commentId)

    /* Historial de comentarios */
    await commentHistoryRepo.createCommentAction({
      logbook_id: logbookId,
      comment_id: commentId,
      editor_id: editorId,
      action: 'update',
      previous_content: oldComment,
      current_content: newComment,
    })

    return res.json({ message: 'Comentario actualizado', newComment })
  } catch (err) {
    // Capturar errores de Zod
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: err.errors,
      })
    }

    console.error(err)
    return res.status(500).json({ error: 'Error al actualizar comentario' })
  }
}

// ════════════════════════════════════════════════════════════
// DELETE COMMENT
// ════════════════════════════════════════════════════════════
export const deleteCommentController = async (req, res) => {
  try {
    const { logbookId, id: commentId } = req.params
    const editorId = req.user.id

    /* Validar que el comentario exista */
    const comment = await commentRepo.getById(commentId)
    if (!comment)
      return res.status(404).json({ error: 'Comentario no encontrado' })

    /* Confirmar que pertenezca al logbook solicitado */
    if (Number(comment.logbook_id) !== Number(logbookId)) {
      return res
        .status(400)
        .json({ error: 'El comentario no pertenece a este logbook' })
    }

    /* Autor o admin solo puede borrarlo */
    if (comment.user_id !== editorId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso' })
    }

    /* Soft‑delete */
    const deleted = await commentRepo.softDeleteComment(commentId)
    if (!deleted) return res.status(500).json({ error: 'Error al eliminar' })

    /* Historial en la tabla de comentarios */
    await commentHistoryRepo.createCommentAction({
      logbook_id: logbookId,
      comment_id: commentId,
      editor_id: editorId,
      action: 'delete',
      previous_content: comment,
      current_content: null,
    })

    return res.json({ message: 'Comentario eliminado' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Error al eliminar comentario' })
  }
}

// ════════════════════════════════════════════════════════════
// GET COMMENTS BY LOGBOOK
// ════════════════════════════════════════════════════════════
export const getCommentsByLogbookController = async (req, res) => {
  try {
    const { logbookId } = req.params
    const comments = await commentRepo.getCommentByLogbookId(logbookId)
    return res.json({ logbookId, comments })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}

// ════════════════════════════════════════════════════════════
// GET COMMENT HISTORY
// ════════════════════════════════════════════════════════════
export const getCommentHistoryController = async (req, res) => {
  try {
    const { commentId } = req.params
    const history = await commentHistoryRepo.getHistoryByCommentId(commentId)
    return res.json({ commentId, history })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
