// controllers/parking/analytics.controller.js

// ============================================
// PARKING ANALYTICS CONTROLLER
// Análisis avanzados usando los datos base
// ============================================
import ParkingStatsRepository from '../../repositories/parking/stats.repository.js'
import { getTodayMadrid, getNowMadrid } from '../../config/date-utils.js'

class ParkingAnalyticsController {
  // ============================================
  // GET /api/parking/stats/analytics/trends
  // Tendencias de ocupación (últimos 7/30 días)
  // ============================================
  getOccupancyTrends = async (req, res) => {
    try {
      const { days = 7 } = req.query // Default: última semana

      const endDate = getNowMadrid()
      const startDate = getNowMadrid().subtract(parseInt(days), 'day')

      const formattedStart = startDate.format('YYYY-MM-DD')
      const formattedEnd = endDate.format('YYYY-MM-DD')

      const result = await ParkingStatsRepository.getOccupancyByRange(
        formattedStart,
        formattedEnd
      )

      // Análisis adicional
      const analysis = {
        period: {
          days: parseInt(days),
          startDate: formattedStart,
          endDate: formattedEnd,
        },
        trends: result.data.levels.map((level) => ({
          level: level.level,
          avg_occupancy: level.occupancy_rate,
          peak_occupancy: parseFloat(
            ((level.max_occupied / level.total_spots) * 100).toFixed(2)
          ),
          lowest_occupancy: parseFloat(
            ((level.min_occupied / level.total_spots) * 100).toFixed(2)
          ),
          trend: this._calculateTrend(
            level.min_occupied,
            level.max_occupied,
            level.occupied_spots
          ),
        })),
        global_summary: {
          avg_occupancy: result.data.summary.occupancy_rate,
          peak_day: null,
          recommendation: this._getRecommendation(
            result.data.summary.occupancy_rate
          ),
        },
      }

      return res.status(200).json({
        success: true,
        data: analysis,
      })
    } catch (error) {
      console.error('❌ Error en getOccupancyTrends:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tendencias',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/analytics/comparison
  // Comparativa entre dos periodos
  // ============================================
  getPeriodComparison = async (req, res) => {
    try {
      const { period1Start, period1End, period2Start, period2End } = req.query

      // Validaciones
      if (!period1Start || !period1End || !period2Start || !period2End) {
        return res.status(400).json({
          success: false,
          message:
            'Se requieren 4 fechas: period1Start, period1End, period2Start, period2End',
        })
      }

      // Obtener datos de ambos periodos
      const [period1, period2] = await Promise.all([
        ParkingStatsRepository.getStatsByRange(period1Start, period1End),
        ParkingStatsRepository.getStatsByRange(period2Start, period2End),
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
          occupancy_rate: this._calculateDiff(
            period1.stats.occupancy_rate,
            period2.stats.occupancy_rate
          ),
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
          performance:
            period1.stats.occupancy_rate > period2.stats.occupancy_rate
              ? 'improving'
              : 'declining',
          booking_trend:
            period1.stats.total_bookings > period2.stats.total_bookings
              ? 'increasing'
              : 'decreasing',
        },
      }

      return res.status(200).json({
        success: true,
        data: comparison,
      })
    } catch (error) {
      console.error('❌ Error en getPeriodComparison:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al comparar periodos',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/analytics/performance
  // Performance por planta (mejor/peor ocupación)
  // ============================================
  getLevelPerformance = async (req, res) => {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate',
        })
      }

      const result = await ParkingStatsRepository.getOccupancyByRange(
        startDate,
        endDate
      )

      // Ordenar por ocupación
      const levelsRanked = [...result.data.levels].sort(
        (a, b) => b.occupancy_rate - a.occupancy_rate
      )

      const performance = {
        period: { startDate, endDate },
        ranking: levelsRanked.map((level, index) => ({
          rank: index + 1,
          level: level.level,
          occupancy_rate: level.occupancy_rate,
          avg_occupied: level.occupied_spots,
          peak_occupied: level.max_occupied,
          status: this._getPerformanceStatus(level.occupancy_rate),
        })),
        insights: {
          best_performer: levelsRanked[0]?.level,
          worst_performer: levelsRanked[levelsRanked.length - 1]?.level,
          avg_global: result.data.summary.occupancy_rate,
        },
      }

      return res.status(200).json({
        success: true,
        data: performance,
      })
    } catch (error) {
      console.error('❌ Error en getLevelPerformance:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener performance',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/analytics/booking-analysis
  // Análisis de comportamiento de reservas
  // ============================================
  getBookingAnalysis = async (req, res) => {
    try {
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate',
        })
      }

      const result = await ParkingStatsRepository.getStatsByRange(
        startDate,
        endDate
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
          completion_rate: parseFloat(
            ((stats.completed_today / totalEvents) * 100).toFixed(2)
          ),
          cancellation_rate: parseFloat(
            ((stats.canceled_today / totalEvents) * 100).toFixed(2)
          ),
          no_show_rate: parseFloat(
            ((stats.no_shows_today / totalEvents) * 100).toFixed(2)
          ),
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

      return res.status(200).json({
        success: true,
        data: analysis,
      })
    } catch (error) {
      console.error('❌ Error en getBookingAnalysis:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al analizar reservas',
        error: error.message,
      })
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  _calculateTrend(min, max, avg) {
    const range = max - min

    if (range === 0) return 'stable'

    const position = avg - min
    const percentage = (position / range) * 100

    if (percentage < 40) return 'declining'
    if (percentage > 60) return 'increasing'
    return 'stable'
  }

  _getRecommendation(occupancyRate) {
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

  _calculateDiff(value1, value2) {
    const diff = value1 - value2
    const percentDiff =
      value2 !== 0 ? parseFloat(((diff / value2) * 100).toFixed(2)) : 0

    return {
      absolute: diff,
      percentage: percentDiff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
    }
  }

  _getPerformanceStatus(occupancyRate) {
    if (occupancyRate >= 80) return 'excellent'
    if (occupancyRate >= 60) return 'good'
    if (occupancyRate >= 40) return 'fair'
    return 'poor'
  }

  _getBookingHealth(completed, canceled, noShows) {
    const total = completed + canceled + noShows
    if (total === 0) return 'no_data'

    const completionRate = (completed / total) * 100

    if (completionRate >= 85) return 'excellent'
    if (completionRate >= 70) return 'good'
    if (completionRate >= 50) return 'fair'
    return 'poor'
  }

  _getBookingRecommendations(canceled, noShows, total) {
    const recommendations = []

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
