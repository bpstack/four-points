// routes/parking/analytics.routes.js

// ============================================
// PARKING ANALYTICS ROUTES
// Análisis avanzados sobre los datos base
// ============================================
import { Router } from 'express'
import ParkingAnalyticsController from '../../controllers/parking/analytics.controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(authenticateToken)

// ============================================
// ENDPOINTS DE ANÁLISIS
// ============================================

/**
 * GET /api/parking/stats/analytics/trends
 * Tendencias de ocupación en los últimos N días
 *
 * Query params: ?days=7 (opcional, default: 7)
 *
 * EJEMPLO:
 * GET /api/parking/stats/analytics/trends?days=30
 *
 * Response incluye:
 * - Ocupación promedio por planta
 * - Pico máximo de ocupación
 * - Mínimo de ocupación
 * - Tendencia (increasing/declining/stable)
 * - Recomendaciones
 */
router.get('/trends', ParkingAnalyticsController.getOccupancyTrends)

/**
 * GET /api/parking/stats/analytics/comparison
 * Comparativa entre dos periodos
 *
 * Query params:
 * - period1Start: Fecha inicio periodo 1 (YYYY-MM-DD)
 * - period1End: Fecha fin periodo 1 (YYYY-MM-DD)
 * - period2Start: Fecha inicio periodo 2 (YYYY-MM-DD)
 * - period2End: Fecha fin periodo 2 (YYYY-MM-DD)
 *
 * EJEMPLO: Comparar semana actual vs semana anterior
 * GET /api/parking/stats/analytics/comparison?period1Start=2025-10-13&period1End=2025-10-20&period2Start=2025-10-06&period2End=2025-10-13
 *
 * Response incluye:
 * - Stats de ambos periodos
 * - Diferencias absolutas y porcentuales
 * - Insights (improving/declining)
 */
router.get('/comparison', ParkingAnalyticsController.getPeriodComparison)

/**
 * GET /api/parking/stats/analytics/performance
 * Performance por planta (ranking)
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 *
 * EJEMPLO:
 * GET /api/parking/stats/analytics/performance?startDate=2025-10-01&endDate=2025-10-31
 *
 * Response incluye:
 * - Ranking de plantas por ocupación
 * - Mejor y peor planta
 * - Ocupación promedio vs pico
 * - Status (excellent/good/fair/poor)
 */
router.get('/performance', ParkingAnalyticsController.getLevelPerformance)

/**
 * GET /api/parking/stats/analytics/booking-analysis
 * Análisis de comportamiento de reservas
 *
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 *
 * EJEMPLO:
 * GET /api/parking/stats/analytics/booking-analysis?startDate=2025-10-01&endDate=2025-10-31
 *
 * Response incluye:
 * - Métricas de reservas (completadas, canceladas, no-shows)
 * - Tasas de conversión
 * - Health status (excellent/good/fair/poor)
 * - Recomendaciones automáticas
 */
router.get('/booking-analysis', ParkingAnalyticsController.getBookingAnalysis)

export default router
