// src/controllers/blacklist/blacklist-controller.ts
/**
 * Controller para el módulo Blacklist
 * Maneja las peticiones HTTP y respuestas
 */

import type { Request, Response } from 'express'
import { BlacklistRepository } from '../../repositories/blacklist/blacklist-repository.js'
import { CloudinaryService } from '../../services/blacklist/cloudinary-service.js'
import {
  createBlacklistSchema,
  updateBlacklistSchema,
  blacklistFiltersSchema,
  idParamSchema,
} from '../../validations/blacklist/schemas.js'
import type { BlacklistFilters } from '../../models/blacklist/index.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import { isImageFile } from '../../services/uploads/image-signature.js'

// ========================================
// CONTROLLER
// ========================================

export class BlacklistController {
  /**
   * GET /api/blacklist
   * Obtener todos los registros con filtros y paginación
   */
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      // Validar query params
      const parseResult = blacklistFiltersSchema.safeParse(req.query)

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_INVALID_SEARCH_PARAMS,
          code: ERROR_CODES.BLACKLIST_INVALID_SEARCH_PARAMS,
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const filters: BlacklistFilters = parseResult.data

      const { entries, pagination } = await BlacklistRepository.getAll(filters)

      res.json({
        success: true,
        entries,
        pagination,
        filters_applied: filters,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_getAll_error' },
        '[BlacklistController.getAll] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_FETCH_RECORDS_ERROR,
        code: ERROR_CODES.BLACKLIST_FETCH_RECORDS_ERROR,
      })
    }
  }

  /**
   * GET /api/blacklist/:id
   * Obtener registro por ID con audit trail
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      // Validar ID
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

      const entry = await BlacklistRepository.getById(id)

      if (!entry) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
          code: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        entry,
        audit_trail: entry.audit_trail || [],
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_getById_error' },
        '[BlacklistController.getById] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_FETCH_RECORD_ERROR,
        code: ERROR_CODES.BLACKLIST_FETCH_RECORD_ERROR,
      })
    }
  }

  /**
   * POST /api/blacklist
   * Crear nuevo registro
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Validar body
      const parseResult = createBlacklistSchema.safeParse(req.body)

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

      // Verificar si el documento ya existe en blacklist activa
      const exists = await BlacklistRepository.existsByDocument(data.document_number)
      if (exists) {
        res.status(409).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_DOCUMENT_EXISTS,
          code: ERROR_CODES.BLACKLIST_DOCUMENT_EXISTS,
        })
        return
      }

      // Crear registro
      const entry = await BlacklistRepository.create(data, req.user.id, req.user.username)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.BLACKLIST_RECORD_CREATED,
        code: SUCCESS_CODES.BLACKLIST_RECORD_CREATED,
        entry,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_create_error' },
        '[BlacklistController.create] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_CREATE_RECORD_ERROR,
        code: ERROR_CODES.BLACKLIST_CREATE_RECORD_ERROR,
      })
    }
  }

  /**
   * PATCH /api/blacklist/:id
   * Actualizar registro existente
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Validar ID
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

      // Validar body
      const bodyResult = updateBlacklistSchema.safeParse(req.body)
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

      // Si se actualiza el documento, verificar que no exista otro igual
      if (data.document_number) {
        const exists = await BlacklistRepository.existsByDocument(data.document_number, id)
        if (exists) {
          res.status(409).json({
            success: false,
            error: ERROR_CODES.BLACKLIST_DOCUMENT_EXISTS,
            code: ERROR_CODES.BLACKLIST_DOCUMENT_EXISTS,
          })
          return
        }
      }

      // Actualizar registro
      const entry = await BlacklistRepository.update(id, data, req.user.id, req.user.username)

      if (!entry) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
          code: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.BLACKLIST_RECORD_UPDATED,
        code: SUCCESS_CODES.BLACKLIST_RECORD_UPDATED,
        entry,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_update_error' },
        '[BlacklistController.update] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_UPDATE_RECORD_ERROR,
        code: ERROR_CODES.BLACKLIST_UPDATE_RECORD_ERROR,
      })
    }
  }

  /**
   * DELETE /api/blacklist/:id
   * Eliminar registro (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Validar ID
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

      const deleted = await BlacklistRepository.delete(id, req.user.id, req.user.username)

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
          code: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.BLACKLIST_RECORD_DELETED,
        code: SUCCESS_CODES.BLACKLIST_RECORD_DELETED,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_delete_error' },
        '[BlacklistController.delete] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_DELETE_RECORD_ERROR,
        code: ERROR_CODES.BLACKLIST_DELETE_RECORD_ERROR,
      })
    }
  }

  /**
   * PATCH /api/blacklist/:id/restore
   * Restaurar registro eliminado
   */
  static async restore(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Validar ID
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

      const entry = await BlacklistRepository.restore(id, req.user.id, req.user.username)

      if (!entry) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
          code: ERROR_CODES.BLACKLIST_RECORD_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.BLACKLIST_RECORD_RESTORED,
        code: SUCCESS_CODES.BLACKLIST_RECORD_RESTORED,
        entry,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_restore_error' },
        '[BlacklistController.restore] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_RESTORE_RECORD_ERROR,
        code: ERROR_CODES.BLACKLIST_RESTORE_RECORD_ERROR,
      })
    }
  }

  /**
   * GET /api/blacklist/stats
   * Obtener estadísticas generales
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await BlacklistRepository.getStats()

      res.json({ success: true, ...stats })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_getStats_error' },
        '[BlacklistController.getStats] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_FETCH_STATS_ERROR,
        code: ERROR_CODES.BLACKLIST_FETCH_STATS_ERROR,
      })
    }
  }

  /**
   * POST /api/blacklist/upload
   * Subir imagen a Cloudinary
   */
  static async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Verificar que se envió un archivo
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_NO_IMAGE_SENT,
          code: ERROR_CODES.BLACKLIST_NO_IMAGE_SENT,
        })
        return
      }

      // Validar tipo de archivo por sus bytes, no por el tipo que declara el cliente
      if (!isImageFile(req.file.buffer)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_INVALID_FILE_TYPE,
          code: ERROR_CODES.BLACKLIST_INVALID_FILE_TYPE,
        })
        return
      }

      // Validar tamaño (máx 5MB)
      const maxSize = 5 * 1024 * 1024
      if (req.file.size > maxSize) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_FILE_TOO_LARGE,
          code: ERROR_CODES.BLACKLIST_FILE_TOO_LARGE,
        })
        return
      }

      // Subir a Cloudinary
      const result = await CloudinaryService.uploadImage(req.file.buffer, req.file.originalname)

      logger.info({ publicId: result.public_id }, '[BlacklistController.uploadImage] Imagen subida')

      res.status(201).json({
        success: true,
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_uploadImage_error' },
        '[BlacklistController.uploadImage] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_UPLOAD_IMAGE_ERROR,
        code: ERROR_CODES.BLACKLIST_UPLOAD_IMAGE_ERROR,
      })
    }
  }

  /**
   * DELETE /api/blacklist/upload/:publicId
   * Eliminar imagen de Cloudinary
   */
  static async deleteImage(req: Request, res: Response): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { publicId } = req.params

      if (!publicId) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_PUBLIC_ID_MISSING,
          code: ERROR_CODES.BLACKLIST_PUBLIC_ID_MISSING,
        })
        return
      }

      // Decodificar el publicId (puede venir con / codificado)
      const decodedPublicId = decodeURIComponent(publicId)

      const deleted = await CloudinaryService.deleteImage(decodedPublicId)

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BLACKLIST_IMAGE_NOT_FOUND,
          code: ERROR_CODES.BLACKLIST_IMAGE_NOT_FOUND,
        })
        return
      }

      logger.info(
        { publicId: decodedPublicId },
        '[BlacklistController.deleteImage] Imagen eliminada'
      )

      res.json({
        success: true,
        message: SUCCESS_CODES.BLACKLIST_IMAGE_DELETED,
        code: SUCCESS_CODES.BLACKLIST_IMAGE_DELETED,
      })
    } catch (error: any) {
      logger.error(
        { err: error, event: 'blacklist_deleteImage_error' },
        '[BlacklistController.deleteImage] Error'
      )
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BLACKLIST_DELETE_IMAGE_ERROR,
        code: ERROR_CODES.BLACKLIST_DELETE_IMAGE_ERROR,
      })
    }
  }
}
