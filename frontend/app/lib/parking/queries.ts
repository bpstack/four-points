// app/lib/parking/queries.ts

import apiClient from '@/app/lib/apiClient'
import type {
  ParkingSpot,
  ParkingVehicle,
  ParkingBooking,
  AvailableSpot,
  CreateBookingDto,
  UpdateBookingDto,
  CreateVehicleDto,
  CheckInDto,
  CheckOutDto,
  BookingResponse,
  BookingsResponse,
  StatsResponse,
  OccupancyResponse,
  PendingCheckinsResponse,
  PendingCheckoutsResponse,
  FullStatsResponse,
  OverdueBookingsResponse,
} from '@/app/lib/parking/types'

// ❌ ELIMINAR TODAS LAS INTERFACES DE AQUÍ - Ya están en types.ts
// NO debe haber ningún "export interface" en este archivo

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api'

export const parkingApi = {
  // ============================================
  // SPOTS (Plazas de parking)
  // ============================================

  /**
   * Obtiene todas las plazas de parking
   */
  getAllSpots: async (): Promise<ParkingSpot[]> => {
    return apiClient.get(`${API_URL}/parking/spots`)
  },

  /**
   * Obtiene plazas por nivel (-2, -3)
   */
  getSpotsByLevel: async (level: string): Promise<ParkingSpot[]> => {
    return apiClient.get(`${API_URL}/parking/spots?level=${level}`)
  },

  /**
   * Obtiene plazas por tipo (normal, ancha, etc.)
   */
  getSpotsByType: async (type: string): Promise<ParkingSpot[]> => {
    return apiClient.get(`${API_URL}/parking/spots?type=${type}`)
  },

  /**
   * Obtiene plazas disponibles para una fecha específica
   */
  getAvailableSpotsByDate: async (
    date: string
  ): Promise<{
    date: string
    total: number
    spots: AvailableSpot[]
  }> => {
    return apiClient.get(`${API_URL}/parking/spots/available?date=${date}`)
  },

  /**
   * Obtiene plazas disponibles en un rango de fechas
   */
  getAvailableSpotsByRange: async (params: {
    start_date: string
    end_date: string
    level?: string
  }): Promise<{
    start_date: string
    end_date: string
    days: number
    level: string
    total: number
    spots: AvailableSpot[]
  }> => {
    const query = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      ...(params.level && { level: params.level }),
    })
    return apiClient.get(`${API_URL}/parking/spots/available?${query}`)
  },

  /**
   * Obtiene plazas disponibles para hoy
   */
  getAvailableSpotsToday: async (): Promise<{
    date: string
    total: number
    spots: AvailableSpot[]
  }> => {
    return apiClient.get(`${API_URL}/parking/spots/available`)
  },

  // ============================================
  // VEHICLES (Vehículos)
  // ============================================

  /**
   * Crea un nuevo vehículo
   */
  createVehicle: async (data: CreateVehicleDto): Promise<{ id: number; message?: string }> => {
    return apiClient.post(`${API_URL}/parking/vehicles`, data)
  },

  /**
   * Obtiene todos los vehículos registrados
   */
  getAllVehicles: async (): Promise<ParkingVehicle[]> => {
    return apiClient.get(`${API_URL}/parking/vehicles`)
  },
  /**
   * Busca vehículos por matrícula O propietario (parcial)
   */
  searchVehicles: async (searchTerm: string): Promise<ParkingVehicle[]> => {
    if (!searchTerm || searchTerm.length < 2) return []
    return apiClient.get(`${API_URL}/parking/vehicles/search?q=${encodeURIComponent(searchTerm)}`)
  },
  /**
   * Busca un vehículo por matrícula
   */
  getVehicleByPlate: async (plate: string): Promise<ParkingVehicle> => {
    return apiClient.get(`${API_URL}/parking/vehicles?plate_number=${plate}`)
  },

  /**
   * Busca vehículos por propietario
   */
  getVehiclesByOwner: async (owner: string): Promise<ParkingVehicle[]> => {
    return apiClient.get(`${API_URL}/parking/vehicles?owner_name=${owner}`)
  },

  // ============================================
  // BOOKINGS (Reservas)
  // ============================================

  /**
   * Crea una nueva reserva
   * ✅ RESPONSE incluye booking_code generado automáticamente
   */
  createBooking: async (data: CreateBookingDto): Promise<BookingResponse> => {
    return apiClient.post(`${API_URL}/parking/bookings`, data)
  },

  /**
   * Obtiene todas las reservas con filtros opcionales
   */
  getAllBookings: async (filters?: {
    status?: string
    date?: string
    plate_number?: string
  }): Promise<BookingsResponse> => {
    const query = new URLSearchParams()
    if (filters?.status) query.append('status', filters.status)
    if (filters?.date) query.append('date', filters.date)
    if (filters?.plate_number) query.append('plate_number', filters.plate_number)
    return apiClient.get(`${API_URL}/parking/bookings?${query}`)
  },

  /**
   * Obtiene una reserva por CÓDIGO (PK-YYYYMMDD-####)
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  getBookingByCode: async (
    code: string
  ): Promise<{ success: boolean; booking: ParkingBooking }> => {
    return apiClient.get(`${API_URL}/parking/bookings/${code}`)
  },

  /**
   * Actualiza una reserva existente
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  updateBooking: async (code: string, data: UpdateBookingDto): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/parking/bookings/${code}`, data)
  },

  /**
   * Elimina una reserva
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  deleteBooking: async (
    code: string
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    return apiClient.delete(`${API_URL}/parking/bookings/${code}`)
  },

  /**
   * Realiza el check-in de una reserva
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  checkInBooking: async (code: string, data?: CheckInDto): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/parking/bookings/${code}/checkin`, data || {})
  },

  /**
   * Realiza el check-out de una reserva
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  checkOutBooking: async (code: string, data?: CheckOutDto): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/parking/bookings/${code}/checkout`, data || {})
  },

  /**
   * Cancela una reserva
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  cancelBooking: async (code: string, notes?: string): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/parking/bookings/${code}/cancel`, { notes })
  },

  /**
   * Marca una reserva como no-show
   * ✅ ACTUALIZADO: Ahora usa código en vez de ID
   */
  markBookingNoShow: async (code: string, notes?: string): Promise<BookingResponse> => {
    return apiClient.put(`${API_URL}/parking/bookings/${code}/no-show`, { notes })
  },

  // ============================================
  // STATS (Estadísticas para dashboard)
  // ============================================

  /**
   * Obtiene estadísticas generales del día
   * @param date - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
   */
  getStats: async (date?: string): Promise<StatsResponse> => {
    const url = date ? `${API_URL}/parking/stats?date=${date}` : `${API_URL}/parking/stats`
    return apiClient.get(url)
  },

  /**
   * Obtiene ocupación por planta
   * @param date - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
   */
  getOccupancy: async (date?: string): Promise<OccupancyResponse> => {
    const url = date
      ? `${API_URL}/parking/stats/occupancy?date=${date}`
      : `${API_URL}/parking/stats/occupancy`
    return apiClient.get(url)
  },

  /**
   * Obtiene check-ins pendientes
   * @param date - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
   */
  getPendingCheckins: async (date?: string): Promise<PendingCheckinsResponse> => {
    const url = date
      ? `${API_URL}/parking/stats/pending-checkins?date=${date}`
      : `${API_URL}/parking/stats/pending-checkins`
    return apiClient.get(url)
  },

  /**
   * Obtiene check-outs pendientes
   * @param date - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
   */
  getPendingCheckouts: async (date?: string): Promise<PendingCheckoutsResponse> => {
    const url = date
      ? `${API_URL}/parking/stats/pending-checkouts?date=${date}`
      : `${API_URL}/parking/stats/pending-checkouts`
    return apiClient.get(url)
  },

  /**
   * Obtiene TODAS las estadísticas de golpe (fecha única)
   * @param date - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
   */
  getFullStats: async (date?: string): Promise<FullStatsResponse> => {
    const url = date ? `${API_URL}/parking/stats?date=${date}` : `${API_URL}/parking/stats`
    return apiClient.get(url)
  },

  /**
   * Obtiene estadísticas por rango de fechas
   * @param startDate - Fecha inicio (YYYY-MM-DD)
   * @param endDate - Fecha fin (YYYY-MM-DD)
   */
  getStatsByRange: async (startDate: string, endDate: string): Promise<FullStatsResponse> => {
    return apiClient.get(`${API_URL}/parking/stats?startDate=${startDate}&endDate=${endDate}`)
  },

  /**
   * Obtener reservas con check-out expirado
   * Retorna vehículos que deberían haber salido ya pero siguen en parking
   *
   * @returns {Promise<OverdueBookingsResponse>} Lista de reservas retrasadas
   */
  getOverdueBookings: async (): Promise<OverdueBookingsResponse> => {
    return apiClient.get(`${API_URL}/parking/bookings/overdue/list`)
  },
}
