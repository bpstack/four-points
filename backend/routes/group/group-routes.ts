// routes/group/group-routes.ts

import { Router } from 'express'
import { authenticateToken as verifyToken } from '../../middlewares/authenticateToken.js'
import { canManageGroups, canViewGroups, isAdmin } from '../../middlewares/roleCheck.js'

// Controllers
import { GroupController } from '../../controllers/group/group-controller.js'
import { GroupPaymentController } from '../../controllers/group/group-payment-controller.js'
import { GroupStatusController } from '../../controllers/group/group-status-controller.js'
import { GroupRoomController } from '../../controllers/group/group-room-controller.js'
import { GroupContactController } from '../../controllers/group/group-contact-controller.js'
import { GroupHistoryController } from '../../controllers/group/group-history-controller.js'
import { NotificationController } from '../../controllers/notifications/notification-controller.js'

const router = Router()

// ═══════════════════════════════════════════════════════
// RUTAS DE GRUPOS PRINCIPALES
// ═══════════════════════════════════════════════════════

// Dashboard
router.get('/dashboard/overview', verifyToken, canViewGroups, GroupController.getDashboardOverview)

router.get('/dashboard/timeline', verifyToken, canViewGroups, GroupController.getDashboardTimeline)

// CRUD de grupos (✅ CAMBIO: eliminar /groups, usar directamente /)
router.get('/', verifyToken, canViewGroups, GroupController.getAllGroups)

router.get('/:id', verifyToken, canViewGroups, GroupController.getGroupById)

router.post('/', verifyToken, canManageGroups, GroupController.createGroup)

router.put('/:id', verifyToken, canManageGroups, GroupController.updateGroup)

router.delete('/:id', verifyToken, canManageGroups, isAdmin, GroupController.deleteGroup)

// ═══════════════════════════════════════════════════════
// RUTAS DE PAGOS
// ═══════════════════════════════════════════════════════

// Pagos próximos y vencidos (rutas globales)
router.get(
  '/payments/upcoming',
  verifyToken,
  canViewGroups,
  GroupPaymentController.getUpcomingPayments
)

router.get(
  '/payments/overdue',
  verifyToken,
  canViewGroups,
  GroupPaymentController.getOverduePayments
)

// Pagos de un grupo específico (✅ CAMBIO: ahora es /:id/payments)
router.get('/:id/payments', verifyToken, canViewGroups, GroupPaymentController.getPaymentsByGroup)

router.post('/:id/payments', verifyToken, canManageGroups, GroupPaymentController.createPayment)

router.put(
  '/:id/payments/:paymentId',
  verifyToken,
  canManageGroups,
  GroupPaymentController.updatePayment
)

router.patch(
  '/:id/payments/:paymentId/status',
  verifyToken,
  canManageGroups,
  GroupPaymentController.updatePaymentStatus
)

router.patch(
  '/:id/payments/:paymentId/amount-paid',
  verifyToken,
  canManageGroups,
  GroupPaymentController.updateAmountPaid
)

router.delete(
  '/:id/payments/:paymentId',
  verifyToken,
  canManageGroups,
  GroupPaymentController.deletePayment
)

// ═══════════════════════════════════════════════════════
// RUTAS DE ESTADOS (BOOKING, CONTRACT, ROOMING, BALANCE)
// ═══════════════════════════════════════════════════════

router.get('/:id/status', verifyToken, canViewGroups, GroupStatusController.getStatus)

router.put('/:id/status/booking', verifyToken, canManageGroups, GroupStatusController.updateBooking)

router.put(
  '/:id/status/contract',
  verifyToken,
  canManageGroups,
  GroupStatusController.updateContract
)

router.put('/:id/status/rooming', verifyToken, canManageGroups, GroupStatusController.updateRooming)

router.put('/:id/status/balance', verifyToken, canManageGroups, GroupStatusController.updateBalance)

// ═══════════════════════════════════════════════════════
// RUTAS DE HABITACIONES
// ═══════════════════════════════════════════════════════

router.get('/:id/rooms', verifyToken, canViewGroups, GroupRoomController.getRoomsByGroup)

router.post('/:id/rooms', verifyToken, canManageGroups, GroupRoomController.createOrUpdateRoom)

router.put('/:id/rooms/:roomId', verifyToken, canManageGroups, GroupRoomController.updateRoom)

router.delete('/:id/rooms/:roomId', verifyToken, canManageGroups, GroupRoomController.deleteRoom)

// ═══════════════════════════════════════════════════════
// RUTAS DE CONTACTOS
// ═══════════════════════════════════════════════════════

router.get('/:id/contacts', verifyToken, canViewGroups, GroupContactController.getContactsByGroup)

router.get(
  '/:id/contacts/primary',
  verifyToken,
  canViewGroups,
  GroupContactController.getPrimaryContact
)

router.post('/:id/contacts', verifyToken, canManageGroups, GroupContactController.createContact)

router.put(
  '/:id/contacts/:contactId',
  verifyToken,
  canManageGroups,
  GroupContactController.updateContact
)

router.delete(
  '/:id/contacts/:contactId',
  verifyToken,
  canManageGroups,
  GroupContactController.deleteContact
)

// ═══════════════════════════════════════════════════════
// RUTAS DE HISTORIAL
// ═══════════════════════════════════════════════════════

router.get('/:id/history', verifyToken, canViewGroups, GroupHistoryController.getGroupHistory)

// ═══════════════════════════════════════════════════════
// RUTAS DE NOTIFICACIONES ESPECÍFICAS DE GRUPOS
// ═══════════════════════════════════════════════════════

// Obtener notificaciones de un grupo específico
router.get(
  '/:id/notifications',
  verifyToken,
  canViewGroups,
  NotificationController.getGroupNotifications
)

// Crear notificación manual para un grupo
router.post(
  '/:id/notifications',
  verifyToken,
  canManageGroups,
  NotificationController.createManualNotification
)

export default router
