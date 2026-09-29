// repositories/group/group-status-repository.ts

// TODO (Estado unificado):
// Actualmente existe lógica de sincronización entre hotel_groups.status
// y group_status.booking_confirmed porque ambas tablas duplican el estado del grupo.
// Cuando se elimine esta duplicidad en la base de datos:
//   1. ELIMINAR toda la lógica de sincronización.
//   2. Unificar el estado en una sola tabla (decidir entre hotel_groups o group_status).
//   3. Simplificar updateGroup() y updateBooking() para evitar actualizaciones cruzadas.
//   4. Actualizar modelos, DTOs y store del frontend.
// IMPORTANTE: Este archivo depende directamente del diseño actual duplicado.

import db from '../../config/db'
import {
  GroupStatusRecord,
  UpdateBookingDTO,
  UpdateContractDTO,
  UpdateRoomingDTO,
  UpdateBalanceDTO,
} from '../../models/group/index'
import { ResultSetHeader } from 'mysql2'

export class GroupStatusRepository {
  /**
   * Obtener estado de un grupo
   */
  static async getByGroupId(groupId: number): Promise<GroupStatusRecord | null> {
    const query = `SELECT * FROM group_status WHERE group_id = ?`
    const [rows] = await db.query<GroupStatusRecord[]>(query, [groupId])
    return rows[0] || null
  }

  /**
   * Actualizar solo bloqueo/confirmación
   */
  static async updateBooking(groupId: number, bookingData: UpdateBookingDTO): Promise<boolean> {
    const { confirmed, date } = bookingData

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // 1. Actualizar booking en group_status
      const confirmDate = confirmed ? date || new Date() : null
      await connection.query<ResultSetHeader>(
        `UPDATE group_status 
      SET booking_confirmed = ?, 
          booking_confirmed_date = ?
      WHERE group_id = ?`,
        [confirmed, confirmDate, groupId]
      )

      // 2. ✅ SINCRONIZAR: Actualizar group.status
      if (confirmed) {
        await connection.query<ResultSetHeader>(
          `UPDATE hotel_groups 
        SET status = 'confirmed', 
            updated_at = NOW() 
        WHERE id = ?`,
          [groupId]
        )
      } else {
        await connection.query<ResultSetHeader>(
          `UPDATE hotel_groups 
        SET status = 'pending', 
            updated_at = NOW() 
        WHERE id = ?`,
          [groupId]
        )
      }

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Actualizar solo contrato
   */
  static async updateContract(groupId: number, contractData: UpdateContractDTO): Promise<boolean> {
    const { signed, date } = contractData

    const query = `
      UPDATE group_status 
      SET contract_signed = ?, contract_signed_date = ?
      WHERE group_id = ?
    `

    const signDate = signed ? date || new Date() : null
    const [result] = await db.query<ResultSetHeader>(query, [signed, signDate, groupId])
    return result.affectedRows > 0
  }

  /**
   * Actualizar solo rooming list
   */
  static async updateRooming(groupId: number, roomingData: UpdateRoomingDTO): Promise<boolean> {
    const { rooming_status, rooming_requested_date, rooming_received_date } = roomingData

    const fields: string[] = []
    const values: any[] = []

    // ✅ CAMBIO 1: SIEMPRE actualizar el status
    if (rooming_status !== undefined) {
      fields.push('rooming_status = ?')
      values.push(rooming_status)
    }

    // ✅ CAMBIO 2: SIEMPRE actualizar las fechas (incluso si son undefined)
    // Convertir undefined/null/'' a NULL en la base de datos
    fields.push('rooming_requested_date = ?')
    values.push(rooming_requested_date || null)

    fields.push('rooming_received_date = ?')
    values.push(rooming_received_date || null)

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    values.push(groupId)

    const query = `UPDATE group_status SET ${fields.join(', ')} WHERE group_id = ?`

    const [result] = await db.query<ResultSetHeader>(query, values)

    return result.affectedRows > 0
  }

  /**
   * Actualizar solo balance
   */
  static async updateBalance(groupId: number, balanceData: UpdateBalanceDTO): Promise<boolean> {
    const { balance_status, balance_requested_date, balance_paid_date } = balanceData

    const fields: string[] = []
    const values: any[] = []

    if (balance_status !== undefined) {
      fields.push('balance_status = ?')
      values.push(balance_status)

      if (balance_status === 'requested' && !balance_requested_date) {
        fields.push('balance_requested_date = NOW()')
      }

      if (balance_status === 'paid' && !balance_paid_date) {
        fields.push('balance_paid_date = NOW()')
      }
    }

    if (balance_requested_date !== undefined) {
      fields.push('balance_requested_date = ?')
      values.push(balance_requested_date)
    }

    if (balance_paid_date !== undefined) {
      fields.push('balance_paid_date = ?')
      values.push(balance_paid_date)
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    values.push(groupId)

    const query = `UPDATE group_status SET ${fields.join(', ')} WHERE group_id = ?`
    const [result] = await db.query<ResultSetHeader>(query, values)

    return result.affectedRows > 0
  }
}
