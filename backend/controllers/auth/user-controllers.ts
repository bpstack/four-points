// controllers/auth/user-controllers.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import type { UpdateUserDTO } from '../../models/auth/index.js'
import { logger } from '../../config/logger.js'
import { ERROR_CODES } from '../../config/error-codes.js'
import {
  validateUpdateUser,
  getValidationErrors,
  newPasswordSchema,
} from '../../validations/auth/user-validation.js'

// ============================================
// USER CONTROLLERS
// ============================================

/**
 * Devuelve todos los usuarios
 * Solo accesible para administradores
 */
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserRepository.getAll()
    res.status(200).json(users)
  } catch (error) {
    logger.error({ err: error }, 'Error getAllUsers')
    res
      .status(500)
      .json({ error: ERROR_CODES.AUTH_FETCH_USERS_ERROR, code: ERROR_CODES.AUTH_FETCH_USERS_ERROR })
  }
}

/**
 * Devuelve un usuario por ID
 * Accesible para el propio usuario o administradores
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserRepository.getById(req.params.id)

    if (!user) {
      res
        .status(404)
        .json({ error: ERROR_CODES.AUTH_USER_NOT_FOUND, code: ERROR_CODES.AUTH_USER_NOT_FOUND })
      return
    }

    res.status(200).json(user)
  } catch (error) {
    logger.error({ err: error }, 'Error getUserById')
    res
      .status(500)
      .json({ error: ERROR_CODES.AUTH_FETCH_USER_ERROR, code: ERROR_CODES.AUTH_FETCH_USER_ERROR })
  }
}

/**
 * Devuelve usuarios filtrados por rol
 * Solo accesible para administradores
 */
export const getUsersByRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserRepository.getByRole(req.params.role)
    res.status(200).json(users)
  } catch (error) {
    logger.error({ err: error }, 'Error getUsersByRole')
    res.status(500).json({
      error: ERROR_CODES.AUTH_FETCH_USERS_BY_ROLE_ERROR,
      code: ERROR_CODES.AUTH_FETCH_USERS_BY_ROLE_ERROR,
    })
  }
}

/**
 * Actualiza un usuario por ID
 * Solo administradores (isAdmin en la ruta)
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const validation = validateUpdateUser(req.body)
  if (!validation.success) {
    res.status(400).json({ errors: getValidationErrors(validation) })
    return
  }

  try {
    const { username, email, role } = validation.data as UpdateUserDTO
    const updatedUser = await UserRepository.update(req.params.id, { username, email, role })

    if (!updatedUser) {
      res
        .status(404)
        .json({ error: ERROR_CODES.AUTH_USER_NOT_FOUND, code: ERROR_CODES.AUTH_USER_NOT_FOUND })
      return
    }

    res.status(200).json(updatedUser)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'Usuario no encontrado') {
      res
        .status(404)
        .json({ error: ERROR_CODES.AUTH_USER_NOT_FOUND, code: ERROR_CODES.AUTH_USER_NOT_FOUND })
      return
    }
    if (message.startsWith('Rol no válido')) {
      res
        .status(400)
        .json({ error: ERROR_CODES.AUTH_INVALID_ROLE, code: ERROR_CODES.AUTH_INVALID_ROLE })
      return
    }
    if (message === 'El nombre de usuario o email ya existe') {
      res.status(409).json({
        error: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
        code: ERROR_CODES.AUTH_USER_ALREADY_EXISTS,
      })
      return
    }
    logger.error({ err: error }, 'Error updateUser')
    res
      .status(500)
      .json({ error: ERROR_CODES.AUTH_UPDATE_USER_ERROR, code: ERROR_CODES.AUTH_UPDATE_USER_ERROR })
  }
}

/**
 * Elimina un usuario por ID
 * Solo accesible para administradores
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await UserRepository.delete(req.params.id)

    if (!deleted) {
      res
        .status(404)
        .json({ error: ERROR_CODES.AUTH_USER_NOT_FOUND, code: ERROR_CODES.AUTH_USER_NOT_FOUND })
      return
    }

    res.status(200).json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    logger.error({ err: error }, 'Error deleteUser')
    res
      .status(500)
      .json({ error: ERROR_CODES.AUTH_DELETE_USER_ERROR, code: ERROR_CODES.AUTH_DELETE_USER_ERROR })
  }
}

/**
 * Reset de contraseña por admin
 * Solo accesible para administradores
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = newPasswordSchema.safeParse(req.body?.newPassword)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message })
      return
    }
    const newPassword = parsed.data

    const success = await UserRepository.resetPassword(req.params.id, newPassword)

    if (!success) {
      res
        .status(404)
        .json({ error: ERROR_CODES.AUTH_USER_NOT_FOUND, code: ERROR_CODES.AUTH_USER_NOT_FOUND })
      return
    }

    res.status(200).json({ message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    logger.error({ err: error }, 'Error resetUserPassword')
    if ((error as Error).message === 'Usuario no encontrado') {
      res
        .status(404)
        .json({ error: ERROR_CODES.AUTH_USER_NOT_FOUND, code: ERROR_CODES.AUTH_USER_NOT_FOUND })
      return
    }
    res.status(500).json({
      error: ERROR_CODES.AUTH_RESET_PASSWORD_ERROR,
      code: ERROR_CODES.AUTH_RESET_PASSWORD_ERROR,
    })
  }
}
