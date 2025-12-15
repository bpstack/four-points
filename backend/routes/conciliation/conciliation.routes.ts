// routes/conciliation/conciliation.routes.ts

// =========================================================
// ROUTES - SISTEMA DE CONCILIACIÓN (Form-based)
// =========================================================

import { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin } from '../../middlewares/roleCheck.js'
import * as conciliationCtrl from '../../controllers/conciliation/conciliation.controller.js'
import monthlyRoutes from './conciliation-monthly.routes.js'

const router = Router()

// ============================================
// MONTAR RUTAS DE RESUMEN MENSUAL
// ============================================
router.use('/monthly-summary', monthlyRoutes)

// ============================================
// RUTAS PÚBLICAS (requieren autenticación)
// ============================================

/**
 * GET /api/conciliations
 * Listar todas las conciliaciones
 */
router.get('/', authenticateToken, conciliationCtrl.getAll)

/**
 * GET /api/conciliations/day/:date
 * Obtener conciliación por fecha específica (igual que logbooks)
 * ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id para evitar conflictos
 */
router.get('/day/:date', authenticateToken, conciliationCtrl.getByDay)

/**
 * GET /api/conciliations/:id
 * Obtener una conciliación completa con todas sus entries
 */
router.get('/:id', authenticateToken, conciliationCtrl.getById)

/**
 * POST /api/conciliations
 * Crear nueva conciliación + inicializar todas las entries en 0
 */
router.post('/', authenticateToken, conciliationCtrl.create)

/**
 * PUT /api/conciliations/:id/form
 * Actualizar el formulario completo (todas las entries de una vez)
 */
router.put('/:id/form', authenticateToken, conciliationCtrl.updateForm)

/**
 * PATCH /api/conciliations/:id/status
 * Cambiar el estado de una conciliación (draft/confirmed/closed)
 * Solo admin puede marcar como 'closed'
 */
router.patch('/:id/status', authenticateToken, conciliationCtrl.updateStatus)

/**
 * POST /api/conciliations/:id/recalculate
 * Recalcular totales de una conciliación
 */
router.post('/:id/recalculate', authenticateToken, conciliationCtrl.recalculateTotals)

// ============================================
// RUTAS ADMIN (requieren rol de administrador)
// ============================================

/**
 * DELETE /api/conciliations/:id
 * Eliminar (soft delete) una conciliación
 * Solo administradores
 */
router.delete('/:id', authenticateToken, isAdmin, conciliationCtrl.remove)

export default router
