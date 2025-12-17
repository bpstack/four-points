// routes/activity/activity-routes.ts
/**
 * Rutas para actividad reciente unificada
 */

import { Router } from 'express'
import { ActivityController } from '../../controllers/activity/activity-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

/**
 * GET /api/activity/recent
 * Obtener actividad reciente de todas las fuentes
 * Query params:
 *  - limit: número de resultados (default: 5, max: 50)
 *  - source: filtrar por fuente (cashier|groups|logbook|maintenance)
 *  - user_id: filtrar por usuario
 */
router.get('/recent', ActivityController.getRecentActivity)

export default router
