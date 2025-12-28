// routes/chat/chat-routes.ts
/**
 * Rutas para el chat de ayuda con IA
 */

import { Router } from 'express'
import { sendMessage, getStatus } from '../../controllers/chat/chat-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

/**
 * POST /api/chat/message
 * Envía un mensaje al asistente de ayuda
 * Body: { message: string, history?: Array<{role, content}> }
 */
router.post('/message', sendMessage)

/**
 * GET /api/chat/status
 * Obtiene el estado del servicio de chat
 */
router.get('/status', getStatus)

export default router
