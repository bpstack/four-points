// routes/parking/stats.routes.ts

// ============================================
// PARKING STATS ROUTES - VERSIÓN SIMPLIFICADA
// ============================================
import { Router } from 'express'
import ParkingStatsController from '../../controllers/parking/stats.controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(authenticateToken)

// ============================================
// ENDPOINTS PRINCIPALES
// ============================================

/**
 * GET /api/parking/stats
 * Dashboard completo - Soporta FECHA ÚNICA o RANGO DE FECHAS
 *
 * MODO 1: Sin params (default: HOY)
 * GET /api/parking/stats
 * → Devuelve: stats, occupancy, pending_checkins, pending_checkouts, availability
 *
 * MODO 2: Fecha única específica
 * GET /api/parking/stats?date=2025-10-17
 * → Devuelve: stats, occupancy, pending_checkins, pending_checkouts, availability
 *
 * MODO 3: Rango de fechas
 * GET /api/parking/stats?startDate=2025-10-01&endDate=2025-10-31
 * → Devuelve: stats y occupancy consolidados (promedios, máximos, mínimos)
 * → NO incluye: pending_checkins, pending_checkouts, availability (solo aplican a día específico)
 *
 * CASOS DE USO:
 * - Dashboard diario → Sin params
 * - Ver día pasado → ?date=2025-10-15
 * - Estadísticas semanales → ?startDate=2025-10-13&endDate=2025-10-20
 * - Estadísticas mensuales → ?startDate=2025-10-01&endDate=2025-10-31
 * - Comparar periodos → Hacer 2 llamadas con diferentes rangos
 */
router.get('/', ParkingStatsController.getFullStats)

/**
 * GET /api/parking/stats/pending-checkins
 * Check-ins pendientes para un día específico
 *
 * Query params:
 * - ?date=2025-10-17 (opcional, default: hoy)
 *
 * Use case: Mostrar lista de vehículos que deben entrar hoy
 * Útil para: Dashboard en tiempo real, notificaciones
 */
router.get('/pending-checkins', ParkingStatsController.getPendingCheckins)

/**
 * GET /api/parking/stats/pending-checkouts
 * Check-outs esperados para un día específico
 *
 * Query params:
 * - ?date=2025-10-17 (opcional, default: hoy)
 *
 * Use case: Mostrar lista de vehículos que deben salir hoy
 * Útil para: Dashboard en tiempo real, alertas de retraso
 */
router.get('/pending-checkouts', ParkingStatsController.getPendingCheckouts)

export default router
