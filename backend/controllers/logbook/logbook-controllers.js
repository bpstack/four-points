// controllers/logbook/logbook-controller.js
import * as logbookRepo from '../../repositories/logbook/logbook-repository.js'
import * as historyService from '../../services/logbookHistory-service.js'
import * as historyRepo from '../../repositories/logbook/logbookHistory-repository.js'

import {
  createLogbookSchema,
  updateLogbookSchema,
} from '../../validations/logbook/logbook-schemas.js'

// ════════════════════════════════════════════════════════════
// CREATE LOGBOOK
// ════════════════════════════════════════════════════════════
export const createLogbook = async (req, res) => {
  try {
    // ✅ Validar con Zod
    const validatedData = createLogbookSchema.parse(req.body)

    // Crear el logbook con datos validados
    const logbook = await logbookRepo.createLogbook(validatedData)

    // Registrar en historial
    await historyService.logAction({
      logbook_id: logbook.id,
      editor_id: validatedData.author_id,
      type: 'logbook',
      action: 'create',
      new_content: validatedData.message,
      department_id: validatedData.department_id,
    })

    res.status(201).json(logbook)
  } catch (err) {
    // Capturar errores de Zod
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: err.errors,
      })
    }

    console.error(err)
    res.status(500).json({ error: 'Error al crear el logbook' })
  }
}

// ════════════════════════════════════════════════════════════
// UPDATE LOGBOOK
// ════════════════════════════════════════════════════════════
export const updateLogbookController = async (req, res) => {
  try {
    const logbookId = req.params.id
    const editorId = req.user.id

    // ✅ Validar con Zod
    const validatedData = updateLogbookSchema.parse(req.body)

    // Llamamos al service que actualiza el logbook y registra el historial
    const historyRecord = await historyService.updateLogbookHistory(
      logbookId,
      editorId,
      validatedData
    )

    return res.status(200).json({
      message: 'Logbook actualizado correctamente',
      history: historyRecord,
    })
  } catch (error) {
    // Capturar errores de Zod
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: error.errors,
      })
    }

    console.error('Error updating logbook:', error)
    return res.status(500).json({ error: error.message })
  }
}

// ════════════════════════════════════════════════════════════
// GET LOGBOOK HISTORY
// ════════════════════════════════════════════════════════════
export const getLogbookHistory = async (req, res) => {
  const logbookIdRaw = req.params.logbookId
  const logbookId = Number(logbookIdRaw)

  if (!Number.isInteger(logbookId)) {
    return res.status(400).json({ error: 'ID inválido' })
  }

  try {
    const data = await historyRepo.getHistoryByLogbookId(logbookId)

    if (!data || !Array.isArray(data.history) || data.history.length === 0) {
      return res
        .status(404)
        .json({ error: 'Logbook no encontrado o sin historial' })
    }

    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

// ════════════════════════════════════════════════════════════
// GET ALL LOGBOOKS
// ════════════════════════════════════════════════════════════
export const getAllLogbooks = async (req, res) => {
  try {
    const logbooks = await logbookRepo.getAllLogbooks()
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks:', err)
    res.status(500).json({ error: 'Error al obtener logbooks' })
  }
}

// ════════════════════════════════════════════════════════════
// GET LOGBOOKS BY DEPARTMENT
// ════════════════════════════════════════════════════════════
export async function getLogbooksByDepartment(req, res) {
  try {
    const { departmentId } = req.params
    const logbooks = await logbookRepo.getLogbooksByDepartment(departmentId)
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por departamento:', err)
    res
      .status(500)
      .json({ error: 'Error al obtener logbooks por departamento' })
  }
}

// ════════════════════════════════════════════════════════════
// GET LOGBOOKS BY AUTHOR
// ════════════════════════════════════════════════════════════
export async function getLogbooksByAuthor(req, res) {
  try {
    const { authorId } = req.params
    const logbooks = await logbookRepo.getLogbooksByAuthor(authorId)
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por autor:', err)
    res.status(500).json({ error: 'Error al obtener logbooks por autor' })
  }
}

// ════════════════════════════════════════════════════════════
// GET LOGBOOKS BY IMPORTANCE
// ════════════════════════════════════════════════════════════
export async function getLogbooksByImportance(req, res) {
  try {
    let importance = req.params.importance.trim().toLowerCase()

    const allowedLevels = ['baja', 'media', 'alta', 'urgente']
    if (!allowedLevels.includes(importance)) {
      return res.status(400).json({
        error:
          'Nivel de importancia inválido. Usa: baja, media, alta o urgente',
      })
    }

    const logbooks = await logbookRepo.getLogbooksByImportance(importance)
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por importancia:', err)
    res.status(500).json({ error: 'Error al obtener logbooks por importancia' })
  }
}

// ════════════════════════════════════════════════════════════
// GET LOGBOOKS BY DAY
// ════════════════════════════════════════════════════════════
export async function getLogbooksByDay(req, res) {
  try {
    const { day } = req.params

    // Validar formato de fecha YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return res.status(400).json({ error: 'Formato de fecha inválido' })
    }

    const logbooks = await logbookRepo.getLogbooksByDay(day)
    res.json(logbooks)
  } catch (err) {
    console.error('Error al obtener logbooks por día:', err)
    res.status(500).json({ error: 'Error al obtener logbooks por día' })
  }
}

// ════════════════════════════════════════════════════════════
// DELETE LOGBOOK (soft-delete)
// ════════════════════════════════════════════════════════════
export const deleteLogbookController = async (req, res) => {
  try {
    const logbookId = req.params.id
    const editorId = req.user.id

    // Obtener el logbook actual (solo si no está borrado)
    const logbook = await logbookRepo.getById(logbookId)
    if (!logbook)
      return res.status(404).json({ error: 'Logbook no encontrado' })

    // Verificar que el editor sea el autor (o admin)
    if (logbook.author_id !== editorId) {
      return res
        .status(403)
        .json({ error: 'Solo el autor puede eliminar este logbook' })
    }

    // Registrar la eliminación en el historial
    const historyRecord = await historyService.deleteLogbookHistory({
      logbook_id: logbookId,
      editor_id: editorId,
      previous_content: logbook,
      department_id: logbook.department_id,
    })

    // Soft‑delete (marcar con deleted_at)
    const deleted = await logbookRepo.softDeleteLogbook(logbookId)
    if (!deleted)
      return res.status(500).json({ error: 'Error al marcar como eliminado' })

    // Respuesta
    return res.status(200).json({
      message: 'Logbook eliminado (soft‑delete) correctamente',
      history: historyRecord,
    })
  } catch (err) {
    console.error('Delete Logbook error:', err)
    return res.status(500).json({ error: err.message })
  }
}
