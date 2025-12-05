// ============================================
// PARKING BOOKINGS CONTROLLER
// Versión profesional con booking_code
// ============================================
import ParkingBookingsRepository from '../../repositories/parking/bookings.repository.js'
import { createBookingSchema } from '../../validations/parking/booking-validation.js'
import { getTodayMadrid, getNowMadrid } from '../../config/date-utils.js'

class ParkingBookingsController {
  // ============================================
  // HELPER: Convertir código a ID (uso interno)
  // ============================================
  _getBookingIdFromCode = async (code) => {
    const booking = await ParkingBookingsRepository.findByCode(code)
    if (!booking) {
      throw new Error('Reserva no encontrada')
    }
    return booking.id
  }

  // ============================================
  // GET /parking/bookings
  // Listar reservas con filtros opcionales
  // ============================================
  getBookings = async (req, res) => {
    try {
      const filters = {}

      if (req.query.id) filters.id = parseInt(req.query.id)
      if (req.query.status) filters.status = req.query.status
      if (req.query.date) filters.date = req.query.date
      if (req.query.spot_id) filters.spot_id = parseInt(req.query.spot_id)
      if (req.query.vehicle_id)
        filters.vehicle_id = parseInt(req.query.vehicle_id)
      if (req.query.plate_number) filters.plate_number = req.query.plate_number
      if (req.query.owner_name) filters.owner_name = req.query.owner_name
      if (req.query.booking_source)
        filters.booking_source = req.query.booking_source

      const bookings = await ParkingBookingsRepository.findAll(filters)

      return res.status(200).json({
        success: true,
        total: bookings.length,
        filters: Object.keys(filters).length > 0 ? filters : null,
        bookings,
      })
    } catch (error) {
      console.error('❌ Error en getBookings:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener reservas',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /parking/bookings/:code
  // Obtener una reserva por CÓDIGO
  // ============================================
  getBookingByCode = async (req, res) => {
    try {
      const { code } = req.params

      // Validar formato del código
      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido. Debe ser: PK-YYYYMMDD-####',
          example: 'PK-20251024-0001',
        })
      }

      const booking = await ParkingBookingsRepository.findByCode(code)

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada',
        })
      }

      return res.status(200).json({
        success: true,
        booking,
      })
    } catch (error) {
      console.error('❌ Error en getBookingByCode:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener reserva',
        error: error.message,
      })
    }
  }

  // ============================================
  // POST /parking/bookings
  // Crear nueva reserva
  // ============================================
  createBooking = async (req, res) => {
    try {
      const {
        spot_number,
        level_code,
        vehicle_id,
        expected_checkin,
        expected_checkout,
        total_amount,
        booking_source,
        external_booking_id,
        notes,
      } = req.body

      const validation = createBookingSchema.safeParse({
        spot_number: parseInt(spot_number),
        level_code,
        vehicle_id: vehicle_id ? parseInt(vehicle_id) : undefined,
        expected_checkin,
        expected_checkout,
        total_amount: total_amount ? parseFloat(total_amount) : undefined,
        source: booking_source,
        external_id: external_booking_id,
        notes,
      })

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: validation.error.issues[0].message,
          errors: validation.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
      }

      const data = validation.data

      // Preparar datos para el repository
      const bookingData = {
        spot_number: data.spot_number,
        level_code: data.level_code,
        vehicle_id: data.vehicle_id,
        operator_id: req.user.id,
        expected_checkin: data.expected_checkin,
        expected_checkout: data.expected_checkout,
        total_amount: data.total_amount,
        booking_source: data.source,
        external_booking_id: data.external_id,
        notes: data.notes,
        created_by: req.user.id,
      }

      const booking = await ParkingBookingsRepository.create(bookingData)

      return res.status(201).json({
        success: true,
        message: 'Reserva creada exitosamente',
        booking,
      })
    } catch (error) {
      console.error('❌ Error en createBooking:', error)

      if (
        error.message.includes('no encontrada') ||
        error.message.includes('no está disponible')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Error al crear reserva',
        error: error.message,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/checkin
  // Realizar check-in
  // ============================================
  checkIn = async (req, res) => {
    try {
      const { code } = req.params
      const { actual_checkin, notes } = req.body

      // Validar formato
      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
      }

      // Convertir code → id
      const id = await this._getBookingIdFromCode(code)

      const checkinDate = actual_checkin
        ? new Date(actual_checkin)
        : getNowMadrid().toDate()

      if (actual_checkin && isNaN(checkinDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido',
        })
      }

      const booking = await ParkingBookingsRepository.checkIn(id, checkinDate)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user.id,
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Check-in realizado exitosamente',
        booking,
      })
    } catch (error) {
      console.error('❌ Error en checkIn:', error)

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        })
      }

      if (error.message.includes('No se puede hacer check-in')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Error al realizar check-in',
        error: error.message,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/checkout
  // Realizar check-out
  // ============================================
  checkOut = async (req, res) => {
    try {
      const { code } = req.params
      const {
        actual_checkout,
        payment_amount,
        payment_method,
        payment_reference,
        notes,
      } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
      }

      const id = await this._getBookingIdFromCode(code)

      const checkoutDate = actual_checkout
        ? new Date(actual_checkout)
        : getNowMadrid().toDate()

      if (actual_checkout && isNaN(checkoutDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido',
        })
      }

      const booking = await ParkingBookingsRepository.checkOut(id, {
        actual_checkout: checkoutDate,
        payment_amount: payment_amount ? parseFloat(payment_amount) : null,
        payment_method,
        payment_reference,
      })

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user.id,
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Check-out realizado exitosamente',
        booking,
      })
    } catch (error) {
      console.error('❌ Error en checkOut:', error)

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        })
      }

      if (error.message.includes('No se puede hacer check-out')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Error al realizar check-out',
        error: error.message,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/cancel
  // Cancelar reserva
  // ============================================
  cancelBooking = async (req, res) => {
    try {
      const { code } = req.params
      const { notes } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.cancel(id)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user.id,
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Reserva cancelada exitosamente',
        booking,
      })
    } catch (error) {
      console.error('❌ Error en cancelBooking:', error)

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        })
      }

      if (error.message.includes('No se puede cancelar')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Error al cancelar reserva',
        error: error.message,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/no-show
  // Marcar como no-show
  // ============================================
  markNoShow = async (req, res) => {
    try {
      const { code } = req.params
      const { notes } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.markNoShow(id)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user.id,
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Reserva marcada como no-show exitosamente',
        booking,
      })
    } catch (error) {
      console.error('❌ Error en markNoShow:', error)

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        })
      }

      if (error.message.includes('No se puede marcar')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Error al marcar como no-show',
        error: error.message,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code
  // Actualizar reserva
  // ============================================
  updateBooking = async (req, res) => {
    try {
      const { code } = req.params
      const {
        expected_checkin,
        expected_checkout,
        spot_number,
        level_code,
        vehicle_id,
        total_amount,
        booking_source,
        external_booking_id,
        notes,
      } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
      }

      const id = await this._getBookingIdFromCode(code)

      const existingBooking = await ParkingBookingsRepository.findById(id)

      if (!existingBooking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada',
        })
      }

      if (
        ['completed', 'canceled', 'no_show'].includes(existingBooking.status)
      ) {
        return res.status(400).json({
          success: false,
          message: `No se puede actualizar una reserva con estado '${existingBooking.status}'`,
        })
      }

      // Validar fechas si se proporcionan
      if (expected_checkin || expected_checkout) {
        const checkin = expected_checkin
          ? new Date(expected_checkin)
          : new Date(existingBooking.schedule.expected_checkin)
        const checkout = expected_checkout
          ? new Date(expected_checkout)
          : new Date(existingBooking.schedule.expected_checkout)

        if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido',
          })
        }

        if (checkout <= checkin) {
          return res.status(400).json({
            success: false,
            message: 'La fecha de salida debe ser posterior a la de entrada',
          })
        }
      }

      if (
        total_amount !== undefined &&
        (isNaN(parseFloat(total_amount)) || parseFloat(total_amount) < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: 'total_amount debe ser un número válido y mayor o igual a 0',
        })
      }

      // Preparar datos de actualización
      const updateData = {}
      if (expected_checkin) updateData.expected_checkin = expected_checkin
      if (expected_checkout) updateData.expected_checkout = expected_checkout
      if (spot_number) updateData.spot_number = spot_number
      if (level_code) updateData.level_code = level_code
      if (vehicle_id !== undefined) updateData.vehicle_id = vehicle_id
      if (total_amount !== undefined)
        updateData.total_amount = parseFloat(total_amount)
      if (booking_source) updateData.booking_source = booking_source
      if (external_booking_id !== undefined)
        updateData.external_booking_id = external_booking_id
      if (notes !== undefined) updateData.notes = notes

      updateData.updated_by = req.user.id

      if (Object.keys(updateData).length === 1) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar',
        })
      }

      const booking = await ParkingBookingsRepository.update(id, updateData)

      return res.status(200).json({
        success: true,
        message: 'Reserva actualizada exitosamente',
        booking,
      })
    } catch (error) {
      console.error('❌ Error en updateBooking:', error)

      if (error.message.includes('no encontrada')) {
        return res.status(404).json({
          success: false,
          message: error.message,
        })
      }

      if (error.message.includes('no está disponible')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        })
      }

      return res.status(500).json({
        success: false,
        message: 'Error al actualizar reserva',
        error: error.message,
      })
    }
  }

  // ============================================
  // DELETE /parking/bookings/:code
  // Eliminar reserva
  // ============================================
  deleteBooking = async (req, res) => {
    try {
      const { code } = req.params

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.findById(id)

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Reserva no encontrada',
        })
      }

      if (booking.status !== 'reserved') {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar una reserva con estado '${booking.status}'. Use cancelar en su lugar.`,
        })
      }

      const now = getNowMadrid().toDate()
      const checkin = new Date(booking.schedule.expected_checkin)

      if (now >= checkin) {
        return res.status(400).json({
          success: false,
          message:
            'No se puede eliminar una reserva que ya debería haber comenzado',
        })
      }

      await ParkingBookingsRepository.delete(id)

      return res.status(200).json({
        success: true,
        message: 'Reserva eliminada exitosamente',
      })
    } catch (error) {
      console.error('❌ Error en deleteBooking:', error)

      return res.status(500).json({
        success: false,
        message: 'Error al eliminar reserva',
        error: error.message,
      })
    }
  }

  // ============================================
  // GET /parking/bookings/overdue/list
  // Reservas retrasadas
  // ============================================
  getOverdueCheckins = async (req, res) => {
    try {
      const bookings = await ParkingBookingsRepository.findOverdue()

      return res.status(200).json({
        success: true,
        total: bookings.length,
        bookings,
      })
    } catch (error) {
      console.error('❌ Error en getOverdueCheckins:', error)
      return res.status(500).json({
        success: false,
        message: 'Error al obtener reservas retrasadas',
        error: error.message,
      })
    }
  }
}

export default new ParkingBookingsController()
