// repositories/activity/activity-repository.ts
/**
 * Repositorio unificado para actividad reciente
 * Combina historial de: cashier, groups, logbook, maintenance
 */

import db from '../../config/db.js'
import { RowDataPacket } from 'mysql2'

// ========================================
// TYPES
// ========================================

export type ActivitySource = 'cashier' | 'groups' | 'logbook' | 'maintenance'

export interface UnifiedActivity {
  id: string
  source: ActivitySource
  action: string
  user_id: string
  username: string
  timestamp: string
  // Identificador del registro relacionado
  record_id: string | number | null
}

interface ActivityRow extends RowDataPacket {
  id: number | string
  source: ActivitySource
  action: string
  user_id: string
  username: string
  timestamp: string
  record_id: string | number | null
}

// ========================================
// REPOSITORY
// ========================================

export class ActivityRepository {
  /**
   * Obtener actividad reciente unificada de todas las fuentes
   * Ordena por timestamp DESC y limita resultados
   */
  static async getRecentActivity(limit: number = 5): Promise<UnifiedActivity[]> {
    // Query unificada usando UNION ALL
    // Usamos COLLATE utf8mb4_0900_ai_ci para Aiven MySQL
    const query = `
      SELECT * FROM (
        SELECT 
          ch.id as id,
          'cashier' COLLATE utf8mb4_0900_ai_ci as source,
          ch.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(ch.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u1.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          ch.changed_at as timestamp,
          CAST(ch.shift_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM cashier_history ch
        LEFT JOIN users u1 ON ch.changed_by = u1.id
        
        UNION ALL
        
        SELECT 
          gh.id as id,
          'groups' COLLATE utf8mb4_0900_ai_ci as source,
          gh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(gh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u2.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          gh.changed_at as timestamp,
          CAST(gh.group_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM group_history gh
        LEFT JOIN users u2 ON gh.changed_by = u2.id
        
        UNION ALL
        
        SELECT 
          lh.id as id,
          'logbook' COLLATE utf8mb4_0900_ai_ci as source,
          lh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(lh.editor_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u3.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          lh.created_at as timestamp,
          CAST(lh.logbook_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM logbook_history lh
        LEFT JOIN users u3 ON lh.editor_id = u3.id
        
        UNION ALL
        
        SELECT 
          mh.id as id,
          'maintenance' COLLATE utf8mb4_0900_ai_ci as source,
          mh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(mh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u4.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          mh.changed_at as timestamp,
          mh.report_id COLLATE utf8mb4_0900_ai_ci as record_id
        FROM maintenance_history mh
        LEFT JOIN users u4 ON mh.changed_by = u4.id
      ) AS combined
      ORDER BY timestamp DESC
      LIMIT ?
    `

    const [rows] = await db.query<ActivityRow[]>(query, [limit])

    return rows.map((row) => ({
      id: `${row.source}-${row.id}`,
      source: row.source,
      action: row.action,
      user_id: row.user_id,
      username: row.username,
      timestamp: new Date(row.timestamp).toISOString(),
      record_id: row.record_id,
    }))
  }

  /**
   * Obtener actividad filtrada por fuente específica
   */
  static async getActivityBySource(
    source: ActivitySource,
    limit: number = 10
  ): Promise<UnifiedActivity[]> {
    let query: string
    const params: (string | number)[] = [limit]

    switch (source) {
      case 'cashier':
        query = `
          SELECT 
            ch.id as id,
            'cashier' COLLATE utf8mb4_0900_ai_ci as source,
            ch.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(ch.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            ch.changed_at as timestamp,
            CAST(ch.shift_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
          FROM cashier_history ch
          LEFT JOIN users u ON ch.changed_by = u.id
          ORDER BY ch.changed_at DESC
          LIMIT ?
        `
        break

      case 'groups':
        query = `
          SELECT 
            gh.id as id,
            'groups' COLLATE utf8mb4_0900_ai_ci as source,
            gh.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(gh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            gh.changed_at as timestamp,
            CAST(gh.group_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
          FROM group_history gh
          LEFT JOIN users u ON gh.changed_by = u.id
          ORDER BY gh.changed_at DESC
          LIMIT ?
        `
        break

      case 'logbook':
        query = `
          SELECT 
            lh.id as id,
            'logbook' COLLATE utf8mb4_0900_ai_ci as source,
            lh.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(lh.editor_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            lh.created_at as timestamp,
            CAST(lh.logbook_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
          FROM logbook_history lh
          LEFT JOIN users u ON lh.editor_id = u.id
          ORDER BY lh.created_at DESC
          LIMIT ?
        `
        break

      case 'maintenance':
        query = `
          SELECT 
            mh.id as id,
            'maintenance' COLLATE utf8mb4_0900_ai_ci as source,
            mh.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(mh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            mh.changed_at as timestamp,
            mh.report_id COLLATE utf8mb4_0900_ai_ci as record_id
          FROM maintenance_history mh
          LEFT JOIN users u ON mh.changed_by = u.id
          ORDER BY mh.changed_at DESC
          LIMIT ?
        `
        break
    }

    const [rows] = await db.query<ActivityRow[]>(query, params)

    return rows.map((row) => ({
      id: `${row.source}-${row.id}`,
      source: row.source,
      action: row.action,
      user_id: row.user_id,
      username: row.username,
      timestamp: new Date(row.timestamp).toISOString(),
      record_id: row.record_id,
    }))
  }

  /**
   * Obtener actividad filtrada por fecha específica (fecha de la actividad)
   * Filtra por DATE(timestamp) = date
   */
  static async getActivityByDate(
    date: string,
    limit: number = 50,
    source?: ActivitySource
  ): Promise<UnifiedActivity[]> {
    // Si hay filtro de fuente, usar query específica
    if (source) {
      return this.getActivityByDateAndSource(date, source, limit)
    }

    // Query unificada con filtro de fecha
    const query = `
      SELECT * FROM (
        SELECT 
          ch.id as id,
          'cashier' COLLATE utf8mb4_0900_ai_ci as source,
          ch.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(ch.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u1.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          ch.changed_at as timestamp,
          CAST(ch.shift_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM cashier_history ch
        LEFT JOIN users u1 ON ch.changed_by = u1.id
        WHERE DATE(ch.changed_at) = ?
        
        UNION ALL
        
        SELECT 
          gh.id as id,
          'groups' COLLATE utf8mb4_0900_ai_ci as source,
          gh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(gh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u2.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          gh.changed_at as timestamp,
          CAST(gh.group_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM group_history gh
        LEFT JOIN users u2 ON gh.changed_by = u2.id
        WHERE DATE(gh.changed_at) = ?
        
        UNION ALL
        
        SELECT 
          lh.id as id,
          'logbook' COLLATE utf8mb4_0900_ai_ci as source,
          lh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(lh.editor_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u3.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          lh.created_at as timestamp,
          CAST(lh.logbook_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM logbook_history lh
        LEFT JOIN users u3 ON lh.editor_id = u3.id
        WHERE DATE(lh.created_at) = ?
        
        UNION ALL
        
        SELECT 
          mh.id as id,
          'maintenance' COLLATE utf8mb4_0900_ai_ci as source,
          mh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(mh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u4.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          mh.changed_at as timestamp,
          mh.report_id COLLATE utf8mb4_0900_ai_ci as record_id
        FROM maintenance_history mh
        LEFT JOIN users u4 ON mh.changed_by = u4.id
        WHERE DATE(mh.changed_at) = ?
      ) AS combined
      ORDER BY timestamp DESC
      LIMIT ?
    `

    const [rows] = await db.query<ActivityRow[]>(query, [date, date, date, date, limit])

    return rows.map((row) => ({
      id: `${row.source}-${row.id}`,
      source: row.source,
      action: row.action,
      user_id: row.user_id,
      username: row.username,
      timestamp: new Date(row.timestamp).toISOString(),
      record_id: row.record_id,
    }))
  }

  /**
   * Obtener actividad filtrada por fecha y fuente específica
   */
  private static async getActivityByDateAndSource(
    date: string,
    source: ActivitySource,
    limit: number = 50
  ): Promise<UnifiedActivity[]> {
    let query: string
    let timestampField: string

    switch (source) {
      case 'cashier':
        timestampField = 'ch.changed_at'
        query = `
          SELECT 
            ch.id as id,
            'cashier' COLLATE utf8mb4_0900_ai_ci as source,
            ch.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(ch.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            ch.changed_at as timestamp,
            CAST(ch.shift_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
          FROM cashier_history ch
          LEFT JOIN users u ON ch.changed_by = u.id
          WHERE DATE(${timestampField}) = ?
          ORDER BY ${timestampField} DESC
          LIMIT ?
        `
        break

      case 'groups':
        timestampField = 'gh.changed_at'
        query = `
          SELECT 
            gh.id as id,
            'groups' COLLATE utf8mb4_0900_ai_ci as source,
            gh.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(gh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            gh.changed_at as timestamp,
            CAST(gh.group_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
          FROM group_history gh
          LEFT JOIN users u ON gh.changed_by = u.id
          WHERE DATE(${timestampField}) = ?
          ORDER BY ${timestampField} DESC
          LIMIT ?
        `
        break

      case 'logbook':
        timestampField = 'lh.created_at'
        query = `
          SELECT 
            lh.id as id,
            'logbook' COLLATE utf8mb4_0900_ai_ci as source,
            lh.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(lh.editor_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            lh.created_at as timestamp,
            CAST(lh.logbook_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
          FROM logbook_history lh
          LEFT JOIN users u ON lh.editor_id = u.id
          WHERE DATE(${timestampField}) = ?
          ORDER BY ${timestampField} DESC
          LIMIT ?
        `
        break

      case 'maintenance':
        timestampField = 'mh.changed_at'
        query = `
          SELECT 
            mh.id as id,
            'maintenance' COLLATE utf8mb4_0900_ai_ci as source,
            mh.action COLLATE utf8mb4_0900_ai_ci as action,
            CAST(mh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
            COALESCE(u.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
            mh.changed_at as timestamp,
            mh.report_id COLLATE utf8mb4_0900_ai_ci as record_id
          FROM maintenance_history mh
          LEFT JOIN users u ON mh.changed_by = u.id
          WHERE DATE(${timestampField}) = ?
          ORDER BY ${timestampField} DESC
          LIMIT ?
        `
        break
    }

    const [rows] = await db.query<ActivityRow[]>(query, [date, limit])

    return rows.map((row) => ({
      id: `${row.source}-${row.id}`,
      source: row.source,
      action: row.action,
      user_id: row.user_id,
      username: row.username,
      timestamp: new Date(row.timestamp).toISOString(),
      record_id: row.record_id,
    }))
  }

  /**
   * Obtener actividad de un usuario específico
   */
  static async getActivityByUser(userId: string, limit: number = 10): Promise<UnifiedActivity[]> {
    const query = `
      SELECT * FROM (
        SELECT 
          ch.id as id,
          'cashier' COLLATE utf8mb4_0900_ai_ci as source,
          ch.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(ch.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u1.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          ch.changed_at as timestamp,
          CAST(ch.shift_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM cashier_history ch
        LEFT JOIN users u1 ON ch.changed_by = u1.id
        WHERE ch.changed_by = ?
        
        UNION ALL
        
        SELECT 
          gh.id as id,
          'groups' COLLATE utf8mb4_0900_ai_ci as source,
          gh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(gh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u2.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          gh.changed_at as timestamp,
          CAST(gh.group_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM group_history gh
        LEFT JOIN users u2 ON gh.changed_by = u2.id
        WHERE gh.changed_by = ?
        
        UNION ALL
        
        SELECT 
          lh.id as id,
          'logbook' COLLATE utf8mb4_0900_ai_ci as source,
          lh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(lh.editor_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u3.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          lh.created_at as timestamp,
          CAST(lh.logbook_id AS CHAR) COLLATE utf8mb4_0900_ai_ci as record_id
        FROM logbook_history lh
        LEFT JOIN users u3 ON lh.editor_id = u3.id
        WHERE lh.editor_id = ?
        
        UNION ALL
        
        SELECT 
          mh.id as id,
          'maintenance' COLLATE utf8mb4_0900_ai_ci as source,
          mh.action COLLATE utf8mb4_0900_ai_ci as action,
          CAST(mh.changed_by AS CHAR) COLLATE utf8mb4_0900_ai_ci as user_id,
          COALESCE(u4.username, 'Sistema') COLLATE utf8mb4_0900_ai_ci as username,
          mh.changed_at as timestamp,
          mh.report_id COLLATE utf8mb4_0900_ai_ci as record_id
        FROM maintenance_history mh
        LEFT JOIN users u4 ON mh.changed_by = u4.id
        WHERE mh.changed_by = ?
      ) AS combined
      ORDER BY timestamp DESC
      LIMIT ?
    `

    const [rows] = await db.query<ActivityRow[]>(query, [
      userId,
      userId,
      userId,
      userId,
      limit,
    ])

    return rows.map((row) => ({
      id: `${row.source}-${row.id}`,
      source: row.source,
      action: row.action,
      user_id: row.user_id,
      username: row.username,
      timestamp: new Date(row.timestamp).toISOString(),
      record_id: row.record_id,
    }))
  }
}
