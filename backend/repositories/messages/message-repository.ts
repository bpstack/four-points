// repositories/messages/message-repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { likeContains } from '../../services/search/search-access.js'
import {
  Message,
  MessageWithSender,
  MessageFilters,
  MESSAGE_CONSTANTS,
  CountResult,
  IdResult,
  UnreadByConversationResult,
} from '../../models/messages/index.js'

export class MessageRepository {
  // ===============================================
  // MESSAGES CRUD
  // ===============================================

  /**
   * Crear mensaje
   */
  static async create(
    conversationId: number,
    senderId: string,
    content: string,
    notify: boolean = false
  ): Promise<Message> {
    const query = `
      INSERT INTO messages (conversation_id, sender_id, content, notify)
      VALUES (?, ?, ?, ?)
    `
    const [result] = await db.query<ResultSetHeader>(query, [
      conversationId,
      senderId,
      content,
      notify ? 1 : 0,
    ])

    // Actualizar updated_at de la conversacion
    await db.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      conversationId,
    ])

    const created = await this.getById(result.insertId)
    if (!created) throw new Error('Error al crear mensaje')

    return created
  }

  /**
   * Obtener mensaje por ID
   */
  static async getById(id: number): Promise<Message | null> {
    const query = `SELECT * FROM messages WHERE id = ? AND deleted_at IS NULL`
    const [rows] = await db.query<Message[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Obtener mensaje con info del sender
   */
  static async getByIdWithSender(id: number): Promise<MessageWithSender | null> {
    const query = `
      SELECT 
        m.*,
        u.username as sender_username,
        r.name as sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN roles r ON r.id = u.role_id
      WHERE m.id = ? AND m.deleted_at IS NULL
    `
    const [rows] = await db.query<MessageWithSender[]>(query, [id])
    return rows[0] || null
  }

  /**
   * Listar mensajes de una conversacion (paginacion cursor-based)
   */
  static async getByConversationId(
    conversationId: number,
    filters: MessageFilters = {}
  ): Promise<MessageWithSender[]> {
    const limit = filters.limit || MESSAGE_CONSTANTS.DEFAULT_MESSAGES_LIMIT

    let query = `
      SELECT 
        m.*,
        u.username as sender_username,
        r.name as sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN roles r ON r.id = u.role_id
      WHERE m.conversation_id = ? AND m.deleted_at IS NULL
    `
    const params: any[] = [conversationId]

    // Cursor-based pagination (para scroll infinito)
    if (filters.before_id) {
      query += ` AND m.id < ?`
      params.push(filters.before_id)
    }

    query += ` ORDER BY m.created_at DESC LIMIT ?`
    params.push(limit + 1) // +1 para saber si hay mas

    const [rows] = await db.query<MessageWithSender[]>(query, params)

    // Invertir para mostrar cronologicamente
    return rows.slice(0, limit).reverse()
  }

  /**
   * Verificar si hay mas mensajes antiguos
   */
  static async hasMoreMessages(conversationId: number, beforeId: number): Promise<boolean> {
    const query = `
      SELECT 1 FROM messages 
      WHERE conversation_id = ? AND id < ? AND deleted_at IS NULL
      LIMIT 1
    `
    const [rows] = await db.query<any[]>(query, [conversationId, beforeId])
    return rows.length > 0
  }

  /**
   * Editar mensaje (solo el sender puede)
   */
  static async update(id: number, content: string): Promise<boolean> {
    const query = `
      UPDATE messages 
      SET content = ?, is_edited = 1, edited_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `
    const [result] = await db.query<ResultSetHeader>(query, [content, id])
    return result.affectedRows > 0
  }

  /**
   * Soft delete mensaje
   */
  static async delete(id: number): Promise<boolean> {
    const query = `UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`
    const [result] = await db.query<ResultSetHeader>(query, [id])
    return result.affectedRows > 0
  }

  /**
   * Verificar si usuario es el sender
   */
  static async isSender(messageId: number, userId: string): Promise<boolean> {
    const query = `SELECT 1 FROM messages WHERE id = ? AND sender_id = ?`
    const [rows] = await db.query<any[]>(query, [messageId, userId])
    return rows.length > 0
  }

  // ===============================================
  // UNREAD COUNTS
  // ===============================================

  /**
   * Contar mensajes no leidos para un usuario (total)
   */
  static async getTotalUnreadCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = ?
        AND cp.is_active = 1
        AND m.sender_id != ?
        AND m.deleted_at IS NULL
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
    `
    const [rows] = await db.query<CountResult[]>(query, [userId, userId])
    return rows[0]?.count || 0
  }

  /**
   * Contar no leidos por conversacion
   */
  static async getUnreadCountByConversation(
    userId: string
  ): Promise<{ conversation_id: number; unread_count: number }[]> {
    const query = `
      SELECT 
        m.conversation_id,
        COUNT(*) as unread_count
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = ?
        AND cp.is_active = 1
        AND m.sender_id != ?
        AND m.deleted_at IS NULL
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      GROUP BY m.conversation_id
    `
    const [rows] = await db.query<UnreadByConversationResult[]>(query, [userId, userId])
    return rows
  }

  /**
   * Contar no leidos en una conversacion especifica
   */
  static async getUnreadCountForConversation(
    conversationId: number,
    userId: string
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.conversation_id = ?
        AND cp.user_id = ?
        AND cp.is_active = 1
        AND m.sender_id != ?
        AND m.deleted_at IS NULL
        AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
    `
    const [rows] = await db.query<CountResult[]>(query, [conversationId, userId, userId])
    return rows[0]?.count || 0
  }

  // ===============================================
  // SEARCH
  // ===============================================

  /**
   * Buscar en mensajes del usuario (fulltext)
   */
  static async search(
    userId: string,
    searchTerm: string,
    limit: number = 50
  ): Promise<MessageWithSender[]> {
    const query = `
      SELECT 
        m.*,
        u.username as sender_username,
        r.name as sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN roles r ON r.id = u.role_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = ?
        AND cp.is_active = 1
        AND m.deleted_at IS NULL
        AND MATCH(m.content) AGAINST(? IN NATURAL LANGUAGE MODE)
      ORDER BY m.created_at DESC
      LIMIT ?
    `
    const [rows] = await db.query<MessageWithSender[]>(query, [userId, searchTerm, limit])
    return rows
  }

  /**
   * Buscar con LIKE (fallback si fulltext no funciona bien)
   */
  static async searchLike(
    userId: string,
    searchTerm: string,
    limit: number = 50
  ): Promise<MessageWithSender[]> {
    const query = `
      SELECT 
        m.*,
        u.username as sender_username,
        r.name as sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN roles r ON r.id = u.role_id
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = ?
        AND cp.is_active = 1
        AND m.deleted_at IS NULL
        AND m.content LIKE ?
      ORDER BY m.created_at DESC
      LIMIT ?
    `
    const [rows] = await db.query<MessageWithSender[]>(query, [
      userId,
      likeContains(searchTerm),
      limit,
    ])
    return rows
  }

  // ===============================================
  // UTILITIES
  // ===============================================

  /**
   * Obtener ultimo mensaje de una conversacion
   */
  static async getLastMessage(conversationId: number): Promise<MessageWithSender | null> {
    const query = `
      SELECT 
        m.*,
        u.username as sender_username,
        r.name as sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      JOIN roles r ON r.id = u.role_id
      WHERE m.conversation_id = ? AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT 1
    `
    const [rows] = await db.query<MessageWithSender[]>(query, [conversationId])
    return rows[0] || null
  }

  /**
   * Contar mensajes en una conversacion
   */
  static async countByConversation(conversationId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE conversation_id = ? AND deleted_at IS NULL
    `
    const [rows] = await db.query<CountResult[]>(query, [conversationId])
    return rows[0]?.count || 0
  }

  /**
   * Obtener ID del mensaje mas antiguo (para paginacion)
   */
  static async getOldestMessageId(conversationId: number): Promise<number | null> {
    const query = `
      SELECT id FROM messages 
      WHERE conversation_id = ? AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `
    const [rows] = await db.query<IdResult[]>(query, [conversationId])
    return rows[0]?.id || null
  }
}
