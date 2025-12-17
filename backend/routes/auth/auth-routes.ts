// routes/auth/auth-routes.ts

import express, { Router } from 'express'
import {
  login,
  register,
  refreshToken,
  logout,
  me,
  updateProfile,
  updatePassword,
} from '../../controllers/auth/auth-controllers.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import {
  loginLimiter,
  passwordChangeLimiter,
  profileUpdateLimiter,
} from '../../middlewares/rateLimiter.js'

const router: Router = express.Router()

// ========================================
// PUBLIC ROUTES (no authentication)
// ========================================

router.post('/login', loginLimiter, login)
router.post('/register', register)
router.post('/refresh-token', refreshToken)

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

// Profile management (with rate limiting)
router.patch('/me/profile', authenticateToken, profileUpdateLimiter, updateProfile)
router.patch('/me/password', authenticateToken, passwordChangeLimiter, updatePassword)

export default router
