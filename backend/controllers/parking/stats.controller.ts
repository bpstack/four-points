// controllers/parking/stats.controller.ts

// ============================================
// PARKING STATS CONTROLLER
// ============================================
import { Request, Response } from 'express'
import ParkingStatsRepository from '../../repositories/parking/stats.repository.js'
import { getTodayMadrid, formatDateMadrid } from '../../config/date-utils.js'
import type { LevelRangeOccupancy } from '../../models/parking/index.js'

interface OccupancyWithAverage extends LevelRangeOccupancy {
  occupancy_rate: number
  average_daily_occupied: number
}

class ParkingStatsController {
  // ============================================
  // GET /api/parking/stats
  // Estadísticas generales del día
  // ============================================
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.query
      const targetDate = date ? new Date(String(date)) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
        return
      }

      const stats = await ParkingStatsRepository.getDailyStats(targetDate)

      res.status(200).json({
        success: true,
        date: formatDateMadrid(targetDate),
        stats,
      })
    } catch (error) {
      console.error('Error en getStats:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/occupancy
  // Ocupación por planta
  // ============================================
  async getOccupancy(req: Request, res: Response): Promise<void> {
    try {
      const { date, startDate, endDate } = req.query

      // Caso 1: Rango de fechas
      if (startDate && endDate) {
        // Validar que ambas fechas existan
        if (!startDate || !endDate) {
          res.status(400).json({
            success: false,
            message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
          })
          return
        }

        // Validar formato de fechas
        const start = new Date(String(startDate))
        const end = new Date(String(endDate))

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido. Use YYYY-MM-DD',
          })
          return
        }

        // Validar que startDate <= endDate
        if (start > end) {
          res.status(400).json({
            success: false,
            message: 'startDate debe ser menor o igual que endDate',
          })
          return
        }

        const result = await ParkingStatsRepository.getOccupancyByRange(
          String(startDate),
          String(endDate)
        )

        res.status(200).json({
          success: true,
          period: {
            startDate,
            endDate,
            days: Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
          },
          data: result.data,
        })
        return
      }

      // Caso 2: Fecha única (comportamiento original)
      const targetDate = date ? new Date(String(date)) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
        return
      }

      const occupancy = await ParkingStatsRepository.getOccupancyByLevel(
        targetDate
      )

      res.status(200).json({
        success: true,
        date: formatDateMadrid(targetDate),
        data: occupancy,
      })
    } catch (error) {
      console.error('Error en getOccupancy:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener ocupación',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/pending-checkins
  // Check-ins pendientes para hoy (o fecha específica o rango de fechas)
  // ============================================
  async getPendingCheckins(req: Request, res: Response): Promise<void> {
    try {
      const { date, startDate, endDate } = req.query

      let checkins
      let responseData

      if (startDate && endDate) {
        // Rango de fechas
        const start = new Date(String(startDate))
        const end = new Date(String(endDate))

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Fechas inválidas',
          })
          return
        }

        checkins = await ParkingStatsRepository.getPendingCheckins(
          String(startDate),
          String(endDate)
        )

        responseData = {
          success: true,
          period: { startDate, endDate },
          total: checkins.length,
          checkins,
        }
      } else {
        // Fecha única
        const targetDate = date ? new Date(String(date)) : new Date(getTodayMadrid())

        if (isNaN(targetDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Fecha inválida',
          })
          return
        }

        checkins = await ParkingStatsRepository.getPendingCheckins(targetDate)

        responseData = {
          success: true,
          date: formatDateMadrid(targetDate),
          total: checkins.length,
          checkins,
        }
      }

      res.status(200).json(responseData)
    } catch (error) {
      console.error('Error en getPendingCheckins:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener check-ins pendientes',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/pending-checkouts
  // Check-outs esperados para hoy (o fecha específica o rango de fechas)
  // ============================================
  async getPendingCheckouts(req: Request, res: Response): Promise<void> {
    try {
      const { date, startDate, endDate } = req.query

      let checkouts
      let responseData

      if (startDate && endDate) {
        // Rango de fechas
        const start = new Date(String(startDate))
        const end = new Date(String(endDate))

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Fechas inválidas',
          })
          return
        }

        checkouts = await ParkingStatsRepository.getPendingCheckouts(
          String(startDate),
          String(endDate)
        )

        responseData = {
          success: true,
          period: { startDate, endDate },
          total: checkouts.length,
          checkouts,
        }
      } else {
        // Fecha única
        const targetDate = date ? new Date(String(date)) : new Date(getTodayMadrid())

        if (isNaN(targetDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Fecha inválida',
          })
          return
        }

        checkouts = await ParkingStatsRepository.getPendingCheckouts(targetDate)

        responseData = {
          success: true,
          date: formatDateMadrid(targetDate),
          total: checkouts.length,
          checkouts,
        }
      }

      res.status(200).json(responseData)
    } catch (error) {
      console.error('Error en getPendingCheckouts:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener check-outs pendientes',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/availability
  // Disponibilidad detallada por planta y tipo
  // ============================================
  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.query
      const targetDate = date ? new Date(String(date)) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
        return
      }

      const availability = await ParkingStatsRepository.getAvailabilityByLevel(
        targetDate
      )

      res.status(200).json({
        success: true,
        data: availability,
      })
    } catch (error) {
      console.error('Error en getAvailability:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener disponibilidad',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats (Overview completo)
  // Endpoint opcional que devuelve TODO de golpe
  // ============================================
  async getFullStats(req: Request, res: Response): Promise<void> {
    try {
      const { date, startDate, endDate } = req.query

      // Caso 1: Rango de fechas
      if (startDate && endDate) {
        // Validar que ambas fechas existan
        if (!startDate || !endDate) {
          res.status(400).json({
            success: false,
            message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
          })
          return
        }

        // Validar formato de fechas
        const start = new Date(String(startDate))
        const end = new Date(String(endDate))

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido. Use YYYY-MM-DD',
          })
          return
        }

        // Validar que startDate <= endDate
        if (start > end) {
          res.status(400).json({
            success: false,
            message: 'startDate debe ser menor o igual que endDate',
          })
          return
        }

        const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        // Obtener datos del rango
        const [statsResult, occupancyResult] = await Promise.all([
          ParkingStatsRepository.getStatsByRange(String(startDate), String(endDate)),
          ParkingStatsRepository.getOccupancyByRange(String(startDate), String(endDate)),
        ])

        // Calcular promedios de ocupación para cada nivel
        const occupancyWithAverages: OccupancyWithAverage[] = occupancyResult.data.map(level => ({
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

        res.status(200).json({
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
        return
      }

      // Caso 2: Fecha única (comportamiento original)
      const targetDate = date ? new Date(String(date)) : new Date(getTodayMadrid())

      // Validar fecha
      if (isNaN(targetDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Fecha inválida',
        })
        return
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

      res.status(200).json({
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
      console.error('Error en getFullDashboard:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/stats-range
  // Estadísticas generales por rango de fechas
  // ============================================
  async getStatsByRange(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query

      // Validar que ambas fechas existan
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
        })
        return
      }

      // Validar formato de fechas
      const start = new Date(String(startDate))
      const end = new Date(String(endDate))

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        })
        return
      }

      // Validar que startDate < endDate
      if (start > end) {
        res.status(400).json({
          success: false,
          message: 'startDate debe ser menor que endDate',
        })
        return
      }

      const result = await ParkingStatsRepository.getStatsByRange(
        String(startDate),
        String(endDate)
      )

      res.status(200).json({
        success: true,
        period: {
          startDate,
          endDate,
          days: Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        },
        ...result,
      })
    } catch (error) {
      console.error('Error en getStatsByRange:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas del rango',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /api/parking/stats/occupancy-range
  // Ocupación por planta en rango de fechas (PROMEDIO)
  // ============================================
  async getOccupancyByRange(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query

      // Validar que ambas fechas existan
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Se requieren startDate y endDate en formato YYYY-MM-DD',
        })
        return
      }

      // Validar formato de fechas
      const start = new Date(String(startDate))
      const end = new Date(String(endDate))

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido. Use YYYY-MM-DD',
        })
        return
      }

      // Validar que startDate <= endDate
      if (start > end) {
        res.status(400).json({
          success: false,
          message: 'startDate debe ser menor o igual que endDate',
        })
        return
      }

      // Calcular número de días en el rango
      const daysInRange = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      // Obtener datos de ocupación del repositorio
      const result = await ParkingStatsRepository.getOccupancyByRange(
        String(startDate),
        String(endDate)
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

      res.status(200).json({
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
      console.error('Error en getOccupancyByRange:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener ocupación del rango',
        error: (error as Error).message,
      })
    }
  }
}

export default new ParkingStatsController()
