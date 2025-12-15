// routes/departments/departments-routes.ts

import { Router } from 'express'
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from '../../controllers/departments/departments-controller.js'

import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin, excludeMantenimiento } from '../../middlewares/roleCheck.js'

const router = Router()

// ========================================
// TODAS las rutas requieren autenticación
// El rol mantenimiento NO tiene acceso a este módulo
// ========================================
router.use(authenticateToken)
router.use(excludeMantenimiento)

// ========================================
// RUTAS
// ========================================

// Crear nuevo departamento (solo admin)
router.post('/', isAdmin, createDepartment)

// Listar todos los departamentos
router.get('/', getAllDepartments)

// Obtener departamento por ID
router.get('/:id', getDepartmentById)

// Actualizar departamento por ID (solo admin)
router.put('/:id', isAdmin, updateDepartment)

// Eliminar departamento por ID (solo admin)
router.delete('/:id', isAdmin, deleteDepartment)

export default router
