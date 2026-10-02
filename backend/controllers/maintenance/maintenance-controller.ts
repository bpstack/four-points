// backend/controllers/maintenance/maintenance-controller.ts
/**
 * Controller para el módulo Maintenance
 * Maneja las peticiones HTTP y respuestas
 * Route params (:id, :imageId) arrive validated by validateParams in
 * routes/maintenance/maintenance-routes.ts
 */

import type { Request, Response } from 'express'
import { MaintenanceRepository } from '../../repositories/maintenance/maintenance-repository.js'
import { CloudinaryService } from '../../services/blacklist/cloudinary-service.js'
import {
  createReportSchema,
  updateReportSchema,
  updateStatusSchema,
  updatePrioritySchema,
  addResolutionNotesSchema,
  reportFiltersSchema,
  assignReportSchema,
} from '../../validations/maintenance/schemas.js'
import type { ReportFilters } from '../../models/maintenance/index.js'
import { logger } from '../../config/logger.js'

// ========================================
// CONTROLLER
// ========================================

export class MaintenanceController {
  // ========================================
  // REPORTS CRUD
  // ========================================

  /**
   * GET /api/maintenance
   * Obtener todos los reportes con filtros y paginación
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = reportFiltersSchema.safeParse(req.query)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Parámetros de búsqueda inválidos',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const filters: ReportFilters = parseResult.data

      const { reports, pagination } = await MaintenanceRepository.getAll(filters)

      res.json({
        reports,
        pagination,
        filters_applied: filters,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.getAll] Error')
      res.status(500).json({
        error: 'Error al obtener los reportes',
      })
    }
  }

  /**
   * GET /api/maintenance/:id
   * Obtener reporte por ID con imágenes e historial
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const report = await MaintenanceRepository.getById(id)

      if (!report) {
        res.status(404).json({
          error: 'Reporte no encontrado',
        })
        return
      }

      res.json({ report })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.getById] Error')
      res.status(500).json({
        error: 'Error al obtener el reporte',
      })
    }
  }

  /**
   * POST /api/maintenance
   * Crear nuevo reporte
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const parseResult = createReportSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const data = parseResult.data

      const report = await MaintenanceRepository.create(data, req.user.id, req.user.username)

      res.status(201).json({
        message: 'Reporte creado correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.create] Error')
      res.status(500).json({
        error: 'Error al crear el reporte',
      })
    }
  }

  /**
   * PATCH /api/maintenance/:id
   * Actualizar reporte existente
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const bodyResult = updateReportSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = req.params
      const data = bodyResult.data

      const report = await MaintenanceRepository.update(id, data, req.user.id, req.user.username)

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({
        message: 'Reporte actualizado correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.update] Error')

      if (error.message.includes('eliminado')) {
        res.status(400).json({ error: error.message })
        return
      }

      res.status(500).json({
        error: 'Error al actualizar el reporte',
      })
    }
  }

  /**
   * PATCH /api/maintenance/:id/status
   * Actualizar solo el estado
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const bodyResult = updateStatusSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = req.params
      const { status, notes } = bodyResult.data

      const report = await MaintenanceRepository.updateStatus(
        id,
        status,
        req.user.id,
        req.user.username,
        notes
      )

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({
        message: 'Estado actualizado correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.updateStatus] Error')
      res.status(500).json({
        error: 'Error al actualizar el estado',
      })
    }
  }

  /**
   * PATCH /api/maintenance/:id/priority
   * Actualizar solo la prioridad
   */
  static async updatePriority(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const bodyResult = updatePrioritySchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = req.params
      const { priority } = bodyResult.data

      const report = await MaintenanceRepository.updatePriority(
        id,
        priority,
        req.user.id,
        req.user.username
      )

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({
        message: 'Prioridad actualizada correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.updatePriority] Error')
      res.status(500).json({
        error: 'Error al actualizar la prioridad',
      })
    }
  }

  /**
   * POST /api/maintenance/:id/resolution-notes
   * Agregar notas de resolución
   */
  static async addResolutionNotes(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const bodyResult = addResolutionNotesSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = req.params
      const { notes } = bodyResult.data

      const report = await MaintenanceRepository.addResolutionNotes(
        id,
        notes,
        req.user.id,
        req.user.username
      )

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({
        message: 'Notas agregadas correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.addResolutionNotes] Error')
      res.status(500).json({
        error: 'Error al agregar las notas',
      })
    }
  }

  /**
   * PATCH /api/maintenance/:id/assign
   * Asignar reporte a usuario o empresa externa
   */
  static async assignReport(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const bodyResult = assignReportSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = req.params
      const data = bodyResult.data

      // Actualizar asignación y cambiar estado a 'assigned'
      const report = await MaintenanceRepository.update(
        id,
        {
          assigned_type: data.assigned_type,
          assigned_to: data.assigned_to,
          external_company_name: data.external_company_name,
          external_contact: data.external_contact,
          status: 'assigned',
        },
        req.user.id,
        req.user.username
      )

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({
        message: 'Reporte asignado correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.assignReport] Error')
      res.status(500).json({
        error: 'Error al asignar el reporte',
      })
    }
  }

  /**
   * DELETE /api/maintenance/:id
   * Eliminar reporte (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const { id } = req.params

      const deleted = await MaintenanceRepository.delete(id, req.user.id, req.user.username)

      if (!deleted) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({ message: 'Reporte eliminado correctamente' })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.delete] Error')

      if (error.message.includes('ya está eliminado')) {
        res.status(400).json({ error: error.message })
        return
      }

      res.status(500).json({
        error: 'Error al eliminar el reporte',
      })
    }
  }

  /**
   * PATCH /api/maintenance/:id/restore
   * Restaurar reporte eliminado
   */
  static async restore(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const { id } = req.params

      const report = await MaintenanceRepository.restore(id, req.user.id, req.user.username)

      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      res.json({
        message: 'Reporte restaurado correctamente',
        report,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.restore] Error')

      if (error.message.includes('no está eliminado')) {
        res.status(400).json({ error: error.message })
        return
      }

      res.status(500).json({
        error: 'Error al restaurar el reporte',
      })
    }
  }

  // ========================================
  // IMAGES
  // ========================================

  /**
   * GET /api/maintenance/:id/images
   * Obtener imágenes de un reporte
   */
  static async getImages(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const images = await MaintenanceRepository.getImagesByReportId(id)

      res.json({ images })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.getImages] Error')
      res.status(500).json({
        error: 'Error al obtener las imágenes',
      })
    }
  }

  /**
   * POST /api/maintenance/:id/images
   * Subir imagen a un reporte
   */
  static async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const { id } = req.params

      // Verificar que el reporte existe
      const report = await MaintenanceRepository.getById(id)
      if (!report) {
        res.status(404).json({ error: 'Reporte no encontrado' })
        return
      }

      // Verificar límite de imágenes
      if (report.images.length >= 5) {
        res.status(400).json({ error: 'El reporte ya tiene el máximo de 5 imágenes' })
        return
      }

      if (!req.file) {
        res.status(400).json({ error: 'No se envió ninguna imagen' })
        return
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          error: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WebP, GIF',
        })
        return
      }

      // Validar tamaño (máx 5MB)
      const maxSize = 5 * 1024 * 1024
      if (req.file.size > maxSize) {
        res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 5MB' })
        return
      }

      // Subir a Cloudinary
      const cloudinaryResult = await CloudinaryService.uploadImage(
        req.file.buffer,
        req.file.originalname,
        'maintenance'
      )

      // Guardar en BD
      const image = await MaintenanceRepository.addImage(
        id,
        {
          file_name: req.file.originalname,
          file_path: cloudinaryResult.secure_url,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          public_id: cloudinaryResult.public_id,
        },
        req.user.id
      )

      res.status(201).json({
        message: 'Imagen subida correctamente',
        image,
      })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.uploadImage] Error')
      res.status(500).json({
        error: 'Error al subir la imagen',
      })
    }
  }

  /**
   * DELETE /api/maintenance/:id/images/:imageId
   * Eliminar imagen de un reporte
   */
  static async deleteImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'No autorizado' })
        return
      }

      const { id, imageId } = req.params

      // Obtener imagen
      const image = await MaintenanceRepository.getImageById(Number(imageId))
      if (!image) {
        res.status(404).json({ error: 'Imagen no encontrada' })
        return
      }

      // Verificar que pertenece al reporte
      if (image.report_id !== id) {
        res.status(400).json({ error: 'La imagen no pertenece a este reporte' })
        return
      }

      // Eliminar de Cloudinary si tiene public_id
      if (image.public_id) {
        await CloudinaryService.deleteImage(image.public_id)
      }

      // Eliminar de BD
      await MaintenanceRepository.deleteImage(Number(imageId))

      res.json({ message: 'Imagen eliminada correctamente' })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.deleteImage] Error')
      res.status(500).json({
        error: 'Error al eliminar la imagen',
      })
    }
  }

  // ========================================
  // HISTORY
  // ========================================

  /**
   * GET /api/maintenance/:id/history
   * Obtener historial de un reporte
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const history = await MaintenanceRepository.getHistoryByReportId(id)

      res.json({ history })
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.getHistory] Error')
      res.status(500).json({
        error: 'Error al obtener el historial',
      })
    }
  }

  // ========================================
  // STATS
  // ========================================

  /**
   * GET /api/maintenance/stats
   * Obtener estadísticas generales
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await MaintenanceRepository.getStats()

      res.json(stats)
    } catch (error: any) {
      logger.error({ err: error }, '[MaintenanceController.getStats] Error')
      res.status(500).json({
        error: 'Error al obtener estadísticas',
      })
    }
  }
}
