// controllers/parking.controller.js

import dayjs from 'dayjs'
import * as repo from '../../repositories/parking/parking.repository.js'
import {
  registerVehicleSchema,
  updateVehicleSchema,
} from '../../validations/parking/vehicle-validation.js'
import { getTodayMadrid } from '../../config/date-utils.js'

export const listSpots = async (req, res) => {
  try {
    const { id, type, level, spot_number, level_code } = req.query

    // ✅ Si viene ID, buscar por ID
    if (id) {
      const spot = await repo.getSpotById(id)
      if (!spot) return res.status(404).json({ error: 'Plaza no encontrada' })
      return res.json(spot)
    }

    // ✅ Si viene type, filtrar por tipo
    if (type) {
      const rows = await repo.getSpotsByType(type)
      return res.json(rows)
    }

    // ✅ Si viene level, filtrar por nivel
    if (level) {
      const rows = await repo.getSpotsByLevel(level)
      return res.json(rows)
    }

    // ✅ Si viene spot_number + level_code, buscar específica
    if (spot_number && level_code) {
      const spot = await repo.getSpotByNumberAndLevel(spot_number, level_code)
      return res.json(spot)
    }

    // ✅ Por defecto: todas las plazas
    const [rows] = await repo.getAllSpots()
    res.json(rows)
  } catch (err) {
    console.error('[parking.controller] listSpots', err)
    res.status(500).json({ error: 'Error al obtener las plazas' })
  }
}

// VEHICLES

export const manageVehicles = async (req, res) => {
  try {
    let { id, plate_number, owner_name } = req.query

    // ✅ POST - Crear vehículo
    if (req.method === 'POST') {
      const validation = registerVehicleSchema.safeParse(req.body)

      if (!validation.success) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: validation.error.issues.map((err) => ({
            // ← Cambiar 'errors' por 'issues'
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }

      const {
        plate_number: body_plate,
        owner_name: body_owner,
        model,
      } = validation.data

      const vehicleId = await repo.registerVehicle(
        body_plate,
        body_owner,
        model
      )
      return res.status(201).json({ id: vehicleId })
    }

    // 🔹 NORMALIZAR query parameters antes de buscar
    if (plate_number) {
      plate_number = plate_number.replace(/\s+/g, ' ').trim().toUpperCase()
    }
    if (owner_name) {
      owner_name = owner_name.replace(/\s+/g, ' ').trim()
    }

    // ✅ GET con ID específico
    if (id) {
      const vehicle = await repo.getVehicleById(id)
      if (!vehicle)
        return res.status(404).json({ error: 'Vehículo no encontrado' })
      return res.json(vehicle)
    }

    // ✅ GET con plate_number (ya normalizado)
    if (plate_number) {
      const vehicle = await repo.getVehicleByPlateNumber(plate_number)
      if (!vehicle)
        return res.status(404).json({ error: 'Vehículo no encontrado' })
      return res.json(vehicle)
    }

    // ✅ GET con owner_name (ya normalizado)
    if (owner_name) {
      const vehicles = await repo.getVehiclesByOwner(owner_name)
      return res.json(vehicles)
    }

    // ✅ Por defecto: todos los vehículos
    const vehicles = await repo.getAllVehicles()
    res.json(vehicles)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La matrícula ya existe' })
    }
    console.error('[parking.controller] manageVehicles', err)
    res.status(500).json({ error: 'Error al gestionar vehículos' })
  }
}

// UPDATE VEHICLE
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params

    // Validar que el vehículo existe
    const existingVehicle = await repo.getVehicleById(id)
    if (!existingVehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' })
    }

    // Validar datos de actualización
    const validation = updateVehicleSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
    }

    // Si no hay datos para actualizar
    if (Object.keys(validation.data).length === 0) {
      return res.status(400).json({
        error: 'No se proporcionaron datos para actualizar',
      })
    }

    // Actualizar vehículo
    await repo.updateVehicle(id, validation.data)

    // Obtener vehículo actualizado
    const updatedVehicle = await repo.getVehicleById(id)

    res.json(updatedVehicle)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'La matrícula ya existe' })
    }
    console.error('[parking.controller] updateVehicle', err)
    res.status(500).json({ error: 'Error al actualizar el vehículo' })
  }
}

/**
 * DELETE - Eliminar vehículo (solo admin)
 */
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que el vehículo existe
    const vehicle = await repo.getVehicleById(id)
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' })
    }

    // Eliminar vehículo
    await repo.deleteVehicle(id)

    res.json({
      message: 'Vehículo eliminado correctamente',
      deleted: {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
      },
    })
  } catch (err) {
    // Si hay reservas asociadas, MySQL dará error de foreign key
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error:
          'No se puede eliminar el vehículo porque tiene reservas asociadas',
        hint: 'Elimina primero las reservas relacionadas',
      })
    }
    console.error('[parking.controller] deleteVehicle', err)
    res.status(500).json({ error: 'Error al eliminar el vehículo' })
  }
}

/**
 * GET - Obtener vehículo by ID
 */
export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params

    // Obtener vehículo
    const vehicle = await repo.getVehicleById(id)
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' })
    }

    res.json(vehicle)
  } catch (err) {
    console.error('[parking.controller] getVehicleById', err)
    res.status(500).json({ error: 'Error al obtener el vehículo' })
  }
}

/**
 * GET - Obtener vehículo by plate_number
 */
export const getVehicleByPlateNumber = async (req, res) => {
  try {
    let { plate_number } = req.params

    // Obtener vehículo
    const vehicle = await repo.getVehicleByPlateNumber(plate_number)
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehículo no encontrado' })
    }

    res.json(vehicle)
  } catch (err) {
    console.error('[parking.controller] getVehicleByPlateNumber', err)
    res.status(500).json({ error: 'Error al obtener el vehículo' })
  }
}

/**
 * GET /parking/vehicles/search?q=término
 * Buscar vehículos por matrícula O propietario (parcial)
 */
export const searchVehicles = async (req, res) => {
  try {
    const { q } = req.query

    if (!q || q.length < 2) {
      return res.json([])
    }

    const vehicle = await repo.searchVehicles(q)
    res.json(vehicle)
  } catch (err) {
    console.error('[parking.controller] searchVehicles', err)
    res.status(500).json({ error: 'Error al buscar vehículos' })
  }
}

// SPOTS DISPONIBLES

// ============================================
// HELPER: Validar formato de fecha
// ============================================

function isValidDate(dateString) {
  // Validar formato YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false

  // Validar que sea una fecha real
  const date = new Date(dateString + 'T00:00:00Z')
  return date instanceof Date && !isNaN(date)
}
// -------------------

export const listAvailableSpots = async (req, res) => {
  try {
    const { date, start_date, end_date, level } = req.query

    // ❌ AMBIGUO: Parámetros conflictivos
    if (date && (start_date || end_date)) {
      return res.status(400).json({
        error: 'No puedes usar "date" y "start_date/end_date" simultáneamente',
        hint: 'Elige una opción: date ó start_date+end_date',
      })
    }

    // ✅ CASO 1: Fecha específica
    if (date) {
      // Validar formato
      if (!isValidDate(date)) {
        return res.status(400).json({
          error: 'Formato de fecha inválido',
          expected: 'YYYY-MM-DD',
        })
      }

      // No permitir fechas en el pasado
      const today = new Date(getTodayMadrid())
      if (new Date(date) < today) {
        return res.status(400).json({
          error: 'No puedes consultar disponibilidad en fechas pasadas',
        })
      }

      const spots = await repo.getAvailableSpots(date)
      return res.json({
        date,
        total: spots.length,
        spots,
      })
    }

    // ✅ CASO 2: Rango de fechas
    if (start_date && end_date) {
      // Ambos requeridos
      if (!start_date || !end_date) {
        return res.status(400).json({
          error: 'Si usas rango, necesitas start_date Y end_date',
        })
      }

      // Validar formato
      if (!isValidDate(start_date) || !isValidDate(end_date)) {
        return res.status(400).json({
          error: 'Formato de fecha inválido',
          expected: 'YYYY-MM-DD',
        })
      }

      // Validar rango
      if (new Date(start_date) >= new Date(end_date)) {
        return res.status(400).json({
          error: 'start_date debe ser menor que end_date',
        })
      }

      // No permitir start_date en el pasado
      const today = new Date(getTodayMadrid())
      if (new Date(start_date) < today) {
        return res.status(400).json({
          error: 'start_date no puede estar en el pasado',
        })
      }

      // Validar level si se proporciona
      if (level && !['-2', '-3'].includes(level)) {
        return res.status(400).json({
          error: 'Level inválido',
          allowed: ['-2', '-3'],
        })
      }

      // Máximo 60 días (evitar queries enormes)
      const days = Math.ceil(
        (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)
      )
      if (days > 60) {
        return res.status(400).json({
          error: `Rango máximo es 60 días (solicitaste ${days})`,
        })
      }

      const spots = await repo.getAvailableSpotsByDateRange(
        start_date,
        end_date,
        level
      )
      return res.json({
        start_date,
        end_date,
        days,
        level: level || 'all',
        total: spots.length,
        spots,
      })
    }

    // ✅ CASO 3: Por defecto = hoy
    const today = getTodayMadrid()
    const spots = await repo.getAvailableSpots(today)
    res.json({
      date: today,
      total: spots.length,
      spots,
    })
  } catch (err) {
    console.error('[parking.controller] listAvailableSpots', err)

    // Diferencia entre errores de BD y lógica
    if (err.code && err.code.startsWith('ER_')) {
      return res.status(500).json({
        error: 'Error en base de datos',
        message: err.message,
      })
    }

    res.status(500).json({
      error: 'Error al obtener plazas disponibles',
      message: err.message,
    })
  }
}
