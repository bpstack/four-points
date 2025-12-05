backend/
├── modules/
│ └── groups/
│ ├── controllers/
│ │ ├── group-controller.js
│ │ ├── group-payment-controller.js
│ │ ├── group-status-controller.js
│ │ ├── group-room-controller.js
│ │ ├── group-contact-controller.js
│ │ ├── group-history-controller.js
│ │ └── notification-controller.js
│ │
│ ├── repositories/
│ │ ├── group-repository.js
│ │ ├── group-payment-repository.js
│ │ ├── group-status-repository.js
│ │ ├── group-room-repository.js
│ │ ├── group-contact-repository.js
│ │ ├── group-history-repository.js
│ │ └── notification-repository.js
│ │
│ ├── services/
│ │ ├── payment-calculator-service.js
│ │ ├── notification-generator-service.js
│ │ ├── email-service.js
│ │ └── group-history-service.js
│ │
│ ├── routes/
│ │ └── group-routes.js
│ │
│ └── validations/
│ └── group-validation.js
│
└── middlewares/
└── roleCheck.js (añadir canManageGroups, canViewGroups)

// ═══════════════════════════════════════════════════════
// GRUPOS - CRUD Principal
// ═══════════════════════════════════════════════════════
GET /api/groups // Listar grupos (con filtros)
GET /api/groups/:id // Detalle completo de un grupo
POST /api/groups // Crear grupo
PUT /api/groups/:id // Actualizar grupo
DELETE /api/groups/:id // Eliminar grupo

// ═══════════════════════════════════════════════════════
// CONTACTOS
// ═══════════════════════════════════════════════════════
GET /api/groups/:id/contacts // Listar contactos del grupo
POST /api/groups/:id/contacts // Añadir contacto
PUT /api/groups/:id/contacts/:contactId // Actualizar contacto
DELETE /api/groups/:id/contacts/:contactId // Eliminar contacto

// ═══════════════════════════════════════════════════════
// HABITACIONES
// ═══════════════════════════════════════════════════════
GET /api/groups/:id/rooms // Listar habitaciones del grupo
POST /api/groups/:id/rooms // Añadir/actualizar habitaciones
PUT /api/groups/:id/rooms/:roomId // Actualizar habitación
DELETE /api/groups/:id/rooms/:roomId // Eliminar tipo de habitación

// ═══════════════════════════════════════════════════════
// ESTADO ADMINISTRATIVO
// ═══════════════════════════════════════════════════════
GET /api/groups/:id/status // Obtener estado del grupo
PUT /api/groups/:id/status // Actualizar estado completo
PATCH /api/groups/:id/status/booking // Actualizar solo bloqueo
PATCH /api/groups/:id/status/contract // Actualizar solo contrato
PATCH /api/groups/:id/status/rooming // Actualizar solo rooming list
PATCH /api/groups/:id/status/balance // Actualizar solo balance

// ═══════════════════════════════════════════════════════
// PAGOS
// ═══════════════════════════════════════════════════════
GET /api/groups/:id/payments // Listar pagos del grupo
POST /api/groups/:id/payments // Añadir pago
PUT /api/groups/:id/payments/:paymentId // Actualizar pago completo
PATCH /api/groups/:id/payments/:paymentId/status // Actualizar solo estado
PATCH /api/groups/:id/payments/:paymentId/amount-paid // Registrar pago parcial
DELETE /api/groups/:id/payments/:paymentId // Eliminar pago

// Dashboard de pagos
GET /api/payments/upcoming // Pagos próximos a vencer
GET /api/payments/overdue // Pagos vencidos

// ═══════════════════════════════════════════════════════
// HISTORIAL
// ═══════════════════════════════════════════════════════
GET /api/groups/:id/history // Ver historial de cambios

// ═══════════════════════════════════════════════════════
// NOTIFICACIONES
// ═══════════════════════════════════════════════════════
GET /api/notifications // MIS notificaciones (del usuario actual)
GET /api/notifications/:id // Detalle de notificación
PATCH /api/notifications/:id/read // Marcar como leída
PATCH /api/notifications/read-all // Marcar todas como leídas
DELETE /api/notifications/:id // Eliminar notificación

// Notificaciones de un grupo específico
GET /api/groups/:id/notifications // Notificaciones del grupo
POST /api/groups/:id/notifications // Crear notificación manual para el grupo

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
GET /api/groups/dashboard/overview // Resumen general
GET /api/groups/dashboard/timeline // Timeline por mes

1. group-controller.js

- getAllGroups(req, res) // GET /api/groups (con filtros: status, date range, agency)
- getGroupById(req, res) // GET /api/groups/:id (detalle completo con joins)
- createGroup(req, res) // POST /api/groups
- updateGroup(req, res) // PUT /api/groups/:id (recalcula payments si cambia total_amount)
- deleteGroup(req, res) // DELETE /api/groups/:id
- getDashboardOverview(req, res) // GET /api/groups/dashboard/overview
- getDashboardTimeline(req, res) // GET /api/groups/dashboard/timeline

2. group-payment-controller.js

- getPaymentsByGroup(req, res) // GET /api/groups/:id/payments
- createPayment(req, res) // POST /api/groups/:id/payments
- updatePayment(req, res) // PUT /api/groups/:id/payments/:paymentId
- updatePaymentStatus(req, res) // PATCH /api/groups/:id/payments/:paymentId/status
- updateAmountPaid(req, res) // PATCH /api/groups/:id/payments/:paymentId/amount-paid
- deletePayment(req, res) // DELETE /api/groups/:id/payments/:paymentId
- getUpcomingPayments(req, res) // GET /api/payments/upcoming
- getOverduePayments(req, res) // GET /api/payments/overdue

3. group-status-controller.js

- getStatus(req, res) // GET /api/groups/:id/status
- updateStatus(req, res) // PUT /api/groups/:id/status (actualizar todo)
- updateBooking(req, res) // PATCH /api/groups/:id/status/booking
- updateContract(req, res) // PATCH /api/groups/:id/status/contract
- updateRooming(req, res) // PATCH /api/groups/:id/status/rooming
- updateBalance(req, res) // PATCH /api/groups/:id/status/balance

4. group-room-controller.js

- getRoomsByGroup(req, res) // GET /api/groups/:id/rooms
- createOrUpdateRooms(req, res) // POST /api/groups/:id/rooms (bulk insert/update)
- updateRoom(req, res) // PUT /api/groups/:id/rooms/:roomId
- deleteRoom(req, res) // DELETE /api/groups/:id/rooms/:roomId

5. group-contact-controller.js

- getContactsByGroup(req, res) // GET /api/groups/:id/contacts
- createContact(req, res) // POST /api/groups/:id/contacts
- updateContact(req, res) // PUT /api/groups/:id/contacts/:contactId
- deleteContact(req, res) // DELETE /api/groups/:id/contacts/:contactId

6. group-history-controller.js

- getHistoryByGroup(req, res) // GET /api/groups/:id/history

7. notification-controller.js

- getMyNotifications(req, res) // GET /api/notifications (del usuario actual)
- getNotificationById(req, res) // GET /api/notifications/:id
- markAsRead(req, res) // PATCH /api/notifications/:id/read
- markAllAsRead(req, res) // PATCH /api/notifications/read-all
- deleteNotification(req, res) // DELETE /api/notifications/:id
- getNotificationsByGroup(req, res) // GET /api/groups/:id/notifications
- createManualNotification(req, res) // POST /api/groups/:id/notifications
