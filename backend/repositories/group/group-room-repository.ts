// repositories/group/group-room-repository.ts

import db from '../../config/db'
import {
  GroupRoom,
  CreateGroupRoomDTO,
  UpdateGroupRoomDTO,
  RoomsSummary,
} from '../../models/group/index'
import { ResultSetHeader } from 'mysql2'
import { buildSetClause } from '../shared/update-columns.js'

export class GroupRoomRepository {
  /**
   * Obtener habitaciones de un grupo
   */
  static async getByGroupId(groupId: number): Promise<GroupRoom[]> {
    const query = `
      SELECT * FROM group_rooms
      WHERE group_id = ?
      ORDER BY room_type
    `

    const [rows] = await db.query<GroupRoom[]>(query, [groupId])
    return rows
  }

  /**
   * Obtener habitación por ID
   */
  static async getById(id: number): Promise<GroupRoom | null> {
    const query = `SELECT * FROM group_rooms WHERE id = ?`
    const [rows] = await db.query<GroupRoom[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Crear o actualizar habitación (UPSERT)
   */
  static async createOrUpdate(roomData: CreateGroupRoomDTO): Promise<ResultSetHeader> {
    const { group_id, room_type, quantity, guests_per_room = 1, notes } = roomData

    const query = `
      INSERT INTO group_rooms (group_id, room_type, quantity, guests_per_room, notes)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = VALUES(quantity),
        guests_per_room = VALUES(guests_per_room),
        notes = VALUES(notes),
        updated_at = NOW()
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      group_id,
      room_type,
      quantity,
      guests_per_room,
      notes,
    ])

    return result
  }

  /**
   * Actualizar habitación
   */
  static async update(id: number, roomData: UpdateGroupRoomDTO): Promise<boolean> {
    const { fields, values } = buildSetClause(roomData, [
      'room_type',
      'quantity',
      'guests_per_room',
      'notes',
    ])

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    values.push(id)

    const query = `UPDATE group_rooms SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`
    const [result] = await db.query<ResultSetHeader>(query, values)

    return result.affectedRows > 0
  }

  /**
   * Eliminar habitación
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM group_rooms WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  /**
   * Obtener total de habitaciones de un grupo
   */
  static async getTotalRoomsByGroup(groupId: number): Promise<RoomsSummary> {
    const query = `
      SELECT 
        SUM(quantity) as total_rooms,
        SUM(quantity * guests_per_room) as total_guests
      FROM group_rooms
      WHERE group_id = ?
    `

    const [rows] = await db.query<RoomsSummary[]>(query, [groupId])
    return rows[0]
  }
}
