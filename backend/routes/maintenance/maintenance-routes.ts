// backend/routes/maintenance/maintenance-routes.ts
/**
 * Rutas para el módulo Maintenance
 * Todas las rutas requieren autenticación
 */

import { Router } from 'express'
import multer from 'multer'
import { MaintenanceController } from '../../controllers/maintenance/maintenance-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { canAccessMaintenance } from '../../middlewares/roleCheck.js'

const router = Router()

// Configurar multer para uploads en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

// Aplicar autenticación y verificación de rol a todas las rutas
router.use(authenticateToken)
router.use(canAccessMaintenance)

// ========================================
// RUTAS DE REPORTES
// ========================================

/**
 * @route   GET /api/maintenance
 * @desc    Obtener todos los reportes con filtros y paginación
 * @access  Private
 * @query   status, priority, location_type, assigned_to, created_by,
 *          room_number, search, date_from, date_to, include_deleted, page, limit
 */
router.get('/', MaintenanceController.getAll)

/**
 * @route   GET /api/maintenance/stats
 * @desc    Obtener estadísticas generales
 * @access  Private
 */
router.get('/stats', MaintenanceController.getStats)

/**
 * @route   GET /api/maintenance/:id
 * @desc    Obtener reporte por ID con imágenes e historial
 * @access  Private
 */
router.get('/:id', MaintenanceController.getById)

/**
 * @route   POST /api/maintenance
 * @desc    Crear nuevo reporte
 * @access  Private
 * @body    title, description, location_type, location_description,
 *          room_number?, room_out_of_service?, priority?, assigned_to?,
 *          assigned_type?, external_company_name?, external_contact?
 */
router.post('/', MaintenanceController.create)

/**
 * @route   PATCH /api/maintenance/:id
 * @desc    Actualizar reporte existente
 * @access  Private
 * @body    Campos opcionales del reporte
 */
router.patch('/:id', MaintenanceController.update)

/**
 * @route   PATCH /api/maintenance/:id/status
 * @desc    Actualizar solo el estado del reporte
 * @access  Private
 * @body    status, notes?
 */
router.patch('/:id/status', MaintenanceController.updateStatus)

/**
 * @route   PATCH /api/maintenance/:id/priority
 * @desc    Actualizar solo la prioridad del reporte
 * @access  Private
 * @body    priority
 */
router.patch('/:id/priority', MaintenanceController.updatePriority)

/**
 * @route   PATCH /api/maintenance/:id/resolution-notes
 * @desc    Agregar notas de resolución
 * @access  Private
 * @body    notes
 */
router.patch('/:id/resolution-notes', MaintenanceController.addResolutionNotes)

/**
 * @route   PATCH /api/maintenance/:id/assign
 * @desc    Asignar reporte a usuario o empresa externa
 * @access  Private
 * @body    assigned_type, assigned_to?, external_company_name?, external_contact?
 */
router.patch('/:id/assign', MaintenanceController.assignReport)

/**
 * @route   DELETE /api/maintenance/:id
 * @desc    Eliminar reporte (soft delete)
 * @access  Private
 */
router.delete('/:id', MaintenanceController.delete)

/**
 * @route   PATCH /api/maintenance/:id/restore
 * @desc    Restaurar reporte eliminado
 * @access  Private
 */
router.patch('/:id/restore', MaintenanceController.restore)

// ========================================
// RUTAS DE IMÁGENES
// ========================================

/**
 * @route   GET /api/maintenance/:id/images
 * @desc    Obtener imágenes de un reporte
 * @access  Private
 */
router.get('/:id/images', MaintenanceController.getImages)

/**
 * @route   POST /api/maintenance/:id/images
 * @desc    Subir imagen a un reporte
 * @access  Private
 * @file    image (multipart/form-data)
 */
router.post('/:id/images', upload.single('image'), MaintenanceController.uploadImage)

/**
 * @route   DELETE /api/maintenance/:id/images/:imageId
 * @desc    Eliminar imagen de un reporte
 * @access  Private
 */
router.delete('/:id/images/:imageId', MaintenanceController.deleteImage)

// ========================================
// RUTAS DE HISTORIAL
// ========================================

/**
 * @route   GET /api/maintenance/:id/history
 * @desc    Obtener historial de cambios de un reporte
 * @access  Private
 */
router.get('/:id/history', MaintenanceController.getHistory)

export default router
