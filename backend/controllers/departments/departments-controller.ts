// controllers/departments/departments-controller.ts

import { Request, Response } from 'express'
import { DepartmentRepository } from '../../repositories/departments/departments-repository.js'

interface MySQLError extends Error {
  code?: string
}

/**
 * Crear un nuevo departamento
 * Solo accesible para administradores
 */
export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body as { name?: string }

    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'El nombre del departamento es requerido' })
      return
    }

    const newDepartment = await DepartmentRepository.create({
      name: name.trim(),
    })

    res.status(201).json(newDepartment)
  } catch (error) {
    console.error('Error createDepartment:', error)

    const mysqlError = error as MySQLError
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: mysqlError.message })
      return
    }

    res.status(500).json({ error: 'Error al crear departamento' })
  }
}

/**
 * Devuelve todos los departamentos
 * Solo accesible para administradores
 */
export const getAllDepartments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await DepartmentRepository.getAll()
    res.status(200).json(departments)
  } catch (error) {
    console.error('Error getAllDepartments:', error)
    res.status(500).json({ error: 'Error al recuperar departamentos' })
  }
}

/**
 * Devuelve un departamento por ID
 * Solo accesible para administradores
 */
export const getDepartmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const department = await DepartmentRepository.getById(req.params.id)

    if (!department) {
      res.status(404).json({ error: 'Departamento no encontrado' })
      return
    }

    res.status(200).json(department)
  } catch (error) {
    console.error('Error getDepartmentById:', error)
    res.status(500).json({ error: 'Error al obtener departamento' })
  }
}

/**
 * Actualiza un departamento por ID
 * Solo accesible para administradores
 */
export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body as { name?: string }

    if (!name || name.trim() === '') {
      res.status(400).json({
        error: 'El nombre del departamento es requerido',
      })
      return
    }

    const updatedDepartment = await DepartmentRepository.update(req.params.id, {
      name: name.trim(),
    })

    if (!updatedDepartment) {
      res.status(404).json({ error: 'Departamento no encontrado' })
      return
    }

    res.status(200).json(updatedDepartment)
  } catch (error) {
    console.error('Error updateDepartment:', error)

    const err = error as MySQLError
    if (err.message.includes('no encontrado')) {
      res.status(404).json({ error: err.message })
      return
    }

    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: err.message })
      return
    }

    res.status(500).json({ error: 'Error al actualizar departamento' })
  }
}

/**
 * Elimina un departamento por ID
 * Solo accesible para administradores
 */
export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await DepartmentRepository.delete(req.params.id)

    if (!deleted) {
      res.status(404).json({ error: 'Departamento no encontrado' })
      return
    }

    res.status(200).json({ message: 'Departamento eliminado correctamente' })
  } catch (error) {
    console.error('Error deleteDepartment:', error)

    const err = error as Error
    if (err.message.includes('registros asociados')) {
      res.status(409).json({ error: err.message })
      return
    }

    res.status(500).json({ error: 'Error al eliminar departamento' })
  }
}
