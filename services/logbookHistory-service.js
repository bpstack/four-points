// services/logbookHistory-service.js
import * as logbookRepo from '../repositories/logbook/logbook-repository.js'
import * as logbookHistoryRepo from '../repositories/logbook/logbookHistory-repository.js'

/**
 * Registrar acción en historial de logbooks
 */
export const logAction = async ({
  logbook_id,
  editor_id,
  action,
  previous_content = null,
  new_content = null,
  department_id = null,
}) => {
  if (!logbook_id) throw new Error('logAction: logbook_id es requerido')
  if (!editor_id) throw new Error('logAction: editor_id es requerido')
  if (!action) throw new Error('logAction: action es requerido')

  return await logbookHistoryRepo.addHistory(
    logbook_id,
    editor_id,
    'logbook', // tipo fijo 'logbook'
    action,
    previous_content,
    new_content,
    null, // comment_id = null, porque no registramos comentarios aquí
    department_id
  )
}

/**
 * Registra la actualización de un logbook en el historial.
 * Solo el autor del logbook puede actualizarlo.
 *
 * @param {string} logbookId - ID del logbook a actualizar
 * @param {string} editorId - ID del usuario que hace la edición
 * @param {Object} updates - Campos a actualizar { message, importance_level, department_id }
 * @returns {Object} - Historial registrado
 */
export async function updateLogbookHistory(logbookId, editorId, updates) {
  // lógica para actualizar logbook y registrar historial
  // 1️⃣ Obtener el logbook actual
  const logbook = await logbookRepo.getById(logbookId)
  if (!logbook) throw new Error('Logbook no encontrado')

  // 2️⃣ Verificar que el editor sea el autor
  if (logbook.author_id !== editorId) {
    throw new Error('Solo el autor puede actualizar este logbook')
  }

  // 3️⃣ Guardar el contenido previo
  const previousContent = {
    message: logbook.message,
    importance_level: logbook.importance_level,
    department_id: logbook.department_id,
  }

  // 4️⃣ Actualizar el logbook
  const updated = await logbookRepo.updateLogbook(logbookId, updates)
  if (!updated) throw new Error('No se pudo actualizar el logbook')

  // 5️⃣ Guardar el historial de cambios
  const historyRecord = await logbookHistoryRepo.addHistory(
    logbookId, // logbook_id
    editorId, // editor_id
    'logbook', // type
    'update', // action
    JSON.stringify(previousContent), // previous_content
    JSON.stringify(updates), // new_content
    null, // comment_id
    updates.department_id ?? logbook.department_id // department_id
  )

  return historyRecord
}

/**
 * Registrar una eliminación de logbook en el historial
 * @param {Object} args
 * @param {string} args.logbook_id   Id del logbook que se borró
 * @param {string} args.editor_id   Id del usuario que realiza la eliminación
 * @param {Object} args.previous_content  Contenido original del logbook
 * @returns {Object} Historial creado
 */
export async function deleteLogbookHistory({
  logbook_id,
  editor_id,
  previous_content,
  department_id = null,
}) {
  // No se pasa `new_content` porque la entrada desaparece por completo.
  return await logbookHistoryRepo.addHistory(
    logbook_id,
    editor_id,
    'logbook',
    'delete',
    JSON.stringify(previous_content),
    null,
    null,
    department_id
  )
}
