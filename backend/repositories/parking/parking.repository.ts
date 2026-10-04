// repositories/parking/parking.repository.ts

import db from '../../config/db.js'
import { ResultSetHeader } from 'mysql2'
import { getTodayMadrid } from '../../config/date-utils.js'
import type {
  ParkingSpotRow,
  ParkingVehicleRow,
  AvailableSpotRow,
  LevelCode,
} from '../../models/parking/index.js'
import { likeContains } from '../shared/like.js'

/* -----------------------------------------------------------------
 * PLAZAS
 * ----------------------------------------------------------------- */

export const getAllSpots = (): Promise<[ParkingSpotRow[], unknown]> =>
  db.execute<ParkingSpotRow[]>('SELECT * FROM parking_spots')

export const getSpotById = async (id: number): Promise<ParkingSpotRow | null> => {
  const [rows] = await db.execute<ParkingSpotRow[]>('SELECT * FROM parking_spots WHERE id = ?', [
    id,
  ])
  return rows[0] || null
}

export const getSpotByNumberAndLevel = async (
  spot_number: number,
  level_code: LevelCode
): Promise<ParkingSpotRow | null> => {
  const [rows] = await db.execute<ParkingSpotRow[]>(
    'SELECT * FROM parking_spots WHERE spot_number = ? AND level_code = ?',
    [spot_number, level_code]
  )
  return rows[0] || null
}

export const getSpotsByType = async (spot_type: string): Promise<ParkingSpotRow[]> => {
  const [rows] = await db.execute<ParkingSpotRow[]>(
    'SELECT * FROM parking_spots WHERE spot_type = ? AND is_active = TRUE ORDER BY level_code, spot_number',
    [spot_type]
  )
  return rows
}

export const getSpotsByLevel = async (level_code: LevelCode): Promise<ParkingSpotRow[]> => {
  const [rows] = await db.execute<ParkingSpotRow[]>(
    'SELECT * FROM parking_spots WHERE level_code = ? AND is_active = TRUE ORDER BY level_code, spot_number',
    [level_code]
  )
  return rows
}

/* -----------------------------------------------------------------
 * VEHÍCULOS
 * ----------------------------------------------------------------- */

export const registerVehicle = async (
  plate_number: string,
  owner_name: string,
  model?: string
): Promise<number> => {
  const [result] = await db.execute<ResultSetHeader>(
    'INSERT INTO parking_vehicles (plate_number, owner_name, model) VALUES (?, ?, ?)',
    [plate_number, owner_name, model ?? null]
  )
  return result.insertId
}

export const getAllVehicles = async (): Promise<ParkingVehicleRow[]> => {
  const [rows] = await db.execute<ParkingVehicleRow[]>(
    'SELECT * FROM parking_vehicles ORDER BY plate_number'
  )
  return rows
}

export const getVehicleById = async (id: number): Promise<ParkingVehicleRow | null> => {
  const [rows] = await db.execute<ParkingVehicleRow[]>(
    'SELECT * FROM parking_vehicles WHERE id = ?',
    [id]
  )
  return rows[0] || null
}

export const getVehicleByPlateNumber = async (
  plate_number: string
): Promise<ParkingVehicleRow | null> => {
  const [rows] = await db.execute<ParkingVehicleRow[]>(
    'SELECT * FROM parking_vehicles WHERE plate_number = ?',
    [plate_number]
  )
  return rows[0] || null
}

export const getVehiclesByOwner = async (owner_name: string): Promise<ParkingVehicleRow[]> => {
  const [rows] = await db.execute<ParkingVehicleRow[]>(
    'SELECT * FROM parking_vehicles WHERE owner_name LIKE ? ORDER BY plate_number',
    [likeContains(owner_name)]
  )
  return rows
}

export interface UpdateVehicleData {
  plate_number?: string
  owner_name?: string
  model?: string
}

export const updateVehicle = async (
  id: number,
  data: UpdateVehicleData
): Promise<ResultSetHeader | undefined> => {
  const fields: string[] = []
  const values: (string | number)[] = []

  if (data.plate_number !== undefined) {
    fields.push('plate_number = ?')
    values.push(data.plate_number)
  }
  if (data.owner_name !== undefined) {
    fields.push('owner_name = ?')
    values.push(data.owner_name)
  }
  if (data.model !== undefined) {
    fields.push('model = ?')
    values.push(data.model)
  }

  if (fields.length === 0) return undefined

  values.push(id)

  const sql = `UPDATE parking_vehicles SET ${fields.join(', ')} WHERE id = ?`
  const [result] = await db.execute<ResultSetHeader>(sql, values)
  return result
}

/**
 * Eliminar vehículo por ID
 */
export const deleteVehicle = async (id: number): Promise<ResultSetHeader> => {
  const [result] = await db.execute<ResultSetHeader>('DELETE FROM parking_vehicles WHERE id = ?', [
    id,
  ])
  return result
}

/**
 * Buscar vehículos por matrícula O propietario (búsqueda parcial)
 */
export async function searchVehicles(searchTerm: string): Promise<ParkingVehicleRow[]> {
  const normalizedTerm = searchTerm.trim().toUpperCase()

  const [rows] = await db.query<ParkingVehicleRow[]>(
    `SELECT 
      id, 
      plate_number, 
      owner_name, 
      model, 
      created_at
    FROM parking_vehicles 
    WHERE plate_number LIKE ? 
      OR UPPER(owner_name) LIKE ?
    ORDER BY created_at DESC
    LIMIT 20`,
    [likeContains(normalizedTerm), likeContains(normalizedTerm)]
  )

  return rows
}

/* -----------------------------------------------------------------
 * SPOTS DISPONIBLES
 * ----------------------------------------------------------------- */

// Usa parking_availability
export const getAvailableSpots = async (date: string | null = null): Promise<ParkingSpotRow[]> => {
  const targetDate = date || getTodayMadrid()

  const [rows] = await db.execute<ParkingSpotRow[]>(
    `SELECT ps.* 
    FROM parking_spots ps
    INNER JOIN parking_availability pa ON ps.id = pa.spot_id
    WHERE pa.date = ? 
      AND pa.is_available = TRUE
      AND ps.is_active = TRUE
    ORDER BY ps.level_code, ps.spot_number`,
    [targetDate]
  )
  return rows
}

// Para rango de fechas (más útil)
export const getAvailableSpotsByDateRange = async (
  startDate: string,
  endDate: string,
  level: LevelCode | null = null
): Promise<AvailableSpotRow[]> => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  let levelFilter = ''
  const params: (string | number | LevelCode)[] = [totalDays, startDate, endDate, totalDays]

  if (level) {
    levelFilter = 'AND ps.level_code = ?'
    params.splice(3, 0, level)
  }

  const [rows] = await db.execute<AvailableSpotRow[]>(
    `SELECT 
      ps.id,
      ps.level_code,
      ps.spot_number,
      ps.spot_type,
      COUNT(DISTINCT pa.date) as dias_disponibles,
      ? as dias_requeridos
    FROM parking_spots ps
    INNER JOIN parking_availability pa ON ps.id = pa.spot_id
    WHERE ps.is_active = TRUE
      AND pa.date BETWEEN ? AND DATE_SUB(?, INTERVAL 1 DAY)
      AND pa.is_available = TRUE
      ${levelFilter}
    GROUP BY ps.id, ps.level_code, ps.spot_number, ps.spot_type
    HAVING dias_disponibles = ?
    ORDER BY ps.level_code, ps.spot_number`,
    params
  )
  return rows
}

/* -----------------------------------------------------------------
 * CALENDARIO DE DISPONIBILIDAD
 * ----------------------------------------------------------------- */

/**
 * Keeps parking_availability covering the next `days` days for every spot.
 * Nothing extended it before: generate_availability was never called, so the
 * calendar ran out and from then on no day was blocked.
 * Idempotent: inserts only the missing days, then blocks every free future day
 * that falls inside an active booking (new days, and any day left out of sync).
 * Blocked days are never freed here.
 */
export const extendAvailability = async (
  days = 365
): Promise<{ inserted: number; blocked: number }> => {
  const today = getTodayMadrid()

  const [insert] = await db.query<ResultSetHeader>(
    `INSERT IGNORE INTO parking_availability (spot_id, date, is_available)
    WITH RECURSIVE dates (d) AS (
      SELECT CAST(? AS DATE)
      UNION ALL
      SELECT d + INTERVAL 1 DAY FROM dates WHERE d < CAST(? AS DATE) + INTERVAL ? DAY
    )
    SELECT ps.id, dates.d, TRUE
    FROM parking_spots ps
    CROSS JOIN dates`,
    [today, today, days]
  )

  const [block] = await db.query<ResultSetHeader>(
    `UPDATE parking_availability pa
    INNER JOIN parking_bookings pb
      ON pb.spot_id = pa.spot_id
      AND pa.date >= DATE(pb.expected_checkin)
      AND pa.date < DATE(pb.expected_checkout)
      AND pb.status IN ('reserved', 'checked_in')
    SET pa.is_available = FALSE, pa.booking_id = pb.id
    WHERE pa.date >= CAST(? AS DATE)
      AND pa.is_available = TRUE
      AND pa.booking_id IS NULL`,
    [today]
  )

  return { inserted: insert.affectedRows, blocked: block.affectedRows }
}
