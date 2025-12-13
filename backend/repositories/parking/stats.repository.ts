// ============================================
// PARKING STATS REPOSITORY
// ============================================
import pool from '../../config/db.js'
import { RowDataPacket } from 'mysql2/promise'
import type {
  DailyStatsRow,
  OccupancyByLevelRow,
  PendingCheckinRow,
  PendingCheckoutRow,
  AvailabilityByLevelRow,
  DailyStats,
  OccupancyByLevelResponse,
  LevelOccupancy,
  FormattedPendingCheckin,
  FormattedPendingCheckout,
  AvailabilityByLevelResponse,
  LevelAvailability,
  RangeStats,
  LevelRangeOccupancy,
  LevelCode,
  SpotType,
} from '../../models/parking/index.js'

interface RangeStatsRow extends RowDataPacket {
  total_spots: number
  total_occupied: number
  total_bookings: number
  total_checkins: number
  total_checkouts: number
  active_bookings: number
  completed_in_range: number
  canceled_in_range: number
  no_shows_in_range: number
}

interface LevelRangeOccupancyRow extends RowDataPacket {
  level_code: LevelCode
  total_spots: number
  total_occupied: number
}

class ParkingStatsRepository {
  // ============================================
  // STATS - Estadísticas generales del día
  // ============================================
  async getDailyStats(date: Date | string = new Date()): Promise<DailyStats> {
    const targetDate = new Date(date).toISOString().split('T')[0]

    const query = `
    SELECT 
      -- Total de plazas
      (SELECT COUNT(*) FROM parking_spots WHERE is_active = TRUE) AS total_spots,
      
      -- CORREGIDO: Plazas ocupadas según AVAILABILITY (no según bookings)
      (SELECT COUNT(DISTINCT spot_id) 
      FROM parking_bookings 
      WHERE DATE(expected_checkin) <= ?
      AND DATE(expected_checkout) >= ?
      AND status IN ('reserved', 'checked_in')
      ) AS occupied_spots,
      
      -- Reservas totales para HOY (todas las que incluyen hoy)
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status IN ('reserved', 'checked_in')
        AND DATE(expected_checkin) <= ?
        AND DATE(expected_checkout) > ?
      ) AS total_bookings,
      
      -- Check-ins pendientes HOY
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status = 'reserved'
        AND DATE(expected_checkin) = ?
      ) AS pending_checkins,
      
      -- Check-outs esperados HOY
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status IN ('reserved', 'checked_in')
        AND DATE(expected_checkout) = ?
      ) AS pending_checkouts,
      
      -- Reservas activas (reserved + checked_in)
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status IN ('reserved', 'checked_in')
        AND DATE(expected_checkin) <= ?
        AND DATE(expected_checkout) > ?
      ) AS active_bookings,
      
      -- Completadas hoy
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status = 'completed'
        AND DATE(actual_checkout) = ?
      ) AS completed_today,
      
      -- Canceladas hoy
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status = 'canceled'
        AND DATE(updated_at) = ?
      ) AS canceled_today,
      
      -- No-shows hoy
      (SELECT COUNT(*) 
      FROM parking_bookings 
      WHERE status = 'no_show'
        AND DATE(updated_at) = ?
      ) AS no_shows_today
  `

    const [rows] = await pool.query<DailyStatsRow[]>(query, [
      targetDate, // para occupied_spots (checkin)
      targetDate, // para occupied_spots (checkout)
      targetDate, // occupied_spots (desde availability)
      targetDate,
      targetDate, // total_bookings
      targetDate, // pending_checkins
      targetDate, // pending_checkouts
      targetDate,
      targetDate, // active_bookings
      targetDate, // completed_today
      targetDate, // canceled_today
      targetDate, // no_shows_today
    ])

    const stats = rows[0]

    return {
      total_spots: parseInt(String(stats.total_spots)),
      occupied_spots: parseInt(String(stats.occupied_spots)),
      available_spots:
        parseInt(String(stats.total_spots)) - parseInt(String(stats.occupied_spots)),
      total_bookings: parseInt(String(stats.total_bookings)),
      pending_checkins: parseInt(String(stats.pending_checkins)),
      pending_checkouts: parseInt(String(stats.pending_checkouts)),
      active_bookings: parseInt(String(stats.active_bookings)),
      completed_today: parseInt(String(stats.completed_today)),
      canceled_today: parseInt(String(stats.canceled_today)),
      no_shows_today: parseInt(String(stats.no_shows_today)),
      occupancy_rate: parseFloat(
        (
          (parseInt(String(stats.occupied_spots)) / parseInt(String(stats.total_spots))) *
          100
        ).toFixed(2)
      ),
    }
  }

  // ============================================
  // OCCUPANCY - Ocupación por planta
  // ============================================
  async getOccupancyByLevel(
    date: Date | string = new Date()
  ): Promise<OccupancyByLevelResponse> {
    const targetDate =
      typeof date === 'string' ? date : new Date().toISOString().split('T')[0]

    const query = `
    SELECT 
      ps.level_code,
      COUNT(DISTINCT ps.id) AS total_spots,
      -- CORREGIDO: Usar ANY_VALUE() para evitar error de GROUP BY
      ANY_VALUE((SELECT COUNT(*) 
      FROM parking_availability pa
      WHERE pa.spot_id = ps.id 
        AND pa.date = ? 
        AND pa.is_available = FALSE
      )) AS occupied_spots,
      COUNT(DISTINCT CASE 
        WHEN b.status IN ('reserved', 'checked_in')
          AND DATE(b.expected_checkin) <= ?
          AND DATE(b.expected_checkout) > ?
        THEN b.id 
      END) AS total_bookings
    FROM parking_spots ps
    LEFT JOIN parking_bookings b ON ps.id = b.spot_id
    WHERE ps.is_active = TRUE
    GROUP BY ps.level_code
    ORDER BY ps.level_code
  `

    const [rows] = await pool.query<OccupancyByLevelRow[]>(query, [
      targetDate, // occupied_spots (desde availability)
      targetDate, // total_bookings
      targetDate, // total_bookings
    ])

    const levels: LevelOccupancy[] = rows.map((row) => ({
      level: row.level_code,
      total_spots: parseInt(String(row.total_spots)),
      occupied_spots: parseInt(String(row.occupied_spots)),
      available_spots: parseInt(String(row.total_spots)) - parseInt(String(row.occupied_spots)),
      total_bookings: parseInt(String(row.total_bookings)),
      occupancy_rate: parseFloat(
        (
          (parseInt(String(row.occupied_spots)) / parseInt(String(row.total_spots))) *
          100
        ).toFixed(2)
      ),
    }))

    // Calcular totales
    const totals = {
      level: 'TOTAL' as const,
      total_spots: levels.reduce((sum, l) => sum + l.total_spots, 0),
      occupied_spots: levels.reduce((sum, l) => sum + l.occupied_spots, 0),
      available_spots: levels.reduce((sum, l) => sum + l.available_spots, 0),
      total_bookings: levels.reduce((sum, l) => sum + l.total_bookings, 0),
      occupancy_rate: 0,
    }

    totals.occupancy_rate = parseFloat(
      ((totals.occupied_spots / totals.total_spots) * 100).toFixed(2)
    )

    return {
      levels,
      summary: totals,
    }
  }

  // ============================================
  // PENDING CHECKINS - Check-ins pendientes hoy y rango de fechas
  // ============================================
  async getPendingCheckins(
    dateOrStartDate: Date | string,
    endDate?: string
  ): Promise<FormattedPendingCheckin[]> {
    let query: string
    let params: string[]

    if (endDate) {
      // Rango de fechas
      query = `
      SELECT 
        b.id AS booking_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.expected_checkin,
        b.expected_checkout,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS days,
        b.booking_source,
        b.external_booking_id,
        b.total_amount,
        b.notes,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM parking_bookings b2 
            WHERE b2.spot_id = b.spot_id 
              AND b2.id != b.id 
              AND b2.status = 'checked_in' 
              AND DATE(b2.actual_checkin) <= ?
              AND (b2.actual_checkout IS NULL OR DATE(b2.actual_checkout) >= ?)
          ) THEN 1 
          ELSE 0 
        END AS spot_currently_occupied
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      WHERE b.status = 'reserved'
        AND DATE(b.expected_checkin) BETWEEN ? AND ?
      ORDER BY b.expected_checkin, ps.level_code, ps.spot_number
    `
      params = [endDate, endDate, String(dateOrStartDate), endDate]
    } else {
      // Fecha única
      const targetDate = new Date(dateOrStartDate).toISOString().split('T')[0]
      query = `
      SELECT 
        b.id AS booking_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.expected_checkin,
        b.expected_checkout,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS days,
        b.booking_source,
        b.external_booking_id,
        b.total_amount,
        b.notes,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM parking_bookings b2 
            WHERE b2.spot_id = b.spot_id 
              AND b2.id != b.id 
              AND b2.status = 'checked_in' 
              AND DATE(b2.actual_checkin) <= ?
              AND (b2.actual_checkout IS NULL OR DATE(b2.actual_checkout) >= ?)
          ) THEN 1 
          ELSE 0 
        END AS spot_currently_occupied
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      WHERE b.status = 'reserved'
        AND DATE(b.expected_checkin) = ?
      ORDER BY b.expected_checkin, ps.level_code, ps.spot_number
    `
      params = [targetDate, targetDate, targetDate]
    }

    const [rows] = await pool.query<PendingCheckinRow[]>(query, params)

    return rows.map((row) => ({
      booking_id: row.booking_id,
      spot: {
        number: row.spot_number,
        level: row.level_code,
        type: row.spot_type,
        currently_occupied: row.spot_currently_occupied === 1,
      },
      vehicle: row.plate_number
        ? {
            plate: row.plate_number,
            owner: row.owner_name!,
            model: row.vehicle_model,
          }
        : null,
      schedule: {
        expected_checkin: row.expected_checkin,
        expected_checkout: row.expected_checkout,
        days: row.days,
      },
      booking_info: {
        source: row.booking_source,
        external_id: row.external_booking_id,
        total_amount: parseFloat(String(row.total_amount || 0)),
        notes: row.notes,
      },
    }))
  }

  // ============================================
  // PENDING CHECKOUTS - Check-outs esperados hoy (o fecha específica o rango de fechas)
  // ============================================
  async getPendingCheckouts(
    dateOrStartDate: Date | string,
    endDate?: string
  ): Promise<FormattedPendingCheckout[]> {
    let query: string
    let params: string[]

    if (endDate) {
      // Rango de fechas
      query = `
      SELECT 
        b.id AS booking_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.expected_checkin,
        b.actual_checkin,
        b.expected_checkout,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS planned_days,
        DATEDIFF(?, IFNULL(b.actual_checkin, b.expected_checkin)) AS actual_days,
        b.booking_source,
        b.external_booking_id,
        b.total_amount,
        b.payment_amount,
        b.payment_method,
        b.notes,
        CASE 
          WHEN NOW() > b.expected_checkout THEN 1
          ELSE 0
        END AS is_overdue
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      WHERE b.status = 'checked_in'
        AND DATE(b.expected_checkout) BETWEEN ? AND ?
      ORDER BY 
        CASE WHEN NOW() > b.expected_checkout THEN 0 ELSE 1 END,
        b.expected_checkout, 
        ps.level_code, 
        ps.spot_number
    `
      params = [endDate, String(dateOrStartDate), endDate]
    } else {
      // Fecha única
      const targetDate = new Date(dateOrStartDate).toISOString().split('T')[0]
      query = `
      SELECT 
        b.id AS booking_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.expected_checkin,
        b.actual_checkin,
        b.expected_checkout,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS planned_days,
        DATEDIFF(?, IFNULL(b.actual_checkin, b.expected_checkin)) AS actual_days,
        b.booking_source,
        b.external_booking_id,
        b.total_amount,
        b.payment_amount,
        b.payment_method,
        b.notes,
        CASE 
          WHEN NOW() > b.expected_checkout THEN 1
          ELSE 0
        END AS is_overdue
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      WHERE b.status = 'checked_in'
        AND DATE(b.expected_checkout) = ?
      ORDER BY 
        CASE WHEN NOW() > b.expected_checkout THEN 0 ELSE 1 END,
        b.expected_checkout, 
        ps.level_code, 
        ps.spot_number
    `
      params = [targetDate, targetDate]
    }

    const [rows] = await pool.query<PendingCheckoutRow[]>(query, params)

    return rows.map((row) => ({
      booking_id: row.booking_id,
      spot: {
        number: row.spot_number,
        level: row.level_code,
        type: row.spot_type,
      },
      vehicle: row.plate_number
        ? {
            plate: row.plate_number,
            owner: row.owner_name!,
            model: row.vehicle_model,
          }
        : null,
      schedule: {
        expected_checkin: row.expected_checkin,
        actual_checkin: row.actual_checkin,
        expected_checkout: row.expected_checkout,
        planned_days: row.planned_days,
        actual_days: row.actual_days,
        is_overdue: row.is_overdue === 1,
      },
      payment: {
        total_amount: parseFloat(String(row.total_amount || 0)),
        paid_amount: parseFloat(String(row.payment_amount || 0)),
        pending_amount:
          parseFloat(String(row.total_amount || 0)) -
          parseFloat(String(row.payment_amount || 0)),
        method: row.payment_method,
      },
      booking_info: {
        source: row.booking_source,
        external_id: row.external_booking_id,
        notes: row.notes,
      },
    }))
  }

  // ============================================
  // AVAILABILITY BY LEVEL - Disponibilidad detallada
  // ============================================
  async getAvailabilityByLevel(
    date: Date | string = new Date()
  ): Promise<AvailabilityByLevelResponse> {
    const targetDate = new Date(date).toISOString().split('T')[0]

    const query = `
    SELECT 
      ps.level_code,
      ps.spot_type,
      COUNT(ps.id) AS total_spots,
      SUM(CASE 
        WHEN pa.is_available = TRUE THEN 1 
        ELSE 0 
      END) AS available_spots,
      SUM(CASE 
        WHEN pa.is_available = FALSE AND pb.status = 'reserved' THEN 1 
        ELSE 0 
      END) AS reserved_spots,
      SUM(CASE 
        WHEN pa.is_available = FALSE AND pb.status = 'checked_in' THEN 1 
        ELSE 0 
      END) AS occupied_spots
    FROM parking_spots ps
    LEFT JOIN parking_availability pa ON ps.id = pa.spot_id 
      AND pa.date = ?
    LEFT JOIN parking_bookings pb ON pa.booking_id = pb.id
    WHERE ps.is_active = TRUE
    GROUP BY ps.level_code, ps.spot_type
    ORDER BY ps.level_code, ps.spot_type
  `

    const [rows] = await pool.query<AvailabilityByLevelRow[]>(query, [targetDate])

    // Agrupar por nivel
    const levelMap: Record<string, LevelAvailability> = {}
    rows.forEach((row) => {
      if (!levelMap[row.level_code]) {
        levelMap[row.level_code] = {
          level: row.level_code,
          total_spots: 0,
          available_spots: 0,
          reserved_spots: 0,
          occupied_spots: 0,
          occupancy_rate: 0,
          by_type: {} as Record<SpotType, {
            total: number
            available: number
            reserved: number
            occupied: number
          }>,
        }
      }

      const level = levelMap[row.level_code]
      level.total_spots += parseInt(String(row.total_spots))
      level.available_spots += parseInt(String(row.available_spots))
      level.reserved_spots += parseInt(String(row.reserved_spots))
      level.occupied_spots += parseInt(String(row.occupied_spots))

      level.by_type[row.spot_type] = {
        total: parseInt(String(row.total_spots)),
        available: parseInt(String(row.available_spots)),
        reserved: parseInt(String(row.reserved_spots)),
        occupied: parseInt(String(row.occupied_spots)),
      }
    })

    const levels = Object.values(levelMap).map((level) => ({
      ...level,
      occupancy_rate: parseFloat(
        (
          ((level.reserved_spots + level.occupied_spots) / level.total_spots) *
          100
        ).toFixed(2)
      ),
    }))

    // Calcular totales globales
    const summary = {
      level: 'TOTAL' as const,
      total_spots: levels.reduce((sum, l) => sum + l.total_spots, 0),
      available_spots: levels.reduce((sum, l) => sum + l.available_spots, 0),
      reserved_spots: levels.reduce((sum, l) => sum + l.reserved_spots, 0),
      occupied_spots: levels.reduce((sum, l) => sum + l.occupied_spots, 0),
      occupancy_rate: 0,
    }

    summary.occupancy_rate = parseFloat(
      (
        ((summary.reserved_spots + summary.occupied_spots) /
          summary.total_spots) *
        100
      ).toFixed(2)
    )

    return {
      date: targetDate,
      levels,
      summary,
    }
  }

  // ============================================
  // STATS - Estadísticas generales del rango
  // ============================================
  async getStatsByRange(
    startDate: string,
    endDate: string
  ): Promise<{ stats: RangeStats }> {
    const query = `
    SELECT 
      -- Total de plazas (constante)
      (SELECT COUNT(*) FROM parking_spots WHERE is_active = TRUE) AS total_spots,
      
      -- Total de ocupaciones en el período (suma de todos los días)
      (SELECT COUNT(*)
      FROM parking_availability
      WHERE date BETWEEN ? AND ?
        AND is_available = FALSE
      ) AS total_occupied,
      
      -- Total de reservas en el rango
      (SELECT COUNT(DISTINCT b.id)
      FROM parking_bookings b
      WHERE b.status IN ('reserved', 'checked_in', 'completed', 'no_show')
        AND DATE(b.expected_checkin) <= ?
        AND DATE(b.expected_checkout) >= ?
      ) AS total_bookings,
      
      -- Check-ins realizados en el rango
      (SELECT COUNT(*)
      FROM parking_bookings
      WHERE status IN ('checked_in', 'completed')
        AND actual_checkin IS NOT NULL
        AND DATE(actual_checkin) BETWEEN ? AND ?
      ) AS total_checkins,
      
      -- Check-outs realizados en el rango
      (SELECT COUNT(*)
      FROM parking_bookings
      WHERE status IN ('completed')
        AND actual_checkout IS NOT NULL
        AND DATE(actual_checkout) BETWEEN ? AND ?
      ) AS total_checkouts,
      
      -- Reservas activas actualmente
      (SELECT COUNT(*)
      FROM parking_bookings
      WHERE status IN ('reserved', 'checked_in')
        AND DATE(expected_checkin) <= ?
        AND DATE(expected_checkout) >= ?
      ) AS active_bookings,
      
      -- Completadas en el rango
      (SELECT COUNT(*)
      FROM parking_bookings
      WHERE status = 'completed'
        AND DATE(actual_checkout) BETWEEN ? AND ?
      ) AS completed_in_range,
      
      -- Canceladas en el rango
      (SELECT COUNT(*)
      FROM parking_bookings
      WHERE status = 'canceled'
        AND DATE(updated_at) BETWEEN ? AND ?
      ) AS canceled_in_range,
      
      -- No-shows en el rango
      (SELECT COUNT(*)
      FROM parking_bookings
      WHERE status = 'no_show'
        AND DATE(updated_at) BETWEEN ? AND ?
      ) AS no_shows_in_range
    `

    const [rows] = await pool.query<RangeStatsRow[]>(query, [
      startDate,
      endDate, // total_occupied
      endDate,
      startDate, // total_bookings
      startDate,
      endDate, // total_checkins
      startDate,
      endDate, // total_checkouts
      endDate,
      startDate, // active_bookings
      startDate,
      endDate, // completed_in_range
      startDate,
      endDate, // canceled_in_range
      startDate,
      endDate, // no_shows_in_range
    ])

    const stats = rows[0]

    return {
      stats: {
        total_spots: parseInt(String(stats.total_spots)),
        total_occupied: parseInt(String(stats.total_occupied || 0)),
        total_bookings: parseInt(String(stats.total_bookings || 0)),
        pending_checkins: parseInt(String(stats.total_checkins || 0)),
        pending_checkouts: parseInt(String(stats.total_checkouts || 0)),
        active_bookings: parseInt(String(stats.active_bookings || 0)),
        completed_today: parseInt(String(stats.completed_in_range || 0)),
        canceled_today: parseInt(String(stats.canceled_in_range || 0)),
        no_shows_today: parseInt(String(stats.no_shows_in_range || 0)),
      },
    }
  }

  // ============================================
  // OCCUPANCY BY LEVEL - Ocupación por planta en rango
  // ============================================
  async getOccupancyByRange(
    startDate: string,
    endDate: string
  ): Promise<{ data: LevelRangeOccupancy[] }> {
    const query = `
    SELECT 
      ps.level_code,
      COUNT(DISTINCT ps.id) AS total_spots,
      -- Total de ocupaciones en el período (suma de todos los días)
      (SELECT COUNT(*)
      FROM parking_availability pa
      WHERE pa.date BETWEEN ? AND ?
        AND pa.is_available = FALSE
        AND pa.spot_id IN (
          SELECT id FROM parking_spots WHERE level_code = ps.level_code
        )
      ) AS total_occupied
    FROM parking_spots ps
    WHERE ps.is_active = TRUE
    GROUP BY ps.level_code
    ORDER BY ps.level_code
    `

    const [rows] = await pool.query<LevelRangeOccupancyRow[]>(query, [
      startDate,
      endDate, // total_occupied (suma de todo el período)
    ])

    // Mapear los datos sin calcular promedios aquí
    // El promedio se calculará en el controlador
    const levels: LevelRangeOccupancy[] = rows.map((row) => ({
      level_code: row.level_code,
      level_name: `Nivel ${row.level_code}`,
      total_spots: parseInt(String(row.total_spots)),
      total_occupied: parseInt(String(row.total_occupied || 0)),
      available: parseInt(String(row.total_spots)),
    }))

    return {
      data: levels,
    }
  }
}

export default new ParkingStatsRepository()
