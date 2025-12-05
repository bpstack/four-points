// repositories/logbook/logbookHistory-repository.js // ← CRUD simple sobre logbook_history
import db from '../../config/db.js'

export const addHistory = async (
  logbook_id,
  editor_id,
  type,
  action,
  previous_content = null,
  new_content = null,
  comment_id = null,
  department_id = null
) => {
  const [result] = await db.execute(
    `INSERT INTO logbook_history 
      (logbook_id, editor_id, type, action, previous_content, new_content, comment_id, department_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      logbook_id,
      editor_id,
      type,
      action,
      previous_content,
      new_content,
      comment_id,
      department_id,
    ]
  )
  return {
    id: result.insertId,
    logbook_id,
    editor_id,
    type,
    action,
    previous_content,
    new_content,
    comment_id,
    department_id,
    created_at: new Date(),
  }
}

/* -------------------------------------------------------------
      Obtener historial completo de un logbook
  |   (incluye: usuario, logbook, departamento, JSON de contenidos)
      router.get('/:id/history', getHistoryByLogbookId)
   ------------------------------------------------------------- */
// 1️⃣ Añadimos la utilidad de parseo seguro
const safeJSON = (val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      // Si no es JSON válido, devolvemos la cadena original
      return val
    }
  }
  return val
}

export const getHistoryByLogbookId = async (logbookId) => {
  const [rows] = await db.execute(
    /* 2️⃣ Queremos mantener la consulta tal cual — solo se usan los datos aquí — */
    `SELECT
        lh.id,
        lh.type,
        lh.action,
        lh.previous_content,
        lh.new_content,
        lh.created_at,
        lh.comment_id,
        lh.department_id,
        /* editor */
        u.id   AS editor_id,
        u.username AS editor_name,
        u.email    AS editor_email,
        /* info opcional de logbook */
        l.author_id,
        l.message,
        l.importance_level,
        l.is_solved,
        l.solved_at,
        l.solved_by,
        l.department_id AS logbook_department
    FROM logbook_history lh
    LEFT JOIN users  u ON u.id = lh.editor_id
    LEFT JOIN logbooks l ON l.id = lh.logbook_id
    WHERE lh.logbook_id = ?
    ORDER BY lh.created_at DESC`,
    [logbookId]
  )

  // 3️⃣ Mapeamos cada fila a un objeto “amigable”
  const history = rows.map((row) => ({
    id: row.id,
    type: row.type,
    action: row.action,
    department: row.department_id ?? null,

    editor: row.editor_id
      ? {
          id: row.editor_id,
          username: row.editor_name,
          email: row.editor_email,
        }
      : null,

    // ---- contenidos ----
    previousContent: safeJSON(row.previous_content),
    newContent: safeJSON(row.new_content),

    // ---- fechas ----
    createdAt: row.created_at.toISOString(),

    // ---- info opcional de logbook ----
    logbook: {
      id: logbookId,
      authorId: row.author_id,
      message: row.message,
      importance: row.importance_level,
      isSolved: !!row.is_solved,
      solvedAt: row.solved_at ? new Date(row.solved_at).toISOString() : null,
      solvedBy: row.solved_by || null,
      departmentId: row.logbook_department,
    },
  }))

  return { logbookId, history }
}
