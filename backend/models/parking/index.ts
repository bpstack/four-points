// models/parking/index.ts

import { RowDataPacket, ResultSetHeader } from 'mysql2'

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type SpotType = 'standard' | 'large' | 'handicapped' | 'electric'
export type LevelCode = '-2' | '-3'
export type BookingStatus = 'reserved' | 'checked_in' | 'completed' | 'canceled' | 'no_show'
export type BookingSource = 'direct' | 'booking.com' | 'expedia' | 'other'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'pending'

// ============================================
// DATABASE MODELS (RowDataPacket for queries)
// ============================================

// Parking Spots
export interface ParkingSpotRow extends RowDataPacket {
  id: number
  spot_number: number
  level_code: LevelCode
  spot_type: SpotType
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// Parking Vehicles
export interface ParkingVehicleRow extends RowDataPacket {
  id: number
  plate_number: string
  owner_name: string
  model: string | null
  created_at: Date
}

// Parking Bookings
export interface ParkingBookingRow extends RowDataPacket {
  id: number
  booking_code: string
  spot_id: number
  vehicle_id: number | null
  operator_id: number | null
  expected_checkin: Date
  expected_checkout: Date
  actual_checkin: Date | null
  actual_checkout: Date | null
  status: BookingStatus
  total_amount: number | null
  payment_amount: number | null
  payment_method: PaymentMethod | null
  payment_reference: string | null
  payment_date: Date | null
  booking_source: BookingSource
  external_booking_id: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
  created_by: number | null
  updated_by: number | null
}

// Parking Availability
export interface ParkingAvailabilityRow extends RowDataPacket {
  id: number
  spot_id: number
  date: string
  is_available: boolean
  booking_id: number | null
}

// Parking Rates
export interface ParkingRateRow extends RowDataPacket {
  id: number
  days: number
  price: number
  description: string | null
}

// ============================================
// JOINED QUERY RESULTS
// ============================================

export interface BookingWithDetailsRow extends RowDataPacket {
  id: number
  booking_code: string
  spot_id: number
  spot_number: number
  level_code: LevelCode
  spot_type: SpotType
  vehicle_id: number | null
  plate_number: string | null
  owner_name: string | null
  vehicle_model: string | null
  operator_id: number | null
  operator_name: string | null
  expected_checkin: Date
  expected_checkout: Date
  actual_checkin: Date | null
  actual_checkout: Date | null
  status: BookingStatus
  total_amount: number | null
  payment_amount: number | null
  payment_method: PaymentMethod | null
  payment_reference: string | null
  payment_date: Date | null
  booking_source: BookingSource
  external_booking_id: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
  created_by: number | null
  updated_by: number | null
  created_by_name: string | null
  updated_by_name: string | null
  planned_days: number
  actual_days: number | null
}

export interface OverdueBookingRow extends RowDataPacket {
  id: number
  booking_code: string
  spot_id: number
  spot_number: number
  level_code: LevelCode
  spot_type: SpotType
  vehicle_id: number | null
  plate_number: string | null
  owner_name: string | null
  vehicle_model: string | null
  actual_checkin: Date
  expected_checkout: Date
  status: BookingStatus
  horas_retraso: number
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface AvailableSpotRow extends RowDataPacket {
  id: number
  level_code: LevelCode
  spot_number: number
  spot_type: SpotType
  dias_disponibles?: number
  dias_requeridos?: number
}

// ============================================
// STATS QUERY RESULTS
// ============================================

export interface DailyStatsRow extends RowDataPacket {
  total_spots: number
  occupied_spots: number
  total_bookings: number
  pending_checkins: number
  pending_checkouts: number
  active_bookings: number
  completed_today: number
  canceled_today: number
  no_shows_today: number
}

export interface OccupancyByLevelRow extends RowDataPacket {
  level_code: LevelCode
  total_spots: number
  occupied_spots: number
  total_bookings: number
}

export interface PendingCheckinRow extends RowDataPacket {
  booking_id: number
  spot_number: number
  level_code: LevelCode
  spot_type: SpotType
  plate_number: string | null
  owner_name: string | null
  vehicle_model: string | null
  expected_checkin: Date
  expected_checkout: Date
  days: number
  booking_source: BookingSource
  external_booking_id: string | null
  total_amount: number | null
  notes: string | null
  spot_currently_occupied: number
}

export interface PendingCheckoutRow extends RowDataPacket {
  booking_id: number
  spot_number: number
  level_code: LevelCode
  spot_type: SpotType
  plate_number: string | null
  owner_name: string | null
  vehicle_model: string | null
  expected_checkin: Date
  actual_checkin: Date | null
  expected_checkout: Date
  planned_days: number
  actual_days: number
  booking_source: BookingSource
  external_booking_id: string | null
  total_amount: number | null
  payment_amount: number | null
  payment_method: PaymentMethod | null
  notes: string | null
  is_overdue: number
}

export interface AvailabilityByLevelRow extends RowDataPacket {
  level_code: LevelCode
  spot_type: SpotType
  total_spots: number
  available_spots: number
  reserved_spots: number
  occupied_spots: number
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface RegisterVehicleDTO {
  plate_number: string
  owner_name: string
  model?: string
}

export interface UpdateVehicleDTO {
  plate_number?: string
  owner_name?: string
  model?: string
}

export interface CreateBookingDTO {
  spot_number: number
  level_code: LevelCode
  vehicle_id?: number | null
  operator_id?: string // UUID string
  expected_checkin: string
  expected_checkout: string
  total_amount?: number | null
  booking_source?: BookingSource
  external_booking_id?: string | null
  notes?: string | null
  created_by?: string | null // UUID string
}

export interface UpdateBookingDTO {
  spot_number?: number
  level_code?: LevelCode
  vehicle_id?: number | null
  expected_checkin?: string
  expected_checkout?: string
  total_amount?: number | null
  booking_source?: BookingSource
  external_booking_id?: string | null
  notes?: string | null
  updated_by?: string | null // UUID string
}

export interface CheckoutDTO {
  actual_checkout?: Date
  payment_amount?: number | null
  payment_method?: PaymentMethod | null
  payment_reference?: string | null
}

export interface CreateReservationDTO {
  spot_id: number
  vehicle_id: number
  operator_id: number
  expected_checkin: string
  expected_checkout: string
  status?: BookingStatus
  booking_source?: BookingSource
  external_booking_id?: string | null
  notes?: string | null
}

// ============================================
// BOOKING FILTERS
// ============================================

export interface BookingFilters {
  id?: number
  status?: BookingStatus
  date?: string
  spot_id?: number
  vehicle_id?: number
  plate_number?: string
  owner_name?: string
  booking_source?: BookingSource
}

// ============================================
// FORMATTED RESPONSE TYPES
// ============================================

export interface FormattedSpot {
  id: number
  number: string
  level: string
  type: SpotType
}

export interface FormattedVehicle {
  id: number
  plate: string
  owner: string
  model: string | null
}

export interface FormattedOperator {
  id: number
  username: string
}

export interface FormattedSchedule {
  expected_checkin: Date
  expected_checkout: Date
  actual_checkin: Date | null
  actual_checkout: Date | null
  planned_days: number
  actual_days: number | null
}

export interface FormattedPayment {
  total_amount: number
  paid_amount: number
  pending_amount: number
  method: PaymentMethod | null
  reference: string | null
  date: Date | null
}

export interface FormattedBookingInfo {
  source: BookingSource
  external_id: string | null
}

export interface FormattedTimestamps {
  created_at: Date
  updated_at: Date
  created_by: FormattedOperator | null
  updated_by: FormattedOperator | null
}

export interface FormattedBooking {
  id: number
  booking_code: string
  spot: FormattedSpot
  vehicle: FormattedVehicle | null
  operator: FormattedOperator | null
  schedule: FormattedSchedule
  status: BookingStatus
  payment: FormattedPayment
  booking_info: FormattedBookingInfo
  notes: string | null
  timestamps: FormattedTimestamps
}

export interface FormattedOverdueBooking {
  id: number
  booking_code: string
  spot: {
    number: string
    level: string
    type: SpotType
  }
  vehicle: {
    plate: string | null
    owner: string | null
    model: string | null
  }
  actual_checkin: Date
  expected_checkout: Date
  horas_retraso: number
  status: BookingStatus
  notes: string | null
  timestamps: {
    created_at: Date
    updated_at: Date
  }
}

// ============================================
// STATS RESPONSE TYPES
// ============================================

export interface DailyStats {
  total_spots: number
  occupied_spots: number
  available_spots: number
  total_bookings: number
  pending_checkins: number
  pending_checkouts: number
  active_bookings: number
  completed_today: number
  canceled_today: number
  no_shows_today: number
  occupancy_rate: number
}

export interface LevelOccupancy {
  level: LevelCode
  total_spots: number
  occupied_spots: number
  available_spots: number
  total_bookings: number
  occupancy_rate: number
}

export interface OccupancyByLevelResponse {
  levels: LevelOccupancy[]
  summary: Omit<LevelOccupancy, 'level'> & { level: 'TOTAL' }
}

export interface FormattedPendingCheckin {
  booking_id: number
  spot: {
    number: number
    level: LevelCode
    type: SpotType
    currently_occupied: boolean
  }
  vehicle: {
    plate: string
    owner: string
    model: string | null
  } | null
  schedule: {
    expected_checkin: Date
    expected_checkout: Date
    days: number
  }
  booking_info: {
    source: BookingSource
    external_id: string | null
    total_amount: number
    notes: string | null
  }
}

export interface FormattedPendingCheckout {
  booking_id: number
  spot: {
    number: number
    level: LevelCode
    type: SpotType
  }
  vehicle: {
    plate: string
    owner: string
    model: string | null
  } | null
  schedule: {
    expected_checkin: Date
    actual_checkin: Date | null
    expected_checkout: Date
    planned_days: number
    actual_days: number
    is_overdue: boolean
  }
  payment: {
    total_amount: number
    paid_amount: number
    pending_amount: number
    method: PaymentMethod | null
  }
  booking_info: {
    source: BookingSource
    external_id: string | null
    notes: string | null
  }
}

export interface LevelAvailability {
  level: LevelCode
  total_spots: number
  available_spots: number
  reserved_spots: number
  occupied_spots: number
  occupancy_rate: number
  by_type: Record<
    SpotType,
    {
      total: number
      available: number
      reserved: number
      occupied: number
    }
  >
}

export interface AvailabilityByLevelResponse {
  date: string
  levels: LevelAvailability[]
  summary: {
    level: 'TOTAL'
    total_spots: number
    available_spots: number
    reserved_spots: number
    occupied_spots: number
    occupancy_rate: number
  }
}

export interface RangeStats {
  total_spots: number
  total_occupied: number
  total_bookings: number
  pending_checkins: number
  pending_checkouts: number
  active_bookings: number
  completed_today: number
  canceled_today: number
  no_shows_today: number
}

export interface LevelRangeOccupancy {
  level_code: LevelCode
  level_name: string
  total_spots: number
  total_occupied: number
  available: number
}

// ============================================
// MYSQL RESULT TYPES
// ============================================

export { ResultSetHeader }
