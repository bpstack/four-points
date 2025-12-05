// repositories/auth/user-repository.js
import { Validation } from '../../validations/auth/user-validation.js'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { SALT_ROUNDS } from '../../config/config.js'
import db from '../../config/db.js' // ← IMPORTAR EL db CENTRALIZADO

// dotenv.config()

// const db = mysql.createdb({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   charset: 'utf8mb4',
//   collation: 'utf8mb4_unicode_ci',
// })

export class UserRepository {
  /**
   * Crear usuario con role_id directo
   */
  static async create({ username, email, password, role }) {
    const DEFAULT_ROLE = 'recepcionista'
    const roleToAssign = role || DEFAULT_ROLE

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const uuid = crypto.randomUUID()
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ')

    try {
      // Buscar el ID del rol
      const [roles] = await db.query(
        'SELECT id FROM roles WHERE LOWER(name) = ?',
        [roleToAssign.toLowerCase()]
      )

      let roleId
      if (roles.length > 0) {
        roleId = roles[0].id
      } else {
        // Si no existe el rol, asignar el rol por defecto
        const [defaultRoles] = await db.query(
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
        [uuid, username, email, hashedPassword, roleId, createdAt]
      )

      // ✅ Si es admin o group-admin, asignar notificaciones existentes
      if (roleToAssign === 'admin' || roleToAssign === 'group-admin') {
        await this.assignExistingNotifications(uuid)
      }

      return {
        id: uuid,
        username,
        email,
        role: roleToAssign,
        created_at: createdAt,
        is_active: 1,
      }
    } catch (error) {
      console.error('Error creating user:', error)
      if (error.code === 'ER_DUP_ENTRY') {
        const err = new Error('El nombre de usuario o email ya existe')
        err.code = 'ER_DUP_ENTRY'
        throw err
      }
      throw new Error('Error interno al crear usuario')
    }
  }

  /**
   * Asignar notificaciones existentes a un nuevo admin/group-admin
   */
  static async assignExistingNotifications(userId) {
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
      console.error('Error asignando notificaciones existentes:', error)
      // No lanzar error, solo log - no queremos que falle la creación del usuario
    }
  }

  /**
   * Login con JOIN directo
   */
  static async login({ username, password }) {
    try {
      Validation.username(username)
      Validation.password(password)
    } catch (err) {
      throw new Error(err.message)
    }

    const [rows] = await db.query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.password,
        u.is_active,
        u.created_at,
        r.name AS role
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE u.username = ?`,
      [username]
    )

    const user = rows[0]
    if (!user) throw new Error('Usuario no encontrado')

    if (!user.is_active) {
      throw new Error('Usuario inactivo')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) throw new Error('Contraseña incorrecta')

    const { password: _pw, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  /**
   * Obtener todos con JOIN directo
   */
  static async getAll() {
    try {
      const [rows] = await db.query(`
        SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        ORDER BY u.username
      `)
      return rows
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
      throw new Error('Error interno al obtener usuarios')
    }
  }

  /**
   * Obtener por ID con JOIN directo
   */
  static async getById(id) {
    try {
      const [rows] = await db.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          u.updated_at,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      console.error('Error en getById:', error)
      throw new Error('Error interno al obtener usuario por ID')
    }
  }

  /**
   * Obtener por username con JOIN directo
   */
  static async getByUsername(username) {
    try {
      const [rows] = await db.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.username = ?`,
        [username]
      )
      return rows[0] || null
    } catch (error) {
      console.error('Error en getByUsername:', error)
      throw new Error('Error interno al obtener usuario por username')
    }
  }

  /**
   * Obtener por role
   */
  static async getByRole(role) {
    try {
      const [rows] = await db.query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          u.is_active,
          r.name AS role
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE LOWER(r.name) = LOWER(?)`,
        [role]
      )
      return rows
    } catch (error) {
      console.error('Error en getByRole:', error)
      throw new Error('Error interno al obtener usuarios por rol')
    }
  }

  /**
   * ✅ CORREGIDO: Actualizar usuario y devolver el usuario completo
   */
  static async update(id, { username, email, role }) {
    const dbConnection = await db.getConnection()
    try {
      await dbConnection.beginTransaction()

      // Verificar que el usuario existe
      const [existingUser] = await dbConnection.query(
        'SELECT id FROM users WHERE id = ?',
        [id]
      )

      if (existingUser.length === 0) {
        throw new Error('Usuario no encontrado')
      }

      // Obtener role_id si se proporciona role
      let roleId = null
      if (role) {
        const [roles] = await dbConnection.query(
          'SELECT id FROM roles WHERE LOWER(name) = LOWER(?)',
          [role]
        )

        if (roles.length === 0) {
          throw new Error(`Rol no válido: ${role}`)
        }

        roleId = roles[0].id
      }

      // Construir query dinámicamente
      const updates = []
      const values = []

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

      await dbConnection.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      )

      await dbConnection.commit()

      // Devolver el usuario completo actualizado
      const updatedUser = await this.getById(id)
      return updatedUser
    } catch (error) {
      await dbConnection.rollback()
      console.error('Error en update:', error)

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('no válido') ||
        error.message.includes('No hay campos')
      ) {
        throw error
      }

      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El nombre de usuario o email ya existe')
      }

      throw new Error('Error interno al actualizar usuario')
    } finally {
      dbConnection.release()
    }
  }

  /**
   * Eliminar usuario
   */
  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM users WHERE id = ?', [id])

      if (result.affectedRows === 0) {
        return null
      }

      return result
    } catch (err) {
      console.error('Error al eliminar usuario:', err)
      throw new Error('Error al eliminar el usuario: ' + err.message)
    }
  }
}
