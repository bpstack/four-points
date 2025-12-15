// routes/cashier-routes.ts

import express from 'express'
import { CashierDailyController } from '../../controllers/cashier/cashier-daily-controller.js'
import { CashierShiftController } from '../../controllers/cashier/cashier-shift-controller.js'
import { CashierVoucherController } from '../../controllers/cashier/cashier-voucher-controller.js'
import { CashierPaymentController } from '../../controllers/cashier/cashier-payment-controller.js'
import { CashierDenominationController } from '../../controllers/cashier/cashier-denomination-controller.js'
import { CashierReportController } from '../../controllers/cashier/cashier-report-controller.js'
import { CashierHistoryController } from '../../controllers/cashier/cashier-history-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import {
  isAdmin,
  canManageCashier,
  canViewReports,
  excludeMantenimiento,
} from '../../middlewares/roleCheck.js'

const router = express.Router()

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// El rol mantenimiento NO tiene acceso a este módulo
// ============================================
router.use(authenticateToken)
router.use(excludeMantenimiento)

// ============================================
// 📅 DAILY ROUTES (Agregados Diarios)
// ============================================

/**
 * GET /api/cashier/daily/:date
 * Obtener detalles completos de un día
 */
router.get('/daily/:date', authenticateToken, CashierDailyController.getByDate)

/**
 * POST /api/cashier/daily/:date/initialize
 * Inicializar día (crear 4 turnos)
 */
router.post(
  '/daily/:date/initialize',
  authenticateToken,
  canManageCashier,
  CashierDailyController.initializeDay
)

/**
 * PATCH /api/cashier/daily/:date/close
 * Cerrar día completo
 */
router.patch(
  '/daily/:date/close',
  authenticateToken,
  canManageCashier,
  CashierDailyController.closeDay
)

/**
 * PATCH /api/cashier/daily/:date/reopen
 * Reabrir día cerrado (solo admin)
 */
router.patch('/daily/:date/reopen', authenticateToken, isAdmin, CashierDailyController.reopenDay)

/**
 * GET /api/cashier/daily/:date/summary
 * Obtener resumen de un día
 */
router.get('/daily/:date/summary', authenticateToken, CashierDailyController.getSummary)

/**
 * GET /api/cashier/daily
 * Listar días con paginación
 */
router.get('/daily', authenticateToken, CashierDailyController.getAll)

/**
 * GET /api/cashier/reports/monthly/:year/:month
 * Resumen mensual (solo admin)
 */
router.get(
  '/reports/monthly/:year/:month',
  authenticateToken,
  canViewReports,
  CashierDailyController.getMonthlySummary
)

// ============================================
// 🔄 SHIFT ROUTES (Turnos)
// ============================================

/**
 * GET /api/cashier/shifts
 * Listar turnos con filtros
 */
router.get('/shifts', authenticateToken, CashierShiftController.getAll)

/**
 * GET /api/cashier/shifts/:id
 * Obtener turno por ID con detalles
 */
router.get('/shifts/:id', authenticateToken, CashierShiftController.getById)

/**
 * PATCH /api/cashier/shifts/:id
 * Actualizar turno
 */
router.patch('/shifts/:id', authenticateToken, canManageCashier, CashierShiftController.update)

/**
 * PATCH /api/cashier/shifts/:id/close
 * Cerrar turno
 */
router.patch('/shifts/:id/close', authenticateToken, canManageCashier, CashierShiftController.close)

/**
 * PATCH /api/cashier/shifts/:id/reopen
 * Reabrir turno (solo admin)
 */
router.patch('/shifts/:id/reopen', authenticateToken, isAdmin, CashierShiftController.reopen)

/**
 * PUT /api/cashier/shifts/:id/users
 * Actualizar responsables del turno (solo admin)
 */
router.put('/shifts/:id/users', authenticateToken, isAdmin, CashierShiftController.updateUsers)

/**
 * DELETE /api/cashier/shifts/:id
 * Eliminar turno (solo admin, solo si está abierto)
 */
router.delete('/shifts/:id', authenticateToken, isAdmin, CashierShiftController.delete)

/**
 * GET /api/cashier/shifts/:id/history
 * Obtener historial de un turno
 */
router.get('/shifts/:id/history', authenticateToken, CashierShiftController.getHistory)

// ============================================
// 🎫 VOUCHER ROUTES (Vales)
// ============================================

/**
 * GET /api/cashier/vouchers
 * Listar vales con filtros
 */
router.get('/vouchers', authenticateToken, CashierVoucherController.getAll)

/**
 * GET /api/cashier/vouchers/active
 * Obtener vales activos (pendientes)
 */
router.get('/vouchers/active', authenticateToken, CashierVoucherController.getActive)

/**
 * GET /api/cashier/vouchers/stats
 * Obtener estadísticas de vales
 */
router.get('/vouchers/stats', authenticateToken, CashierVoucherController.getStats)

/**
 * GET /api/cashier/vouchers/:id
 * Obtener vale por ID
 */
router.get('/vouchers/:id', authenticateToken, CashierVoucherController.getById)

/**
 * POST /api/cashier/shifts/:shiftId/vouchers
 * Crear vale en un turno
 */
router.post(
  '/shifts/:shiftId/vouchers',
  authenticateToken,
  canManageCashier,
  CashierVoucherController.create
)

/**
 * PATCH /api/cashier/vouchers/:id
 * Actualizar vale
 */
router.patch('/vouchers/:id', authenticateToken, canManageCashier, CashierVoucherController.update)

/**
 * PATCH /api/cashier/vouchers/:id/justify
 * Justificar vale (cambiar a justified)
 */
router.patch(
  '/vouchers/:id/justify',
  authenticateToken,
  canManageCashier,
  CashierVoucherController.justify
)

/**
 * PATCH /api/cashier/vouchers/:id/cancel
 * Cancelar vale (solo admin)
 */
router.patch('/vouchers/:id/cancel', authenticateToken, isAdmin, CashierVoucherController.cancel)

/**
 * DELETE /api/cashier/vouchers/:id
 * Eliminar vale (solo admin, solo si está pendiente)
 */
router.delete('/vouchers/:id', authenticateToken, isAdmin, CashierVoucherController.delete)

// ============================================
// 💳 PAYMENT ROUTES (Pagos)
// ============================================

/**
 * GET /api/cashier/shifts/:shiftId/payments
 * Obtener pagos de un turno
 */
router.get('/shifts/:shiftId/payments', authenticateToken, CashierPaymentController.getByShift)

/**
 * GET /api/cashier/shifts/:shiftId/payments/summary
 * Resumen de pagos por método
 */
router.get(
  '/shifts/:shiftId/payments/summary',
  authenticateToken,
  CashierPaymentController.getSummary
)

/**
 * POST /api/cashier/shifts/:shiftId/payments
 * Crear pago individual
 */
router.post(
  '/shifts/:shiftId/payments',
  authenticateToken,
  canManageCashier,
  CashierPaymentController.create
)

/**
 * PUT /api/cashier/shifts/:shiftId/payments
 * Reemplazar todos los pagos de un turno (bulk update)
 */
router.put(
  '/shifts/:shiftId/payments',
  authenticateToken,
  canManageCashier,
  CashierPaymentController.replaceAll
)

/**
 * PATCH /api/cashier/payments/:id
 * Actualizar pago
 */
router.patch('/payments/:id', authenticateToken, canManageCashier, CashierPaymentController.update)

/**
 * DELETE /api/cashier/payments/:id
 * Eliminar pago (solo admin)
 */
router.delete('/payments/:id', authenticateToken, isAdmin, CashierPaymentController.delete)

// ============================================
// 💵 DENOMINATION ROUTES (Denominaciones)
// ============================================

/**
 * GET /api/cashier/shifts/:shiftId/denominations
 * Obtener denominaciones de un turno
 */
router.get(
  '/shifts/:shiftId/denominations',
  authenticateToken,
  CashierDenominationController.getByShift
)

/**
 * POST /api/cashier/shifts/:shiftId/denominations
 * Crear denominación individual
 */
router.post(
  '/shifts/:shiftId/denominations',
  authenticateToken,
  canManageCashier,
  CashierDenominationController.create
)

/**
 * PUT /api/cashier/shifts/:shiftId/denominations
 * Reemplazar todas las denominaciones de un turno (bulk update)
 */
router.put(
  '/shifts/:shiftId/denominations',
  authenticateToken,
  canManageCashier,
  CashierDenominationController.replaceAll
)

/**
 * PATCH /api/cashier/denominations/:id
 * Actualizar denominación
 */
router.patch(
  '/denominations/:id',
  authenticateToken,
  canManageCashier,
  CashierDenominationController.update
)

/**
 * DELETE /api/cashier/denominations/:id
 * Eliminar denominación (solo admin)
 */
router.delete(
  '/denominations/:id',
  authenticateToken,
  isAdmin,
  CashierDenominationController.delete
)

// ============================================
// 📊 REPORT ROUTES (Reportes - Solo Admin)
// ============================================

/**
 * GET /api/cashier/reports/dashboard
 * Dashboard general con resumen de hoy
 */
router.get(
  '/reports/dashboard',
  authenticateToken,
  canViewReports,
  CashierReportController.getDashboardOverview
)

/**
 * GET /api/cashier/reports/daily/:date
 * Reporte completo de un día específico
 */
router.get(
  '/reports/daily/:date',
  authenticateToken,
  canViewReports,
  CashierReportController.getDailyReport
)

/**
 * GET /api/cashier/reports/period
 * Reporte de período con desglose diario
 */
router.get(
  '/reports/period',
  authenticateToken,
  canViewReports,
  CashierReportController.getPeriodReport
)

/**
 * GET /api/cashier/reports/vouchers-history
 * Historial completo de vales
 */
router.get(
  '/reports/vouchers-history',
  authenticateToken,
  canViewReports,
  CashierReportController.getVouchersHistory
)

/**
 * GET /api/cashier/reports/shifts-summary
 * Resumen de turnos agrupados por tipo
 */
router.get(
  '/reports/shifts-summary',
  authenticateToken,
  canViewReports,
  CashierReportController.getShiftsSummary
)
// ============================================
// 🔍 HISTORY & AUDIT ROUTES (Historial)
// ============================================

/**
 * GET /api/cashier/history
 * Obtener historial con filtros
 */
router.get('/history', authenticateToken, canViewReports, CashierHistoryController.getAll)

/**
 * GET /api/cashier/history/stats
 * Obtener estadísticas de historial
 */
router.get('/history/stats', authenticateToken, canViewReports, CashierHistoryController.getStats)

/**
 * GET /api/cashier/history/shift/:shiftId
 * Obtener historial de un turno específico
 */
router.get(
  '/history/shift/:shiftId',
  authenticateToken,
  canViewReports,
  CashierHistoryController.getByShift
)

/**
 * GET /api/cashier/history/recent
 * Obtener actividad reciente
 */
router.get('/history/recent', authenticateToken, canViewReports, CashierHistoryController.getRecent)

export default router
