// backend/routes/demo/demo-activity-routes.ts
/**
 * Rutas para consultar y gestionar logs de actividad demo
 * Solo accesible para administradores reales (no demo-admin)
 */

import { Router } from 'express'
import { DemoActivityController } from '../../controllers/demo/demo-activity-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isRealAdmin } from '../../middlewares/roleCheck.js'

const router = Router()

// Aplicar autenticación y verificar que es admin real
router.use(authenticateToken)
router.use(isRealAdmin)

// ========================================
// RUTAS DE LOGS
// ========================================

/**
 * @route   GET /api/demo-activity/logs
 * @desc    Obtener logs de actividad demo con paginación y filtros
 * @access  Private (admin only, not demo-admin)
 * @query   limit, offset, username, method, route, startDate, endDate, blocked
 */
router.get('/logs', DemoActivityController.getLogs)

/**
 * @route   GET /api/demo-activity/stats
 * @desc    Obtener estadísticas de actividad demo
 * @access  Private (admin only, not demo-admin)
 * @query   days (default 30, max 365)
 */
router.get('/stats', DemoActivityController.getStats)

/**
 * @route   GET /api/demo-activity/export
 * @desc    Exportar logs a formato markdown (descargar registrosDemo.md)
 * @access  Private (admin only, not demo-admin)
 * @query   limit (default 100, max 500)
 */
router.get('/export', DemoActivityController.exportToMarkdown)

/**
 * @route   DELETE /api/demo-activity/cleanup
 * @desc    Limpiar logs antiguos
 * @access  Private (admin only, not demo-admin)
 * @query   daysToKeep (default 90, min 30)
 */
router.delete('/cleanup', DemoActivityController.cleanupOldLogs)

export default router
