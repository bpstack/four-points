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
          error: 'Parámetros de búsqueda inválidos',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const filters: BlacklistFilters = parseResult.data

      const { entries, pagination } = await BlacklistRepository.getAll(filters)

      res.json({
        entries,
        pagination,
        filters_applied: filters,
      })
    } catch (error: any) {
      console.error('[BlacklistController.getAll] Error:', error.message)
      res.status(500).json({
        error: 'Error al obtener los registros',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/blacklist/:id
   * Obtener registro por ID con audit trail
   */
  static async getById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Validar ID
      const parseResult = idParamSchema.safeParse(req.params)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'ID inválido',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const entry = await BlacklistRepository.getById(id)

      if (!entry) {
        res.status(404).json({
          error: 'Registro no encontrado',
        })
        return
      }

      res.json({
        entry,
        audit_trail: entry.audit_trail || [],
      })
    } catch (error: any) {
      console.error('[BlacklistController.getById] Error:', error.message)
      res.status(500).json({
        error: 'Error al obtener el registro',
        message: error.message,
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
          error: 'No autorizado',
        })
        return
      }

      // Validar body
      const parseResult = createBlacklistSchema.safeParse(req.body)

      if (!parseResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const data = parseResult.data

      // Verificar si el documento ya existe en blacklist activa
      const exists = await BlacklistRepository.existsByDocument(
        data.document_number
      )
      if (exists) {
        res.status(409).json({
          error: 'Documento ya registrado',
          message: `El documento ${data.document_number} ya existe en la blacklist activa`,
        })
        return
      }

      // Crear registro
      const entry = await BlacklistRepository.create(
        data,
        req.user.id,
        req.user.username
      )

      res.status(201).json({
        message: 'Registro creado correctamente',
        entry,
      })
    } catch (error: any) {
      console.error('[BlacklistController.create] Error:', error.message)
      res.status(500).json({
        error: 'Error al crear el registro',
        message: error.message,
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
          error: 'No autorizado',
        })
        return
      }

      // Validar ID
      const idResult = idParamSchema.safeParse(req.params)
      if (!idResult.success) {
        res.status(400).json({
          error: 'ID inválido',
          details: idResult.error.flatten().fieldErrors,
        })
        return
      }

      // Validar body
      const bodyResult = updateBlacklistSchema.safeParse(req.body)
      if (!bodyResult.success) {
        res.status(400).json({
          error: 'Datos inválidos',
          details: bodyResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = idResult.data
      const data = bodyResult.data

      // Si se actualiza el documento, verificar que no exista otro igual
      if (data.document_number) {
        const exists = await BlacklistRepository.existsByDocument(
          data.document_number,
          id
        )
        if (exists) {
          res.status(409).json({
            error: 'Documento ya registrado',
            message: `El documento ${data.document_number} ya existe en otro registro de la blacklist`,
          })
          return
        }
      }

      // Actualizar registro
      const entry = await BlacklistRepository.update(
        id,
        data,
        req.user.id,
        req.user.username
      )

      if (!entry) {
        res.status(404).json({
          error: 'Registro no encontrado',
        })
        return
      }

      res.json({
        message: 'Registro actualizado correctamente',
        entry,
      })
    } catch (error: any) {
      console.error('[BlacklistController.update] Error:', error.message)

      // Manejar error de registro eliminado
      if (error.message.includes('eliminado')) {
        res.status(400).json({
          error: error.message,
        })
        return
      }

      res.status(500).json({
        error: 'Error al actualizar el registro',
        message: error.message,
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
          error: 'No autorizado',
        })
        return
      }

      // Validar ID
      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'ID inválido',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const deleted = await BlacklistRepository.delete(
        id,
        req.user.id,
        req.user.username
      )

      if (!deleted) {
        res.status(404).json({
          error: 'Registro no encontrado',
        })
        return
      }

      res.json({
        message: 'Registro eliminado correctamente',
      })
    } catch (error: any) {
      console.error('[BlacklistController.delete] Error:', error.message)

      // Manejar error de registro ya eliminado
      if (error.message.includes('ya está eliminado')) {
        res.status(400).json({
          error: error.message,
        })
        return
      }

      res.status(500).json({
        error: 'Error al eliminar el registro',
        message: error.message,
      })
    }
  }

  /**
   * PATCH /api/blacklist/:id/restore
   * Restaurar registro eliminado
   */
  static async restore(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id || !req.user?.username) {
        res.status(401).json({
          error: 'No autorizado',
        })
        return
      }

      // Validar ID
      const parseResult = idParamSchema.safeParse(req.params)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'ID inválido',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { id } = parseResult.data

      const entry = await BlacklistRepository.restore(
        id,
        req.user.id,
        req.user.username
      )

      if (!entry) {
        res.status(404).json({
          error: 'Registro no encontrado',
        })
        return
      }

      res.json({
        message: 'Registro restaurado correctamente',
        entry,
      })
    } catch (error: any) {
      console.error('[BlacklistController.restore] Error:', error.message)

      // Manejar error de registro ya activo
      if (error.message.includes('ya está activo')) {
        res.status(400).json({
          error: error.message,
        })
        return
      }

      res.status(500).json({
        error: 'Error al restaurar el registro',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/blacklist/stats
   * Obtener estadísticas generales
   */
  static async getStats(
    _req: Request,
    res: Response
  ): Promise<void> {
    try {
      const stats = await BlacklistRepository.getStats()

      res.json(stats)
    } catch (error: any) {
      console.error('[BlacklistController.getStats] Error:', error.message)
      res.status(500).json({
        error: 'Error al obtener estadísticas',
        message: error.message,
      })
    }
  }

  /**
   * POST /api/blacklist/upload
   * Subir imagen a Cloudinary
   */
  static async uploadImage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id) {
        res.status(401).json({
          error: 'No autorizado',
        })
        return
      }

      // Verificar que se envió un archivo
      if (!req.file) {
        res.status(400).json({
          error: 'No se envió ninguna imagen',
        })
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
        res.status(400).json({
          error: 'El archivo es demasiado grande. Máximo 5MB',
        })
        return
      }

      // Subir a Cloudinary
      const result = await CloudinaryService.uploadImage(
        req.file.buffer,
        req.file.originalname
      )

      console.log('[BlacklistController.uploadImage] Imagen subida:', result.public_id)

      res.status(201).json({
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      })
    } catch (error: any) {
      console.error('[BlacklistController.uploadImage] Error:', error.message)
      res.status(500).json({
        error: 'Error al subir imagen',
        message: error.message,
      })
    }
  }

  /**
   * DELETE /api/blacklist/upload/:publicId
   * Eliminar imagen de Cloudinary
   */
  static async deleteImage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Verificar autenticación
      if (!req.user?.id) {
        res.status(401).json({
          error: 'No autorizado',
        })
        return
      }

      const { publicId } = req.params

      if (!publicId) {
        res.status(400).json({
          error: 'public_id no proporcionado',
        })
        return
      }

      // Decodificar el publicId (puede venir con / codificado)
      const decodedPublicId = decodeURIComponent(publicId)

      const deleted = await CloudinaryService.deleteImage(decodedPublicId)

      if (!deleted) {
        res.status(404).json({
          error: 'Imagen no encontrada o ya eliminada',
        })
        return
      }

      console.log('[BlacklistController.deleteImage] Imagen eliminada:', decodedPublicId)

      res.json({
        message: 'Imagen eliminada correctamente',
      })
    } catch (error: any) {
      console.error('[BlacklistController.deleteImage] Error:', error.message)
      res.status(500).json({
        error: 'Error al eliminar imagen',
        message: error.message,
      })
    }
  }
}
