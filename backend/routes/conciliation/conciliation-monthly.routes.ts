// routes/conciliation/conciliation-monthly.routes.ts

// =========================================================
// ROUTES - RESUMEN MENSUAL DE CONCILIACIÓN
// =========================================================

import { Router } from 'express'
import { isAdmin } from '../../middlewares/roleCheck.js'
import * as monthlyCtrl from '../../controllers/conciliation/conciliation-monthly.controller.js'

const router = Router()

// ============================================
// NOTA: Este router se monta DESPUÉS de que
// conciliation.routes.ts ya aplicó authenticateToken
// y excludeMantenimiento, por lo que hereda esos middlewares
// ============================================

// ============================================
// RUTAS PÚBLICAS (autenticación heredada del router padre)
// ============================================

/**
 * GET /api/conciliations/monthly-summary/:year/:month
 * Obtener resumen mensual completo
 * Cualquier usuario autenticado puede consultar
 */
router.get('/:year/:month', monthlyCtrl.getMonthlySummary)

/**
 * GET /api/conciliations/monthly-summary/:year/:month/validation
 * Validar si el resumen mensual puede cerrarse
 * Útil para mostrar warnings/errors en el frontend antes de intentar cerrar
 */
router.get('/:year/:month/validation', monthlyCtrl.validateMonthlySummary)

/**
 * GET /api/conciliations/monthly-summary/:year/:month/missing-days
 * Obtener lista de días faltantes en el mes
 */
router.get('/:year/:month/missing-days', monthlyCtrl.getMissingDays)

// ============================================
// RUTAS ADMIN (requieren rol administrador)
// ============================================

/**
 * PATCH /api/conciliations/monthly-summary/:year/:month/status
 * Actualizar el estado del resumen mensual
 * Solo admin puede marcar como 'closed'
 */
router.patch('/:year/:month/status', isAdmin, monthlyCtrl.updateMonthlySummaryStatus)

export default router
