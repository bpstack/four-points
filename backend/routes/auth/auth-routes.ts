// routes/auth/auth-routes.ts

import express, { Router } from 'express'
import {
  login,
  register,
  refreshToken,
  logout,
  me,
} from '../../controllers/auth/auth-controllers.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router: Router = express.Router()

// ========================================
// PUBLIC ROUTES (no authentication)
// ========================================

router.post('/login', login)
router.post('/register', register)
router.post('/refresh-token', refreshToken)

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

export default router
