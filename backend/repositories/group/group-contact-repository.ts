// repositories/group/group-contact-repository.ts

import db from '../../config/db'
import {
  GroupContact,
  CreateGroupContactDTO,
  UpdateGroupContactDTO,
} from '../../models/group/index'
import { ResultSetHeader } from 'mysql2'

export class GroupContactRepository {
  /**
   * Obtener contactos de un grupo
   */
  static async getByGroupId(groupId: number): Promise<GroupContact[]> {
    const query = `
      SELECT * FROM group_contacts
      WHERE group_id = ?
      ORDER BY is_primary DESC, contact_name ASC
    `

    const [rows] = await db.query<GroupContact[]>(query, [groupId])
    return rows
  }

  /**
   * Obtener contacto por ID
   */
  static async getById(id: number): Promise<GroupContact | null> {
    const query = `SELECT * FROM group_contacts WHERE id = ?`
    const [rows] = await db.query<GroupContact[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Crear contacto
   */
  static async create(
    contactData: CreateGroupContactDTO
  ): Promise<GroupContact> {
    const {
      group_id,
      contact_name,
      contact_email,
      contact_phone,
      is_primary = false,
    } = contactData

    const query = `
      INSERT INTO group_contacts (group_id, contact_name, contact_email, contact_phone, is_primary)
      VALUES (?, ?, ?, ?, ?)
    `

    const [result] = await db.query<ResultSetHeader>(query, [
      group_id,
      contact_name,
      contact_email,
      contact_phone,
      is_primary,
    ])

    const createdContact = await this.getById(result.insertId)

    if (!createdContact) {
      throw new Error('Error al recuperar el contacto creado')
    }

    return createdContact
  }

  /**
   * Actualizar contacto
   */
  static async update(
    id: number,
    contactData: UpdateGroupContactDTO
  ): Promise<boolean> {
    const fields: string[] = []
    const values: any[] = []

    Object.entries(contactData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'group_id') {
        fields.push(`${key} = ?`)
        values.push(value)
      }
    })

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar')
    }

    values.push(id)

    const query = `UPDATE group_contacts SET ${fields.join(
      ', '
    )}, updated_at = NOW() WHERE id = ?`
    const [result] = await db.query<ResultSetHeader>(query, values)

    return result.affectedRows > 0
  }

  /**
   * Eliminar contacto
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM group_contacts WHERE id = ?',
      [id]
    )
    return result.affectedRows > 0
  }

  /**
   * Obtener contacto principal de un grupo
   */
  static async getPrimaryContact(
    groupId: number
  ): Promise<GroupContact | null> {
    const query = `
      SELECT * FROM group_contacts
      WHERE group_id = ? AND is_primary = 1
      LIMIT 1
    `

    const [rows] = await db.query<GroupContact[]>(query, [groupId])
    return rows[0] || null
  }
}
