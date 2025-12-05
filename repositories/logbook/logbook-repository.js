/* ──────────────────────────────────────────────────────────────────────
 *  repositories/logbook/logbook-repository.js // ← CRUD + soft‑delete + filtros
 *  ------------------------------------------------------------
 *  Funciones de acceso a la tabla `logbooks` con soporte para
 *  **soft‑delete** (columna `deleted_at`).
 *  ------------------------------------------------------------
 *
 *  ──  Dependencias  --------------------------------------------
 */
import db from '../../config/db.js'

/* ──  Exportaciones  -------------------------------------------- */

/** Crea un logbook */
export async function createLogbook({
  message,
  importance_level,
  department_id,
  author_id,
  date,
}) {
  if (author_id == null)
    throw new Error('author_id no puede ser undefined o null')

  const today = new Date().toISOString().split('T')[0] // yyyy-mm-dd

  const [result] = await db.execute(
    `INSERT INTO logbooks
      (message, importance_level, department_id, author_id, created_at, updated_at, date)
    VALUES (?, ?, ?, ?, NOW(), NOW(), ?)`,

    [message, importance_level, department_id, author_id, date || today]
  )

  return {
    id: result.insertId,
    message,
    importance_level,
    department_id,
    author_id,
    created_at: new Date(),
    updated_at: new Date(),
    comments: [],
    date: date || today,
  }
}

/** Obtiene un logbook por ID **excluyendo aquellos marcados como `deleted_at`**  */
export const getById = async (id) => {
  const [rows] = await db.execute(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.id = ? AND l.deleted_at IS NULL`,
    [id]
  )
  return rows[0]
}

/** Actualiza un logbook (solo campos que se pasen) */
export async function updateLogbook(
  logbookId,
  { message, importance_level, department_id }
) {
  const [result] = await db.execute(
    `UPDATE logbooks
    SET message = COALESCE(?, message),
        importance_level = COALESCE(?, importance_level),
        department_id = COALESCE(?, department_id),
        updated_at = NOW()
    WHERE id = ? AND deleted_at IS NULL`,
    [
      message ?? null,
      importance_level ?? null,
      department_id ?? null,
      logbookId,
    ]
  )
  return result.affectedRows > 0
}

/** Soft‑delete: marca la fila con `deleted_at = NOW()` */
export async function softDeleteLogbook(logbookId) {
  const [result] = await db.execute(
    'UPDATE logbooks SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [logbookId]
  )
  return result.affectedRows > 0
}

/** Devuelve todos los logbooks que no están soft‑deleted  */
export async function getAllLogbooks() {
  const [rows] = await db.query(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`
  )
  return rows
}

/** Devuelve los logbooks de un departamento (no soft‑deleted) */
export async function getLogbooksByDepartment(departmentId) {
  const [rows] = await db.query(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.department_id = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`,
    [departmentId]
  )
  return rows
}

/** Devuelve los logbooks de un autor (no soft‑deleted) */
export async function getLogbooksByAuthor(authorId) {
  const [rows] = await db.query(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.author_id = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`,
    [authorId]
  )
  return rows
}

/** Devuelve los logbooks filtrados por importancia (no soft‑deleted) */
export async function getLogbooksByImportance(importance) {
  const allowed = ['baja', 'media', 'alta', 'urgente']
  if (!allowed.includes(importance))
    throw new Error('Nivel de importancia no válido')

  const [rows] = await db.query(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.importance_level = ? AND l.deleted_at IS NULL 
    ORDER BY l.created_at DESC`,
    [importance]
  )
  return rows
}

/** Devuelve los logbooks de un día concreto (no soft‑deleted) */
// ✅ CORRECTO - Usa date para filtrar, created_at para ordenar
export async function getLogbooksByDay(day) {
  const [rows] = await db.query(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE (l.date = ? OR (l.date IS NULL AND DATE(l.created_at) = ?))
      AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC`,
    [day, day]
  )
  return rows
}
/** ------------------------------ /
 *  Métodos opcionales (no obligatorios)
 *  — Por ejemplo, obtener *todas* las filas (incluidos los soft‑deleted)
 *  — O bien, obtener sólo los soft‑deleted.
 *  ------------------------------ */

export async function getAllTrashedLogbooks() {
  const [rows] = await db.query(
    `SELECT 
      l.*,
      u.username as author_name,
      u.email as author_email
    FROM logbooks l
    LEFT JOIN users u ON l.author_id = u.id
    WHERE l.deleted_at IS NOT NULL 
    ORDER BY l.deleted_at DESC`
  )
  return rows
}
