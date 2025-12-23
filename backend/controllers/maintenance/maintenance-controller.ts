// backend/controllers/maintenance/maintenance-controller.ts
/**
 * Controller para el módulo Maintenance
 * Maneja las peticiones HTTP y respuestas
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
  idParamSchema,
  assignReportSchema,
} from '../../validations/maintenance/schemas.js'
import type { ReportFilters } from '../../models/maintenance/index.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'

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
          success: false,
          error: ERROR_CODES.MAINTENANCE_INVALID_SEARCH_PARAMS,
          code: ERROR_CODES.MAINTENANCE_INVALID_SEARCH_PARAMS,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const filters: ReportFilters = parseResult.data

      const { reports, pagination } = await MaintenanceRepository.getAll(filters)

      res.json({
        success: true,
        data: reports,
        pagination,
        filters_applied: filters,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.getAll] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_FETCH_REPORTS_ERROR,
        code: ERROR_CODES.MAINTENANCE_FETCH_REPORTS_ERROR,
      })
    }
  }

  /**
   * GET /api/maintenance/:id
   * Obtener reporte por ID con imágenes e historial
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = idParamSchema.safeParse(req.params)

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const report = await MaintenanceRepository.getById(id)

      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({ success: true, data: report })
    } catch (error: any) {
      console.error('[MaintenanceController.getById] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_FETCH_REPORT_ERROR,
        code: ERROR_CODES.MAINTENANCE_FETCH_REPORT_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const parseResult = createReportSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const data = parseResult.data

      const report = await MaintenanceRepository.create(data, req.user.id, req.user.username)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_REPORT_CREATED,
        code: SUCCESS_CODES.MAINTENANCE_REPORT_CREATED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.create] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_CREATE_REPORT_ERROR,
        code: ERROR_CODES.MAINTENANCE_CREATE_REPORT_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const idResult = idParamSchema.safeParse(req.params)
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: idResult.error.flatten().fieldErrors,
        })
        return
      }

      const bodyResult = updateReportSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = idResult.data
      const data = bodyResult.data

      const report = await MaintenanceRepository.update(id, data, req.user.id, req.user.username)

      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_REPORT_UPDATED,
        code: SUCCESS_CODES.MAINTENANCE_REPORT_UPDATED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.update] Error:', error.message)

      if (error.message.includes('eliminado')) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_UPDATE_REPORT_ERROR,
        code: ERROR_CODES.MAINTENANCE_UPDATE_REPORT_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const idResult = idParamSchema.safeParse(req.params)
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: idResult.error.flatten().fieldErrors,
        })
        return
      }

      const bodyResult = updateStatusSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = idResult.data
      const { status, notes } = bodyResult.data

      const report = await MaintenanceRepository.updateStatus(
        id,
        status,
        req.user.id,
        req.user.username,
        notes
      )

      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_STATUS_UPDATED,
        code: SUCCESS_CODES.MAINTENANCE_STATUS_UPDATED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.updateStatus] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_UPDATE_STATUS_ERROR,
        code: ERROR_CODES.MAINTENANCE_UPDATE_STATUS_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const idResult = idParamSchema.safeParse(req.params)
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: idResult.error.flatten().fieldErrors,
        })
        return
      }

      const bodyResult = updatePrioritySchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = idResult.data
      const { priority } = bodyResult.data

      const report = await MaintenanceRepository.updatePriority(
        id,
        priority,
        req.user.id,
        req.user.username
      )

      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_PRIORITY_UPDATED,
        code: SUCCESS_CODES.MAINTENANCE_PRIORITY_UPDATED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.updatePriority] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_UPDATE_PRIORITY_ERROR,
        code: ERROR_CODES.MAINTENANCE_UPDATE_PRIORITY_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const idResult = idParamSchema.safeParse(req.params)
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: idResult.error.flatten().fieldErrors,
        })
        return
      }

      const bodyResult = addResolutionNotesSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = idResult.data
      const { notes } = bodyResult.data

      const report = await MaintenanceRepository.addResolutionNotes(
        id,
        notes,
        req.user.id,
        req.user.username
      )

      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_NOTES_ADDED,
        code: SUCCESS_CODES.MAINTENANCE_NOTES_ADDED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.addResolutionNotes] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_ADD_NOTES_ERROR,
        code: ERROR_CODES.MAINTENANCE_ADD_NOTES_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const idResult = idParamSchema.safeParse(req.params)
      if (!idResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: idResult.error.flatten().fieldErrors,
        })
        return
      }

      const bodyResult = assignReportSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = idResult.data
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
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_REPORT_ASSIGNED,
        code: SUCCESS_CODES.MAINTENANCE_REPORT_ASSIGNED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.assignReport] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_ASSIGN_ERROR,
        code: ERROR_CODES.MAINTENANCE_ASSIGN_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const deleted = await MaintenanceRepository.delete(id, req.user.id, req.user.username)

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_REPORT_DELETED,
        code: SUCCESS_CODES.MAINTENANCE_REPORT_DELETED,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.delete] Error:', error.message)

      if (error.message.includes('ya está eliminado')) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_DELETE_REPORT_ERROR,
        code: ERROR_CODES.MAINTENANCE_DELETE_REPORT_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const report = await MaintenanceRepository.restore(id, req.user.id, req.user.username)

      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_REPORT_RESTORED,
        code: SUCCESS_CODES.MAINTENANCE_REPORT_RESTORED,
        data: report,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.restore] Error:', error.message)

      if (error.message.includes('no está eliminado')) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_RESTORE_REPORT_ERROR,
        code: ERROR_CODES.MAINTENANCE_RESTORE_REPORT_ERROR,
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
      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const images = await MaintenanceRepository.getImagesByReportId(id)

      res.json({ success: true, data: images })
    } catch (error: any) {
      console.error('[MaintenanceController.getImages] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_FETCH_IMAGES_ERROR,
        code: ERROR_CODES.MAINTENANCE_FETCH_IMAGES_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      // Verificar que el reporte existe
      const report = await MaintenanceRepository.getById(id)
      if (!report) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_REPORT_NOT_FOUND,
        })
        return
      }

      // Verificar límite de imágenes
      if (report.images.length >= 5) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_MAX_IMAGES_REACHED,
          code: ERROR_CODES.MAINTENANCE_MAX_IMAGES_REACHED,
        })
        return
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_NO_IMAGE_SENT,
          code: ERROR_CODES.MAINTENANCE_NO_IMAGE_SENT,
        })
        return
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_INVALID_FILE_TYPE,
          code: ERROR_CODES.MAINTENANCE_INVALID_FILE_TYPE,
        })
        return
      }

      // Validar tamaño (máx 5MB)
      const maxSize = 5 * 1024 * 1024
      if (req.file.size > maxSize) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_FILE_TOO_LARGE,
          code: ERROR_CODES.MAINTENANCE_FILE_TOO_LARGE,
        })
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
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_IMAGE_UPLOADED,
        code: SUCCESS_CODES.MAINTENANCE_IMAGE_UPLOADED,
        data: image,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.uploadImage] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_UPLOAD_IMAGE_ERROR,
        code: ERROR_CODES.MAINTENANCE_UPLOAD_IMAGE_ERROR,
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
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id, imageId } = req.params

      if (!id || !imageId) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_REPORT_IMAGE_REQUIRED,
          code: ERROR_CODES.MAINTENANCE_REPORT_IMAGE_REQUIRED,
        })
        return
      }

      // Obtener imagen
      const image = await MaintenanceRepository.getImageById(Number(imageId))
      if (!image) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_IMAGE_NOT_FOUND,
          code: ERROR_CODES.MAINTENANCE_IMAGE_NOT_FOUND,
        })
        return
      }

      // Verificar que pertenece al reporte
      if (image.report_id !== id) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.MAINTENANCE_IMAGE_NOT_IN_REPORT,
          code: ERROR_CODES.MAINTENANCE_IMAGE_NOT_IN_REPORT,
        })
        return
      }

      // Eliminar de Cloudinary si tiene public_id
      if (image.public_id) {
        await CloudinaryService.deleteImage(image.public_id)
      }

      // Eliminar de BD
      await MaintenanceRepository.deleteImage(Number(imageId))

      res.json({
        success: true,
        message: SUCCESS_CODES.MAINTENANCE_IMAGE_DELETED,
        code: SUCCESS_CODES.MAINTENANCE_IMAGE_DELETED,
      })
    } catch (error: any) {
      console.error('[MaintenanceController.deleteImage] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_DELETE_IMAGE_ERROR,
        code: ERROR_CODES.MAINTENANCE_DELETE_IMAGE_ERROR,
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
      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const history = await MaintenanceRepository.getHistoryByReportId(id)

      res.json({ success: true, data: history })
    } catch (error: any) {
      console.error('[MaintenanceController.getHistory] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_FETCH_HISTORY_ERROR,
        code: ERROR_CODES.MAINTENANCE_FETCH_HISTORY_ERROR,
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

      res.json({ success: true, data: stats })
    } catch (error: any) {
      console.error('[MaintenanceController.getStats] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.MAINTENANCE_FETCH_STATS_ERROR,
        code: ERROR_CODES.MAINTENANCE_FETCH_STATS_ERROR,
      })
    }
  }
}
