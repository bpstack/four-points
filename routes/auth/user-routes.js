// routes/user-routes.js

import express from 'express'
import {
  getAllUsers,
  getUserById,
  getUsersByRole,
  updateUser,
  deleteUser,
} from '../../controllers/auth/user-controllers.js'

import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin, isOwnerOrAdmin } from '../../middlewares/roleCheck.js'

const router = express.Router()

// ========================================
// TODAS las rutas requieren autenticación
// ========================================
router.use(authenticateToken)

// ========================================
// RUTAS SOLO PARA ADMINISTRADORES
// ========================================

router.get('/', isAdmin, getAllUsers)
router.get('/role/:role', isAdmin, getUsersByRole)
router.delete('/:id', isAdmin, deleteUser)

// ========================================
// RUTAS PARA DUEÑO O ADMINISTRADOR
// ========================================

router.get('/:id', isOwnerOrAdmin, getUserById)
router.put('/:id', isOwnerOrAdmin, updateUser)

export default router
