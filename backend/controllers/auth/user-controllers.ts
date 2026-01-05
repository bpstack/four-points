// controllers/auth/user-controllers.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import type { UpdateUserDTO } from '../../models/auth/index.js'

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
    console.error('Error getAllUsers:', error)
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
    console.error('Error getUserById:', error)
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
    console.error('Error getUsersByRole:', error)
    res.status(500).json({ error: 'Error al obtener usuarios por rol' })
  }
}

/**
 * Actualiza un usuario por ID
 * Accesible para el propio usuario o administradores
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, role } = req.body as UpdateUserDTO

    const updatedUser = await UserRepository.update(req.params.id, {
      username,
      email,
      role,
    })

    if (!updatedUser) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json(updatedUser)
  } catch (error) {
    console.error('Error updateUser:', error)
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
    console.error('Error deleteUser:', error)
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
    console.error('Error resetUserPassword:', error)
    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ error: error.message })
      return
    }
    res.status(500).json({ error: 'Error al resetear contraseña' })
  }
}
