// src/repositories/blacklist/blacklist-repository.ts
/**
 * Repositorio para el módulo Blacklist
 * Acceso a datos con MySQL
 */

import db from '../../config/db.js'
import crypto from 'crypto'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type {
  BlacklistEntry,
  AuditEntry,
  CreateBlacklistDTO,
  UpdateBlacklistDTO,
  BlacklistFilters,
  PaginationInfo,
  BlacklistStats,
} from '../../models/blacklist/index.js'
import { likeContains } from '../shared/like.js'
import { toBlacklistImagePath } from '../../services/uploads/blacklist-images.js'

// ========================================
// INTERFACES INTERNAS (para tipado de queries)
// ========================================

interface BlacklistRow extends RowDataPacket {
  id: number
  guest_name: string
  document_type: 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
  document_number: string
  check_in_date: string
  check_out_date: string
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  comments: string
  images: string // JSON string
  status: 'ACTIVE' | 'DELETED'
  deleted_at: string | null
  deleted_by: string | null
  created_by: string
  created_at: string
  updated_at: string
  audit_trail: string | null // JSON string
  created_by_username: string | null
  deleted_by_username: string | null
}

interface CountRow extends RowDataPacket {
  total: number
}

interface SeverityCountRow extends RowDataPacket {
  severity: string
  count: number
}

// ========================================
// HELPER: Parsear fila de BD a objeto
// ========================================

function parseBlacklistRow(row: BlacklistRow): BlacklistEntry {
  return {
    id: row.id,
    guest_name: row.guest_name,
    document_type: row.document_type,
    document_number: row.document_number,
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    reason: row.reason,
    severity: row.severity,
    comments: row.comments,
    // API paths, never Cloudinary URLs (services/uploads/blacklist-images.ts)
    images: ((typeof row.images === 'string' ? JSON.parse(row.images) : row.images) as string[])
      .map(toBlacklistImagePath)
      .filter((path): path is string => path !== null),
    status: row.status,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    audit_trail:
      typeof row.audit_trail === 'string' ? JSON.parse(row.audit_trail) : row.audit_trail,
    created_by_username: row.created_by_username || undefined,
    deleted_by_username: row.deleted_by_username || undefined,
  }
}

// ========================================
// REPOSITORIO
// ========================================

export class BlacklistRepository {
  /**
   * Obtener todos los registros con filtros y paginación
   */
  static async getAll(
    filters: BlacklistFilters = {}
  ): Promise<{ entries: BlacklistEntry[]; pagination: PaginationInfo }> {
    const {
      q,
      document,
      severity,
      status = 'ACTIVE',
      from_date,
      to_date,
      page = 1,
      limit = 50,
    } = filters

    // Construir WHERE dinámico
    let query = `
      SELECT 
        b.*,
        u1.username as created_by_username,
        u2.username as deleted_by_username
      FROM blacklist_entries b
      LEFT JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.deleted_by = u2.id
      WHERE 1=1
    `
    const params: (string | number)[] = []

    // Filtro por status
    if (status !== 'ALL') {
      query += ` AND b.status = ?`
      params.push(status)
    }

    // Búsqueda general (nombre o documento)
    if (q) {
      query += ` AND (b.guest_name LIKE ? OR b.document_number LIKE ?)`
      params.push(likeContains(q), likeContains(q))
    }

    // Filtro por documento específico
    if (document) {
      query += ` AND b.document_number LIKE ?`
      params.push(likeContains(document))
    }

    // Filtro por severidad
    if (severity) {
      query += ` AND b.severity = ?`
      params.push(severity)
    }

    // Filtro por rango de fechas (check_in_date)
    if (from_date) {
      query += ` AND b.check_in_date >= ?`
      params.push(from_date)
    }
    if (to_date) {
      query += ` AND b.check_in_date <= ?`
      params.push(to_date)
    }

    // Query para contar total (mismos filtros)
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM')

    const [countResult] = await db.query<CountRow[]>(countQuery, params)
    const total = countResult[0]?.total || 0

    // Agregar ordenamiento y paginación
    query += ` ORDER BY b.created_at DESC`
    const offset = (page - 1) * limit
    query += ` LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const [rows] = await db.query<BlacklistRow[]>(query, params)

    // Calcular paginación
    const totalPages = Math.ceil(total / limit)
    const pagination: PaginationInfo = {
      current_page: page,
      total_pages: totalPages,
      total_entries: total,
      per_page: limit,
      has_next: page < totalPages,
      has_prev: page > 1,
    }

    return {
      entries: rows.map(parseBlacklistRow),
      pagination,
    }
  }

  /**
   * Obtener registro por ID
   */
  static async getById(id: number): Promise<BlacklistEntry | null> {
    const query = `
      SELECT 
        b.*,
        u1.username as created_by_username,
        u2.username as deleted_by_username
      FROM blacklist_entries b
      LEFT JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.deleted_by = u2.id
      WHERE b.id = ?
    `

    const [rows] = await db.query<BlacklistRow[]>(query, [id])

    if (rows.length === 0) {
      return null
    }

    return parseBlacklistRow(rows[0])
  }

  /**
   * Crear nuevo registro
   */
  static async create(
    data: CreateBlacklistDTO,
    userId: string,
    username: string
  ): Promise<BlacklistEntry> {
    // Crear audit trail inicial
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      action: 'CREATE',
      changed_by: userId,
      changed_by_username: username,
      timestamp: new Date().toISOString(),
      changes: null,
    }

    const query = `
      INSERT INTO blacklist_entries (
        guest_name,
        document_type,
        document_number,
        check_in_date,
        check_out_date,
        reason,
        severity,
        comments,
        images,
        status,
        created_by,
        audit_trail
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `

    const params = [
      data.guest_name,
      data.document_type,
      data.document_number,
      data.check_in_date,
      data.check_out_date,
      data.reason,
      data.severity,
      data.comments,
      JSON.stringify(data.images),
      userId,
      JSON.stringify([auditEntry]),
    ]

    const [result] = await db.query<ResultSetHeader>(query, params)

    // Obtener el registro creado
    const created = await this.getById(result.insertId)
    if (!created) {
      throw new Error('Error al obtener el registro creado')
    }

    return created
  }

  /**
   * Actualizar registro existente
   */
  static async update(
    id: number,
    data: UpdateBlacklistDTO,
    userId: string,
    username: string
  ): Promise<BlacklistEntry | null> {
    // Obtener registro actual para comparar cambios
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    // Solo permitir actualizar registros activos
    if (current.status === 'DELETED') {
      throw new Error('No se puede actualizar un registro eliminado')
    }

    // Detectar campos que cambiaron
    const changes: Record<string, { old: unknown; new: unknown }> = {}
    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.guest_name !== undefined && data.guest_name !== current.guest_name) {
      changes.guest_name = { old: current.guest_name, new: data.guest_name }
      fields.push('guest_name = ?')
      values.push(data.guest_name)
    }

    if (data.document_type !== undefined && data.document_type !== current.document_type) {
      changes.document_type = {
        old: current.document_type,
        new: data.document_type,
      }
      fields.push('document_type = ?')
      values.push(data.document_type)
    }

    if (data.document_number !== undefined && data.document_number !== current.document_number) {
      changes.document_number = {
        old: current.document_number,
        new: data.document_number,
      }
      fields.push('document_number = ?')
      values.push(data.document_number)
    }

    if (data.check_in_date !== undefined && data.check_in_date !== current.check_in_date) {
      changes.check_in_date = {
        old: current.check_in_date,
        new: data.check_in_date,
      }
      fields.push('check_in_date = ?')
      values.push(data.check_in_date)
    }

    if (data.check_out_date !== undefined && data.check_out_date !== current.check_out_date) {
      changes.check_out_date = {
        old: current.check_out_date,
        new: data.check_out_date,
      }
      fields.push('check_out_date = ?')
      values.push(data.check_out_date)
    }

    if (data.reason !== undefined && data.reason !== current.reason) {
      changes.reason = { old: current.reason, new: data.reason }
      fields.push('reason = ?')
      values.push(data.reason)
    }

    if (data.severity !== undefined && data.severity !== current.severity) {
      changes.severity = { old: current.severity, new: data.severity }
      fields.push('severity = ?')
      values.push(data.severity)
    }

    if (data.comments !== undefined && data.comments !== current.comments) {
      changes.comments = { old: current.comments, new: data.comments }
      fields.push('comments = ?')
      values.push(data.comments)
    }

    if (data.images !== undefined) {
      const currentImages = JSON.stringify(current.images)
      const newImages = JSON.stringify(data.images)
      if (currentImages !== newImages) {
        changes.images = { old: current.images, new: data.images }
        fields.push('images = ?')
        values.push(newImages)
      }
    }

    // Si no hay cambios, retornar el registro actual
    if (fields.length === 0) {
      return current
    }

    // Crear entrada de audit trail
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      action: 'UPDATE',
      changed_by: userId,
      changed_by_username: username,
      timestamp: new Date().toISOString(),
      changes,
    }

    // Agregar audit trail al update
    const currentAudit = current.audit_trail || []
    const newAudit = [...currentAudit, auditEntry]
    fields.push('audit_trail = ?')
    values.push(JSON.stringify(newAudit))

    // Ejecutar update
    values.push(id)
    const query = `UPDATE blacklist_entries SET ${fields.join(', ')} WHERE id = ?`

    await db.query<ResultSetHeader>(query, values)

    return this.getById(id)
  }

  /**
   * Eliminar registro (soft delete)
   */
  static async delete(id: number, userId: string, username: string): Promise<boolean> {
    const current = await this.getById(id)
    if (!current) {
      return false
    }

    if (current.status === 'DELETED') {
      throw new Error('El registro ya está eliminado')
    }

    // Crear entrada de audit trail
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      action: 'DELETE',
      changed_by: userId,
      changed_by_username: username,
      timestamp: new Date().toISOString(),
      changes: null,
    }

    const currentAudit = current.audit_trail || []
    const newAudit = [...currentAudit, auditEntry]

    const query = `
      UPDATE blacklist_entries
      SET 
        status = 'DELETED',
        deleted_at = NOW(),
        deleted_by = ?,
        audit_trail = ?
      WHERE id = ?
    `

    const [result] = await db.query<ResultSetHeader>(query, [userId, JSON.stringify(newAudit), id])

    return result.affectedRows > 0
  }

  /**
   * Restaurar registro eliminado
   */
  static async restore(
    id: number,
    userId: string,
    username: string
  ): Promise<BlacklistEntry | null> {
    const current = await this.getById(id)
    if (!current) {
      return null
    }

    if (current.status === 'ACTIVE') {
      throw new Error('El registro ya está activo')
    }

    // Crear entrada de audit trail
    const auditEntry: AuditEntry = {
      id: crypto.randomUUID(),
      action: 'RESTORE',
      changed_by: userId,
      changed_by_username: username,
      timestamp: new Date().toISOString(),
      changes: null,
    }

    const currentAudit = current.audit_trail || []
    const newAudit = [...currentAudit, auditEntry]

    const query = `
      UPDATE blacklist_entries
      SET 
        status = 'ACTIVE',
        deleted_at = NULL,
        deleted_by = NULL,
        audit_trail = ?
      WHERE id = ?
    `

    await db.query<ResultSetHeader>(query, [JSON.stringify(newAudit), id])

    return this.getById(id)
  }

  /**
   * Verificar si existe un documento en blacklist activa
   */
  static async existsByDocument(documentNumber: string, excludeId?: number): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as total
      FROM blacklist_entries
      WHERE document_number = ? AND status = 'ACTIVE'
    `
    const params: (string | number)[] = [documentNumber]

    if (excludeId) {
      query += ' AND id != ?'
      params.push(excludeId)
    }

    const [rows] = await db.query<CountRow[]>(query, params)
    return (rows[0]?.total || 0) > 0
  }

  /**
   * Obtener estadísticas generales
   */
  static async getStats(): Promise<BlacklistStats> {
    // Total y activos/eliminados
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'DELETED' THEN 1 ELSE 0 END) as deleted
      FROM blacklist_entries
    `

    // Por severidad (solo activos)
    const severityQuery = `
      SELECT severity, COUNT(*) as count
      FROM blacklist_entries
      WHERE status = 'ACTIVE'
      GROUP BY severity
    `

    // Registros recientes
    const recentQuery = `
      SELECT 
        b.*,
        u1.username as created_by_username,
        u2.username as deleted_by_username
      FROM blacklist_entries b
      LEFT JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.deleted_by = u2.id
      WHERE b.status = 'ACTIVE'
      ORDER BY b.created_at DESC
      LIMIT 5
    `

    const [countResult] = await db.query<RowDataPacket[]>(countQuery)
    const [severityResult] = await db.query<SeverityCountRow[]>(severityQuery)
    const [recentResult] = await db.query<BlacklistRow[]>(recentQuery)

    const counts = countResult[0] || { total: 0, active: 0, deleted: 0 }

    const bySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    }
    for (const row of severityResult) {
      bySeverity[row.severity] = row.count
    }

    return {
      total_entries: Number(counts.total),
      active_entries: Number(counts.active),
      deleted_entries: Number(counts.deleted),
      by_severity: bySeverity as Record<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', number>,
      recent_entries: recentResult.map(parseBlacklistRow),
    }
  }
}
