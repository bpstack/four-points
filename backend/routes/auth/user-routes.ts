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
import { denyDemoWrites } from '../../middlewares/demoRestriction.js'

const router: Router = express.Router()

// ========================================
// ALL routes require authentication
// ========================================
router.use(authenticateToken)
// The demo account sees users but cannot create, edit, delete or reset them
router.use(denyDemoWrites)

// ========================================
// ADMIN ONLY ROUTES
// ========================================

router.get('/', isAdmin, getAllUsers)
router.get('/role/:role', isAdmin, getUsersByRole)
router.delete('/:id', isAdmin, deleteUser)
router.post('/:id/reset-password', isAdmin, resetUserPassword)
// Users edit their own username via PATCH /api/auth/me/profile (requires current password)
router.put('/:id', isAdmin, updateUser)

// ========================================
// OWNER OR ADMIN ROUTES
// ========================================

router.get('/:id', isOwnerOrAdmin, getUserById)

export default router
