// routes/auth/auth-routes.ts

import express, { Router } from 'express'
import {
  login,
  demoLogin,
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
import { denyDemo } from '../../middlewares/demoRestriction.js'
import { singleImage } from '../../middlewares/imageUpload.js'
import {
  loginLimiter,
  demoLoginLimiter,
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
// Demo entry without password; answers 404 unless DEMO_MODE=true (ADR-038)
router.post('/demo', demoLoginLimiter, demoLogin)

// ========================================
// ADMIN ONLY ROUTES
// ========================================

// Solo admins reales pueden crear usuarios (no demo-admin)
router.post('/register', authenticateToken, denyDemo, isRealAdmin, register)

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

router.get('/me', authenticateToken, me)

// Profile management (with rate limiting)
// The demo account cannot change its username, password or avatar (it is shared)
router.patch('/me/profile', authenticateToken, denyDemo, profileUpdateLimiter, updateProfile)
router.patch('/me/password', authenticateToken, denyDemo, passwordChangeLimiter, updatePassword)

// Avatar management
router.post(
  '/me/avatar',
  authenticateToken,
  denyDemo,
  singleImage('avatar', 2 * 1024 * 1024),
  uploadAvatar
)
router.delete('/me/avatar', authenticateToken, denyDemo, deleteAvatar)

export default router
