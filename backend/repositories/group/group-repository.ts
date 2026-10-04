// repositories/group/group-repository.ts

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
  Group,
  GroupWithDetails,
  CreateGroupDTO,
  UpdateGroupDTO,
  GroupFilters,
  DashboardOverview,
  GroupTimeline,
  GroupStatus,
} from '../../models/group/index'
import { ResultSetHeader } from 'mysql2'
import { buildSetClause } from '../shared/update-columns.js'
import { GROUP_SORT_FIELDS } from '../../validations/group/group-schemas.js'
import { likeContains } from '../shared/like.js'

export class GroupRepository {
  /**
   * Obtener todos los grupos con filtros opcionales
   */
  static async getAll(filters: GroupFilters = {}): Promise<Group[]> {
    let query = `
    SELECT 
      g.*,
      u1.username as created_by_username,
      u2.username as updated_by_username
    FROM hotel_groups g
    LEFT JOIN users u1 ON g.created_by = u1.id
    LEFT JOIN users u2 ON g.updated_by = u2.id
    WHERE 1=1
  `
    const params: (string | number | Date)[] = []

    // Filtros dinámicos
    if (filters.status) {
      query += ` AND g.status = ?`
      params.push(filters.status)
    }

    if (filters.arrival_from) {
      query += ` AND g.arrival_date >= ?`
      params.push(filters.arrival_from)
    }

    if (filters.arrival_to) {
      query += ` AND g.arrival_date <= ?`
      params.push(filters.arrival_to)
    }

    if (filters.departure_from) {
      query += ` AND g.departure_date >= ?`
      params.push(filters.departure_from)
    }

    if (filters.departure_to) {
      query += ` AND g.departure_date <= ?`
      params.push(filters.departure_to)
    }

    if (filters.agency) {
      query += ` AND g.agency LIKE ?`
      params.push(likeContains(filters.agency))
    }

    // Interpolated into SQL: only allow-listed values
    const sortField = GROUP_SORT_FIELDS.includes(filters.sort as never)
      ? filters.sort
      : 'arrival_date'
    const sortOrder = filters.order === 'DESC' ? 'DESC' : 'ASC'
    query += ` ORDER BY g.${sortField} ${sortOrder}`

    // Paginación
    if (filters.limit) {
      query += ` LIMIT ?`
      params.push(filters.limit)

      if (filters.offset) {
        query += ` OFFSET ?`
        params.push(filters.offset)
      }
    }

    const [rows] = await db.query<Group[]>(query, params)
    return rows
  }

  /**
   * Obtener grupo por ID con toda su información relacionada
   */
  static async getById(id: number): Promise<GroupWithDetails | null> {
    const query = `
    SELECT 
      g.*,
      u1.username as created_by_username,
      u2.username as updated_by_username,
      gs.booking_confirmed,
      gs.booking_confirmed_date,
      gs.contract_signed,
      gs.contract_signed_date,
      gs.rooming_status,
      gs.rooming_requested_date,
      gs.rooming_received_date,
      gs.balance_status,
      gs.balance_requested_date,
      gs.balance_paid_date
    FROM hotel_groups g
    LEFT JOIN users u1 ON g.created_by = u1.id
    LEFT JOIN users u2 ON g.updated_by = u2.id
    LEFT JOIN group_status gs ON g.id = gs.group_id
    WHERE g.id = ?
  `

    const [rows] = await db.query<GroupWithDetails[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Crear nuevo grupo
   */
  static async create(groupData: CreateGroupDTO): Promise<Group> {
    const {
      name,
      agency,
      arrival_date,
      departure_date,
      status = 'pending',
      total_amount,
      currency = 'EUR',
      notes,
      created_by,
    } = groupData

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Insertar grupo
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO hotel_groups 
        (name, agency, arrival_date, departure_date, status, total_amount, currency, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          agency,
          arrival_date,
          departure_date,
          status,
          total_amount,
          currency,
          notes,
          created_by,
        ]
      )

      const groupId = result.insertId

      // Crear registro en group_status automáticamente
      await connection.query(`INSERT INTO group_status (group_id) VALUES (?)`, [groupId])

      await connection.commit()

      // Obtener el grupo creado
      const createdGroup = await this.getById(groupId)

      if (!createdGroup) {
        throw new Error('Error al recuperar el grupo creado')
      }

      return createdGroup as Group
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Actualizar grupo
   * ✅ CAMBIO: Ahora sincroniza booking_confirmed cuando cambia el status
   */
  static async update(id: number, groupData: UpdateGroupDTO): Promise<Group | null> {
    const { fields, values } = buildSetClause(groupData, [
      'name',
      'agency',
      'arrival_date',
      'departure_date',
      'status',
      'total_amount',
      'currency',
      'notes',
      'updated_by',
    ])

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    values.push(id)

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // 1. Actualizar el grupo
      const query = `UPDATE hotel_groups SET ${fields.join(', ')} WHERE id = ?`
      await connection.query<ResultSetHeader>(query, values)

      // 2. ✅ SINCRONIZAR: Si se cambió el status, actualizar booking_confirmed
      if (groupData.status !== undefined) {
        if (groupData.status === 'confirmed') {
          // Status confirmed → marcar booking
          await connection.query<ResultSetHeader>(
            `UPDATE group_status 
            SET booking_confirmed = TRUE,
                booking_confirmed_date = COALESCE(booking_confirmed_date, NOW())
            WHERE group_id = ?`,
            [id]
          )
        } else {
          // Status diferente a confirmed → desmarcar booking
          await connection.query<ResultSetHeader>(
            `UPDATE group_status 
            SET booking_confirmed = FALSE,
                booking_confirmed_date = NULL
            WHERE group_id = ?`,
            [id]
          )
        }
      }

      await connection.commit()

      // Obtener el grupo actualizado
      return (await this.getById(id)) as Group
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Actualizar solo el status del grupo
   */
  static async updateStatus(id: number, status: GroupStatus): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>(
      'UPDATE hotel_groups SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    )
    return result.affectedRows > 0
  }

  /**
   * Eliminar grupo
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM hotel_groups WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  /**
   * Obtener resumen general para dashboard
   */
  static async getDashboardOverview(): Promise<DashboardOverview> {
    const query = `
    SELECT 
      COUNT(*) as total_groups,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_groups,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_groups,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_groups,
      SUM(total_amount) as total_revenue
    FROM hotel_groups
    WHERE status != 'cancelled'
  `

    const [rows] = await db.query<DashboardOverview[]>(query)
    return rows[0]
  }

  /**
   * Obtener timeline de grupos por año
   */
  static async getTimeline(year: number): Promise<GroupTimeline[]> {
    const query = `
    SELECT 
      g.id,
      g.name,
      g.agency,
      g.arrival_date,
      g.departure_date,
      g.status,
      g.total_amount,
      DATE_FORMAT(g.arrival_date, '%Y-%m') as month
    FROM hotel_groups g
    WHERE YEAR(g.arrival_date) = ?
    ORDER BY g.arrival_date ASC
  `

    const [rows] = await db.query<GroupTimeline[]>(query, [year])
    return rows
  }

  // ═══════════════════════════════════════════════════════
  // MÉTODOS PARA NOTIFICACIONES AUTOMÁTICAS
  // ═══════════════════════════════════════════════════════

  /**
   * Obtener grupos con llegada próxima (en X días)
   * Solo grupos confirmados o en progreso que no estén cancelados
   */
  static async getUpcomingArrivals(days: number = 3): Promise<GroupWithDetails[]> {
    const query = `
      SELECT 
        g.*,
        gs.rooming_status,
        gs.rooming_received_date,
        DATEDIFF(g.arrival_date, CURDATE()) as days_until_arrival
      FROM hotel_groups g
      LEFT JOIN group_status gs ON g.id = gs.group_id
      WHERE g.status IN ('confirmed', 'in_progress')
      AND g.arrival_date = DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY g.arrival_date ASC
    `

    const [rows] = await db.query<GroupWithDetails[]>(query, [days])
    return rows
  }

  /**
   * Obtener grupos con rooming list pendiente
   * Grupos confirmados donde rooming_status != 'received' y llegada próxima
   */
  static async getPendingRoomingLists(daysBeforeArrival: number = 15): Promise<GroupWithDetails[]> {
    const query = `
      SELECT 
        g.*,
        gs.rooming_status,
        DATEDIFF(g.arrival_date, CURDATE()) as days_until_arrival
      FROM hotel_groups g
      LEFT JOIN group_status gs ON g.id = gs.group_id
      WHERE g.status IN ('confirmed', 'in_progress')
      AND (gs.rooming_status IS NULL OR gs.rooming_status != 'received')
      AND g.arrival_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY g.arrival_date ASC
    `

    const [rows] = await db.query<GroupWithDetails[]>(query, [daysBeforeArrival])
    return rows
  }
}
