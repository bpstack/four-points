// repositories/departments/departments-repository.js

import db from '../../config/db.js'

export class DepartmentRepository {
  /**
   * Crear un nuevo departamento
   */
  static async create({ name }) {
    try {
      const [result] = await db.query(
        `INSERT INTO departments (name) VALUES (?)`,
        [name]
      )

      return {
        id: result.insertId,
        name,
      }
    } catch (error) {
      console.error('Error creating department:', error)

      if (error.code === 'ER_DUP_ENTRY') {
        const err = new Error('El nombre del departamento ya existe')
        err.code = 'ER_DUP_ENTRY'
        throw err
      }

      throw new Error('Error interno al crear departamento')
    }
  }

  /**
   * Obtener todos los departamentos
   */
  static async getAll() {
    try {
      const [rows] = await db.query(`
        SELECT 
          id,
          name
        FROM departments
        ORDER BY name
      `)
      return rows
    } catch (error) {
      console.error('Error al obtener departamentos:', error)
      throw new Error('Error interno al obtener departamentos')
    }
  }

  /**
   * Obtener departamento por ID
   */
  static async getById(id) {
    try {
      const [rows] = await db.query(
        `SELECT 
          id,
          name
        FROM departments
        WHERE id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      console.error('Error en getById:', error)
      throw new Error('Error interno al obtener departamento por ID')
    }
  }

  /**
   * Actualizar departamento
   */
  static async update(id, { name }) {
    const dbConnection = await db.getConnection()

    try {
      await dbConnection.beginTransaction()

      // Verificar que el departamento existe
      const [existing] = await dbConnection.query(
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

      await dbConnection.query(`UPDATE departments SET name = ? WHERE id = ?`, [
        name,
        id,
      ])

      await dbConnection.commit()

      // Devolver el departamento actualizado
      const updatedDepartment = await this.getById(id)
      return updatedDepartment
    } catch (error) {
      await dbConnection.rollback()
      console.error('Error en update:', error)

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('No hay campos')
      ) {
        throw error
      }

      if (error.code === 'ER_DUP_ENTRY') {
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
  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM departments WHERE id = ?', [
        id,
      ])

      if (result.affectedRows === 0) {
        return null
      }

      return result
    } catch (error) {
      console.error('Error al eliminar departamento:', error)

      // Si hay registros relacionados (FK constraint)
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new Error(
          'No se puede eliminar el departamento porque tiene registros asociados'
        )
      }

      throw new Error('Error al eliminar el departamento: ' + error.message)
    }
  }
}
