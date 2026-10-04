// src/routes/blacklist/blacklist-routes.ts
/**
 * Rutas del módulo Blacklist
 * Todas las rutas requieren autenticación
 */

import { Router } from 'express'
import multer from 'multer'
import { BlacklistController } from '../../controllers/blacklist/blacklist-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { excludeMantenimiento } from '../../middlewares/roleCheck.js'

const router = Router()

// Configurar multer para memoria (no guardar en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

// ========================================
// Todas las rutas requieren autenticación
// El rol mantenimiento NO tiene acceso a este módulo
// ========================================
router.use(authenticateToken)
router.use(excludeMantenimiento)

// ========================================
// RUTAS DE IMÁGENES (deben ir ANTES de /:id)
// ========================================

/**
 * POST /api/blacklist/upload
 * Subir imagen a Cloudinary
 */
router.post('/upload', upload.single('image'), BlacklistController.uploadImage)

// ========================================
// RUTAS PRINCIPALES
// ========================================

/**
 * GET /api/blacklist/stats
 * Obtener estadísticas (debe ir ANTES de /:id)
 */
router.get('/stats', BlacklistController.getStats)

/**
 * GET /api/blacklist
 * Listar registros con filtros y paginación
 * Query params: q, document, severity, status, created_by, from_date, to_date, page, limit
 */
router.get('/', BlacklistController.getAll)

/**
 * GET /api/blacklist/:id
 * Obtener registro por ID con audit trail
 */
router.get('/:id', BlacklistController.getById)

/**
 * POST /api/blacklist
 * Crear nuevo registro
 */
router.post('/', BlacklistController.create)

/**
 * PATCH /api/blacklist/:id
 * Actualizar registro existente
 */
router.patch('/:id', BlacklistController.update)

/**
 * DELETE /api/blacklist/:id
 * Eliminar registro (soft delete)
 */
router.delete('/:id', BlacklistController.delete)

/**
 * PATCH /api/blacklist/:id/restore
 * Restaurar registro eliminado
 */
router.patch('/:id/restore', BlacklistController.restore)

export default router
