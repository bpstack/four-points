// ============================================
// PARKING BOOKINGS CONTROLLER
// Versión profesional con booking_code
// ============================================
import { Request, Response } from 'express'
import ParkingBookingsRepository from '../../repositories/parking/bookings.repository.js'
import {
  bookingsPageSchema,
  createBookingSchema,
  updateBookingBodySchema,
} from '../../validations/parking/booking-validation.js'
import { getNowMadrid } from '../../config/date-utils.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import type { BookingFilters, BookingSource, UpdateBookingDTO } from '../../models/parking/index.js'
import { logger } from '../../config/logger.js'
import { isCalendarDate } from '../../validations/common/calendar-date.js'

class ParkingBookingsController {
  // ============================================
  // HELPER: Convertir código a ID (uso interno)
  // ============================================
  _getBookingIdFromCode = async (code: string): Promise<number> => {
    const booking = await ParkingBookingsRepository.findByCode(code)
    if (!booking) {
      throw new Error(ERROR_CODES.PARKING_BOOKING_NOT_FOUND)
    }
    return booking.id
  }

  // ============================================
  // GET /parking/bookings
  // Listar reservas con filtros opcionales y paginación
  // ============================================
  getBookings = async (req: Request, res: Response): Promise<void> => {
    try {
      const paging = bookingsPageSchema.safeParse({
        page: req.query.page || undefined,
        limit: req.query.limit || undefined,
      })
      if (!paging.success) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.INVALID_DATA,
          code: ERROR_CODES.INVALID_DATA,
        })
        return
      }
      const { page, limit } = paging.data

      // Priority 1: quickFilter (filtros compuestos del dashboard)
      if (req.query.quickFilter) {
        const quickFilter = String(req.query.quickFilter)

        const result = await ParkingBookingsRepository.findByQuickFilter(quickFilter, page, limit)

        res.status(200).json({
          success: true,
          total: result.pagination.total,
          pagination: result.pagination,
          quickFilter,
          bookings: result.bookings,
        })
        return
      }

      // Priority 2: dateFilter (filtro por rango de fechas)
      if (req.query.startDate) {
        const startDate = String(req.query.startDate)
        const endDate = req.query.endDate ? String(req.query.endDate) : undefined
        const status = req.query.status as BookingFilters['status'] | undefined

        // Validar formato de fechas (YYYY-MM-DD)
        if (!isCalendarDate(startDate)) {
          res.status(400).json({
            success: false,
            error: ERROR_CODES.PARKING_INVALID_START_DATE,
            code: ERROR_CODES.PARKING_INVALID_START_DATE,
          })
          return
        }
        if (endDate && !isCalendarDate(endDate)) {
          res.status(400).json({
            success: false,
            error: ERROR_CODES.PARKING_INVALID_END_DATE,
            code: ERROR_CODES.PARKING_INVALID_END_DATE,
          })
          return
        }

        const result = await ParkingBookingsRepository.findByDateFilter(
          startDate,
          endDate,
          status,
          page,
          limit
        )

        res.status(200).json({
          success: true,
          total: result.pagination.total,
          pagination: result.pagination,
          dateFilter: { startDate, endDate: endDate || null, status: status || null },
          bookings: result.bookings,
        })
        return
      }

      // Priority 3: Standard filters (findAll)
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

      // Pagination params
      filters.page = page
      filters.limit = limit

      const result = await ParkingBookingsRepository.findAll(filters)

      res.status(200).json({
        success: true,
        total: result.pagination.total,
        pagination: result.pagination,
        filters:
          Object.keys(filters).filter((k) => !['page', 'limit'].includes(k)).length > 0
            ? Object.fromEntries(
                Object.entries(filters).filter(([k]) => !['page', 'limit'].includes(k))
              )
            : null,
        bookings: result.bookings,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getBookings:')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_FETCH_BOOKINGS_ERROR,
        code: ERROR_CODES.PARKING_FETCH_BOOKINGS_ERROR,
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
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      const booking = await ParkingBookingsRepository.findByCode(code)

      if (!booking) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      res.status(200).json({
        success: true,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getBookingByCode:')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_FETCH_BOOKING_ERROR,
        code: ERROR_CODES.PARKING_FETCH_BOOKING_ERROR,
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
        operator_id: req.user!.id, // UUID string, no parseInt
        expected_checkin: data.expected_checkin,
        expected_checkout: data.expected_checkout,
        total_amount: data.total_amount,
        booking_source: data.booking_source as BookingSource | undefined,
        external_booking_id: data.external_booking_id,
        notes: data.notes,
        created_by: req.user!.id, // UUID string, no parseInt
      }

      const booking = await ParkingBookingsRepository.create(bookingData)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.PARKING_BOOKING_CREATED,
        code: SUCCESS_CODES.PARKING_BOOKING_CREATED,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en createBooking:')
      const errorMessage = (error as Error).message

      if (errorMessage.includes('no encontrada') || errorMessage.includes('no está disponible')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_CREATE_BOOKING_ERROR,
        code: ERROR_CODES.PARKING_CREATE_BOOKING_ERROR,
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
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      // Convertir code → id
      const id = await this._getBookingIdFromCode(code)

      const checkinDate = actual_checkin ? new Date(actual_checkin) : getNowMadrid().toDate()

      if (actual_checkin && isNaN(checkinDate.getTime())) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_INVALID_DATE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_DATE_FORMAT,
        })
        return
      }

      const booking = await ParkingBookingsRepository.checkIn(id, checkinDate)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user!.id,
        })
      }

      res.status(200).json({
        success: true,
        message: SUCCESS_CODES.PARKING_CHECKIN_SUCCESS,
        code: SUCCESS_CODES.PARKING_CHECKIN_SUCCESS,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en checkIn:')
      const errorMessage = (error as Error).message

      if (
        errorMessage === ERROR_CODES.PARKING_BOOKING_NOT_FOUND ||
        errorMessage === 'Reserva no encontrada'
      ) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      if (
        errorMessage.includes('No se puede hacer check-in') ||
        errorMessage.includes('estado actual es')
      ) {
        res.status(400).json({
          success: false,
          error: errorMessage,
          code: 'PARKING_CHECKIN_INVALID_STATUS',
        })
        return
      }

      if (errorMessage.includes('plaza ya está ocupada')) {
        res.status(409).json({
          success: false,
          error: errorMessage,
          code: 'PARKING_SPOT_OCCUPIED',
        })
        return
      }

      // Log detallado para debugging
      logger.error(
        { message: errorMessage, stack: (error as Error).stack },
        'Error no manejado en checkIn'
      )

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_CHECKIN_ERROR,
        code: ERROR_CODES.PARKING_CHECKIN_ERROR,
        debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
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
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const checkoutDate = actual_checkout ? new Date(actual_checkout) : getNowMadrid().toDate()

      if (actual_checkout && isNaN(checkoutDate.getTime())) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_INVALID_DATE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_DATE_FORMAT,
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
          updated_by: req.user!.id,
        })
      }

      res.status(200).json({
        success: true,
        message: SUCCESS_CODES.PARKING_CHECKOUT_SUCCESS,
        code: SUCCESS_CODES.PARKING_CHECKOUT_SUCCESS,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en checkOut:')
      const errorMessage = (error as Error).message

      if (errorMessage === ERROR_CODES.PARKING_BOOKING_NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      if (errorMessage.includes('No se puede hacer check-out')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_CHECKOUT_ERROR,
        code: ERROR_CODES.PARKING_CHECKOUT_ERROR,
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
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.cancel(id)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user!.id,
        })
      }

      res.status(200).json({
        success: true,
        message: SUCCESS_CODES.PARKING_BOOKING_CANCELLED,
        code: SUCCESS_CODES.PARKING_BOOKING_CANCELLED,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en cancelBooking:')
      const errorMessage = (error as Error).message

      if (errorMessage === ERROR_CODES.PARKING_BOOKING_NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      if (errorMessage.includes('No se puede cancelar')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_CANCEL_ERROR,
        code: ERROR_CODES.PARKING_CANCEL_ERROR,
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
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.markNoShow(id)

      if (notes && booking) {
        await ParkingBookingsRepository.update(id, {
          notes,
          updated_by: req.user!.id,
        })
      }

      res.status(200).json({
        success: true,
        message: SUCCESS_CODES.PARKING_NOSHOW_SUCCESS,
        code: SUCCESS_CODES.PARKING_NOSHOW_SUCCESS,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en markNoShow:')
      const errorMessage = (error as Error).message

      if (errorMessage === ERROR_CODES.PARKING_BOOKING_NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      if (errorMessage.includes('No se puede marcar')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_NOSHOW_ERROR,
        code: ERROR_CODES.PARKING_NOSHOW_ERROR,
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
      const parsedBody = updateBookingBodySchema.safeParse(req.body)
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          message: parsedBody.error.issues[0].message,
          errors: parsedBody.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        })
        return
      }
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
        // Payment fields
        payment_amount,
        payment_method,
        payment_reference,
      } = parsedBody.data

      if (!/^PK-\d{8}-\d{4}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const existingBooking = await ParkingBookingsRepository.findById(id)

      if (!existingBooking) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      const hasOtherUpdates =
        expected_checkin ||
        expected_checkout ||
        spot_number ||
        level_code ||
        vehicle_id !== undefined ||
        total_amount !== undefined ||
        booking_source ||
        external_booking_id !== undefined ||
        notes !== undefined

      // For non-payment updates, restrict to reserved/checked_in status
      if (
        hasOtherUpdates &&
        ['completed', 'canceled', 'no_show'].includes(existingBooking.status)
      ) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_CANNOT_UPDATE_STATUS,
          code: ERROR_CODES.PARKING_CANNOT_UPDATE_STATUS,
        })
        return
      }

      // Payment updates are allowed in ALL statuses (reserved, checked_in, completed, canceled, no_show)

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
            error: ERROR_CODES.PARKING_INVALID_DATE_FORMAT,
            code: ERROR_CODES.PARKING_INVALID_DATE_FORMAT,
          })
          return
        }

        if (checkout <= checkin) {
          res.status(400).json({
            success: false,
            error: ERROR_CODES.PARKING_END_BEFORE_START,
            code: ERROR_CODES.PARKING_END_BEFORE_START,
          })
          return
        }
      }

      if (total_amount !== undefined && (total_amount === null || total_amount < 0)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_INVALID_AMOUNT,
          code: ERROR_CODES.PARKING_INVALID_AMOUNT,
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
      if (total_amount !== undefined && total_amount !== null)
        updateData.total_amount = total_amount
      if (booking_source) updateData.booking_source = booking_source as BookingSource
      if (external_booking_id !== undefined) updateData.external_booking_id = external_booking_id
      if (notes !== undefined) updateData.notes = notes

      // Payment fields
      if (payment_amount !== undefined) {
        updateData.payment_amount = payment_amount
      }
      if (payment_method !== undefined) updateData.payment_method = payment_method
      if (payment_reference !== undefined) updateData.payment_reference = payment_reference

      updateData.updated_by = req.user!.id

      if (Object.keys(updateData).length === 1) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_NO_FIELDS_TO_UPDATE,
          code: ERROR_CODES.PARKING_NO_FIELDS_TO_UPDATE,
        })
        return
      }

      const booking = await ParkingBookingsRepository.update(id, updateData)

      res.status(200).json({
        success: true,
        message: SUCCESS_CODES.PARKING_BOOKING_UPDATED,
        code: SUCCESS_CODES.PARKING_BOOKING_UPDATED,
        booking,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en updateBooking:')
      const errorMessage = (error as Error).message

      if (errorMessage === ERROR_CODES.PARKING_BOOKING_NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      if (errorMessage.includes('no está disponible')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_UPDATE_BOOKING_ERROR,
        code: ERROR_CODES.PARKING_UPDATE_BOOKING_ERROR,
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
          error: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
          code: ERROR_CODES.PARKING_INVALID_CODE_FORMAT,
        })
        return
      }

      const id = await this._getBookingIdFromCode(code)

      const booking = await ParkingBookingsRepository.findById(id)

      if (!booking) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      if (booking.status !== 'reserved') {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_CANNOT_DELETE_STATUS,
          code: ERROR_CODES.PARKING_CANNOT_DELETE_STATUS,
        })
        return
      }

      const now = getNowMadrid().toDate()
      const checkin = new Date(booking.schedule.expected_checkin)

      if (now >= checkin) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.PARKING_CANNOT_DELETE_STARTED,
          code: ERROR_CODES.PARKING_CANNOT_DELETE_STARTED,
        })
        return
      }

      await ParkingBookingsRepository.delete(id)

      res.status(200).json({
        success: true,
        message: SUCCESS_CODES.PARKING_BOOKING_DELETED,
        code: SUCCESS_CODES.PARKING_BOOKING_DELETED,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en deleteBooking:')
      const errorMessage = (error as Error).message

      if (errorMessage === ERROR_CODES.PARKING_BOOKING_NOT_FOUND) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
          code: ERROR_CODES.PARKING_BOOKING_NOT_FOUND,
        })
        return
      }

      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_DELETE_BOOKING_ERROR,
        code: ERROR_CODES.PARKING_DELETE_BOOKING_ERROR,
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
      logger.error({ err: error }, 'Error en getOverdueCheckins:')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.PARKING_FETCH_DELAYED_ERROR,
        code: ERROR_CODES.PARKING_FETCH_DELAYED_ERROR,
      })
    }
  }
}

export default new ParkingBookingsController()
