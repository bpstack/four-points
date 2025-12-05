// controllers/departments/departments-controller.js

import { DepartmentRepository } from '../../repositories/departments/departments-repository.js'

/**
 * Crear un nuevo departamento
 * Solo accesible para administradores
 */
export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body

    if (!name || name.trim() === '') {
      return res
        .status(400)
        .json({ error: 'El nombre del departamento es requerido' })
    }

    const newDepartment = await DepartmentRepository.create({
      name: name.trim(),
    })

    res.status(201).json(newDepartment)
  } catch (error) {
    console.error('Error createDepartment:', error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: error.message })
    }

    res.status(500).json({ error: 'Error al crear departamento' })
  }
}

/**
 * Devuelve todos los departamentos
 * Solo accesible para administradores
 */
export const getAllDepartments = async (req, res) => {
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
export const getDepartmentById = async (req, res) => {
  try {
    const department = await DepartmentRepository.getById(req.params.id)

    if (!department) {
      return res.status(404).json({ error: 'Departamento no encontrado' })
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
export const updateDepartment = async (req, res) => {
  try {
    const { name } = req.body

    if (!name || name.trim() === '') {
      return res.status(400).json({
        error: 'El nombre del departamento es requerido',
      })
    }

    const updatedDepartment = await DepartmentRepository.update(req.params.id, {
      name: name.trim(),
    })

    if (!updatedDepartment) {
      return res.status(404).json({ error: 'Departamento no encontrado' })
    }

    res.status(200).json(updatedDepartment)
  } catch (error) {
    console.error('Error updateDepartment:', error)

    if (error.message.includes('no encontrado')) {
      return res.status(404).json({ error: error.message })
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: error.message })
    }

    res.status(500).json({ error: 'Error al actualizar departamento' })
  }
}

/**
 * Elimina un departamento por ID
 * Solo accesible para administradores
 */
export const deleteDepartment = async (req, res) => {
  try {
    const deleted = await DepartmentRepository.delete(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Departamento no encontrado' })
    }

    res.status(200).json({ message: 'Departamento eliminado correctamente' })
  } catch (error) {
    console.error('Error deleteDepartment:', error)

    if (error.message.includes('registros asociados')) {
      return res.status(409).json({ error: error.message })
    }

    res.status(500).json({ error: 'Error al eliminar departamento' })
  }
}
