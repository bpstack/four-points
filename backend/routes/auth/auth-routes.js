// routes/auth-routes.js

import express from 'express'
import {
  login,
  register,
  refreshToken,
  logout,
  me,
} from '../../controllers/auth/auth-controllers.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = express.Router()

// ========================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================

router.post('/login', login)
router.post('/register', register)
router.post('/refresh-token', refreshToken)

// ========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================

// ✅ CORREGIDO: /me ahora está protegido
router.get('/me', authenticateToken, me)

// ✅ OPCIONAL: logout también protegido (buena práctica)
router.post('/logout', authenticateToken, logout)

export default router
