// routes/departments/departments-routes.js

import express from 'express'
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../../controllers/departments/departments-controller.js'

import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin } from '../../middlewares/roleCheck.js'

const router = express.Router()

// ========================================
// TODAS las rutas requieren autenticación
// ========================================
router.use(authenticateToken)

// ========================================
// RUTAS SOLO PARA ADMINISTRADORES
// ========================================

// Crear nuevo departamento
router.post('/', authenticateToken, isAdmin, createDepartment)

// Listar todos los departamentos
router.get('/', authenticateToken, getAllDepartments)

// Obtener departamento por ID
router.get('/:id', authenticateToken, getDepartmentById)

// Actualizar departamento por ID
router.put('/:id', authenticateToken, isAdmin, updateDepartment)

// Eliminar departamento por ID
router.delete('/:id', authenticateToken, isAdmin, deleteDepartment)

export default router
