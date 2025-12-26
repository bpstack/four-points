// routes/auth/user-routes.ts

import express, { Router } from 'express'
import {
  getAllUsers,
  getUserById,
  getUsersByRole,
  updateUser,
  deleteUser,
  resetUserPassword,
} from '../../controllers/auth/user-controllers.js'

import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin, isOwnerOrAdmin } from '../../middlewares/roleCheck.js'

const router: Router = express.Router()

// ========================================
// ALL routes require authentication
// ========================================
router.use(authenticateToken)

// ========================================
// ADMIN ONLY ROUTES
// ========================================

router.get('/', isAdmin, getAllUsers)
router.get('/role/:role', isAdmin, getUsersByRole)
router.delete('/:id', isAdmin, deleteUser)
router.post('/:id/reset-password', isAdmin, resetUserPassword)

// ========================================
// OWNER OR ADMIN ROUTES
// ========================================

router.get('/:id', isOwnerOrAdmin, getUserById)
router.put('/:id', isOwnerOrAdmin, updateUser)

export default router
