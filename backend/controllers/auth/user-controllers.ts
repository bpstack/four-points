// controllers/auth/user-controllers.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import type { UpdateUserDTO } from '../../models/auth/index.js'
import { logger } from '../../config/logger.js'
import { validateUpdateUser, getValidationErrors } from '../../validations/auth/user-validation.js'

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
    res.status(500).json({ error: 'Error al recuperar usuarios' })
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
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json(user)
  } catch (error) {
    logger.error({ err: error }, 'Error getUserById')
    res.status(500).json({ error: 'Error al obtener usuario' })
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
    res.status(500).json({ error: 'Error al obtener usuarios por rol' })
  }
}

/**
 * Actualiza un usuario por ID
 * Solo administradores (isRealAdmin en la ruta)
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
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json(updatedUser)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message === 'Usuario no encontrado') {
      res.status(404).json({ error: message })
      return
    }
    if (message.startsWith('Rol no válido')) {
      res.status(400).json({ error: 'Rol no válido' })
      return
    }
    if (message === 'El nombre de usuario o email ya existe') {
      res.status(409).json({ error: message })
      return
    }
    logger.error({ err: error }, 'Error updateUser')
    res.status(500).json({ error: 'Error al actualizar usuario' })
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
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    logger.error({ err: error }, 'Error deleteUser')
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
}

/**
 * Reset de contraseña por admin
 * Solo accesible para administradores
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    const success = await UserRepository.resetPassword(req.params.id, newPassword)

    if (!success) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ message: 'Contraseña actualizada correctamente' })
  } catch (error: any) {
    logger.error({ err: error }, 'Error resetUserPassword')
    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error al resetear contraseña' })
  }
}
