// controllers/user-controllers.js

import { UserRepository } from '../../repositories/auth/user-repository.js'

/**
 * Devuelve todos los usuarios
 * Solo accesible para administradores
 */
export const getAllUsers = async (req, res) => {
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
export const getUserById = async (req, res) => {
  try {
    const user = await UserRepository.getById(req.params.id)

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
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
export const getUsersByRole = async (req, res) => {
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
export const updateUser = async (req, res) => {
  try {
    const { username, email, role } = req.body

    const updatedUser = await UserRepository.update(req.params.id, {
      username,
      email,
      role,
    })

    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
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
export const deleteUser = async (req, res) => {
  try {
    const deleted = await UserRepository.delete(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.status(200).json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('Error deleteUser:', error)
    res.status(500).json({ error: 'Error al eliminar usuario' })
  }
}
