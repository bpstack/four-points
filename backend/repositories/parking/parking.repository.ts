// repositories/parking/parking.repository.ts

import db from '../../config/db.js'
import dayjs from 'dayjs'
import { ResultSetHeader } from 'mysql2'
import type {
  ParkingSpotRow,
  ParkingVehicleRow,
  ParkingRateRow,
  AvailableSpotRow,
  LevelCode,
  CreateReservationDTO,
} from '../../models/parking/index.js'

/* -----------------------------------------------------------------
 * PLAZAS
 * ----------------------------------------------------------------- */

export const getAllSpots = (): Promise<[ParkingSpotRow[], unknown]> =>
  db.execute<ParkingSpotRow[]>('SELECT * FROM parking_spots')

export const getSpotById = async (id: number): Promise<ParkingSpotRow | null> => {
  const [rows] = await db.execute<ParkingSpotRow[]>(
    'SELECT * FROM parking_spots WHERE id = ?',
    [id]
  )
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

export const getSpotsByType = async (
  spot_type: string
): Promise<ParkingSpotRow[]> => {
  const [rows] = await db.execute<ParkingSpotRow[]>(
    'SELECT * FROM parking_spots WHERE spot_type = ? AND is_active = TRUE ORDER BY level_code, spot_number',
    [spot_type]
  )
  return rows
}

export const getSpotsByLevel = async (
  level_code: LevelCode
): Promise<ParkingSpotRow[]> => {
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

export const getVehicleById = async (
  id: number
): Promise<ParkingVehicleRow | null> => {
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

export const getVehiclesByOwner = async (
  owner_name: string
): Promise<ParkingVehicleRow[]> => {
  const [rows] = await db.execute<ParkingVehicleRow[]>(
    'SELECT * FROM parking_vehicles WHERE owner_name LIKE ? ORDER BY plate_number',
    [`%${owner_name}%`]
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
  const [result] = await db.execute<ResultSetHeader>(
    'DELETE FROM parking_vehicles WHERE id = ?',
    [id]
  )
  return result
}

/**
 * Buscar vehículos por matrícula O propietario (búsqueda parcial)
 */
export async function searchVehicles(
  searchTerm: string
): Promise<ParkingVehicleRow[]> {
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
    [`%${normalizedTerm}%`, `%${normalizedTerm}%`]
  )

  return rows
}

/* -----------------------------------------------------------------
 * SPOTS DISPONIBLES
 * ----------------------------------------------------------------- */

// Usa parking_availability
export const getAvailableSpots = async (
  date: string | null = null
): Promise<ParkingSpotRow[]> => {
  const targetDate = date || new Date().toISOString().split('T')[0]

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
  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )

  let levelFilter = ''
  const params: (string | number | LevelCode)[] = [
    totalDays,
    startDate,
    endDate,
    totalDays,
  ]

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
 * RESERVAS
 * ----------------------------------------------------------------- */

interface SpotIdRow {
  id: number
}

interface VehicleIdRow {
  id: number
}

interface AvailabilityCheckRow {
  available: number
}

// Este lo puedes mantener si lo necesitas para otras cosas
export const getVehicleIdByPlateNumber = async (
  plate_number: string
): Promise<number | null> => {
  const [rows] = await db.execute<(VehicleIdRow & import('mysql2').RowDataPacket)[]>(
    'SELECT id FROM parking_vehicles WHERE plate_number = ?',
    [plate_number]
  )
  return rows[0]?.id || null
}

// Para conversión spot_number → spot_id
export const getSpotIdByNumberAndLevel = async (
  spot_number: number,
  level_code: LevelCode
): Promise<number | null> => {
  const [rows] = await db.execute<(SpotIdRow & import('mysql2').RowDataPacket)[]>(
    'SELECT id FROM parking_spots WHERE spot_number = ? AND level_code = ?',
    [spot_number, level_code]
  )
  return rows[0]?.id || null
}

// Para validar disponibilidad
export const isSpotAvailable = async (
  spot_id: number,
  checkin: string,
  checkout: string
): Promise<boolean> => {
  const startDate = dayjs(checkin).format('YYYY-MM-DD')
  const endDate = dayjs(checkout).format('YYYY-MM-DD')

  const [rows] = await db.execute<(AvailabilityCheckRow & import('mysql2').RowDataPacket)[]>(
    'SELECT check_availability(?, ?, ?) as available',
    [spot_id, startDate, endDate]
  )

  return rows[0]?.available === 1
}

// Para calcular precio
export const calculatePriceByDays = async (
  days: number
): Promise<ParkingRateRow | null> => {
  const [rows] = await db.execute<ParkingRateRow[]>(
    'SELECT price, description FROM parking_rates WHERE days = ?',
    [days]
  )
  return rows[0] || null
}

// Para crear reserva
export const createReservation = async ({
  spot_id,
  vehicle_id,
  operator_id,
  expected_checkin,
  expected_checkout,
  status = 'reserved',
  booking_source = 'direct',
  external_booking_id = null,
  notes = null,
}: CreateReservationDTO): Promise<[ResultSetHeader, unknown]> => {
  const sql = `
    INSERT INTO parking_bookings
        (spot_id, vehicle_id, operator_id, expected_checkin, expected_checkout,
        status, booking_source, external_booking_id, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`

  return db.execute<ResultSetHeader>(sql, [
    spot_id,
    vehicle_id,
    operator_id,
    expected_checkin,
    expected_checkout,
    status,
    booking_source,
    external_booking_id,
    notes,
  ])
}
