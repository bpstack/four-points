// repositories/auth/user-repository.ts

import { Validation } from '../../validations/auth/user-validation.js'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { SALT_ROUNDS } from '../../config/config.js'
import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { logger } from '../../config/logger.js'
import type {
  User,
  UserWithRole,
  RoleRow,
  CreateUserDTO,
  UpdateUserDTO,
  LoginDTO,
  UpdateProfileDTO,
  UpdatePasswordDTO,
} from '../../models/auth/index.js'

/**
 * Sanitize username to prevent XSS attacks
 * Only allows alphanumeric characters and underscores
 */
function sanitizeUsername(username: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '')
  // Limit length
  return sanitized.slice(0, 50)
}

export class UserRepository {
  /**
   * Crear usuario con role_id directo
   */
  static async create({ username, email, password, role }: CreateUserDTO): Promise<User> {
    const DEFAULT_ROLE = 'recepcionista'
    const roleToAssign = role || DEFAULT_ROLE

    // Sanitize username for XSS prevention
    const sanitizedUsername = sanitizeUsername(username)

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const uuid = crypto.randomUUID()
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')

    try {
      // Buscar el ID del rol
      const [roles] = await db.query<RoleRow[]>('SELECT id FROM roles WHERE LOWER(name) = ?', [
        roleToAssign.toLowerCase(),
      ])

      let roleId: number
      if (roles.length > 0) {
        roleId = roles[0].id
      } else {
        // Si no existe el rol, asignar el rol por defecto
        const [defaultRoles] = await db.query<RoleRow[]>(
          'SELECT id FROM roles WHERE LOWER(name) = ?',
          [DEFAULT_ROLE.toLowerCase()]
        )

        if (defaultRoles.length === 0) {
          throw new Error('Rol por defecto no existe en la BD')
        }

        roleId = defaultRoles[0].id
      }

      await db.query(
        `INSERT INTO users (id, username, email, password, role_id, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [uuid, sanitizedUsername, email, hashedPassword, roleId, createdAt]
      )

      // ✅ Si es admin o group-admin, asignar notificaciones existentes
      if (roleToAssign === 'admin' || roleToAssign === 'group-admin') {
        await this.assignExistingNotifications(uuid)
      }

      return {
        id: uuid,
        username: sanitizedUsername,
        email,
        role: roleToAssign,
        created_at: new Date(createdAt),
        is_active: 1,
      }
    } catch (error: any) {
      logger.error({ err: error }, 'Error creating user')
      if (error.code === 'ER_DUP_ENTRY') {
        const err = new Error('El nombre de usuario o email ya existe') as any
        err.code = 'ER_DUP_ENTRY'
        throw err
      }
      throw new Error('Error interno al crear usuario', { cause: error })
    }
  }

  /**
   * Asignar notificaciones existentes a un nuevo admin/group-admin
   */
  static async assignExistingNotifications(userId: string): Promise<void> {
    try {
      await db.query(
        `
      INSERT INTO notification_recipients (notification_id, user_id, is_read)
      SELECT n.id, ?, 0
      FROM notifications n
      WHERE n.status = 'sent'
      AND n.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      AND NOT EXISTS (
        SELECT 1 FROM notification_recipients nr 
        WHERE nr.notification_id = n.id AND nr.user_id = ?
      )
    `,
        [userId, userId]
      )
    } catch (error) {
      logger.error({ err: error }, 'Error asignando notificaciones existentes')
      // No lanzar error, solo log - no queremos que falle la creación del usuario
    }
  }

  /**
   * Login con JOIN directo
   * Uses timing-safe comparison to prevent timing attacks
   */
  static async login({ username, password }: LoginDTO): Promise<User> {
    try {
      Validation.username(username)
      Validation.password(password)
    } catch (err: any) {
      throw new Error(err.message, { cause: err })
    }

    const [rows] = await db.query<UserWithRole[]>(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.password,
        u.is_active,
        u.is_demo,
        u.created_at,
        u.avatar_url,
        r.name AS role
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.username = ?`,
      [username]
    )

    const user = rows[0]

    // Always perform password comparison to prevent timing attacks
    // Even if user doesn't exist, we compare against a dummy hash
    // Hash generated once with bcrypt.hash('dummy-password-for-timing', 10)
    const DUMMY_HASH = '$2b$10$NZRVB2LhoSY6QTIjXL9PjeglXTf0F0uyXSM42Nh89IFBEhi8jU2U6'
    const passwordToCompare = user?.password || DUMMY_HASH
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare)

    // Now check if user exists (after timing-safe comparison)
    if (!user) {
      logger.warn(
        { event: 'login_failed', reason: 'user_not_found', username },
        '[SECURITY] login failed'
      )
      throw new Error('Credenciales inválidas')
    }

    if (!user.is_active) {
      logger.warn(
        { event: 'login_failed', reason: 'inactive_user', username },
        '[SECURITY] login failed'
      )
      throw new Error('Usuario inactivo')
    }

    if (!isPasswordValid) {
      logger.warn(
        { event: 'login_failed', reason: 'invalid_password', username },
        '[SECURITY] login failed'
      )
      throw new Error('Credenciales inválidas')
    }

    logger.info({ event: 'login_success', username }, '[AUTH] user logged in')
    const { password: _pw, ...userWithoutPassword } = user
    return userWithoutPassword as User
  }

  /**
   * Obtener todos con JOIN directo
   * Solo devuelve usuarios activos (no soft-deleted)
   */
  static async getAll(): Promise<User[]> {
    try {
      const [rows] = await db.query<UserWithRole[]>(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          u.avatar_url,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.is_active = 1
        ORDER BY u.username
      `)
      return rows as User[]
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener usuarios')
      throw new Error('Error interno al obtener usuarios', { cause: error })
    }
  }

  /**
   * Obtener por ID con JOIN directo
   */
  static async getById(id: string): Promise<User | null> {
    try {
      const [rows] = await db.query<UserWithRole[]>(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          u.is_demo,
          u.updated_at,
          u.avatar_url,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?`,
        [id]
      )
      return (rows[0] as User) || null
    } catch (error) {
      logger.error({ err: error }, 'Error en getById')
      throw new Error('Error interno al obtener usuario por ID', { cause: error })
    }
  }

  /**
   * Obtener por username con JOIN directo
   */
  static async getByUsername(username: string): Promise<User | null> {
    try {
      const [rows] = await db.query<UserWithRole[]>(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          u.avatar_url,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.username = ?`,
        [username]
      )
      return (rows[0] as User) || null
    } catch (error) {
      logger.error({ err: error }, 'Error en getByUsername')
      throw new Error('Error interno al obtener usuario por username', { cause: error })
    }
  }

  /**
   * Obtener por role
   * Solo devuelve usuarios activos
   */
  static async getByRole(role: string): Promise<User[]> {
    try {
      const [rows] = await db.query<UserWithRole[]>(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          u.avatar_url,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE LOWER(r.name) = LOWER(?) AND u.is_active = 1`,
        [role]
      )
      return rows as User[]
    } catch (error) {
      logger.error({ err: error }, 'Error en getByRole')
      throw new Error('Error interno al obtener usuarios por rol', { cause: error })
    }
  }

  /**
   * ✅ CORREGIDO: Actualizar usuario y devolver el usuario completo
   */
  static async update(id: string, { username, email, role }: UpdateUserDTO): Promise<User | null> {
    const dbConnection = await db.getConnection()
    try {
      await dbConnection.beginTransaction()

      // Verificar que el usuario existe
      const [existingUser] = await dbConnection.query<UserWithRole[]>(
        'SELECT id FROM users WHERE id = ?',
        [id]
      )

      if (existingUser.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      // Obtener role_id si se proporciona role
      let roleId: number | null = null
      if (role) {
        const [roles] = await dbConnection.query<RoleRow[]>(
          'SELECT id FROM roles WHERE LOWER(name) = LOWER(?)',
          [role]
        )

        if (roles.length === 0) {
          throw new Error(`Rol no válido: ${role}`)
        }

        roleId = roles[0].id
      }

      // Construir query dinámicamente
      const updates: string[] = []
      const values: (string | number)[] = []

      if (username) {
        updates.push('username = ?')
        values.push(username)
      }

      if (email) {
        updates.push('email = ?')
        values.push(email)
      }

      if (roleId) {
        updates.push('role_id = ?')
        values.push(roleId)
      }

      if (updates.length === 0) {
        throw new Error('No hay campos para actualizar')
      }

      // ✅ CORREGIDO: Agregar updated_at y luego el ID para el WHERE
      updates.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id) // ← El ID va al final para el WHERE

      await dbConnection.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)

      await dbConnection.commit()

      // Devolver el usuario completo actualizado
      const updatedUser = await this.getById(id)
      return updatedUser
    } catch (error: any) {
      await dbConnection.rollback()
      logger.error({ err: error }, 'Error en update')

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('no válido') ||
        error.message.includes('No hay campos')
      ) {
        throw error
      }

      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El nombre de usuario o email ya existe', { cause: error })
      }

      throw new Error('Error interno al actualizar usuario', { cause: error })
    } finally {
      dbConnection.release()
    }
  }

  /**
   * Soft delete de usuario
   * En lugar de eliminar, marca como inactivo y renombra username para liberar el nombre
   * Formato: username_deleted_timestamp
   */
  static async delete(id: string): Promise<boolean> {
    const dbConnection = await db.getConnection()
    try {
      await dbConnection.beginTransaction()

      // Verificar que el usuario existe y obtener su username
      const [users] = await dbConnection.query<UserWithRole[]>(
        'SELECT id, username, is_active FROM users WHERE id = ?',
        [id]
      )

      if (users.length === 0) {
        await dbConnection.rollback()
        return false
      }

      const user = users[0]

      // Si ya está eliminado (inactivo con sufijo), no hacer nada
      if (!user.is_active && user.username.includes('_deleted_')) {
        await dbConnection.rollback()
        return false
      }

      // Generar nuevo username con sufijo único
      const timestamp = Date.now()
      const deletedUsername = `${user.username}_deleted_${timestamp}`

      // Actualizar: marcar como inactivo y renombrar username
      const [result] = await dbConnection.query<ResultSetHeader>(
        `UPDATE users 
         SET is_active = 0, 
             username = ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [deletedUsername, id]
      )

      await dbConnection.commit()

      logger.info(
        { event: 'user_soft_deleted', from: user.username, to: deletedUsername },
        '[AUTH] user soft deleted'
      )

      return result.affectedRows > 0
    } catch (err) {
      await dbConnection.rollback()
      logger.error({ err }, 'Error al eliminar usuario')
      throw new Error('Error al eliminar el usuario', { cause: err })
    } finally {
      dbConnection.release()
    }
  }

  /**
   * Actualizar perfil (username) - requiere contraseña actual
   */
  static async updateProfile(
    userId: string,
    { username, currentPassword }: UpdateProfileDTO
  ): Promise<User> {
    const dbConnection = await db.getConnection()

    // Sanitize username for XSS prevention
    const sanitizedUsername = sanitizeUsername(username)

    try {
      await dbConnection.beginTransaction()

      // 1. Obtener usuario actual con contraseña
      const [users] = await dbConnection.query<UserWithRole[]>(
        `SELECT u.id, u.username, u.email, u.password, u.is_active, r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?`,
        [userId]
      )

      if (users.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      const user = users[0]

      // 2. Verificar contraseña actual
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password || '')
      if (!isPasswordValid) {
        logger.warn(
          { event: 'profile_update_failed', reason: 'invalid_password', userId },
          '[SECURITY] profile update failed'
        )
        throw new Error('Contraseña actual incorrecta')
      }

      // 3. Verificar que el nuevo username no exista (si es diferente)
      if (sanitizedUsername !== user.username) {
        const [existing] = await dbConnection.query<UserWithRole[]>(
          'SELECT id FROM users WHERE username = ? AND id != ?',
          [sanitizedUsername, userId]
        )

        if (existing.length > 0) {
          throw new Error('El nombre de usuario ya está en uso')
        }
      }

      // 4. Actualizar username
      await dbConnection.query(
        'UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [sanitizedUsername, userId]
      )

      await dbConnection.commit()

      logger.info(
        { event: 'profile_updated', userId, newUsername: sanitizedUsername },
        '[AUTH] profile updated'
      )

      // 5. Devolver usuario actualizado
      const updatedUser = await this.getById(userId)
      if (!updatedUser) {
        throw new Error('Error al obtener usuario actualizado')
      }

      return updatedUser
    } catch (error: any) {
      await dbConnection.rollback()
      logger.error({ err: error }, 'Error en updateProfile')
      throw error
    } finally {
      dbConnection.release()
    }
  }

  /**
   * Actualizar contraseña - requiere contraseña actual
   * Devuelve true si se actualizó correctamente
   */
  static async updatePassword(
    userId: string,
    { currentPassword, newPassword }: UpdatePasswordDTO
  ): Promise<boolean> {
    const dbConnection = await db.getConnection()
    try {
      await dbConnection.beginTransaction()

      // 1. Obtener usuario actual con contraseña
      const [users] = await dbConnection.query<UserWithRole[]>(
        'SELECT id, password FROM users WHERE id = ?',
        [userId]
      )

      if (users.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      const user = users[0]

      // 2. Verificar contraseña actual
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password || '')
      if (!isPasswordValid) {
        logger.warn(
          { event: 'password_change_failed', reason: 'invalid_current_password', userId },
          '[SECURITY] password change failed'
        )
        throw new Error('Contraseña actual incorrecta')
      }

      // 3. Verificar que la nueva contraseña sea diferente a la actual
      if (currentPassword === newPassword) {
        throw new Error('La nueva contraseña debe ser diferente a la actual')
      }

      // 4. Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

      // 5. Actualizar contraseña
      await dbConnection.query(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, userId]
      )

      await dbConnection.commit()

      logger.info({ event: 'password_changed', userId }, '[AUTH] password changed')

      return true
    } catch (error: any) {
      await dbConnection.rollback()
      logger.error({ err: error }, 'Error en updatePassword')
      throw error
    } finally {
      dbConnection.release()
    }
  }

  /**
   * Reset de contraseña por admin (no requiere contraseña actual)
   */
  static async resetPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      // Verificar que el usuario existe
      const [users] = await db.query<UserWithRole[]>('SELECT id FROM users WHERE id = ?', [userId])

      if (users.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

      // Actualizar contraseña
      await db.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        hashedPassword,
        userId,
      ])

      logger.info({ event: 'password_reset_by_admin', userId }, '[AUTH] password reset by admin')

      return true
    } catch (error: any) {
      logger.error({ err: error }, 'Error en resetPassword')
      throw error
    }
  }

  /**
   * Verificar contraseña de un usuario
   */
  static async verifyPassword(userId: string, password: string): Promise<boolean> {
    const [users] = await db.query<UserWithRole[]>('SELECT password FROM users WHERE id = ?', [
      userId,
    ])

    if (users.length === 0) {
      return false
    }

    return bcrypt.compare(password, users[0].password || '')
  }

  /**
   * Actualizar avatar del usuario
   */
  static async updateAvatar(
    userId: string,
    avatarUrl: string,
    avatarPublicId: string
  ): Promise<User | null> {
    try {
      await db.query(
        'UPDATE users SET avatar_url = ?, avatar_public_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [avatarUrl, avatarPublicId, userId]
      )

      logger.info({ event: 'avatar_updated', userId }, '[AUTH] avatar updated')
      return this.getById(userId)
    } catch (error) {
      logger.error({ err: error }, 'Error en updateAvatar')
      throw new Error('Error interno al actualizar avatar', { cause: error })
    }
  }

  /**
   * Eliminar avatar del usuario
   * Devuelve el public_id anterior para poder eliminarlo de Cloudinary
   */
  static async deleteAvatar(userId: string): Promise<string | null> {
    try {
      // Obtener public_id actual antes de eliminar
      const [users] = await db.query<UserWithRole[]>(
        'SELECT avatar_public_id FROM users WHERE id = ?',
        [userId]
      )

      if (users.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      const previousPublicId = users[0].avatar_public_id || null

      // Limpiar campos de avatar
      await db.query(
        'UPDATE users SET avatar_url = NULL, avatar_public_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      )

      logger.info({ event: 'avatar_deleted', userId }, '[AUTH] avatar deleted')
      return previousPublicId
    } catch (error) {
      logger.error({ err: error }, 'Error en deleteAvatar')
      throw new Error('Error interno al eliminar avatar', { cause: error })
    }
  }

  /**
   * Obtener public_id del avatar actual
   */
  static async getAvatarPublicId(userId: string): Promise<string | null> {
    const [users] = await db.query<UserWithRole[]>(
      'SELECT avatar_public_id FROM users WHERE id = ?',
      [userId]
    )

    return users[0]?.avatar_public_id || null
  }
}
