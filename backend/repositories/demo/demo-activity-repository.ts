// repositories/demo/demo-activity-repository.ts
/**
 * Repositorio para registrar y consultar actividad de usuarios demo
 * Registra intentos de escritura bloqueados para análisis
 */

import db from '../../config/db.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { likeContains } from '../shared/like.js'

// ========================================
// TYPES
// ========================================

export interface DemoActivityLog {
  id: number
  timestamp: string
  user_id: string | null
  username: string | null
  method: string
  route: string
  body_preview: string | null
  ip_address: string | null
  user_agent: string | null
  blocked: boolean
}

export interface DemoActivityInput {
  user_id?: string | null
  username?: string | null
  method: string
  route: string
  body_preview?: string | null
  ip_address?: string | null
  user_agent?: string | null
  blocked?: boolean
}

export interface DemoActivityStats {
  total_blocked: number
  unique_users: number
  most_attempted_routes: Array<{ route: string; count: number }>
  activity_by_day: Array<{ date: string; count: number }>
}

interface DemoActivityRow extends RowDataPacket {
  id: number
  timestamp: Date
  user_id: string | null
  username: string | null
  method: string
  route: string
  body_preview: string | null
  ip_address: string | null
  user_agent: string | null
  blocked: boolean
}

interface CountRow extends RowDataPacket {
  count: number
}

interface RouteCountRow extends RowDataPacket {
  route: string
  count: number
}

interface DayCountRow extends RowDataPacket {
  date: string
  count: number
}

// ========================================
// REPOSITORY
// ========================================

export class DemoActivityRepository {
  /**
   * Registrar un intento de actividad demo (bloqueado o permitido)
   */
  static async logActivity(input: DemoActivityInput): Promise<number> {
    const query = `
      INSERT INTO demo_activity_log 
        (user_id, username, method, route, body_preview, ip_address, user_agent, blocked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      input.user_id || null,
      input.username || null,
      input.method,
      input.route,
      input.body_preview || null,
      input.ip_address || null,
      input.user_agent || null,
      input.blocked ?? true,
    ])

    return result.insertId
  }

  /**
   * Obtener logs de actividad demo con paginación
   */
  static async getLogs(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      username?: string
      method?: string
      route?: string
      startDate?: string
      endDate?: string
      blocked?: boolean
    }
  ): Promise<{ logs: DemoActivityLog[]; total: number }> {
    let whereClause = 'WHERE 1=1'
    const params: (string | number | boolean)[] = []

    if (filters?.username) {
      whereClause += ' AND username LIKE ?'
      params.push(likeContains(filters.username))
    }

    if (filters?.method) {
      whereClause += ' AND method = ?'
      params.push(filters.method)
    }

    if (filters?.route) {
      whereClause += ' AND route LIKE ?'
      params.push(likeContains(filters.route))
    }

    if (filters?.startDate) {
      whereClause += ' AND DATE(timestamp) >= ?'
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      whereClause += ' AND DATE(timestamp) <= ?'
      params.push(filters.endDate)
    }

    if (filters?.blocked !== undefined) {
      whereClause += ' AND blocked = ?'
      params.push(filters.blocked)
    }

    // Count total
    const countQuery = `SELECT COUNT(*) as count FROM demo_activity_log ${whereClause}`
    const [countResult] = await db.query<CountRow[]>(countQuery, params)
    const total = countResult[0]?.count || 0

    // Get logs
    const query = `
      SELECT * FROM demo_activity_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `

    const [rows] = await db.query<DemoActivityRow[]>(query, [...params, limit, offset])

    const logs: DemoActivityLog[] = rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toISOString(),
      user_id: row.user_id,
      username: row.username,
      method: row.method,
      route: row.route,
      body_preview: row.body_preview,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      blocked: Boolean(row.blocked),
    }))

    return { logs, total }
  }

  /**
   * Obtener estadísticas de actividad demo
   */
  static async getStats(days: number = 30): Promise<DemoActivityStats> {
    // Total blocked
    const [totalResult] = await db.query<CountRow[]>(
      'SELECT COUNT(*) as count FROM demo_activity_log WHERE blocked = TRUE AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    )
    const total_blocked = totalResult[0]?.count || 0

    // Unique users
    const [usersResult] = await db.query<CountRow[]>(
      'SELECT COUNT(DISTINCT username) as count FROM demo_activity_log WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    )
    const unique_users = usersResult[0]?.count || 0

    // Most attempted routes
    const [routesResult] = await db.query<RouteCountRow[]>(
      `SELECT route, COUNT(*) as count 
       FROM demo_activity_log 
       WHERE blocked = TRUE AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY route 
       ORDER BY count DESC 
       LIMIT 10`,
      [days]
    )
    const most_attempted_routes = routesResult.map((r) => ({
      route: r.route,
      count: r.count,
    }))

    // Activity by day
    const [daysResult] = await db.query<DayCountRow[]>(
      `SELECT DATE(timestamp) as date, COUNT(*) as count 
       FROM demo_activity_log 
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(timestamp) 
       ORDER BY date DESC`,
      [days]
    )
    const activity_by_day = daysResult.map((d) => ({
      date: d.date,
      count: d.count,
    }))

    return {
      total_blocked,
      unique_users,
      most_attempted_routes,
      activity_by_day,
    }
  }

  /**
   * Exportar logs a formato markdown (para registrosDemo.md)
   */
  static async exportToMarkdown(limit: number = 100): Promise<string> {
    const { logs } = await this.getLogs(limit, 0, { blocked: true })

    let markdown = `# Registro de Intentos Demo Bloqueados

Este archivo registra los intentos de escritura bloqueados para usuarios demo.
Generado automáticamente desde la base de datos.

| Timestamp | Usuario | Método | Ruta | Body (truncado) |
|-----------|---------|--------|------|-----------------|
`

    for (const log of logs) {
      const bodyPreview = log.body_preview
        ? log.body_preview.substring(0, 100).replace(/\|/g, '\\|')
        : '{}'
      markdown += `| ${log.timestamp} | ${log.username || 'unknown'} | ${log.method} | ${log.route} | ${bodyPreview} |\n`
    }

    return markdown
  }

  /**
   * Limpiar logs antiguos (más de X días)
   */
  static async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM demo_activity_log WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysToKeep]
    )
    return result.affectedRows
  }
}
