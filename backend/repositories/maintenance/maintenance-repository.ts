// backend/repositories/maintenance/maintenance-repository.ts
/**
 * Repositorio para el módulo Maintenance
 * Acceso a datos con MySQL - 3 tablas relacionadas
 */

import db from '../../config/db.js'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type {
  MaintenanceReport,
  MaintenanceImage,
  MaintenanceHistory,
  ReportWithDetails,
  ReportListItem,
  CreateReportInput,
  UpdateReportInput,
  ReportFilters,
  Pagination,
  HistoryAction,
  AddImageInput,
} from '../../models/maintenance/index.js'

// ========================================
// INTERFACES INTERNAS (para tipado de queries)
// ========================================

interface ReportRow extends RowDataPacket {
  id: string
  report_date: string
  title: string
  description: string
  location_type: string
  location_description: string
  room_number: string | null
  room_out_of_service: number // MySQL devuelve 0/1
  priority: string
  status: string
  assigned_to: string | null
  assigned_type: string | null
  external_company_name: string | null
  external_contact: string | null
  started_at: string | null
  resolved_at: string | null
  closed_at: string | null
  resolution_notes: string | null
  is_deleted: number // MySQL devuelve 0/1
  deleted_at: string | null
  deleted_by: string | null
  created_by: string
  created_at: string
  updated_by: string | null
  updated_at: string
  // JOINs
  created_by_name?: string
  assigned_to_name?: string
  updated_by_name?: string
  image_count?: number
}

interface ImageRow extends RowDataPacket {
  id: number
  report_id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  public_id: string | null
  auto_delete_on_close: number
  uploaded_by: string
  uploaded_at: string
}

interface HistoryRow extends RowDataPacket {
  id: number
  report_id: string
  action: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  changed_by: string
  changed_at: string
  user_name?: string
}

interface CountRow extends RowDataPacket {
  total: number
}

// ========================================
// HELPERS: Parsear filas de BD a objetos
// ========================================

/**
 * Genera un ID único con formato DDMMYY-XXX
 * Ejemplo: 120625-001, 120625-002, etc.
 */
async function generateReportId(): Promise<string> {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  const datePrefix = `${day}${month}${year}`

  // Buscar el último número del día
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM maintenance_reports 
     WHERE id LIKE ? 
     ORDER BY id DESC 
     LIMIT 1`,
    [`${datePrefix}-%`]
  )

  let sequence = 1
  if (rows.length > 0) {
    const lastId = rows[0].id as string
    const lastSequence = parseInt(lastId.split('-')[1], 10)
    sequence = lastSequence + 1
  }

  return `${datePrefix}-${String(sequence).padStart(3, '0')}`
}

function parseReportRow(row: ReportRow): MaintenanceReport {
  return {
    id: row.id,
    report_date:
      typeof row.report_date === 'string'
        ? row.report_date
        : new Date(row.report_date).toISOString(),
    title: row.title,
    description: row.description,
    location_type: row.location_type as MaintenanceReport['location_type'],
    location_description: row.location_description,
    room_number: row.room_number,
    room_out_of_service: Boolean(row.room_out_of_service),
    priority: row.priority as MaintenanceReport['priority'],
    status: row.status as MaintenanceReport['status'],
    assigned_to: row.assigned_to,
    assigned_type: row.assigned_type as MaintenanceReport['assigned_type'],
    external_company_name: row.external_company_name,
    external_contact: row.external_contact,
    started_at: row.started_at
      ? typeof row.started_at === 'string'
        ? row.started_at
        : new Date(row.started_at).toISOString()
      : null,
    resolved_at: row.resolved_at
      ? typeof row.resolved_at === 'string'
        ? row.resolved_at
        : new Date(row.resolved_at).toISOString()
      : null,
    closed_at: row.closed_at
      ? typeof row.closed_at === 'string'
        ? row.closed_at
        : new Date(row.closed_at).toISOString()
      : null,
    resolution_notes: row.resolution_notes,
    is_deleted: Boolean(row.is_deleted),
    deleted_at: row.deleted_at
      ? typeof row.deleted_at === 'string'
        ? row.deleted_at
        : new Date(row.deleted_at).toISOString()
      : null,
    deleted_by: row.deleted_by,
    created_by: row.created_by,
    created_at:
      typeof row.created_at === 'string' ? row.created_at : new Date(row.created_at).toISOString(),
    updated_by: row.updated_by,
    updated_at: row.updated_at
      ? typeof row.updated_at === 'string'
        ? row.updated_at
        : new Date(row.updated_at).toISOString()
      : (() => {
          throw new Error('MaintenanceReport: updated_at is required but missing/null in DB row')
        })(),
  }
}

function parseReportListItem(row: ReportRow): ReportListItem {
  return {
    ...parseReportRow(row),
    created_by_name: row.created_by_name || undefined,
    assigned_to_name: row.assigned_to_name || undefined,
    image_count: row.image_count || 0,
  }
}

function parseImageRow(row: ImageRow): MaintenanceImage {
  return {
    id: row.id,
    report_id: row.report_id,
    file_name: row.file_name,
    file_path: row.file_path,
    file_size: row.file_size,
    mime_type: row.mime_type,
    public_id: row.public_id,
    auto_delete_on_close: Boolean(row.auto_delete_on_close),
    uploaded_by: row.uploaded_by,
    uploaded_at:
      typeof row.uploaded_at === 'string'
        ? row.uploaded_at
        : new Date(row.uploaded_at).toISOString(),
  }
}

function parseHistoryRow(row: HistoryRow): MaintenanceHistory {
  return {
    id: row.id,
    report_id: row.report_id,
    action: row.action as HistoryAction,
    field_changed: row.field_changed,
    old_value: row.old_value,
    new_value: row.new_value,
    notes: row.notes,
    changed_by: row.changed_by,
    changed_at:
      typeof row.changed_at === 'string' ? row.changed_at : new Date(row.changed_at).toISOString(),
    user_name: row.user_name || undefined,
  }
}

// ========================================
// REPOSITORIO
// ========================================

export class MaintenanceRepository {
  // ========================================
  // REPORTS - CRUD
  // ========================================

  /**
   * Obtener todos los reportes con filtros y paginación
   */
  static async getAll(
    filters: ReportFilters = {}
  ): Promise<{ reports: ReportListItem[]; pagination: Pagination }> {
    const {
      status,
      priority,
      location_type,
      assigned_to,
      created_by,
      room_number,
      search,
      date,
      date_from,
      date_to,
      include_deleted = false,
      page = 1,
      limit = 100,
    } = filters

    // Construir condiciones WHERE una sola vez (se reutiliza en count + data)
    const conditions: string[] = []
    const whereParams: any[] = []

    if (!include_deleted) {
      conditions.push(`r.is_deleted = FALSE`)
    }

    if (status) {
      conditions.push(`r.status = ?`)
      whereParams.push(status)
    }

    if (priority) {
      conditions.push(`r.priority = ?`)
      whereParams.push(priority)
    }

    if (location_type) {
      conditions.push(`r.location_type = ?`)
      whereParams.push(location_type)
    }

    if (assigned_to) {
      conditions.push(`r.assigned_to = ?`)
      whereParams.push(assigned_to)
    }

    if (created_by) {
      conditions.push(`r.created_by = ?`)
      whereParams.push(created_by)
    }

    if (room_number) {
      conditions.push(`r.room_number = ?`)
      whereParams.push(room_number)
    }

    // Búsqueda general: la collation utf8mb4_0900_ai_ci de la tabla
    // ya es accent-insensitive y case-insensitive, no hace falta CAST/LOWER
    if (search && search.trim() !== '') {
      conditions.push(`(
        r.title LIKE ? OR
        r.location_description LIKE ? OR
        r.room_number LIKE ? OR
        r.id LIKE ? OR
        CONCAT_WS(' ', r.location_type, CASE r.location_type
          WHEN 'room' THEN 'Habitacion Room'
          WHEN 'common_area' THEN 'Area Comun Common Area'
          WHEN 'exterior' THEN 'Exterior'
          WHEN 'facilities' THEN 'Instalaciones Facilities'
          WHEN 'other' THEN 'Otro Other'
          ELSE ''
        END) LIKE ?
      )`)
      const searchPattern = `%${search.trim()}%`
      whereParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
    }

    // Filtro por fecha específica (single day)
    if (date) {
      conditions.push(`DATE(r.report_date) = ?`)
      whereParams.push(date)
    }

    // Filtro por rango de fechas (inclusivo en ambos extremos)
    if (date_from && !date) {
      conditions.push(`DATE(r.report_date) >= ?`)
      whereParams.push(date_from)
    }
    if (date_to && !date) {
      conditions.push(`DATE(r.report_date) <= ?`)
      whereParams.push(date_to)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Count query (reutiliza los mismos params)
    const countQuery = `SELECT COUNT(*) as total FROM maintenance_reports r ${whereClause}`
    const [countResult] = await db.query<CountRow[]>(countQuery, whereParams)
    const total = countResult[0]?.total || 0

    // Data query
    const offset = (page - 1) * limit
    const dataQuery = `
      SELECT 
        r.*,
        u1.username as created_by_name,
        u2.username as assigned_to_name,
        (SELECT COUNT(*) FROM maintenance_images WHERE report_id = r.id) as image_count
      FROM maintenance_reports r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      ${whereClause}
      ORDER BY 
        CASE r.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        r.report_date DESC
      LIMIT ? OFFSET ?
    `
    const [rows] = await db.query<ReportRow[]>(dataQuery, [...whereParams, limit, offset])

    // Calcular paginación
    const totalPages = Math.ceil(total / limit)
    const pagination: Pagination = {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    }

    return {
      reports: rows.map(parseReportListItem),
      pagination,
    }
  }

  /**
   * Obtener reporte por ID con imágenes e historial
   */
  static async getById(id: string): Promise<ReportWithDetails | null> {
    // Obtener reporte
    const reportQuery = `
      SELECT 
        r.*,
        u1.username as created_by_name,
        u2.username as assigned_to_name,
        u3.username as updated_by_name
      FROM maintenance_reports r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      LEFT JOIN users u3 ON r.updated_by = u3.id
      WHERE r.id = ?
    `

    const [reportRows] = await db.query<ReportRow[]>(reportQuery, [id])

    if (reportRows.length === 0) {
      return null
    }

    const report = reportRows[0]

    // Obtener imágenes
    const images = await this.getImagesByReportId(id)

    // Obtener historial
    const history = await this.getHistoryByReportId(id)

    return {
      ...parseReportRow(report),
      created_by_name: report.created_by_name || undefined,
      assigned_to_name: report.assigned_to_name || undefined,
      updated_by_name: report.updated_by_name || undefined,
      images,
      history,
    }
  }

  /**
   * Crear nuevo reporte
   */
  static async create(
    data: CreateReportInput,
    userId: string,
    username: string
  ): Promise<ReportWithDetails> {
    // Generar ID con formato DDMMYY-XXX
    const id = await generateReportId()

    const query = `
      INSERT INTO maintenance_reports (
        id,
        title,
        description,
        location_type,
        location_description,
        room_number,
        room_out_of_service,
        priority,
        status,
        assigned_to,
        assigned_type,
        external_company_name,
        external_contact,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reported', ?, ?, ?, ?, ?)
    `

    const params = [
      id,
      data.title,
      data.description,
      data.location_type,
      data.location_description,
      data.room_number || null,
      data.room_out_of_service || false,
      data.priority || 'medium',
      data.assigned_to || null,
      data.assigned_type || null,
      data.external_company_name || null,
      data.external_contact || null,
      userId,
    ]

    await db.query<ResultSetHeader>(query, params)

    // Crear entrada de historial
    await this.addHistoryEntry(id, 'created', userId, username)

    // Si se asignó, agregar entrada de asignación
    if (data.assigned_to || data.external_company_name) {
      await this.addHistoryEntry(id, 'assigned', userId, username, {
        field_changed: 'assigned_to',
        new_value: data.assigned_to || data.external_company_name || null,
      })
    }

    const created = await this.getById(id)
    if (!created) {
      throw new Error('Error al obtener el reporte creado')
    }

    return created
  }

  /**
   * Actualizar reporte existente
   */
  static async update(
    id: string,
    data: UpdateReportInput,
    userId: string,
    username: string
  ): Promise<ReportWithDetails | null> {
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    if (current.is_deleted) {
      throw new Error('No se puede actualizar un reporte eliminado')
    }

    // Detectar campos que cambiaron
    const fields: string[] = []
    const values: any[] = []
    const changes: Array<{ field: string; old: any; new: any }> = []

    const checkAndAdd = (field: string, newValue: any) => {
      const oldValue = (current as any)[field]
      if (newValue !== undefined && newValue !== oldValue) {
        fields.push(`${field} = ?`)
        values.push(newValue)
        changes.push({ field, old: oldValue, new: newValue })
      }
    }

    checkAndAdd('title', data.title)
    checkAndAdd('description', data.description)
    checkAndAdd('location_type', data.location_type)
    checkAndAdd('location_description', data.location_description)
    checkAndAdd('room_number', data.room_number)
    checkAndAdd('room_out_of_service', data.room_out_of_service)
    checkAndAdd('priority', data.priority)
    checkAndAdd('status', data.status)
    checkAndAdd('assigned_to', data.assigned_to)
    checkAndAdd('assigned_type', data.assigned_type)
    checkAndAdd('external_company_name', data.external_company_name)
    checkAndAdd('external_contact', data.external_contact)
    checkAndAdd('resolution_notes', data.resolution_notes)

    if (fields.length === 0) {
      return current
    }

    // Agregar updated_by
    fields.push('updated_by = ?')
    values.push(userId)

    // Ejecutar update
    values.push(id)
    const query = `UPDATE maintenance_reports SET ${fields.join(', ')} WHERE id = ?`
    await db.query<ResultSetHeader>(query, values)

    // Agregar entradas de historial para cada cambio significativo
    for (const change of changes) {
      if (change.field === 'status') {
        await this.addHistoryEntry(id, 'status_changed', userId, username, {
          field_changed: 'status',
          old_value: change.old,
          new_value: change.new,
        })
      } else if (change.field === 'priority') {
        await this.addHistoryEntry(id, 'priority_changed', userId, username, {
          field_changed: 'priority',
          old_value: change.old,
          new_value: change.new,
        })
      } else if (change.field === 'assigned_to' || change.field === 'assigned_type') {
        await this.addHistoryEntry(id, 'assigned', userId, username, {
          field_changed: change.field,
          old_value: change.old,
          new_value: change.new,
        })
      } else {
        await this.addHistoryEntry(id, 'updated', userId, username, {
          field_changed: change.field,
          old_value: String(change.old),
          new_value: String(change.new),
        })
      }
    }

    return this.getById(id)
  }

  /**
   * Actualizar solo el estado
   */
  static async updateStatus(
    id: string,
    status: MaintenanceReport['status'],
    userId: string,
    username: string,
    notes?: string
  ): Promise<ReportWithDetails | null> {
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    if (current.is_deleted) {
      throw new Error('No se puede actualizar un reporte eliminado')
    }

    const oldStatus = current.status

    // Determinar timestamps según el nuevo estado
    let timestampField = ''
    let historyAction: HistoryAction = 'status_changed'

    switch (status) {
      case 'in_progress':
        timestampField = ', started_at = NOW()'
        break
      case 'completed':
        timestampField = ', resolved_at = NOW()'
        historyAction = 'resolved'
        break
      case 'closed':
      case 'canceled':
        timestampField = ', closed_at = NOW()'
        historyAction = 'closed'
        break
    }

    const query = `
      UPDATE maintenance_reports 
      SET status = ?, updated_by = ?${timestampField}
      WHERE id = ?
    `

    await db.query<ResultSetHeader>(query, [status, userId, id])

    // Agregar entrada de historial
    await this.addHistoryEntry(id, historyAction, userId, username, {
      field_changed: 'status',
      old_value: oldStatus,
      new_value: status,
      notes,
    })

    return this.getById(id)
  }

  /**
   * Actualizar solo la prioridad
   */
  static async updatePriority(
    id: string,
    priority: MaintenanceReport['priority'],
    userId: string,
    username: string
  ): Promise<ReportWithDetails | null> {
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    if (current.is_deleted) {
      throw new Error('No se puede actualizar un reporte eliminado')
    }

    const oldPriority = current.priority

    const query = `
      UPDATE maintenance_reports 
      SET priority = ?, updated_by = ?
      WHERE id = ?
    `

    await db.query<ResultSetHeader>(query, [priority, userId, id])

    // Agregar entrada de historial
    await this.addHistoryEntry(id, 'priority_changed', userId, username, {
      field_changed: 'priority',
      old_value: oldPriority,
      new_value: priority,
    })

    return this.getById(id)
  }

  /**
   * Agregar notas de resolución
   */
  static async addResolutionNotes(
    id: string,
    notes: string,
    userId: string,
    username: string
  ): Promise<ReportWithDetails | null> {
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    if (current.is_deleted) {
      throw new Error('No se puede actualizar un reporte eliminado')
    }

    const query = `
      UPDATE maintenance_reports 
      SET resolution_notes = CONCAT(IFNULL(resolution_notes, ''), '\n\n[', NOW(), ' - ', ?, ']\n', ?),
          updated_by = ?
      WHERE id = ?
    `

    await db.query<ResultSetHeader>(query, [username, notes, userId, id])

    // Agregar entrada de historial
    await this.addHistoryEntry(id, 'updated', userId, username, {
      field_changed: 'resolution_notes',
      new_value: notes,
      notes: 'Notas de resolución agregadas',
    })

    return this.getById(id)
  }

  /**
   * Eliminar reporte (soft delete)
   */
  static async delete(id: string, userId: string, username: string): Promise<boolean> {
    const current = await this.getById(id)
    if (!current) {
      return false
    }

    if (current.is_deleted) {
      throw new Error('El reporte ya está eliminado')
    }

    const query = `
      UPDATE maintenance_reports
      SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = ?, updated_by = ?
      WHERE id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [userId, userId, id])

    // Agregar entrada de historial
    await this.addHistoryEntry(id, 'deleted', userId, username)

    return result.affectedRows > 0
  }

  /**
   * Restaurar reporte eliminado
   */
  static async restore(
    id: string,
    userId: string,
    username: string
  ): Promise<ReportWithDetails | null> {
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    if (!current.is_deleted) {
      throw new Error('El reporte no está eliminado')
    }

    const query = `
      UPDATE maintenance_reports
      SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, updated_by = ?
      WHERE id = ?
    `

    await db.query<ResultSetHeader>(query, [userId, id])

    // Agregar entrada de historial
    await this.addHistoryEntry(id, 'restored', userId, username)

    return this.getById(id)
  }

  // ========================================
  // IMAGES
  // ========================================

  /**
   * Obtener imágenes de un reporte
   */
  static async getImagesByReportId(reportId: string): Promise<MaintenanceImage[]> {
    const query = `
      SELECT * FROM maintenance_images
      WHERE report_id = ?
      ORDER BY uploaded_at DESC
    `

    const [rows] = await db.query<ImageRow[]>(query, [reportId])
    return rows.map(parseImageRow)
  }

  /**
   * Agregar imagen a un reporte
   */
  static async addImage(
    reportId: string,
    data: AddImageInput,
    userId: string
  ): Promise<MaintenanceImage> {
    const query = `
      INSERT INTO maintenance_images (
        report_id, file_name, file_path, file_size, mime_type, public_id, auto_delete_on_close, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      reportId,
      data.file_name,
      data.file_path,
      data.file_size,
      data.mime_type,
      data.public_id || null,
      data.auto_delete_on_close ?? true,
      userId,
    ]

    const [result] = await db.query<ResultSetHeader>(query, params)

    const [rows] = await db.query<ImageRow[]>('SELECT * FROM maintenance_images WHERE id = ?', [
      result.insertId,
    ])

    return parseImageRow(rows[0])
  }

  /**
   * Eliminar imagen
   */
  static async deleteImage(imageId: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM maintenance_images WHERE id = ?',
      [imageId]
    )

    return result.affectedRows > 0
  }

  /**
   * Obtener imagen por ID
   */
  static async getImageById(imageId: number): Promise<MaintenanceImage | null> {
    const [rows] = await db.query<ImageRow[]>('SELECT * FROM maintenance_images WHERE id = ?', [
      imageId,
    ])

    if (rows.length === 0) {
      return null
    }

    return parseImageRow(rows[0])
  }

  // ========================================
  // HISTORY
  // ========================================

  /**
   * Obtener historial de un reporte
   */
  static async getHistoryByReportId(reportId: string): Promise<MaintenanceHistory[]> {
    const query = `
      SELECT h.*, u.username as user_name
      FROM maintenance_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.report_id = ?
      ORDER BY h.changed_at DESC
    `

    const [rows] = await db.query<HistoryRow[]>(query, [reportId])
    return rows.map(parseHistoryRow)
  }

  /**
   * Agregar entrada de historial
   */
  static async addHistoryEntry(
    reportId: string,
    action: HistoryAction,
    userId: string,
    _username: string,
    extra?: {
      field_changed?: string
      old_value?: string | null
      new_value?: string | null
      notes?: string
    }
  ): Promise<void> {
    const query = `
      INSERT INTO maintenance_history (
        report_id, action, field_changed, old_value, new_value, notes, changed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      reportId,
      action,
      extra?.field_changed || null,
      extra?.old_value || null,
      extra?.new_value || null,
      extra?.notes || null,
      userId,
    ]

    await db.query<ResultSetHeader>(query, params)
  }

  // ========================================
  // STATS
  // ========================================

  /**
   * Obtener estadísticas generales
   */
  static async getStats(): Promise<{
    total: number
    by_status: Record<string, number>
    by_priority: Record<string, number>
    by_location: Record<string, number>
    rooms_out_of_service: number
  }> {
    const queries = {
      total: `SELECT COUNT(*) as total FROM maintenance_reports WHERE is_deleted = FALSE`,
      byStatus: `
        SELECT status, COUNT(*) as count 
        FROM maintenance_reports 
        WHERE is_deleted = FALSE 
        GROUP BY status
      `,
      byPriority: `
        SELECT priority, COUNT(*) as count 
        FROM maintenance_reports 
        WHERE is_deleted = FALSE 
        GROUP BY priority
      `,
      byLocation: `
        SELECT location_type, COUNT(*) as count 
        FROM maintenance_reports 
        WHERE is_deleted = FALSE 
        GROUP BY location_type
      `,
      roomsOut: `
        SELECT COUNT(*) as total 
        FROM maintenance_reports 
        WHERE is_deleted = FALSE 
          AND room_out_of_service = TRUE 
          AND status NOT IN ('completed', 'closed', 'canceled')
      `,
    }

    const [totalResult] = await db.query<CountRow[]>(queries.total)
    const [statusResult] = await db.query<RowDataPacket[]>(queries.byStatus)
    const [priorityResult] = await db.query<RowDataPacket[]>(queries.byPriority)
    const [locationResult] = await db.query<RowDataPacket[]>(queries.byLocation)
    const [roomsResult] = await db.query<CountRow[]>(queries.roomsOut)

    const byStatus: Record<string, number> = {}
    for (const row of statusResult) {
      byStatus[row.status] = row.count
    }

    const byPriority: Record<string, number> = {}
    for (const row of priorityResult) {
      byPriority[row.priority] = row.count
    }

    const byLocation: Record<string, number> = {}
    for (const row of locationResult) {
      byLocation[row.location_type] = row.count
    }

    return {
      total: totalResult[0]?.total || 0,
      by_status: byStatus,
      by_priority: byPriority,
      by_location: byLocation,
      rooms_out_of_service: roomsResult[0]?.total || 0,
    }
  }
}
