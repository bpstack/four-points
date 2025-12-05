// repositories/parking.repository.js

import db from '../../config/db.js'
import dayjs from 'dayjs'

/* -----------------------------------------------------------------
 * PLAZAS
 * ----------------------------------------------------------------- */

export const getAllSpots = () => db.execute('SELECT * FROM parking_spots')

export const getSpotById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM parking_spots WHERE id = ?', [
    id,
  ])
  return rows[0] || null
}

export const getSpotByNumberAndLevel = async (spot_number, level_code) => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_spots WHERE spot_number = ? AND level_code = ?',
    [spot_number, level_code]
  )
  return rows[0] || null
}

export const getSpotsByType = async (spot_type) => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_spots WHERE spot_type = ? AND is_active = TRUE ORDER BY level_code, spot_number',
    [spot_type]
  )
  return rows // ← Solo devuelve los rows, no el array completo
}

export const getSpotsByLevel = async (level_code) => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_spots WHERE level_code = ? AND is_active = TRUE ORDER BY level_code, spot_number',
    [level_code]
  )
  return rows // ← Solo devuelve los rows, no el array completo
}

/* -----------------------------------------------------------------
 * VEHÍCULOS
 * ----------------------------------------------------------------- */

export const registerVehicle = async (plate_number, owner_name, model) => {
  const [rows] = await db.execute(
    'INSERT INTO parking_vehicles (plate_number, owner_name, model) VALUES (?, ?, ?)',
    [plate_number, owner_name, model]
  )
  return rows.insertId
}

export const getAllVehicles = async () => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_vehicles ORDER BY plate_number'
  )
  return rows
}

export const getVehicleById = async (id) => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_vehicles WHERE id = ?',
    [id]
  )
  return rows[0] || null
}

export const getVehicleByPlateNumber = async (plate_number) => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_vehicles WHERE plate_number = ?',
    [plate_number]
  )
  return rows[0] || null
}

export const getVehiclesByOwner = async (owner_name) => {
  const [rows] = await db.execute(
    'SELECT * FROM parking_vehicles WHERE owner_name LIKE ? ORDER BY plate_number',
    [`%${owner_name}%`]
  )
  return rows
}

// Añadir al final del archivo, en la sección de VEHÍCULOS

export const updateVehicle = async (id, data) => {
  const fields = []
  const values = []

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

  if (fields.length === 0) return

  values.push(id)

  const sql = `UPDATE parking_vehicles SET ${fields.join(', ')} WHERE id = ?`
  const [result] = await db.execute(sql, values)
  return result
}

/**
 * Eliminar vehículo por ID
 */
export const deleteVehicle = async (id) => {
  const [result] = await db.execute(
    'DELETE FROM parking_vehicles WHERE id = ?',
    [id]
  )
  return result
}

/**
 * Buscar vehículos por matrícula O propietario (búsqueda parcial)
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Promise<Array>} Lista de vehículos que coinciden
 */
export async function searchVehicles(searchTerm) {
  const normalizedTerm = searchTerm.trim().toUpperCase()

  const [rows] = await db.query(
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

// ✅  Usa parking_availability
export const getAvailableSpots = async (date = null) => {
  const targetDate = date || new Date().toISOString().split('T')[0]

  const [rows] = await db.execute(
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

// ✅ Para rango de fechas (más útil)
export const getAvailableSpotsByDateRange = async (
  startDate,
  endDate,
  level = null
) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

  let levelFilter = ''
  let params = [totalDays, startDate, endDate, totalDays]

  if (level) {
    levelFilter = 'AND ps.level_code = ?'
    params.splice(3, 0, level) // Inserta level antes del último totalDays
  }

  const [rows] = await db.execute(
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

// DASHBOARD

/* -----------------------------------------------------------------
 * RESERVAS
 * ----------------------------------------------------------------- */

// ✅ Este lo puedes mantener si lo necesitas para otras cosas
export const getVehicleIdByPlateNumber = async (plate_number) => {
  const [rows] = await db.execute(
    'SELECT id FROM parking_vehicles WHERE plate_number = ?',
    [plate_number]
  )
  return rows[0]?.id || null
}

// 1. Para conversión spot_number → spot_id
export const getSpotIdByNumberAndLevel = async (spot_number, level_code) => {
  const [rows] = await db.execute(
    'SELECT id FROM parking_spots WHERE spot_number = ? AND level_code = ?',
    [spot_number, level_code]
  )
  return rows[0]?.id || null
}

// 2. Para validar disponibilidad
export const isSpotAvailable = async (spot_id, checkin, checkout) => {
  const startDate = dayjs(checkin).format('YYYY-MM-DD')
  const endDate = dayjs(checkout).format('YYYY-MM-DD')

  const [rows] = await db.execute(
    'SELECT check_availability(?, ?, ?) as available',
    [spot_id, startDate, endDate]
  )

  return rows[0]?.available === 1
}

// 3. Para calcular precio
export const calculatePriceByDays = async (days) => {
  const [rows] = await db.execute(
    'SELECT price, description FROM parking_rates WHERE days = ?',
    [days]
  )
  return rows[0] || null
}

// 4. Para crear reserva (YA ADAPTADA)
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
}) => {
  const sql = `
    INSERT INTO parking_bookings
        (spot_id, vehicle_id, operator_id, expected_checkin, expected_checkout,
        status, booking_source, external_booking_id, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`

  return db.execute(sql, [
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
