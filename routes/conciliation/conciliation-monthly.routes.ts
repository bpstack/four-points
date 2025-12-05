// routes/conciliation/conciliation-monthly.routes.ts

// =========================================================
// ROUTES - RESUMEN MENSUAL DE CONCILIACIÓN
// =========================================================

import { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin } from '../../middlewares/roleCheck.js'
import * as monthlyCtrl from '../../controllers/conciliation/conciliation-monthly.controller.js'

const router = Router()

// ============================================
// RUTAS PÚBLICAS (requieren autenticación)
// ============================================

/**
 * GET /api/conciliations/monthly-summary/:year/:month
 * Obtener resumen mensual completo
 * Cualquier usuario autenticado puede consultar
 */
router.get('/:year/:month', authenticateToken, monthlyCtrl.getMonthlySummary)

/**
 * GET /api/conciliations/monthly-summary/:year/:month/validation
 * Validar si el resumen mensual puede cerrarse
 * Útil para mostrar warnings/errors en el frontend antes de intentar cerrar
 */
router.get(
  '/:year/:month/validation',
  authenticateToken,
  monthlyCtrl.validateMonthlySummary
)

/**
 * GET /api/conciliations/monthly-summary/:year/:month/missing-days
 * Obtener lista de días faltantes en el mes
 */
router.get(
  '/:year/:month/missing-days',
  authenticateToken,
  monthlyCtrl.getMissingDays
)

// ============================================
// RUTAS ADMIN (requieren rol administrador)
// ============================================

/**
 * PATCH /api/conciliations/monthly-summary/:year/:month/status
 * Actualizar el estado del resumen mensual
 * Solo admin puede marcar como 'closed'
 */
router.patch(
  '/:year/:month/status',
  authenticateToken,
  isAdmin,
  monthlyCtrl.updateMonthlySummaryStatus
)

export default router
