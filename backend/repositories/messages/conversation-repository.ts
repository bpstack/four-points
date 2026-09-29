// repositories/messages/conversation-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import {
  Conversation,
  ConversationWithDetails,
  ParticipantWithUser,
  ConversationType,
  UserSearchResult,
  IdResult,
  CountResult,
  UserIdResult,
} from '../../models/messages/index.js'

export class ConversationRepository {
  // ===============================================
  // CONVERSATIONS
  // ===============================================

  /**
   * Crear una nueva conversacion
   */
  static async create(
    type: ConversationType,
    createdBy: string,
    name?: string
  ): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (type, name, created_by)
      VALUES (?, ?, ?)
    `
    const [result] = await db.query<ResultSetHeader>(query, [type, name || null, createdBy])

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al crear conversacion')

    return created
  }

  /**
   * Obtener conversacion por ID
   */
  static async getById(id: number): Promise<Conversation | null> {
    const query = `SELECT * FROM conversations WHERE id = ?`
    const [rows] = await db.query<Conversation[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener conversacion con detalles para un usuario
   */
  static async getByIdWithDetails(
    conversationId: number,
    userId: string
  ): Promise<ConversationWithDetails | null> {
    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id AND is_active = 1) as participant_count,
        (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (
          SELECT COUNT(*) FROM messages m
          JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
          WHERE m.conversation_id = c.id
            AND cp.user_id = ?
            AND cp.is_active = 1
            AND m.sender_id != ?
            AND m.deleted_at IS NULL
            AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
        ) as unread_count,
        -- Para DMs: obtener info del otro usuario
        CASE WHEN c.type = 'dm' THEN (
          SELECT u.id FROM users u
          JOIN conversation_participants cp ON cp.user_id = u.id
          WHERE cp.conversation_id = c.id AND cp.is_active = 1 AND u.id != ?
          LIMIT 1
        ) END as other_user_id,
        CASE WHEN c.type = 'dm' THEN (
          SELECT u.username FROM users u
          JOIN conversation_participants cp ON cp.user_id = u.id
          WHERE cp.conversation_id = c.id AND cp.is_active = 1 AND u.id != ?
          LIMIT 1
        ) END as other_username,
        CASE WHEN c.type = 'dm' THEN (
          SELECT r.name FROM users u
          JOIN conversation_participants cp ON cp.user_id = u.id
          JOIN roles r ON r.id = u.role_id
          WHERE cp.conversation_id = c.id AND cp.is_active = 1 AND u.id != ?
          LIMIT 1
        ) END as other_role
      FROM conversations c
      WHERE c.id = ?
    `

    const [rows] = await db.query<ConversationWithDetails[]>(query, [
      userId,
      userId,
      userId,
      userId,
      userId,
      conversationId,
    ])
    return rows[0] || null
  }

  /**
   * Listar conversaciones de un usuario
   */
  static async getByUserId(userId: string): Promise<ConversationWithDetails[]> {
    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id AND is_active = 1) as participant_count,
        (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id != ?
            AND m.deleted_at IS NULL
            AND (cp_main.last_read_at IS NULL OR m.created_at > cp_main.last_read_at)
        ) as unread_count,
        -- Para DMs: obtener info del otro usuario
        CASE WHEN c.type = 'dm' THEN (
          SELECT u.id FROM users u
          JOIN conversation_participants cp ON cp.user_id = u.id
          WHERE cp.conversation_id = c.id AND cp.is_active = 1 AND u.id != ?
          LIMIT 1
        ) END as other_user_id,
        CASE WHEN c.type = 'dm' THEN (
          SELECT u.username FROM users u
          JOIN conversation_participants cp ON cp.user_id = u.id
          WHERE cp.conversation_id = c.id AND cp.is_active = 1 AND u.id != ?
          LIMIT 1
        ) END as other_username,
        CASE WHEN c.type = 'dm' THEN (
          SELECT r.name FROM users u
          JOIN conversation_participants cp ON cp.user_id = u.id
          JOIN roles r ON r.id = u.role_id
          WHERE cp.conversation_id = c.id AND cp.is_active = 1 AND u.id != ?
          LIMIT 1
        ) END as other_role
      FROM conversations c
      JOIN conversation_participants cp_main ON cp_main.conversation_id = c.id
      WHERE cp_main.user_id = ? AND cp_main.is_active = 1
      ORDER BY 
        COALESCE(
          (SELECT created_at FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1),
          c.created_at
        ) DESC
    `

    const [rows] = await db.query<ConversationWithDetails[]>(query, [
      userId,
      userId,
      userId,
      userId,
      userId,
    ])
    return rows
  }

  /**
   * Buscar DM existente entre dos usuarios
   */
  static async findExistingDM(userId1: string, userId2: string): Promise<number | null> {
    const query = `
      SELECT c.id
      FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
      WHERE c.type = 'dm'
        AND cp1.user_id = ? AND cp1.is_active = 1
        AND cp2.user_id = ? AND cp2.is_active = 1
      LIMIT 1
    `
    const [rows] = await db.query<IdResult[]>(query, [userId1, userId2])
    return rows[0]?.id || null
  }

  /**
   * Actualizar nombre de grupo
   */
  static async updateName(conversationId: number, name: string): Promise<boolean> {
    const query = `UPDATE conversations SET name = ? WHERE id = ? AND type = 'group'`
    const [result] = await db.query<ResultSetHeader>(query, [name, conversationId])
    return result.affectedRows > 0
  }

  /**
   * Eliminar conversacion (solo si no tiene mensajes o admin lo solicita)
   */
  static async delete(conversationId: number): Promise<boolean> {
    const query = `DELETE FROM conversations WHERE id = ?`
    const [result] = await db.query<ResultSetHeader>(query, [conversationId])
    return result.affectedRows > 0
  }

  /**
   * Eliminar conversacion completa con todos sus mensajes
   * Solo el admin de la conversacion o admin del sistema puede hacerlo
   */
  static async deleteComplete(conversationId: number): Promise<boolean> {
    // Los mensajes se eliminan por CASCADE en la FK
    const query = `DELETE FROM conversations WHERE id = ?`
    const [result] = await db.query<ResultSetHeader>(query, [conversationId])
    return result.affectedRows > 0
  }

  /**
   * Obtener todas las conversaciones (para admin)
   */
  static async getAll(limit: number = 100): Promise<ConversationWithDetails[]> {
    const query = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id AND is_active = 1) as participant_count,
        (SELECT content FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM conversations c
      ORDER BY c.updated_at DESC
      LIMIT ?
    `
    const [rows] = await db.query<ConversationWithDetails[]>(query, [limit])
    return rows
  }

  // ===============================================
  // PARTICIPANTS
  // ===============================================

  /**
   * Añadir participante a conversacion
   */
  static async addParticipant(
    conversationId: number,
    userId: string,
    isAdmin: boolean = false
  ): Promise<boolean> {
    const query = `
      INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE is_active = 1, joined_at = CURRENT_TIMESTAMP
    `
    const [result] = await db.query<ResultSetHeader>(query, [
      conversationId,
      userId,
      isAdmin ? 1 : 0,
    ])
    return result.affectedRows > 0
  }

  /**
   * Añadir multiples participantes
   */
  static async addParticipants(
    conversationId: number,
    userIds: string[],
    adminId?: string
  ): Promise<void> {
    if (!userIds || userIds.length === 0) return

    const values = userIds.map((userId) => [conversationId, userId, userId === adminId ? 1 : 0])
    const query = `
      INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
      VALUES ?
      ON DUPLICATE KEY UPDATE is_active = 1, joined_at = CURRENT_TIMESTAMP
    `
    await db.query(query, [values])
  }

  /**
   * Remover participante (soft: is_active = 0)
   */
  static async removeParticipant(conversationId: number, userId: string): Promise<boolean> {
    const query = `
      UPDATE conversation_participants 
      SET is_active = 0 
      WHERE conversation_id = ? AND user_id = ?
    `
    const [result] = await db.query<ResultSetHeader>(query, [conversationId, userId])
    return result.affectedRows > 0
  }

  /**
   * Verificar si usuario es participante activo
   */
  static async isParticipant(conversationId: number, userId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = ? AND user_id = ? AND is_active = 1
    `
    const [rows] = await db.query<any[]>(query, [conversationId, userId])
    return rows.length > 0
  }

  /**
   * Verificar si usuario es admin de la conversacion
   */
  static async isAdmin(conversationId: number, userId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = ? AND user_id = ? AND is_admin = 1 AND is_active = 1
    `
    const [rows] = await db.query<any[]>(query, [conversationId, userId])
    return rows.length > 0
  }

  /**
   * Obtener participantes de una conversacion
   */
  static async getParticipants(conversationId: number): Promise<ParticipantWithUser[]> {
    const query = `
      SELECT 
        cp.*,
        u.username,
        u.email,
        r.name as role_name
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      JOIN roles r ON r.id = u.role_id
      WHERE cp.conversation_id = ? AND cp.is_active = 1
      ORDER BY cp.is_admin DESC, cp.joined_at ASC
    `
    const [rows] = await db.query<ParticipantWithUser[]>(query, [conversationId])
    return rows
  }

  /**
   * Contar participantes activos
   */
  static async countParticipants(conversationId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM conversation_participants 
      WHERE conversation_id = ? AND is_active = 1
    `
    const [rows] = await db.query<CountResult[]>(query, [conversationId])
    return rows[0]?.count || 0
  }

  /**
   * Actualizar last_read_at para un participante
   */
  static async updateLastRead(conversationId: number, userId: string): Promise<boolean> {
    const query = `
      UPDATE conversation_participants 
      SET last_read_at = CURRENT_TIMESTAMP 
      WHERE conversation_id = ? AND user_id = ?
    `
    const [result] = await db.query<ResultSetHeader>(query, [conversationId, userId])
    return result.affectedRows > 0
  }

  /**
   * Transferir admin al siguiente participante mas antiguo
   */
  static async transferAdmin(
    conversationId: number,
    currentAdminId: string
  ): Promise<string | null> {
    // Buscar el participante mas antiguo que no sea el admin actual
    const query = `
      SELECT user_id FROM conversation_participants
      WHERE conversation_id = ? AND user_id != ? AND is_active = 1
      ORDER BY joined_at ASC
      LIMIT 1
    `
    const [rows] = await db.query<UserIdResult[]>(query, [conversationId, currentAdminId])

    if (rows.length === 0) return null

    const newAdminId = rows[0].user_id

    // Actualizar admin
    await db.query(
      `UPDATE conversation_participants SET is_admin = 0 WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, currentAdminId]
    )
    await db.query(
      `UPDATE conversation_participants SET is_admin = 1 WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, newAdminId]
    )

    return newAdminId
  }

  // ===============================================
  // USER SEARCH
  // ===============================================

  /**
   * Buscar usuarios para iniciar conversacion
   */
  static async searchUsers(
    searchTerm: string,
    currentUserId: string,
    limit: number = 20
  ): Promise<UserSearchResult[]> {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        r.name as role_name,
        (
          SELECT c.id FROM conversations c
          JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
          JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
          WHERE c.type = 'dm'
            AND cp1.user_id = ? AND cp1.is_active = 1
            AND cp2.user_id = u.id AND cp2.is_active = 1
          LIMIT 1
        ) as existing_dm_id
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id != ?
        AND u.is_active = 1
        AND (u.username LIKE ? OR u.email LIKE ?)
      ORDER BY u.username ASC
      LIMIT ?
    `
    const searchPattern = `%${searchTerm}%`
    const [rows] = await db.query<UserSearchResult[]>(query, [
      currentUserId,
      currentUserId,
      searchPattern,
      searchPattern,
      limit,
    ])
    return rows
  }

  /**
   * Obtener todos los usuarios (para nueva conversacion)
   */
  static async getAllUsers(currentUserId: string): Promise<UserSearchResult[]> {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        r.name as role_name,
        (
          SELECT c.id FROM conversations c
          JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
          JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
          WHERE c.type = 'dm'
            AND cp1.user_id = ? AND cp1.is_active = 1
            AND cp2.user_id = u.id AND cp2.is_active = 1
          LIMIT 1
        ) as existing_dm_id
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id != ? AND u.is_active = 1
      ORDER BY u.username ASC
    `
    const [rows] = await db.query<UserSearchResult[]>(query, [currentUserId, currentUserId])
    return rows
  }
}
