// controllers/departments/departments-controller.ts

import { Request, Response } from 'express'
import { DepartmentRepository } from '../../repositories/departments/departments-repository.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'

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
      res.status(400).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_NAME_REQUIRED,
        code: ERROR_CODES.DEPARTMENTS_NAME_REQUIRED,
      })
      return
    }

    const newDepartment = await DepartmentRepository.create({
      name: name.trim(),
    })

    res.status(201).json({ success: true, data: newDepartment })
  } catch (error) {
    console.error('Error createDepartment:', error)

    const mysqlError = error as MySQLError
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_DUPLICATE,
        code: ERROR_CODES.DEPARTMENTS_DUPLICATE,
      })
      return
    }

    res.status(500).json({
      success: false,
      error: ERROR_CODES.DEPARTMENTS_CREATE_ERROR,
      code: ERROR_CODES.DEPARTMENTS_CREATE_ERROR,
    })
  }
}

/**
 * Devuelve todos los departamentos
 * Solo accesible para administradores
 */
export const getAllDepartments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const departments = await DepartmentRepository.getAll()
    res.status(200).json({ success: true, data: departments })
  } catch (error) {
    console.error('Error getAllDepartments:', error)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.DEPARTMENTS_FETCH_ERROR,
      code: ERROR_CODES.DEPARTMENTS_FETCH_ERROR,
    })
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
      res.status(404).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
        code: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
      })
      return
    }

    res.status(200).json({ success: true, data: department })
  } catch (error) {
    console.error('Error getDepartmentById:', error)
    res.status(500).json({
      success: false,
      error: ERROR_CODES.DEPARTMENTS_FETCH_ONE_ERROR,
      code: ERROR_CODES.DEPARTMENTS_FETCH_ONE_ERROR,
    })
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
        success: false,
        error: ERROR_CODES.DEPARTMENTS_NAME_REQUIRED,
        code: ERROR_CODES.DEPARTMENTS_NAME_REQUIRED,
      })
      return
    }

    const updatedDepartment = await DepartmentRepository.update(req.params.id, {
      name: name.trim(),
    })

    if (!updatedDepartment) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
        code: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
      })
      return
    }

    res.status(200).json({ success: true, data: updatedDepartment })
  } catch (error) {
    console.error('Error updateDepartment:', error)

    const err = error as MySQLError
    if (err.message.includes('no encontrado')) {
      res.status(404).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
        code: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
      })
      return
    }

    if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_DUPLICATE,
        code: ERROR_CODES.DEPARTMENTS_DUPLICATE,
      })
      return
    }

    res.status(500).json({
      success: false,
      error: ERROR_CODES.DEPARTMENTS_UPDATE_ERROR,
      code: ERROR_CODES.DEPARTMENTS_UPDATE_ERROR,
    })
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
      res.status(404).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
        code: ERROR_CODES.DEPARTMENTS_NOT_FOUND,
      })
      return
    }

    res.status(200).json({
      success: true,
      message: SUCCESS_CODES.DEPARTMENTS_DELETED,
      code: SUCCESS_CODES.DEPARTMENTS_DELETED,
    })
  } catch (error) {
    console.error('Error deleteDepartment:', error)

    const err = error as Error
    if (err.message.includes('registros asociados')) {
      res.status(409).json({
        success: false,
        error: ERROR_CODES.DEPARTMENTS_HAS_RECORDS,
        code: ERROR_CODES.DEPARTMENTS_HAS_RECORDS,
      })
      return
    }

    res.status(500).json({
      success: false,
      error: ERROR_CODES.DEPARTMENTS_DELETE_ERROR,
      code: ERROR_CODES.DEPARTMENTS_DELETE_ERROR,
    })
  }
}
