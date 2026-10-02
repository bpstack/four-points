// routes/notifications/notifications-routes.ts

import { Router } from 'express'
import { authenticateToken as verifyToken } from '../../middlewares/authenticateToken.js'
import { canManageGroups, canViewGroups, isAdmin } from '../../middlewares/roleCheck.js'
import { NotificationController } from '../../controllers/notifications/notification-controller.js'

const router = Router()

// ═══════════════════════════════════════════════════════
// RUTAS DE NOTIFICACIONES (GENERALES)
// Base: /api/notifications
// ═══════════════════════════════════════════════════════

// Obtener notificaciones del usuario autenticado
router.get('/', verifyToken, canViewGroups, NotificationController.getUserNotifications)
// Obtener solo notificaciones no leídas
router.get('/unread', verifyToken, canViewGroups, NotificationController.getUnreadNotifications)

// Obtener contador de no leídas (para badge)
router.get('/unread/count', verifyToken, canViewGroups, NotificationController.getUnreadCount)

// Crear notificación general (sin grupo específico)
router.post('/', verifyToken, isAdmin, NotificationController.createGeneralNotification)

// Verificar notificaciones pendientes (trigger manual): admin y group-admin
router.post(
  '/check-pending',
  verifyToken,
  canManageGroups,
  NotificationController.checkPendingNotifications
)
// Marcar todas como leídas
router.patch('/read-all', verifyToken, canViewGroups, NotificationController.markAllAsRead)

// Marcar una como leída
router.patch('/:id/read', verifyToken, canViewGroups, NotificationController.markAsRead)

// Eliminar notificación (solo admin)
router.delete('/:id', verifyToken, isAdmin, NotificationController.deleteNotification)

export default router
