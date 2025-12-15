// ============================================
// PARKING BOOKINGS CONTROLLER
// Versión profesional con booking_code
// ============================================
import { Request, Response } from 'express'
import ParkingBookingsRepository from '../../repositories/parking/bookings.repository.js'
import { createBookingSchema } from '../../validations/parking/booking-validation.js'
import { getNowMadrid } from '../../config/date-utils.js'
import type { BookingFilters, UpdateBookingDTO } from '../../models/parking/index.js'

class ParkingBookingsController {
  // ============================================
  // HELPER: Convertir código a ID (uso interno)
  // ============================================
  _getBookingIdFromCode = async (code: string): Promise<number> => {
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
  getBookings = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: BookingFilters = {}

      if (req.query.id) filters.id = parseInt(String(req.query.id))
      if (req.query.status) filters.status = req.query.status as BookingFilters['status']
      if (req.query.date) filters.date = String(req.query.date)
      if (req.query.spot_id) filters.spot_id = parseInt(String(req.query.spot_id))
      if (req.query.vehicle_id) filters.vehicle_id = parseInt(String(req.query.vehicle_id))
      if (req.query.plate_number) filters.plate_number = String(req.query.plate_number)
      if (req.query.owner_name) filters.owner_name = String(req.query.owner_name)
      if (req.query.booking_source)
        filters.booking_source = req.query.booking_source as BookingFilters['booking_source']

      const bookings = await ParkingBookingsRepository.findAll(filters)

      res.status(200).json({
        success: true,
        total: bookings.length,
        filters: Object.keys(filters).length > 0 ? filters : null,
        bookings,
      })
    } catch (error) {
      console.error('Error en getBookings:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener reservas',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /parking/bookings/:code
  // Obtener una reserva por CÓDIGO
  // ============================================
  getBookingByCode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params

      // Validar formato del código
      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido. Debe ser: PK-YYYYMMDD-####',
          example: 'PK-20251024-0001',
        })
        return
      }

      const booking = await ParkingBookingsRepository.findByCode(code)

      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Reserva no encontrada',
        })
        return
      }

      res.status(200).json({
        success: true,
        booking,
      })
    } catch (error) {
      console.error('Error en getBookingByCode:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener reserva',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // POST /parking/bookings
  // Crear nueva reserva
  // ============================================
  createBooking = async (req: Request, res: Response): Promise<void> => {
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
        res.status(400).json({
          success: false,
          message: validation.error.issues[0].message,
          errors: validation.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
        return
      }

      const data = validation.data

      // Preparar datos para el repository
      const bookingData = {
        spot_number: data.spot_number,
        level_code: data.level_code as '-2' | '-3',
        vehicle_id: data.vehicle_id,
        operator_id: parseInt(req.user!.id),
        expected_checkin: data.expected_checkin,
        expected_checkout: data.expected_checkout,
        total_amount: data.total_amount,
        booking_source: data.booking_source as
          | 'direct'
          | 'booking.com'
          | 'expedia'
          | 'other'
          | undefined,
        external_booking_id: data.external_booking_id,
        notes: data.notes,
        created_by: parseInt(req.user!.id),
      }

      const booking = await ParkingBookingsRepository.create(bookingData)

      res.status(201).json({
        success: true,
        message: 'Reserva creada exitosamente',
        booking,
      })
    } catch (error) {
      console.error('Error en createBooking:', error)
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada') || errorMessage.includes('no está disponible')) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear reserva',
        error: errorMessage,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/checkin
  // Realizar check-in
  // ============================================
  checkIn = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params
      const { actual_checkin, notes } = req.body

      // Validar formato
      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
        return
      }

      // Convertir code → id
      const id = await this._getBookingIdFromCode(code)

      const checkinDate = actual_checkin ? new Date(actual_checkin) : getNowMadrid().toDate()

      if (actual_checkin && isNaN(checkinDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido',
        })
        return
      }

      const booking = await ParkingBookingsRepository.checkIn(id, checkinDate)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: parseInt(req.user!.id),
        })
      }

      res.status(200).json({
        success: true,
        message: 'Check-in realizado exitosamente',
        booking,
      })
    } catch (error) {
      console.error('Error en checkIn:', error)
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada')) {
        res.status(404).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      if (errorMessage.includes('No se puede hacer check-in')) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Error al realizar check-in',
        error: errorMessage,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/checkout
  // Realizar check-out
  // ============================================
  checkOut = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params
      const { actual_checkout, payment_amount, payment_method, payment_reference, notes } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const checkoutDate = actual_checkout ? new Date(actual_checkout) : getNowMadrid().toDate()

      if (actual_checkout && isNaN(checkoutDate.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Formato de fecha inválido',
        })
        return
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
          updated_by: parseInt(req.user!.id),
        })
      }

      res.status(200).json({
        success: true,
        message: 'Check-out realizado exitosamente',
        booking,
      })
    } catch (error) {
      console.error('Error en checkOut:', error)
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada')) {
        res.status(404).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      if (errorMessage.includes('No se puede hacer check-out')) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Error al realizar check-out',
        error: errorMessage,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/cancel
  // Cancelar reserva
  // ============================================
  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params
      const { notes } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.cancel(id)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: parseInt(req.user!.id),
        })
      }

      res.status(200).json({
        success: true,
        message: 'Reserva cancelada exitosamente',
        booking,
      })
    } catch (error) {
      console.error('Error en cancelBooking:', error)
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada')) {
        res.status(404).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      if (errorMessage.includes('No se puede cancelar')) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Error al cancelar reserva',
        error: errorMessage,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code/no-show
  // Marcar como no-show
  // ============================================
  markNoShow = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params
      const { notes } = req.body

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.markNoShow(id)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: parseInt(req.user!.id),
        })
      }

      res.status(200).json({
        success: true,
        message: 'Reserva marcada como no-show exitosamente',
        booking,
      })
    } catch (error) {
      console.error('Error en markNoShow:', error)
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada')) {
        res.status(404).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      if (errorMessage.includes('No se puede marcar')) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Error al marcar como no-show',
        error: errorMessage,
      })
    }
  }

  // ============================================
  // PUT /parking/bookings/:code
  // Actualizar reserva
  // ============================================
  updateBooking = async (req: Request, res: Response): Promise<void> => {
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
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const existingBooking = await ParkingBookingsRepository.findById(id)

      if (!existingBooking) {
        res.status(404).json({
          success: false,
          message: 'Reserva no encontrada',
        })
        return
      }

      if (['completed', 'canceled', 'no_show'].includes(existingBooking.status)) {
        res.status(400).json({
          success: false,
          message: `No se puede actualizar una reserva con estado '${existingBooking.status}'`,
        })
        return
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
          res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido',
          })
          return
        }

        if (checkout <= checkin) {
          res.status(400).json({
            success: false,
            message: 'La fecha de salida debe ser posterior a la de entrada',
          })
          return
        }
      }

      if (
        total_amount !== undefined &&
        (isNaN(parseFloat(total_amount)) || parseFloat(total_amount) < 0)
      ) {
        res.status(400).json({
          success: false,
          message: 'total_amount debe ser un número válido y mayor o igual a 0',
        })
        return
      }

      // Preparar datos de actualización
      const updateData: UpdateBookingDTO = {}
      if (expected_checkin) updateData.expected_checkin = expected_checkin
      if (expected_checkout) updateData.expected_checkout = expected_checkout
      if (spot_number) updateData.spot_number = spot_number
      if (level_code) updateData.level_code = level_code
      if (vehicle_id !== undefined) updateData.vehicle_id = vehicle_id
      if (total_amount !== undefined) updateData.total_amount = parseFloat(total_amount)
      if (booking_source) updateData.booking_source = booking_source
      if (external_booking_id !== undefined) updateData.external_booking_id = external_booking_id
      if (notes !== undefined) updateData.notes = notes

      updateData.updated_by = parseInt(req.user!.id)

      if (Object.keys(updateData).length === 1) {
        res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar',
        })
        return
      }

      const booking = await ParkingBookingsRepository.update(id, updateData)

      res.status(200).json({
        success: true,
        message: 'Reserva actualizada exitosamente',
        booking,
      })
    } catch (error) {
      console.error('Error en updateBooking:', error)
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada')) {
        res.status(404).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      if (errorMessage.includes('no está disponible')) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        message: 'Error al actualizar reserva',
        error: errorMessage,
      })
    }
  }

  // ============================================
  // DELETE /parking/bookings/:code
  // Eliminar reserva
  // ============================================
  deleteBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Formato de código inválido',
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.findById(id)

      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Reserva no encontrada',
        })
        return
      }

      if (booking.status !== 'reserved') {
        res.status(400).json({
          success: false,
          message: `No se puede eliminar una reserva con estado '${booking.status}'. Use cancelar en su lugar.`,
        })
        return
      }

      const now = getNowMadrid().toDate()
      const checkin = new Date(booking.schedule.expected_checkin)

      if (now >= checkin) {
        res.status(400).json({
          success: false,
          message: 'No se puede eliminar una reserva que ya debería haber comenzado',
        })
        return
      }

      await ParkingBookingsRepository.delete(id)

      res.status(200).json({
        success: true,
        message: 'Reserva eliminada exitosamente',
      })
    } catch (error) {
      console.error('Error en deleteBooking:', error)

      res.status(500).json({
        success: false,
        message: 'Error al eliminar reserva',
        error: (error as Error).message,
      })
    }
  }

  // ============================================
  // GET /parking/bookings/overdue/list
  // Reservas retrasadas
  // ============================================
  getOverdueCheckins = async (_req: Request, res: Response): Promise<void> => {
    try {
      const bookings = await ParkingBookingsRepository.findOverdue()

      res.status(200).json({
        success: true,
        total: bookings.length,
        bookings,
      })
    } catch (error) {
      console.error('Error en getOverdueCheckins:', error)
      res.status(500).json({
        success: false,
        message: 'Error al obtener reservas retrasadas',
        error: (error as Error).message,
      })
    }
  }
}

export default new ParkingBookingsController()
