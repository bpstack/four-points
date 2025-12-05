// controllers/parking/stats.controller.js

// ============================================
// PARKING STATS CONTROLLER
// ============================================
import ParkingStatsRepository from '../../repositories/parking/stats.repository.js'
import { getTodayMadrid, formatDateMadrid } from '../../config/date-utils.js'

class ParkingStatsController {
  // ============================================
  // GET /api/parking/stats
  // Estadísticas generales del día
  // ============================================
  async getStats(req, res) {
    try {
      const { date } = req.query
      const targetDate = date ? new Date(date) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
      }

      const stats = await ParkingStatsRepository.getDailyStats(targetDate)

      return res.status(200).json({
        success: true,
        date: formatDateMadrid(targetDate),
        stats,
      })
    } catch (error) {
      console.error('❌ Error en getStats:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/occupancy
  // Ocupación por planta
  // ============================================
  async getOccupancy(req, res) {
    try {
      const { date, startDate, endDate } = req.query

      // Caso 1: Rango de fechas
      if (startDate && endDate) {
        // Validar que ambas fechas existan
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
          })
        }

        // Validar formato de fechas
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido. Use YYYY-MM-DD',
          })
        }

        // Validar que startDate <= endDate
        if (start > end) {
          return res.status(400).json({
            success: false,
            message: 'startDate debe ser menor o igual que endDate',
          })
        }

        const result = await ParkingStatsRepository.getOccupancyByRange(
          startDate,
          endDate
        )

        return res.status(200).json({
          success: true,
          period: {
            startDate,
            endDate,
            days: Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1,
          },
          data: result.data,
        })
      }

      // Caso 2: Fecha única (comportamiento original)
      const targetDate = date ? new Date(date) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
      }

      const occupancy = await ParkingStatsRepository.getOccupancyByLevel(
        targetDate
      )

      return res.status(200).json({
        success: true,
        date: formatDateMadrid(targetDate),
        data: occupancy,
      })
    } catch (error) {
      console.error('❌ Error en getOccupancy:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ocupación',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/pending-checkins
  // Check-ins pendientes para hoy (o fecha específica o rango de fechas)
  // ============================================
  async getPendingCheckins(req, res) {
    try {
      const { date, startDate, endDate } = req.query

      let checkins
      let responseData

      if (startDate && endDate) {
        // Rango de fechas
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Fechas inválidas',
          })
        }

        checkins = await ParkingStatsRepository.getPendingCheckins(
          startDate,
          endDate
        )

        responseData = {
          success: true,
          period: { startDate, endDate },
          total: checkins.length,
          checkins,
        }
      } else {
        // Fecha única
        const targetDate = date ? new Date(date) : new Date(getTodayMadrid())

        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Fecha inválida',
          })
        }

        checkins = await ParkingStatsRepository.getPendingCheckins(targetDate)

        responseData = {
          success: true,
          date: formatDateMadrid(targetDate),
          total: checkins.length,
          checkins,
        }
      }

      return res.status(200).json(responseData)
    } catch (error) {
      console.error('❌ Error en getPendingCheckins:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener check-ins pendientes',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/pending-checkouts
  // Check-outs esperados para hoy (o fecha específica o rango de fechas)
  // ============================================
  async getPendingCheckouts(req, res) {
    try {
      const { date, startDate, endDate } = req.query

      let checkouts
      let responseData

      if (startDate && endDate) {
        // Rango de fechas
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Fechas inválidas',
          })
        }

        checkouts = await ParkingStatsRepository.getPendingCheckouts(
          startDate,
          endDate
        )

        responseData = {
          success: true,
          period: { startDate, endDate },
          total: checkouts.length,
          checkouts,
        }
      } else {
        // Fecha única
        const targetDate = date ? new Date(date) : new Date(getTodayMadrid())

        if (isNaN(targetDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Fecha inválida',
          })
        }

        checkouts = await ParkingStatsRepository.getPendingCheckouts(targetDate)

        responseData = {
          success: true,
          date: formatDateMadrid(targetDate),
          total: checkouts.length,
          checkouts,
        }
      }

      return res.status(200).json(responseData)
    } catch (error) {
      console.error('❌ Error en getPendingCheckouts:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener check-outs pendientes',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/availability
  // Disponibilidad detallada por planta y tipo
  // ============================================
  async getAvailability(req, res) {
    try {
      const { date } = req.query
      const targetDate = date ? new Date(date) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
      }

      const availability = await ParkingStatsRepository.getAvailabilityByLevel(
        targetDate
      )

      return res.status(200).json({
        success: true,
        data: availability,
      })
    } catch (error) {
      console.error('❌ Error en getAvailability:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener disponibilidad',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats (Overview completo)
  // Endpoint opcional que devuelve TODO de golpe
  // ============================================
  async getFullStats(req, res) {
    try {
      const { date, startDate, endDate } = req.query

      // Caso 1: Rango de fechas
      if (startDate && endDate) {
        // Validar que ambas fechas existan
        if (!startDate || !endDate) {
          return res.status(400).json({
            success: false,
            message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
          })
        }

        // Validar formato de fechas
        const start = new Date(startDate)
        const end = new Date(endDate)

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido. Use YYYY-MM-DD',
          })
        }

        // Validar que startDate <= endDate
        if (start > end) {
          return res.status(400).json({
            success: false,
            message: 'startDate debe ser menor o igual que endDate',
          })
        }

        const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1

        // Obtener datos del rango
        const [statsResult, occupancyResult] = await Promise.all([
          ParkingStatsRepository.getStatsByRange(startDate, endDate),
          ParkingStatsRepository.getOccupancyByRange(startDate, endDate),
        ])

        // Calcular promedios de ocupación para cada nivel
        const occupancyWithAverages = occupancyResult.data.map(level => ({
          ...level,
          occupancy_rate: level.total_spots > 0 
            ? parseFloat((level.total_occupied / (level.total_spots * days) * 100).toFixed(1))
            : 0,
          average_daily_occupied: parseFloat((level.total_occupied / days).toFixed(1))
        }))

        // Calcular estadísticas con promedios
        const adjustedStats = {
          ...statsResult.stats,
          // Recalcular occupancy_rate como promedio diario
          occupancy_rate: statsResult.stats.total_spots > 0
            ? parseFloat((statsResult.stats.total_occupied / (statsResult.stats.total_spots * days) * 100).toFixed(1))
            : 0,
          average_daily_occupied: parseFloat((statsResult.stats.total_occupied / days).toFixed(1)),
          calculation_period: days === 7 ? 'weekly_average' : days === 30 ? 'monthly_average' : `${days}_days_average`
        }

        return res.status(200).json({
          success: true,
          period: {
            type: 'range',
            startDate,
            endDate,
            days,
          },
          dashboard: {
            stats: adjustedStats,
            occupancy: occupancyWithAverages,
            // Para rangos, pending_checkins y pending_checkouts son siempre del último día
            pending_checkins: null,
            pending_checkouts: null,
            availability: null,
            note: 'Los porcentajes de ocupación son promedios diarios del período',
          },
        })
      }

      // Caso 2: Fecha única (comportamiento original)
      const targetDate = date ? new Date(date) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
      }

      const formattedDate = targetDate.toISOString().split('T')[0]

      // Ejecutar todas las consultas en paralelo para un día
      const [
        stats,
        occupancy,
        pendingCheckins,
        pendingCheckouts,
        availability,
      ] = await Promise.all([
        ParkingStatsRepository.getDailyStats(targetDate),
        ParkingStatsRepository.getOccupancyByLevel(targetDate),
        ParkingStatsRepository.getPendingCheckins(targetDate),
        ParkingStatsRepository.getPendingCheckouts(targetDate),
        ParkingStatsRepository.getAvailabilityByLevel(targetDate),
      ])

      return res.status(200).json({
        success: true,
        period: {
          type: 'single_day',
          date: formattedDate,
        },
        dashboard: {
          stats,
          occupancy,
          pending_checkins: {
            total: pendingCheckins.length,
            items: pendingCheckins,
          },
          pending_checkouts: {
            total: pendingCheckouts.length,
            items: pendingCheckouts,
          },
          availability,
        },
      })
    } catch (error) {
      console.error('❌ Error en getFullDashboard:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/stats-range
  // Estadísticas generales por rango de fechas
  // ============================================
  async getStatsByRange(req, res) {
    try {
      const { startDate, endDate } = req.query

      // Validar que ambas fechas existan
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
        })
      }

      // Validar formato de fechas
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        })
      }

      // Validar que startDate < endDate
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'startDate debe ser menor que endDate',
        })
      }

      const result = await ParkingStatsRepository.getStatsByRange(
        startDate,
        endDate
      )

      return res.status(200).json({
        success: true,
        period: {
          startDate,
          endDate,
          days: Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1,
        },
        ...result,
      })
    } catch (error) {
      console.error('❌ Error en getStatsByRange:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas del rango',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/occupancy-range
  // Ocupación por planta en rango de fechas (PROMEDIO)
  // ============================================
  async getOccupancyByRange(req, res) {
    try {
      const { startDate, endDate } = req.query

      // Validar que ambas fechas existan
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
        })
      }

      // Validar formato de fechas
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        })
      }

      // Validar que startDate <= endDate
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'startDate debe ser menor o igual que endDate',
        })
      }

      // Calcular número de días en el rango
      const daysInRange = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1

      // Obtener datos de ocupación del repositorio
      const result = await ParkingStatsRepository.getOccupancyByRange(
        startDate,
        endDate
      )

      // Calcular promedios de ocupación
      const occupancyWithAverages = result.data.map(level => ({
        ...level,
        occupancy_rate: level.total_spots > 0 
          ? parseFloat((level.total_occupied / (level.total_spots * daysInRange) * 100).toFixed(1))
          : 0,
        average_daily_occupied: parseFloat((level.total_occupied / daysInRange).toFixed(1))
      }))

      // Calcular totales y promedios generales
      const totals = occupancyWithAverages.reduce((acc, level) => ({
        total_spots: acc.total_spots + level.total_spots,
        total_occupied_sum: acc.total_occupied_sum + level.total_occupied,
        total_available: acc.total_available + level.available
      }), { total_spots: 0, total_occupied_sum: 0, total_available: 0 })

      const averageOccupancyRate = totals.total_spots > 0
        ? parseFloat((totals.total_occupied_sum / (totals.total_spots * daysInRange) * 100).toFixed(1))
        : 0

      return res.status(200).json({
        success: true,
        period: {
          startDate,
          endDate,
          days: daysInRange,
        },
        data: occupancyWithAverages,
        summary: {
          average_occupancy_rate: averageOccupancyRate,
          average_daily_occupied: parseFloat((totals.total_occupied_sum / daysInRange).toFixed(1)),
          total_spots: totals.total_spots,
          calculation_method: 'daily_average'
        }
      })
    } catch (error) {
      console.error('❌ Error en getOccupancyByRange:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener ocupación del rango',
        error: error.message,
      })
    }
  }
}

export default new ParkingStatsController()
