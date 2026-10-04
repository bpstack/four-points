// controllers/parking/parking.controller.ts

import { Request, Response } from 'express'
import * as repo from '../../repositories/parking/parking.repository.js'
import {
  registerVehicleSchema,
  updateVehicleSchema,
} from '../../validations/parking/vehicle-validation.js'
import { getTodayMadrid } from '../../config/date-utils.js'
import type { LevelCode } from '../../models/parking/index.js'
import { logger } from '../../config/logger.js'
import { isCalendarDate } from '../../validations/common/calendar-date.js'

interface MySQLError extends Error {
  code?: string
}

export const listSpots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, type, level, spot_number, level_code } = req.query

    // Si viene ID, buscar por ID
    if (id) {
      const spot = await repo.getSpotById(Number(id))
      if (!spot) {
        res.status(404).json({ error: 'Plaza no encontrada' })
        return
      }
      res.json(spot)
      return
    }

    // Si viene type, filtrar por tipo
    if (type) {
      const rows = await repo.getSpotsByType(String(type))
      res.json(rows)
      return
    }

    // Si viene level, filtrar por nivel
    if (level) {
      const rows = await repo.getSpotsByLevel(level as LevelCode)
      res.json(rows)
      return
    }

    // Si viene spot_number + level_code, buscar específica
    if (spot_number && level_code) {
      const spot = await repo.getSpotByNumberAndLevel(Number(spot_number), level_code as LevelCode)
      res.json(spot)
      return
    }

    // Por defecto: todas las plazas
    const [rows] = await repo.getAllSpots()
    res.json(rows)
  } catch (err) {
    logger.error({ err }, '[parking.controller] listSpots')
    res.status(500).json({ error: 'Error al obtener las plazas' })
  }
}

// VEHICLES

export const manageVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    let { id, plate_number, owner_name } = req.query as {
      id?: string
      plate_number?: string
      owner_name?: string
    }

    // POST - Crear vehículo
    if (req.method === 'POST') {
      const validation = registerVehicleSchema.safeParse(req.body)

      if (!validation.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: validation.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
        return
      }

      const { plate_number: body_plate, owner_name: body_owner, model } = validation.data

      const vehicleId = await repo.registerVehicle(body_plate, body_owner, model)
      res.status(201).json({ id: vehicleId })
      return
    }

    // NORMALIZAR query parameters antes de buscar
    if (plate_number) {
      plate_number = plate_number.replace(/\s+/g, ' ').trim().toUpperCase()
    }
    if (owner_name) {
      owner_name = owner_name.replace(/\s+/g, ' ').trim()
    }

    // GET con ID específico
    if (id) {
      const vehicle = await repo.getVehicleById(Number(id))
      if (!vehicle) {
        res.status(404).json({ error: 'Vehículo no encontrado' })
        return
      }
      res.json(vehicle)
      return
    }

    // GET con plate_number (ya normalizado)
    if (plate_number) {
      const vehicle = await repo.getVehicleByPlateNumber(plate_number)
      if (!vehicle) {
        res.status(404).json({ error: 'Vehículo no encontrado' })
        return
      }
      res.json(vehicle)
      return
    }

    // GET con owner_name (ya normalizado)
    if (owner_name) {
      const vehicles = await repo.getVehiclesByOwner(owner_name)
      res.json(vehicles)
      return
    }

    // Por defecto: todos los vehículos
    const vehicles = await repo.getAllVehicles()
    res.json(vehicles)
  } catch (err) {
    const error = err as MySQLError
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'La matrícula ya existe' })
      return
    }
    logger.error({ err }, '[parking.controller] manageVehicles')
    res.status(500).json({ error: 'Error al gestionar vehículos' })
  }
}

// UPDATE VEHICLE
export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Validar que el vehículo existe
    const existingVehicle = await repo.getVehicleById(Number(id))
    if (!existingVehicle) {
      res.status(404).json({ error: 'Vehículo no encontrado' })
      return
    }

    // Validar datos de actualización
    const validation = updateVehicleSchema.safeParse(req.body)

    if (!validation.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: validation.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      })
      return
    }

    // Si no hay datos para actualizar
    if (Object.keys(validation.data).length === 0) {
      res.status(400).json({
        error: 'No se proporcionaron datos para actualizar',
      })
      return
    }

    // Actualizar vehículo
    await repo.updateVehicle(Number(id), validation.data)

    // Obtener vehículo actualizado
    const updatedVehicle = await repo.getVehicleById(Number(id))

    res.json(updatedVehicle)
  } catch (err) {
    const error = err as MySQLError
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ error: 'La matrícula ya existe' })
      return
    }
    logger.error({ err }, '[parking.controller] updateVehicle')
    res.status(500).json({ error: 'Error al actualizar el vehículo' })
  }
}

/**
 * DELETE - Eliminar vehículo (solo admin)
 */
export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Verificar que el vehículo existe
    const vehicle = await repo.getVehicleById(Number(id))
    if (!vehicle) {
      res.status(404).json({ error: 'Vehículo no encontrado' })
      return
    }

    // Eliminar vehículo
    await repo.deleteVehicle(Number(id))

    res.json({
      message: 'Vehículo eliminado correctamente',
      deleted: {
        id: vehicle.id,
        plate_number: vehicle.plate_number,
      },
    })
  } catch (err) {
    const error = err as MySQLError
    // Si hay reservas asociadas, MySQL dará error de foreign key
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(409).json({
        error: 'No se puede eliminar el vehículo porque tiene reservas asociadas',
        hint: 'Elimina primero las reservas relacionadas',
      })
      return
    }
    logger.error({ err }, '[parking.controller] deleteVehicle')
    res.status(500).json({ error: 'Error al eliminar el vehículo' })
  }
}

/**
 * GET - Obtener vehículo by ID
 */
export const getVehicleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Obtener vehículo
    const vehicle = await repo.getVehicleById(Number(id))
    if (!vehicle) {
      res.status(404).json({ error: 'Vehículo no encontrado' })
      return
    }

    res.json(vehicle)
  } catch (err) {
    logger.error({ err }, '[parking.controller] getVehicleById')
    res.status(500).json({ error: 'Error al obtener el vehículo' })
  }
}

/**
 * GET - Obtener vehículo by plate_number
 */
export const getVehicleByPlateNumber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { plate_number } = req.params

    // Obtener vehículo
    const vehicle = await repo.getVehicleByPlateNumber(plate_number)
    if (!vehicle) {
      res.status(404).json({ error: 'Vehículo no encontrado' })
      return
    }

    res.json(vehicle)
  } catch (err) {
    logger.error({ err }, '[parking.controller] getVehicleByPlateNumber')
    res.status(500).json({ error: 'Error al obtener el vehículo' })
  }
}

/**
 * GET /parking/vehicles/search?q=término
 * Buscar vehículos por matrícula O propietario (parcial)
 */
export const searchVehicles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query

    if (!q || String(q).length < 2) {
      res.json([])
      return
    }

    const vehicle = await repo.searchVehicles(String(q))
    res.json(vehicle)
  } catch (err) {
    logger.error({ err }, '[parking.controller] searchVehicles')
    res.status(500).json({ error: 'Error al buscar vehículos' })
  }
}

// SPOTS DISPONIBLES

export const listAvailableSpots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, start_date, end_date, level } = req.query as {
      date?: string
      start_date?: string
      end_date?: string
      level?: LevelCode
    }

    // AMBIGUO: Parámetros conflictivos
    if (date && (start_date || end_date)) {
      res.status(400).json({
        error: 'No puedes usar "date" y "start_date/end_date" simultáneamente',
        hint: 'Elige una opción: date ó start_date+end_date',
      })
      return
    }

    // CASO 1: Fecha específica
    if (date) {
      // Validar formato
      if (!isCalendarDate(date)) {
        res.status(400).json({
          error: 'Formato de fecha inválido',
          expected: 'YYYY-MM-DD',
        })
        return
      }

      // No permitir fechas en el pasado
      const today = new Date(getTodayMadrid())
      if (new Date(date) < today) {
        res.status(400).json({
          error: 'No puedes consultar disponibilidad en fechas pasadas',
        })
        return
      }

      const spots = await repo.getAvailableSpots(date)
      res.json({
        date,
        total: spots.length,
        spots,
      })
      return
    }

    // CASO 2: Rango de fechas
    if (start_date && end_date) {
      // Ambos requeridos
      if (!start_date || !end_date) {
        res.status(400).json({
          error: 'Si usas rango, necesitas start_date Y end_date',
        })
        return
      }

      // Validar formato
      if (!isCalendarDate(start_date) || !isCalendarDate(end_date)) {
        res.status(400).json({
          error: 'Formato de fecha inválido',
          expected: 'YYYY-MM-DD',
        })
        return
      }

      // Validar rango
      if (new Date(start_date) >= new Date(end_date)) {
        res.status(400).json({
          error: 'start_date debe ser menor que end_date',
        })
        return
      }

      // No permitir start_date en el pasado
      const today = new Date(getTodayMadrid())
      if (new Date(start_date) < today) {
        res.status(400).json({
          error: 'start_date no puede estar en el pasado',
        })
        return
      }

      // Validar level si se proporciona
      if (level && !['-2', '-3'].includes(level)) {
        res.status(400).json({
          error: 'Level inválido',
          allowed: ['-2', '-3'],
        })
        return
      }

      // Máximo 60 días (evitar queries enormes)
      const days = Math.ceil(
        (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (days > 60) {
        res.status(400).json({
          error: `Rango máximo es 60 días (solicitaste ${days})`,
        })
        return
      }

      const spots = await repo.getAvailableSpotsByDateRange(start_date, end_date, level ?? null)
      res.json({
        start_date,
        end_date,
        days,
        level: level || 'all',
        total: spots.length,
        spots,
      })
      return
    }

    // CASO 3: Por defecto = hoy
    const today = getTodayMadrid()
    const spots = await repo.getAvailableSpots(today)
    res.json({
      date: today,
      total: spots.length,
      spots,
    })
  } catch (err) {
    const error = err as MySQLError
    logger.error({ err }, '[parking.controller] listAvailableSpots')

    // Diferencia entre errores de BD y lógica
    if (error.code && error.code.startsWith('ER_')) {
      res.status(500).json({
        error: 'Error en base de datos',
      })
      return
    }

    res.status(500).json({
      error: 'Error al obtener plazas disponibles',
    })
  }
}
