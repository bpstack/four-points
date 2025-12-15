// repositories/group/group-history-repository.ts

import db from '../../config/db'
import { GroupHistory, HistoryWithUser, CreateGroupHistoryDTO } from '../../models/group/index'
import { ResultSetHeader } from 'mysql2'

export class GroupHistoryRepository {
  /**
   * Obtener historial de un grupo
   */
  static async getByGroupId(groupId: number, limit: number = 100): Promise<HistoryWithUser[]> {
    const query = `
      SELECT 
        gh.*,
        u.username as changed_by_username
      FROM group_history gh
      LEFT JOIN users u ON gh.changed_by = u.id
      WHERE gh.group_id = ?
      ORDER BY gh.changed_at DESC
      LIMIT ?
    `

    const [rows] = await db.query<HistoryWithUser[]>(query, [groupId, limit])
    return rows
  }

  /**
   * Crear registro en historial
   */
  static async create(historyData: CreateGroupHistoryDTO): Promise<GroupHistory> {
    const {
      group_id,
      action,
      table_affected,
      record_id,
      field_changed,
      old_value,
      new_value,
      changed_by,
      notes,
    } = historyData

    const query = `
      INSERT INTO group_history 
      (group_id, action, table_affected, record_id, field_changed, old_value, new_value, changed_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      group_id,
      action,
      table_affected,
      record_id,
      field_changed,
      old_value,
      new_value,
      changed_by,
      notes,
    ])

    // Obtener el registro creado
    const createdHistory = await this.getById(result.insertId)

    if (!createdHistory) {
      throw new Error('Error al recuperar el historial creado')
    }

    return createdHistory
  }

  /**
   * Obtener registro de historial por ID
   */
  private static async getById(id: number): Promise<GroupHistory | null> {
    const query = `SELECT * FROM group_history WHERE id = ?`
    const [rows] = await db.query<GroupHistory[]>(query, [id])
    return rows[0] || null
  }
}
