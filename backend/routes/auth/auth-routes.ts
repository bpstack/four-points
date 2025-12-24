// routes/auth/auth-routes.ts

import express, { Router } from 'express'
import multer from 'multer'
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
import {
  // loginLimiter, // Temporarily disabled for testing
  passwordChangeLimiter,
  profileUpdateLimiter,
} from '../../middlewares/rateLimiter.js'
import { isRealAdmin } from '../../middlewares/roleCheck.js'

const router: Router = express.Router()

// Configurar multer para avatares (máximo 2MB)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no válido. Solo se permiten: JPEG, PNG, WebP, GIF'))
    }
  },
})

// ========================================
// PUBLIC ROUTES (no authentication)
// ========================================

router.post('/login', /* loginLimiter, */ login)
router.post('/refresh-token', refreshToken)

// ========================================
// ADMIN ONLY ROUTES
// ========================================

// Solo admins reales pueden crear usuarios (no demo-admin)
router.post('/register', authenticateToken, isRealAdmin, register)

// ========================================
// PROTECTED ROUTES (require authentication)
// ========================================

router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

// Profile management (with rate limiting)
router.patch('/me/profile', authenticateToken, profileUpdateLimiter, updateProfile)
router.patch('/me/password', authenticateToken, passwordChangeLimiter, updatePassword)

// Avatar management
router.post('/me/avatar', authenticateToken, avatarUpload.single('avatar'), uploadAvatar)
router.delete('/me/avatar', authenticateToken, deleteAvatar)

export default router
