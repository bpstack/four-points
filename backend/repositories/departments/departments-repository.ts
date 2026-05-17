// repositories/departments/departments-repository.ts

import db from '../../config/db.js'
import { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'
import { logger } from '../../config/logger.js'

// ============================================
// TYPES
// ============================================

interface DepartmentRow extends RowDataPacket {
  id: number
  name: string
}

interface CreateDepartmentInput {
  name: string
}

interface UpdateDepartmentInput {
  name: string
}

export interface Department {
  id: number
  name: string
}

interface MySQLError extends Error {
  code?: string
}

// ============================================
// REPOSITORY
// ============================================

export class DepartmentRepository {
  /**
   * Crear un nuevo departamento
   */
  static async create({ name }: CreateDepartmentInput): Promise<Department> {
    try {
      const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO departments (name) VALUES (?)`,
        [name]
      )

      return {
        id: result.insertId,
        name,
      }
    } catch (error) {
      logger.error({ err: error }, 'Error creating department')

      const mysqlError = error as MySQLError
      if (mysqlError.code === 'ER_DUP_ENTRY') {
        const err = new Error('El nombre del departamento ya existe') as MySQLError
        err.code = 'ER_DUP_ENTRY'
        throw err
      }

      throw new Error('Error interno al crear departamento')
    }
  }

  /**
   * Obtener todos los departamentos
   */
  static async getAll(): Promise<Department[]> {
    try {
      const [rows] = await db.query<DepartmentRow[]>(`
        SELECT 
          id,
          name
        FROM departments
        ORDER BY name
      `)
      return rows
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener departamentos')
      throw new Error('Error interno al obtener departamentos')
    }
  }

  /**
   * Obtener departamento por ID
   */
  static async getById(id: number | string): Promise<Department | null> {
    try {
      const [rows] = await db.query<DepartmentRow[]>(
        `SELECT 
          id,
          name
        FROM departments
        WHERE id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      logger.error({ err: error }, 'Error en getById')
      throw new Error('Error interno al obtener departamento por ID')
    }
  }

  /**
   * Actualizar departamento
   */
  static async update(
    id: number | string,
    { name }: UpdateDepartmentInput
  ): Promise<Department | null> {
    const dbConnection = (await db.getConnection()) as PoolConnection

    try {
      await dbConnection.beginTransaction()

      // Verificar que el departamento existe
      const [existing] = await dbConnection.query<DepartmentRow[]>(
        'SELECT id FROM departments WHERE id = ?',
        [id]
      )

      if (existing.length === 0) {
        throw new Error('Departamento no encontrado')
      }

      // Validar que se proporciona el nombre
      if (!name) {
        throw new Error('No hay campos para actualizar')
      }

      await dbConnection.query(`UPDATE departments SET name = ? WHERE id = ?`, [name, id])

      await dbConnection.commit()

      // Devolver el departamento actualizado
      const updatedDepartment = await this.getById(id)
      return updatedDepartment
    } catch (error) {
      await dbConnection.rollback()
      logger.error({ err: error }, 'Error en update')

      const err = error as MySQLError
      if (err.message.includes('no encontrado') || err.message.includes('No hay campos')) {
        throw error
      }

      if (err.code === 'ER_DUP_ENTRY') {
        throw new Error('El nombre del departamento ya existe')
      }

      throw new Error('Error interno al actualizar departamento')
    } finally {
      dbConnection.release()
    }
  }

  /**
   * Eliminar departamento
   */
  static async delete(id: number | string): Promise<ResultSetHeader | null> {
    try {
      const [result] = await db.query<ResultSetHeader>('DELETE FROM departments WHERE id = ?', [id])

      if (result.affectedRows === 0) {
        return null
      }

      return result
    } catch (error) {
      logger.error({ err: error }, 'Error al eliminar departamento')

      const mysqlError = error as MySQLError
      // Si hay registros relacionados (FK constraint)
      if (mysqlError.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new Error('No se puede eliminar el departamento porque tiene registros asociados')
      }

      throw new Error('Error al eliminar el departamento: ' + (error as Error).message)
    }
  }
}
