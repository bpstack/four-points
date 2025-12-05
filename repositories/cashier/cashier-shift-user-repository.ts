// repositories/cashier/cashier-shift-user-repository.ts

import db from '../../config/db.js'

export class CashierShiftUserRepository {
  /**
   * Obtener todos los responsables de un turno
   */
  static async getByShiftId(shiftId: number): Promise<
    Array<{
      user_id: string
      username: string
      is_primary: boolean
    }>
  > {
    const query = `
      SELECT 
        csu.user_id,
        csu.is_primary,
        u.username
      FROM cashier_shift_users csu
      INNER JOIN users u ON csu.user_id = u.id
      WHERE csu.shift_id = ?
      ORDER BY csu.is_primary DESC, u.username ASC
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return rows
  }

  /**
   * Obtener el responsable principal de un turno
   */
  static async getPrimaryUser(shiftId: number): Promise<string | null> {
    const query = `
      SELECT user_id 
      FROM cashier_shift_users 
      WHERE shift_id = ? AND is_primary = 1
      LIMIT 1
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return rows[0]?.user_id || null
  }

  /**
   * Verificar si un usuario es responsable de un turno
   */
  static async isUserInShift(
    shiftId: number,
    userId: string
  ): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count 
      FROM cashier_shift_users 
      WHERE shift_id = ? AND user_id = ?
    `

    const [rows] = await db.query<any[]>(query, [shiftId, userId])
    return (rows[0]?.count || 0) > 0
  }

  /**
   * Añadir responsable a un turno
   */
  static async addUser(
    shiftId: number,
    userId: string,
    isPrimary: boolean = false
  ): Promise<void> {
    const query = `
      INSERT INTO cashier_shift_users (shift_id, user_id, is_primary)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)
    `

    await db.query(query, [shiftId, userId, isPrimary ? 1 : 0])
  }

  /**
   * Establecer responsables de un turno (reemplaza todos)
   */
  static async setUsers(
    shiftId: number,
    primaryUserId: string,
    secondaryUserIds: string[] = []
  ): Promise<void> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Eliminar responsables existentes
      await connection.query(
        'DELETE FROM cashier_shift_users WHERE shift_id = ?',
        [shiftId]
      )

      // Añadir responsable principal
      await connection.query(
        'INSERT INTO cashier_shift_users (shift_id, user_id, is_primary) VALUES (?, ?, 1)',
        [shiftId, primaryUserId]
      )

      // Añadir responsables secundarios
      if (secondaryUserIds.length > 0) {
        const values = secondaryUserIds.map((userId) => [shiftId, userId, 0])
        await connection.query(
          'INSERT INTO cashier_shift_users (shift_id, user_id, is_primary) VALUES ?',
          [values]
        )
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Eliminar responsable de un turno
   */
  static async removeUser(shiftId: number, userId: string): Promise<void> {
    await db.query(
      'DELETE FROM cashier_shift_users WHERE shift_id = ? AND user_id = ?',
      [shiftId, userId]
    )
  }

  /**
   * Eliminar todos los responsables de un turno
   */
  static async removeAllUsers(shiftId: number): Promise<void> {
    await db.query('DELETE FROM cashier_shift_users WHERE shift_id = ?', [
      shiftId,
    ])
  }

  /**
   * Contar responsables de un turno
   */
  static async count(shiftId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as total 
      FROM cashier_shift_users 
      WHERE shift_id = ?
    `

    const [rows] = await db.query<any[]>(query, [shiftId])
    return rows[0]?.total || 0
  }

  /**
   * Obtener turnos donde un usuario es responsable
   */
  static async getShiftsByUser(
    userId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<number[]> {
    let query = `
      SELECT DISTINCT csu.shift_id
      FROM cashier_shift_users csu
      INNER JOIN cashier_shifts cs ON csu.shift_id = cs.id
      WHERE csu.user_id = ?
    `

    const params: any[] = [userId]

    if (fromDate) {
      query += ' AND cs.shift_date >= ?'
      params.push(fromDate)
    }

    if (toDate) {
      query += ' AND cs.shift_date <= ?'
      params.push(toDate)
    }

    query += ' ORDER BY cs.shift_date DESC'

    const [rows] = await db.query<any[]>(query, params)
    return rows.map((r) => r.shift_id)
  }
}
