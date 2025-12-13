// ============================================
// PARKING BOOKINGS ROUTES
// Versión profesional con booking_code
// ============================================
import { Router } from 'express'
import ParkingBookingsController from '../../controllers/parking/bookings.controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// ============================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================
router.use(authenticateToken)

// ============================================
// 1️ RUTAS ESPECÍFICAS PRIMERO (sin :code)
// ============================================

/**
 * GET /parking/bookings/overdue/list
 * Listar reservas con check-out expirado
 */
router.get('/overdue/list', ParkingBookingsController.getOverdueCheckins)

// ============================================
// 2️ RUTAS GENERALES (sin :code)
// ============================================

/**
 * GET /parking/bookings
 * Listar reservas con filtros opcionales
 * Query params:
 *   - status: reserved|checked_in|completed|canceled|no_show
 *   - date: fecha (filtra bookings activos en esa fecha)
 *   - spot_id: ID de plaza
 *   - vehicle_id: ID de vehículo
 *   - plate_number: matrícula (búsqueda)
 *   - owner_name: nombre propietario (búsqueda)
 *   - booking_source: direct|booking_com|expedia|airbnb|agency_other
 */
router.get('/', ParkingBookingsController.getBookings)

/**
 * POST /parking/bookings
 * Crear nueva reserva
 * Body: {
 *   spot_number: número de plaza,
 *   level_code: "-2" o "-3",
 *   vehicle_id: ID (opcional),
 *   expected_checkin: "2025-10-25 15:00",
 *   expected_checkout: "2025-10-27 11:00",
 *   total_amount: 27.00 (opcional),
 *   booking_source: "direct" (default),
 *   external_booking_id: "BK123" (opcional),
 *   notes: "texto" (opcional)
 * }
 *
 * Response incluye booking_code generado automáticamente:
 * { booking_code: "PK-20251024-0001", ... }
 */
router.post('/', ParkingBookingsController.createBooking)

// ============================================
// 3️ RUTAS CON :code (código público)
// ============================================

/**
 * GET /parking/bookings/:code
 * Obtener una reserva específica por CÓDIGO
 *
 * Ejemplo: GET /parking/bookings/PK-20251024-0001
 */
router.get('/:code', ParkingBookingsController.getBookingByCode)

/**
 * PUT /parking/bookings/:code
 * Actualizar datos de una reserva
 *
 * Ejemplo: PUT /parking/bookings/PK-20251024-0001
 * Body: {
 *   expected_checkin: "2025-10-25 16:00" (opcional),
 *   expected_checkout: "2025-10-28 11:00" (opcional),
 *   spot_number: 5 (opcional),
 *   level_code: "-3" (opcional),
 *   vehicle_id: 10 (opcional),
 *   total_amount: 39.00 (opcional),
 *   booking_source: "expedia" (opcional),
 *   external_booking_id: "EXP456" (opcional),
 *   notes: "cambio de fechas" (opcional)
 * }
 */
router.put('/:code', ParkingBookingsController.updateBooking)

/**
 * DELETE /parking/bookings/:code
 * Eliminar una reserva (solo si status = reserved y no ha empezado)
 *
 * Ejemplo: DELETE /parking/bookings/PK-20251024-0001
 */
router.delete('/:code', ParkingBookingsController.deleteBooking)

// ============================================
// 4️ SUB-RUTAS CON :code
// ============================================

/**
 * PUT /parking/bookings/:code/checkin
 * Realizar check-in de una reserva
 *
 * Ejemplo: PUT /parking/bookings/PK-20251024-0001/checkin
 * Body: {
 *   actual_checkin: "2025-10-25 14:30" (opcional, default: NOW()),
 *   notes: "llegó antes" (opcional)
 * }
 */
router.put('/:code/checkin', ParkingBookingsController.checkIn)

/**
 * PUT /parking/bookings/:code/checkout
 * Realizar check-out de una reserva
 *
 * Ejemplo: PUT /parking/bookings/PK-20251024-0001/checkout
 * Body: {
 *   actual_checkout: "2025-10-27 10:45" (opcional, default: NOW()),
 *   payment_amount: 27.00 (opcional),
 *   payment_method: "cash|card|transfer|agency" (opcional),
 *   payment_reference: "REF123" (opcional),
 *   notes: "todo ok" (opcional)
 * }
 */
router.put('/:code/checkout', ParkingBookingsController.checkOut)

/**
 * PUT /parking/bookings/:code/cancel
 * Cancelar una reserva
 *
 * Ejemplo: PUT /parking/bookings/PK-20251024-0001/cancel
 * Body: {
 *   notes: "cliente canceló" (opcional)
 * }
 */
router.put('/:code/cancel', ParkingBookingsController.cancelBooking)

/**
 * PUT /parking/bookings/:code/no-show
 * Marcar como no-show (no se presentó)
 *
 * Ejemplo: PUT /parking/bookings/PK-20251024-0001/no-show
 * Body: {
 *   notes: "no apareció" (opcional)
 * }
 */
router.put('/:code/no-show', ParkingBookingsController.markNoShow)

export default router
