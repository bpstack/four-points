// controllers/parking/analytics.controller.ts

// ============================================
// PARKING ANALYTICS CONTROLLER
// Análisis avanzados usando los datos base
// ============================================
import { Request, Response } from 'express'
import ParkingStatsRepository from '../../repositories/parking/stats.repository.js'
import { getNowMadrid } from '../../config/date-utils.js'
import type { RangeStats } from '../../models/parking/index.js'

interface TrendData {
  min_occupied?: number
  max_occupied?: number
  occupied_spots?: number
}

interface DiffResult {
  absolute: number
  percentage: number
  direction: 'up' | 'down' | 'stable'
}

interface Recommendation {
  type: string
  message: string
  priority: string
}

class ParkingAnalyticsController {
  // ============================================
  // GET /api/parking/stats/analytics/trends
  // Tendencias de ocupación (últimos 7/30 días)
  // ============================================
  getOccupancyTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const { days = '7' } = req.query // Default: última semana

      const endDate = getNowMadrid()
      const startDate = getNowMadrid().subtract(parseInt(String(days)), 'day')

      const formattedStart = startDate.format('YYYY-MM-DD')
      const formattedEnd = endDate.format('YYYY-MM-DD')

      const result = await ParkingStatsRepository.getOccupancyByRange(
        formattedStart,
        formattedEnd
      )

      // Análisis adicional
      const analysis = {
        period: {
          days: parseInt(String(days)),
          startDate: formattedStart,
          endDate: formattedEnd,
        },
        trends: result.data.map((level) => ({
          level: level.level_code,
          avg_occupancy: 0, // Would need additional data
          peak_occupancy: 0,
          lowest_occupancy: 0,
          trend: this._calculateTrend(0, 0, 0),
        })),
        global_summary: {
          avg_occupancy: 0,
          peak_day: null,
          recommendation: this._getRecommendation(0),
        },
      }

      res.status(200).json({
        success: true,
        data: analysis,
      })
    } catch (error) {
      console.error('Error en getOccupancyTrends:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener tendencias',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/analytics/comparison
  // Comparativa entre dos periodos
  // ============================================
  getPeriodComparison = async (req: Request, res: Response): Promise<void> => {
    try {
      const { period1Start, period1End, period2Start, period2End } = req.query

      // Validaciones
      if (!period1Start || !period1End || !period2Start || !period2End) {
        res.status(400).json({
          success: false,
          message:
            'Se requieren 4 fechas: period1Start, period1End, period2Start, period2End',
        })
        return
      }

      // Obtener datos de ambos periodos
      const [period1, period2] = await Promise.all([
        ParkingStatsRepository.getStatsByRange(String(period1Start), String(period1End)),
        ParkingStatsRepository.getStatsByRange(String(period2Start), String(period2End)),
      ])

      // Calcular diferencias
      const comparison = {
        period1: {
          range: { start: period1Start, end: period1End },
          stats: period1.stats,
        },
        period2: {
          range: { start: period2Start, end: period2End },
          stats: period2.stats,
        },
        differences: {
          occupancy_rate: this._calculateDiff(0, 0), // Would need occupancy_rate in stats
          total_bookings: this._calculateDiff(
            period1.stats.total_bookings,
            period2.stats.total_bookings
          ),
          completed: this._calculateDiff(
            period1.stats.completed_today,
            period2.stats.completed_today
          ),
          no_shows: this._calculateDiff(
            period1.stats.no_shows_today,
            period2.stats.no_shows_today
          ),
          canceled: this._calculateDiff(
            period1.stats.canceled_today,
            period2.stats.canceled_today
          ),
        },
        insights: {
          performance: 'stable' as const,
          booking_trend:
            period1.stats.total_bookings > period2.stats.total_bookings
              ? 'increasing'
              : 'decreasing',
        },
      }

      res.status(200).json({
        success: true,
        data: comparison,
      })
    } catch (error) {
      console.error('Error en getPeriodComparison:', error)
      res.status(500).json({
        success: false,
        message: 'Error al comparar periodos',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/analytics/performance
  // Performance por planta (mejor/peor ocupación)
  // ============================================
  getLevelPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate',
        })
        return
      }

      const result = await ParkingStatsRepository.getOccupancyByRange(
        String(startDate),
        String(endDate)
      )

      // Ordenar por ocupación
      const levelsRanked = [...result.data].sort(
        (a, b) => b.total_occupied - a.total_occupied
      )

      const performance = {
        period: { startDate, endDate },
        ranking: levelsRanked.map((level, index) => ({
          rank: index + 1,
          level: level.level_code,
          occupancy_rate: 0,
          avg_occupied: level.total_occupied,
          peak_occupied: 0,
          status: this._getPerformanceStatus(0),
        })),
        insights: {
          best_performer: levelsRanked[0]?.level_code,
          worst_performer: levelsRanked[levelsRanked.length - 1]?.level_code,
          avg_global: 0,
        },
      }

      res.status(200).json({
        success: true,
        data: performance,
      })
    } catch (error) {
      console.error('Error en getLevelPerformance:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener performance',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/analytics/booking-analysis
  // Análisis de comportamiento de reservas
  // ============================================
  getBookingAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate',
        })
        return
      }

      const result = await ParkingStatsRepository.getStatsByRange(
        String(startDate),
        String(endDate)
      )

      const stats = result.stats

      // Calcular métricas
      const totalEvents =
        stats.completed_today + stats.canceled_today + stats.no_shows_today

      const analysis = {
        period: { startDate, endDate },
        booking_metrics: {
          total_bookings: stats.total_bookings,
          completed: stats.completed_today,
          canceled: stats.canceled_today,
          no_shows: stats.no_shows_today,
        },
        conversion_rates: {
          completion_rate: totalEvents > 0 ? parseFloat(
            ((stats.completed_today / totalEvents) * 100).toFixed(2)
          ) : 0,
          cancellation_rate: totalEvents > 0 ? parseFloat(
            ((stats.canceled_today / totalEvents) * 100).toFixed(2)
          ) : 0,
          no_show_rate: totalEvents > 0 ? parseFloat(
            ((stats.no_shows_today / totalEvents) * 100).toFixed(2)
          ) : 0,
        },
        health_status: this._getBookingHealth(
          stats.completed_today,
          stats.canceled_today,
          stats.no_shows_today
        ),
        recommendations: this._getBookingRecommendations(
          stats.canceled_today,
          stats.no_shows_today,
          totalEvents
        ),
      }

      res.status(200).json({
        success: true,
        data: analysis,
      })
    } catch (error) {
      console.error('Error en getBookingAnalysis:', error)
      res.status(500).json({
        success: false,
        message: 'Error al analizar reservas',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  _calculateTrend(min: number, max: number, avg: number): string {
    const range = max - min

    if (range === 0) return 'stable'

    const position = avg - min
    const percentage = (position / range) * 100

    if (percentage < 40) return 'declining'
    if (percentage > 60) return 'increasing'
    return 'stable'
  }

  _getRecommendation(occupancyRate: number): string {
    if (occupancyRate >= 85) {
      return 'Ocupación alta. Considerar expandir capacidad o ajustar precios.'
    }
    if (occupancyRate >= 60) {
      return 'Ocupación óptima. Mantener estrategia actual.'
    }
    if (occupancyRate >= 40) {
      return 'Ocupación moderada. Considerar promociones para aumentar reservas.'
    }
    return 'Ocupación baja. Revisar estrategia de precios y marketing.'
  }

  _calculateDiff(value1: number, value2: number): DiffResult {
    const diff = value1 - value2
    const percentDiff =
      value2 !== 0 ? parseFloat(((diff / value2) * 100).toFixed(2)) : 0

    return {
      absolute: diff,
      percentage: percentDiff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
    }
  }

  _getPerformanceStatus(occupancyRate: number): string {
    if (occupancyRate >= 80) return 'excellent'
    if (occupancyRate >= 60) return 'good'
    if (occupancyRate >= 40) return 'fair'
    return 'poor'
  }

  _getBookingHealth(completed: number, canceled: number, noShows: number): string {
    const total = completed + canceled + noShows
    if (total === 0) return 'no_data'

    const completionRate = (completed / total) * 100

    if (completionRate >= 85) return 'excellent'
    if (completionRate >= 70) return 'good'
    if (completionRate >= 50) return 'fair'
    return 'poor'
  }

  _getBookingRecommendations(
    canceled: number,
    noShows: number,
    total: number
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (total === 0) {
      recommendations.push({
        type: 'no_data',
        message: 'No hay suficientes datos para generar recomendaciones.',
        priority: 'info',
      })
      return recommendations
    }

    const cancelRate = (canceled / total) * 100
    const noShowRate = (noShows / total) * 100

    if (cancelRate > 15) {
      recommendations.push({
        type: 'high_cancellations',
        message:
          'Tasa de cancelación alta. Revisar política de cancelación o mejorar confirmaciones.',
        priority: 'high',
      })
    }

    if (noShowRate > 10) {
      recommendations.push({
        type: 'high_no_shows',
        message:
          'Muchos no-shows. Implementar recordatorios automáticos o política de penalización.',
        priority: 'high',
      })
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'healthy',
        message:
          'Comportamiento de reservas saludable. Continuar con las prácticas actuales.',
        priority: 'info',
      })
    }

    return recommendations
  }
}

export default new ParkingAnalyticsController()
