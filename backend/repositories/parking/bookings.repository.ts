// ============================================
// PARKING BOOKINGS REPOSITORY
// Versión profesional con booking_code
// ============================================
import pool from '../../config/db.js'
import { targetSpot, type SpotRef } from '../../services/parking/target-spot.js'
import { ResultSetHeader, RowDataPacket, type PoolConnection } from 'mysql2/promise'
import type {
  BookingWithDetailsRow,
  OverdueBookingRow,
  ParkingBookingRow,
  BookingFilters,
  FormattedBooking,
  FormattedOverdueBooking,
  CreateBookingDTO,
  UpdateBookingDTO,
  CheckoutDTO,
  PaginatedBookingsResult,
  BookingStatus,
} from '../../models/parking/index.js'
import { likeContains } from '../shared/like.js'

interface CountRow extends RowDataPacket {
  total: number
}

interface SpotIdRow extends RowDataPacket {
  id: number
}

interface CurrentSpotRow extends RowDataPacket, SpotRef {}

interface OverlapCountRow extends RowDataPacket {
  overlapping: number
}

interface RatePriceRow extends RowDataPacket {
  price: number
}

interface OccupiedCountRow extends RowDataPacket {
  count: number
}

class ParkingBookingsRepository {
  /**
   * Throws if another active booking holds the spot on any of the days
   * [DATE(checkin), DATE(checkout)), the same days the calendar blocks.
   * Locks the spot row first, so two requests for the same spot run one after
   * the other inside their transactions instead of both passing the check.
   * Reads the bookings, not parking_availability: the calendar can be missing
   * days or out of sync, the bookings are the source of truth.
   */
  async _assertSpotFree(
    connection: PoolConnection,
    spotId: number,
    checkin: string | Date,
    checkout: string | Date,
    excludeBookingId: number | null,
    message = 'La plaza no está disponible en las fechas seleccionadas'
  ): Promise<void> {
    await connection.query('SELECT id FROM parking_spots WHERE id = ? FOR UPDATE', [spotId])

    const [rows] = await connection.query<OverlapCountRow[]>(
      `SELECT COUNT(*) AS overlapping
      FROM parking_bookings
      WHERE spot_id = ?
        AND id <> ?
        AND status IN ('reserved', 'checked_in')
        AND DATE(expected_checkin) < DATE(?)
        AND DATE(expected_checkout) > DATE(?)`,
      [spotId, excludeBookingId ?? 0, checkout, checkin]
    )

    if (rows[0].overlapping > 0) {
      throw new Error(message)
    }
  }

  // ============================================
  // HELPER: Calcular días entre fechas
  // ============================================
  _calculateBookingDays(checkinDate: string | Date, checkoutDate: string | Date): number {
    const checkin = new Date(checkinDate)
    const checkout = new Date(checkoutDate)

    const checkinDay = new Date(checkin.getFullYear(), checkin.getMonth(), checkin.getDate())
    const checkoutDay = new Date(checkout.getFullYear(), checkout.getMonth(), checkout.getDate())

    const diffTime = checkoutDay.getTime() - checkinDay.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return Math.max(1, diffDays)
  }

  // ============================================
  // GET ALL BOOKINGS (con filtros opcionales y paginación)
  // ============================================
  async findAll(filters: BookingFilters = {}): Promise<PaginatedBookingsResult> {
    // Extract pagination params
    const page = filters.page && filters.page > 0 ? filters.page : 1
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, 500) : 50
    const offset = (page - 1) * limit

    // Build WHERE conditions
    let whereClause = 'WHERE 1=1'
    const params: (string | number)[] = []

    if (filters.id) {
      whereClause += ' AND b.id = ?'
      params.push(filters.id)
    }

    if (filters.status) {
      whereClause += ' AND b.status = ?'
      params.push(filters.status)
    }

    if (filters.date) {
      whereClause += ' AND DATE(b.expected_checkin) <= ? AND DATE(b.expected_checkout) > ?'
      params.push(filters.date, filters.date)
    }

    if (filters.spot_id) {
      whereClause += ' AND b.spot_id = ?'
      params.push(filters.spot_id)
    }

    if (filters.vehicle_id) {
      whereClause += ' AND b.vehicle_id = ?'
      params.push(filters.vehicle_id)
    }

    if (filters.plate_number) {
      whereClause += ' AND v.plate_number LIKE ?'
      params.push(likeContains(filters.plate_number))
    }

    if (filters.owner_name) {
      whereClause += ' AND v.owner_name LIKE ?'
      params.push(likeContains(filters.owner_name))
    }

    if (filters.booking_source) {
      whereClause += ' AND b.booking_source = ?'
      params.push(filters.booking_source)
    }

    // Count total records
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      ${whereClause}
    `
    const [countResult] = await pool.query<CountRow[]>(countQuery, params)
    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    // Main query with pagination
    const query = `
      SELECT 
        b.id,
        b.booking_code,
        b.spot_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        b.vehicle_id,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.operator_id,
        u.username AS operator_name,
        b.expected_checkin,
        b.expected_checkout,
        b.actual_checkin,
        b.actual_checkout,
        b.status,
        b.total_amount,
        b.payment_amount,
        b.payment_method,
        b.payment_reference,
        b.payment_date,
        b.booking_source,
        b.external_booking_id,
        b.notes,
        b.created_at,
        b.updated_at,
        b.created_by,
        b.updated_by,
        creator.username AS created_by_name,
        updater.username AS updated_by_name,
        DATEDIFF(DATE(b.expected_checkout), DATE(b.expected_checkin)) AS planned_days,
        CASE 
          WHEN b.actual_checkin IS NOT NULL AND b.actual_checkout IS NOT NULL 
          THEN DATEDIFF(DATE(b.actual_checkout), DATE(b.actual_checkin))
          WHEN b.actual_checkin IS NOT NULL 
          THEN DATEDIFF(CURDATE(), DATE(b.actual_checkin))
          ELSE NULL
        END AS actual_days
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.operator_id = u.id
      LEFT JOIN users creator ON b.created_by = creator.id
      LEFT JOIN users updater ON b.updated_by = updater.id
      ${whereClause}
      ORDER BY b.expected_checkin DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `

    const [rows] = await pool.query<BookingWithDetailsRow[]>(query, [...params, limit, offset])

    return {
      bookings: rows.map((row) => this._formatBooking(row)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }
  }

  // ============================================
  // GET BOOKING BY ID (interno)
  // ============================================
  async findById(id: number): Promise<FormattedBooking | null> {
    const result = await this.findAll({ id, limit: 1 })
    return result.bookings.length > 0 ? result.bookings[0] : null
  }

  // ============================================
  // GET BOOKING BY CODE (público)
  // ============================================
  async findByCode(bookingCode: string): Promise<FormattedBooking | null> {
    const [rows] = await pool.query<BookingWithDetailsRow[]>(
      `SELECT 
        b.id,
        b.booking_code,
        b.spot_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        b.vehicle_id,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.operator_id,
        u.username AS operator_name,
        b.expected_checkin,
        b.expected_checkout,
        b.actual_checkin,
        b.actual_checkout,
        b.status,
        b.total_amount,
        b.payment_amount,
        b.payment_method,
        b.payment_reference,
        b.payment_date,
        b.booking_source,
        b.external_booking_id,
        b.notes,
        b.created_at,
        b.updated_at,
        b.created_by,
        b.updated_by,
        creator.username AS created_by_name,
        updater.username AS updated_by_name,
        DATEDIFF(DATE(b.expected_checkout), DATE(b.expected_checkin)) AS planned_days,
        CASE 
          WHEN b.actual_checkin IS NOT NULL AND b.actual_checkout IS NOT NULL 
          THEN DATEDIFF(DATE(b.actual_checkout), DATE(b.actual_checkin))
          WHEN b.actual_checkin IS NOT NULL 
          THEN DATEDIFF(CURDATE(), DATE(b.actual_checkin))
          ELSE NULL
        END AS actual_days
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.operator_id = u.id
      LEFT JOIN users creator ON b.created_by = creator.id
      LEFT JOIN users updater ON b.updated_by = updater.id
      WHERE b.booking_code = ?`,
      [bookingCode]
    )

    return rows.length > 0 ? this._formatBooking(rows[0]) : null
  }

  // ============================================
  // CREATE BOOKING
  // ============================================
  async create(bookingData: CreateBookingDTO): Promise<FormattedBooking | null> {
    const {
      spot_number,
      level_code,
      vehicle_id = null,
      operator_id,
      expected_checkin,
      expected_checkout,
      total_amount = null,
      booking_source = 'direct',
      external_booking_id = null,
      notes = null,
      created_by = null,
    } = bookingData

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 1. Obtener spot_id
      const [spotRows] = await connection.query<SpotIdRow[]>(
        'SELECT id FROM parking_spots WHERE spot_number = ? AND level_code = ? AND is_active = TRUE',
        [spot_number, level_code]
      )

      if (spotRows.length === 0) {
        throw new Error(`Plaza ${level_code}-${spot_number} no encontrada o inactiva`)
      }

      const spot_id = spotRows[0].id

      // 2. Verificar disponibilidad (bloquea la plaza hasta el commit)
      await this._assertSpotFree(connection, spot_id, expected_checkin, expected_checkout, null)

      // 3. Calcular precio SOLO si no se proporciona manualmente
      let finalAmount = total_amount

      if (!finalAmount) {
        const days = this._calculateBookingDays(expected_checkin, expected_checkout)

        const [rateRows] = await connection.query<RatePriceRow[]>(
          'SELECT price FROM parking_rates WHERE days = ?',
          [days]
        )

        finalAmount = rateRows.length > 0 ? rateRows[0].price : days * 15.0
      }

      // 4. Insertar booking (trigger genera booking_code automáticamente)
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO parking_bookings (
          spot_id, vehicle_id, operator_id, 
          expected_checkin, expected_checkout, 
          status, total_amount, 
          booking_source, external_booking_id, notes,
          created_by
        ) VALUES (?, ?, ?, ?, ?, 'reserved', ?, ?, ?, ?, ?)`,
        [
          spot_id,
          vehicle_id,
          operator_id,
          expected_checkin,
          expected_checkout,
          finalAmount,
          booking_source,
          external_booking_id,
          notes,
          created_by,
        ]
      )

      await connection.commit()

      return await this.findById(result.insertId)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // CHECK-IN
  // ============================================
  async checkIn(id: number, actual_checkin: Date = new Date()): Promise<FormattedBooking | null> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [booking] = await connection.query<ParkingBookingRow[]>(
        'SELECT * FROM parking_bookings WHERE id = ?',
        [id]
      )

      if (booking.length === 0) {
        throw new Error('Reserva no encontrada')
      }

      if (booking[0].status !== 'reserved') {
        throw new Error(`No se puede hacer check-in: estado actual es '${booking[0].status}'`)
      }

      // Lock the spot so two check-ins on it run one after the other
      await connection.query('SELECT id FROM parking_spots WHERE id = ? FOR UPDATE', [
        booking[0].spot_id,
      ])

      const [occupied] = await connection.query<OccupiedCountRow[]>(
        `SELECT COUNT(*) AS count 
        FROM parking_bookings 
        WHERE spot_id = ? 
          AND id != ? 
          AND status = 'checked_in' 
          AND (actual_checkout IS NULL OR actual_checkout > NOW())`,
        [booking[0].spot_id, id]
      )

      if (occupied[0].count > 0) {
        throw new Error('La plaza ya está ocupada por otra reserva')
      }

      await connection.query(
        'UPDATE parking_bookings SET status = ?, actual_checkin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['checked_in', actual_checkin, id]
      )

      await connection.commit()

      return await this.findById(id)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // CHECK-OUT
  // ============================================
  async checkOut(id: number, checkoutData: CheckoutDTO): Promise<FormattedBooking | null> {
    const {
      actual_checkout = new Date(),
      payment_amount = null,
      payment_method = null,
      payment_reference = null,
    } = checkoutData

    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [booking] = await connection.query<ParkingBookingRow[]>(
        'SELECT * FROM parking_bookings WHERE id = ?',
        [id]
      )

      if (booking.length === 0) {
        throw new Error('Reserva no encontrada')
      }

      if (booking[0].status !== 'checked_in') {
        throw new Error(`No se puede hacer check-out: estado actual es '${booking[0].status}'`)
      }

      const payment_date = payment_amount ? new Date() : null

      await connection.query(
        `UPDATE parking_bookings 
        SET status = ?, 
            actual_checkout = ?, 
            payment_amount = ?,
            payment_method = ?,
            payment_reference = ?,
            payment_date = ?,
            updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
        [
          'completed',
          actual_checkout,
          payment_amount,
          payment_method,
          payment_reference,
          payment_date,
          id,
        ]
      )

      await connection.commit()

      return await this.findById(id)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // CANCEL
  // ============================================
  async cancel(id: number): Promise<FormattedBooking | null> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [booking] = await connection.query<ParkingBookingRow[]>(
        'SELECT * FROM parking_bookings WHERE id = ?',
        [id]
      )

      if (booking.length === 0) {
        throw new Error('Reserva no encontrada')
      }

      if (!['reserved', 'checked_in'].includes(booking[0].status)) {
        throw new Error(`No se puede cancelar: estado actual es '${booking[0].status}'`)
      }

      await connection.query(
        'UPDATE parking_bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['canceled', id]
      )

      await connection.commit()

      return await this.findById(id)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // NO SHOW
  // ============================================
  async markNoShow(id: number): Promise<FormattedBooking | null> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [booking] = await connection.query<ParkingBookingRow[]>(
        'SELECT * FROM parking_bookings WHERE id = ?',
        [id]
      )

      if (booking.length === 0) {
        throw new Error('Reserva no encontrada')
      }

      if (booking[0].status !== 'reserved') {
        throw new Error(`No se puede marcar como no-show: estado actual es '${booking[0].status}'`)
      }

      await connection.query(
        'UPDATE parking_bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['no_show', id]
      )

      await connection.commit()

      return await this.findById(id)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // UPDATE BOOKING
  // ============================================
  async update(id: number, updateData: UpdateBookingDTO): Promise<FormattedBooking | null> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      const [booking] = await connection.query<ParkingBookingRow[]>(
        'SELECT * FROM parking_bookings WHERE id = ?',
        [id]
      )

      if (booking.length === 0) {
        throw new Error('Reserva no encontrada')
      }

      // Payment can be updated in any status (reserved, checked_in, completed, canceled, no_show)
      // No status restriction for payment fields

      let spot_id = booking[0].spot_id

      if (updateData.spot_number || updateData.level_code) {
        const [currentSpot] = await connection.query<CurrentSpotRow[]>(
          'SELECT spot_number, level_code FROM parking_spots WHERE id = ?',
          [booking[0].spot_id]
        )
        const target = targetSpot(updateData, currentSpot[0])
        const spotNum = target.spot_number
        const levelCode = target.level_code

        const [spotRows] = await connection.query<SpotIdRow[]>(
          'SELECT id FROM parking_spots WHERE spot_number = ? AND level_code = ? AND is_active = TRUE',
          [spotNum, levelCode]
        )

        if (spotRows.length === 0) {
          throw new Error(`Plaza ${levelCode}-${spotNum} no encontrada o inactiva`)
        }

        spot_id = spotRows[0].id
      }

      // A new spot or new dates must be free for an active booking. It used
      // to be checked only when the spot changed, so moving the dates onto
      // another booking's days went through
      const spotChanged = spot_id !== booking[0].spot_id
      const datesChanged = Boolean(updateData.expected_checkin || updateData.expected_checkout)
      if (
        (spotChanged || datesChanged) &&
        (booking[0].status === 'reserved' || booking[0].status === 'checked_in')
      ) {
        await this._assertSpotFree(
          connection,
          spot_id,
          updateData.expected_checkin || booking[0].expected_checkin,
          updateData.expected_checkout || booking[0].expected_checkout,
          id,
          spotChanged
            ? 'La nueva plaza no está disponible en las fechas seleccionadas'
            : 'La plaza no está disponible en las fechas seleccionadas'
        )
      }

      const fields: string[] = []
      const values: (string | number | null)[] = []

      if (updateData.expected_checkin) {
        fields.push('expected_checkin = ?')
        values.push(updateData.expected_checkin)
      }
      if (updateData.expected_checkout) {
        fields.push('expected_checkout = ?')
        values.push(updateData.expected_checkout)
      }
      if (spot_id !== booking[0].spot_id) {
        fields.push('spot_id = ?')
        values.push(spot_id)
      }
      if (updateData.vehicle_id !== undefined) {
        fields.push('vehicle_id = ?')
        values.push(updateData.vehicle_id)
      }
      if (updateData.booking_source) {
        fields.push('booking_source = ?')
        values.push(updateData.booking_source)
      }
      if (updateData.external_booking_id !== undefined) {
        fields.push('external_booking_id = ?')
        values.push(updateData.external_booking_id)
      }
      if (updateData.notes !== undefined) {
        fields.push('notes = ?')
        values.push(updateData.notes)
      }
      if (updateData.total_amount !== undefined) {
        fields.push('total_amount = ?')
        values.push(updateData.total_amount)
      }
      if (updateData.updated_by) {
        fields.push('updated_by = ?')
        values.push(updateData.updated_by)
      }

      // Payment fields
      if (updateData.payment_amount !== undefined) {
        fields.push('payment_amount = ?')
        values.push(updateData.payment_amount)
        // Auto-set payment_date when payment is registered
        if (updateData.payment_amount !== null && updateData.payment_amount > 0) {
          fields.push('payment_date = CURRENT_TIMESTAMP')
        }
      }
      if (updateData.payment_method !== undefined) {
        fields.push('payment_method = ?')
        values.push(updateData.payment_method)
      }
      if (updateData.payment_reference !== undefined) {
        fields.push('payment_reference = ?')
        values.push(updateData.payment_reference)
      }

      if (fields.length === 0) {
        throw new Error('No hay campos para actualizar')
      }

      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      await connection.query(
        `UPDATE parking_bookings SET ${fields.join(', ')} WHERE id = ?`,
        values
      )

      await connection.commit()

      return await this.findById(id)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // DELETE BOOKING
  // ============================================
  async delete(id: number): Promise<boolean> {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // Free its days first: the foreign key only sets booking_id to NULL and
      // there is no delete trigger, so they stayed blocked
      await connection.query(
        'UPDATE parking_availability SET is_available = TRUE, booking_id = NULL WHERE booking_id = ?',
        [id]
      )
      await connection.query('DELETE FROM parking_bookings WHERE id = ?', [id])

      await connection.commit()

      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  // ============================================
  // FIND BY QUICK FILTER (Dashboard filters)
  // Método aislado para filtros compuestos del dashboard
  // ============================================
  async findByQuickFilter(
    quickFilter: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedBookingsResult> {
    const safeLimit = Math.min(limit, 500)
    const offset = (page - 1) * safeLimit

    // Build WHERE clause based on quickFilter type
    let whereClause: string
    const params: (string | number)[] = []

    switch (quickFilter) {
      case 'arrivals_pending':
        // Llegadas en espera: reserved + entrada hoy
        whereClause = `WHERE b.status = 'reserved' AND DATE(b.expected_checkin) = CURDATE()`
        break

      case 'arrivals_inside':
        // Dentro: todos los checked_in
        whereClause = `WHERE b.status = 'checked_in'`
        break

      case 'arrivals_total':
        // Total llegadas: reserved entrada hoy + checked_in
        whereClause = `WHERE (
          b.status = 'checked_in' 
          OR (b.status = 'reserved' AND DATE(b.expected_checkin) = CURDATE())
        )`
        break

      case 'departures_pending':
        // Salidas en espera: checked_in + salida hoy
        whereClause = `WHERE b.status = 'checked_in' AND DATE(b.expected_checkout) = CURDATE()`
        break

      case 'departures_completed':
        // Completadas hoy (por fecha de checkout real)
        whereClause = `WHERE b.status = 'completed' AND DATE(b.actual_checkout) = CURDATE()`
        break

      case 'departures_total':
        // Total salidas: checked_in salida hoy + completed hoy
        whereClause = `WHERE (
          (b.status = 'checked_in' AND DATE(b.expected_checkout) = CURDATE())
          OR (b.status = 'completed' AND DATE(b.actual_checkout) = CURDATE())
        )`
        break

      default:
        throw new Error(`QuickFilter no válido: ${quickFilter}`)
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      ${whereClause}
    `
    const [countResult] = await pool.query<CountRow[]>(countQuery, params)
    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / safeLimit)

    // Main query
    const query = `
      SELECT 
        b.id,
        b.booking_code,
        b.spot_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        b.vehicle_id,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.operator_id,
        u.username AS operator_name,
        b.expected_checkin,
        b.expected_checkout,
        b.actual_checkin,
        b.actual_checkout,
        b.status,
        b.total_amount,
        b.payment_amount,
        b.payment_method,
        b.payment_reference,
        b.payment_date,
        b.booking_source,
        b.external_booking_id,
        b.notes,
        b.created_at,
        b.updated_at,
        b.created_by,
        b.updated_by,
        creator.username AS created_by_name,
        updater.username AS updated_by_name,
        DATEDIFF(DATE(b.expected_checkout), DATE(b.expected_checkin)) AS planned_days,
        CASE 
          WHEN b.actual_checkin IS NOT NULL AND b.actual_checkout IS NOT NULL 
          THEN DATEDIFF(DATE(b.actual_checkout), DATE(b.actual_checkin))
          WHEN b.actual_checkin IS NOT NULL 
          THEN DATEDIFF(CURDATE(), DATE(b.actual_checkin))
          ELSE NULL
        END AS actual_days
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.operator_id = u.id
      LEFT JOIN users creator ON b.created_by = creator.id
      LEFT JOIN users updater ON b.updated_by = updater.id
      ${whereClause}
      ORDER BY b.expected_checkin DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `

    const [rows] = await pool.query<BookingWithDetailsRow[]>(query, [...params, safeLimit, offset])

    return {
      bookings: rows.map((row) => this._formatBooking(row)),
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages,
      },
    }
  }

  // ============================================
  // FIND BY DATE FILTER (Rango de fechas)
  // Filtra reservas por fecha de entrada y opcionalmente salida
  // IMPORTANTE: Las fechas en BD están en hora local (Madrid), no UTC
  // Por eso comparamos directamente con DATE()
  // ============================================
  async findByDateFilter(
    startDate: string,
    endDate?: string,
    status?: BookingStatus,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedBookingsResult> {
    const safeLimit = Math.min(limit, 500)
    const offset = (page - 1) * safeLimit

    // Build WHERE clause
    // Las fechas se almacenan como DATETIME en hora local de Madrid
    // Comparamos directamente el DATE de expected_checkin
    let whereClause: string
    const params: (string | number)[] = []

    if (endDate) {
      // Ambas fechas: checkin EXACTO en startDate Y checkout EXACTO en endDate
      whereClause = `WHERE DATE(b.expected_checkin) = ? AND DATE(b.expected_checkout) = ?`
      params.push(startDate, endDate)
    } else {
      // Solo fecha entrada: checkin EXACTO en startDate
      whereClause = `WHERE DATE(b.expected_checkin) = ?`
      params.push(startDate)
    }

    // Añadir filtro de estado si se proporciona
    if (status) {
      whereClause += ` AND b.status = ?`
      params.push(status)
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      ${whereClause}
    `
    const [countResult] = await pool.query<CountRow[]>(countQuery, params)
    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / safeLimit)

    // Main query
    const query = `
      SELECT 
        b.id,
        b.booking_code,
        b.spot_id,
        ps.spot_number,
        ps.level_code,
        ps.spot_type,
        b.vehicle_id,
        v.plate_number,
        v.owner_name,
        v.model AS vehicle_model,
        b.operator_id,
        u.username AS operator_name,
        b.expected_checkin,
        b.expected_checkout,
        b.actual_checkin,
        b.actual_checkout,
        b.status,
        b.total_amount,
        b.payment_amount,
        b.payment_method,
        b.payment_reference,
        b.payment_date,
        b.booking_source,
        b.external_booking_id,
        b.notes,
        b.created_at,
        b.updated_at,
        b.created_by,
        b.updated_by,
        creator.username AS created_by_name,
        updater.username AS updated_by_name,
        DATEDIFF(DATE(b.expected_checkout), DATE(b.expected_checkin)) AS planned_days,
        CASE 
          WHEN b.actual_checkin IS NOT NULL AND b.actual_checkout IS NOT NULL 
          THEN DATEDIFF(DATE(b.actual_checkout), DATE(b.actual_checkin))
          WHEN b.actual_checkin IS NOT NULL 
          THEN DATEDIFF(CURDATE(), DATE(b.actual_checkin))
          ELSE NULL
        END AS actual_days
      FROM parking_bookings b
      INNER JOIN parking_spots ps ON b.spot_id = ps.id
      LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.operator_id = u.id
      LEFT JOIN users creator ON b.created_by = creator.id
      LEFT JOIN users updater ON b.updated_by = updater.id
      ${whereClause}
      ORDER BY b.expected_checkin DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `

    const [rows] = await pool.query<BookingWithDetailsRow[]>(query, [...params, safeLimit, offset])

    return {
      bookings: rows.map((row) => this._formatBooking(row)),
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages,
      },
    }
  }

  // ============================================
  // RESERVAS CON CHECK-IN EXPIRADO
  // ============================================
  async findOverdue(): Promise<FormattedOverdueBooking[]> {
    const query = `
    SELECT 
      b.id,
      b.booking_code,
      b.spot_id,
      ps.spot_number,
      ps.level_code,
      ps.spot_type,
      b.vehicle_id,
      v.plate_number,
      v.owner_name,
      v.model AS vehicle_model,
      b.actual_checkin,
      b.expected_checkout,
      b.status,
      TIMESTAMPDIFF(HOUR, b.expected_checkout, NOW()) AS horas_retraso,
      b.notes,
      b.created_at,
      b.updated_at
    FROM parking_bookings b
    INNER JOIN parking_spots ps ON b.spot_id = ps.id
    LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
    WHERE b.status = 'checked_in'
      AND b.actual_checkout IS NULL
      AND b.expected_checkout < NOW()
    ORDER BY b.expected_checkout ASC
  `

    const [rows] = await pool.query<OverdueBookingRow[]>(query)
    return rows.map((row) => this._formatOverdueBooking(row))
  }

  // ============================================
  // HELPER: Formatear booking completo
  // ============================================
  _formatBooking(row: BookingWithDetailsRow): FormattedBooking {
    const normalizeLevel = (levelCode: string): string => {
      return levelCode.replace('-', '')
    }

    return {
      id: row.id,
      booking_code: row.booking_code,
      spot: {
        id: row.spot_id,
        number: ` Nº ${row.spot_number}`,
        level: `Planta ${normalizeLevel(row.level_code)} `,
        type: row.spot_type,
      },
      vehicle: row.vehicle_id
        ? {
            id: row.vehicle_id,
            plate: row.plate_number!,
            owner: row.owner_name!,
            model: row.vehicle_model,
          }
        : null,
      operator: row.operator_id
        ? {
            id: row.operator_id,
            username: row.operator_name!,
          }
        : null,
      schedule: {
        expected_checkin: row.expected_checkin,
        expected_checkout: row.expected_checkout,
        actual_checkin: row.actual_checkin,
        actual_checkout: row.actual_checkout,
        planned_days: row.planned_days,
        actual_days: row.actual_days,
      },
      status: row.status,
      payment: {
        total_amount: parseFloat(String(row.total_amount || 0)),
        paid_amount: parseFloat(String(row.payment_amount || 0)),
        pending_amount:
          parseFloat(String(row.total_amount || 0)) - parseFloat(String(row.payment_amount || 0)),
        method: row.payment_method,
        reference: row.payment_reference,
        date: row.payment_date,
      },
      booking_info: {
        source: row.booking_source,
        external_id: row.external_booking_id,
      },
      notes: row.notes,
      timestamps: {
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by
          ? {
              id: row.created_by,
              username: row.created_by_name!,
            }
          : null,
        updated_by: row.updated_by
          ? {
              id: row.updated_by,
              username: row.updated_by_name!,
            }
          : null,
      },
    }
  }

  // ============================================
  // HELPER: Formatear booking retrasado
  // ============================================
  _formatOverdueBooking(row: OverdueBookingRow): FormattedOverdueBooking {
    const normalizeLevel = (levelCode: string): string => {
      return levelCode.replace('-', '')
    }

    return {
      id: row.id,
      booking_code: row.booking_code,
      spot: {
        number: `Nº ${row.spot_number}`,
        level: `Planta ${normalizeLevel(row.level_code)}`,
        type: row.spot_type,
      },
      vehicle: {
        plate: row.plate_number,
        owner: row.owner_name,
        model: row.vehicle_model,
      },
      actual_checkin: row.actual_checkin,
      expected_checkout: row.expected_checkout,
      horas_retraso: row.horas_retraso,
      status: row.status,
      notes: row.notes,
      timestamps: {
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    }
  }
}

export default new ParkingBookingsRepository()
