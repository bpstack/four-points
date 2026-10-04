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
  uploadAvatar,
  deleteAvatar,
} from '../../controllers/auth/auth-controllers.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { singleImage } from '../../middlewares/imageUpload.js'
import {
  loginLimiter,
  loginIpLimiter,
  refreshLimiter,
  passwordChangeLimiter,
  profileUpdateLimiter,
} from '../../middlewares/rateLimiter.js'
import { isRealAdmin } from '../../middlewares/roleCheck.js'

const router: Router = express.Router()

// ========================================
// PUBLIC ROUTES (no authentication)
// ========================================

router.post('/login', loginIpLimiter, loginLimiter, login)
router.post('/refresh-token', refreshLimiter, refreshToken)
// Public: only clears the HttpOnly cookies, which the browser cannot do itself once the access token expired
router.post('/logout', logout)

// ========================================
// ADMIN ONLY ROUTES
// ========================================

// Solo admins reales pueden crear usuarios (no demo-admin)
router.post('/register', authenticateToken, isRealAdmin, register)

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

router.get('/me', authenticateToken, me)

// Profile management (with rate limiting)
router.patch('/me/profile', authenticateToken, profileUpdateLimiter, updateProfile)
router.patch('/me/password', authenticateToken, passwordChangeLimiter, updatePassword)

// Avatar management
router.post('/me/avatar', authenticateToken, singleImage('avatar', 2 * 1024 * 1024), uploadAvatar)
router.delete('/me/avatar', authenticateToken, deleteAvatar)

export default router
