// routes/conciliation/conciliation.routes.ts

// =========================================================
// ROUTES - SISTEMA DE CONCILIACIÓN (Form-based)
// =========================================================

import { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin, excludeMantenimiento } from '../../middlewares/roleCheck.js'
import * as conciliationCtrl from '../../controllers/conciliation/conciliation.controller.js'
import monthlyRoutes from './conciliation-monthly.routes.js'

const router = Router()

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// El rol mantenimiento NO tiene acceso a este módulo
// ============================================
router.use(authenticateToken)
router.use(excludeMantenimiento)

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
router.get('/', conciliationCtrl.getAll)

/**
 * GET /api/conciliations/day/:date
 * Obtener conciliación por fecha específica (igual que logbooks)
 * ⚠️ IMPORTANTE: Esta ruta DEBE ir ANTES de /:id para evitar conflictos
 */
router.get('/day/:date', conciliationCtrl.getByDay)

/**
 * GET /api/conciliations/:id
 * Obtener una conciliación completa con todas sus entries
 */
router.get('/:id', conciliationCtrl.getById)

/**
 * POST /api/conciliations
 * Crear nueva conciliación + inicializar todas las entries en 0
 */
router.post('/', conciliationCtrl.create)

/**
 * PUT /api/conciliations/:id/form
 * Actualizar el formulario completo (todas las entries de una vez)
 */
router.put('/:id/form', conciliationCtrl.updateForm)

/**
 * PATCH /api/conciliations/:id/status
 * Cambiar el estado de una conciliación (draft/confirmed/closed)
 * Solo admin puede marcar como 'closed'
 */
router.patch('/:id/status', conciliationCtrl.updateStatus)

/**
 * POST /api/conciliations/:id/recalculate
 * Recalcular totales de una conciliación
 */
router.post('/:id/recalculate', conciliationCtrl.recalculateTotals)

// ============================================
// RUTAS ADMIN (requieren rol de administrador)
// ============================================

/**
 * DELETE /api/conciliations/:id
 * Eliminar (soft delete) una conciliación
 * Solo administradores
 */
router.delete('/:id', isAdmin, conciliationCtrl.remove)

export default router
