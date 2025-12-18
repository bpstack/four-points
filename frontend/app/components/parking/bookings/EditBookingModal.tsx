// app/components/parking/bookings/EditBookingModal.tsx
'use client'

import { useState, useEffect } from 'react'
import type { ParkingBooking, ParkingVehicle, AvailableSpot } from '@/app/lib/parking/types'
import { parkingApi } from '@/app/lib/parking'
import { formatDateTimeLocal, BOOKING_SOURCES, SPOT_TYPES } from '../helpers'
import { FiEdit2, FiX, FiSearch, FiMapPin, FiTruck } from 'react-icons/fi'

interface EditBookingModalProps {
  booking: ParkingBooking
  onClose: () => void
  onConfirm: (data: {
    expected_checkin?: string
    expected_checkout?: string
    spot_number?: number
    level_code?: string
    vehicle_id?: number
    total_amount?: number
    booking_source?: string
    external_booking_id?: string
    notes?: string
  }) => Promise<void>
}

export function EditBookingModal({ booking, onClose, onConfirm }: EditBookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'spot' | 'vehicle'>('general')

  // Determinar si la reserva ya tiene check-in realizado
  const isCheckedIn = booking.status === 'checked_in'

  // Verificar si la fecha de check-in está en el pasado
  const checkinDate = new Date(booking.schedule.expected_checkin)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isCheckinInPast = checkinDate < today

  // Form data
  const [data, setData] = useState({
    expected_checkin: formatDateTimeLocal(new Date(booking.schedule.expected_checkin)),
    expected_checkout: formatDateTimeLocal(new Date(booking.schedule.expected_checkout)),
    total_amount: booking.payment.total_amount.toString(),
    booking_source: booking.booking_info.source || 'direct',
    external_booking_id: booking.booking_info.external_id || '',
    notes: booking.notes || '',
  })

  // Spot selection
  const extractSpotNumber = (num: number | string): number => {
    if (typeof num === 'number') return num
    return parseInt(String(num).replace(/\D/g, '')) || 0
  }

  const [selectedSpot, setSelectedSpot] = useState({
    spot_number: extractSpotNumber(booking.spot.number),
    level_code: String(booking.spot.level).includes('2') ? '-2' : '-3',
  })
  const [availableSpots, setAvailableSpots] = useState<AvailableSpot[]>([])
  const [loadingSpots, setLoadingSpots] = useState(false)

  // Vehicle selection
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(booking.vehicle?.id || null)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicles, setVehicles] = useState<ParkingVehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  // Load available spots when dates change
  useEffect(() => {
    if (data.expected_checkin && data.expected_checkout) {
      loadAvailableSpots()
    }
  }, [data.expected_checkin, data.expected_checkout])

  const loadAvailableSpots = async () => {
    setLoadingSpots(true)
    try {
      // Si la fecha de entrada está en el pasado, usar hoy como start_date
      const startDate = isCheckinInPast 
        ? new Date().toISOString().split('T')[0]
        : data.expected_checkin.split('T')[0]
      const endDate = data.expected_checkout.split('T')[0]
      const result = await parkingApi.getAvailableSpotsByRange({
        start_date: startDate,
        end_date: endDate,
      })
      setAvailableSpots(result.spots || [])
    } catch (error) {
      console.error('Error loading spots:', error)
    } finally {
      setLoadingSpots(false)
    }
  }

  // Search vehicles
  useEffect(() => {
    if (vehicleSearch.length >= 2) {
      searchVehicles()
    } else {
      setVehicles([])
    }
  }, [vehicleSearch])

  const searchVehicles = async () => {
    setLoadingVehicles(true)
    try {
      const result = await parkingApi.searchVehicles(vehicleSearch)
      setVehicles(result)
    } catch (error) {
      console.error('Error searching vehicles:', error)
    } finally {
      setLoadingVehicles(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const updateData: Parameters<typeof onConfirm>[0] = {}

      // General data
      if (data.expected_checkin !== formatDateTimeLocal(new Date(booking.schedule.expected_checkin))) {
        updateData.expected_checkin = data.expected_checkin
      }
      if (data.expected_checkout !== formatDateTimeLocal(new Date(booking.schedule.expected_checkout))) {
        updateData.expected_checkout = data.expected_checkout
      }
      if (parseFloat(data.total_amount) !== booking.payment.total_amount) {
        updateData.total_amount = parseFloat(data.total_amount)
      }
      if (data.booking_source !== booking.booking_info.source) {
        updateData.booking_source = data.booking_source
      }
      if (data.external_booking_id !== (booking.booking_info.external_id || '')) {
        updateData.external_booking_id = data.external_booking_id
      }
      if (data.notes !== (booking.notes || '')) {
        updateData.notes = data.notes
      }

      // Spot data
      const currentSpotNumber = extractSpotNumber(booking.spot.number)
      const currentLevel = String(booking.spot.level).includes('2') ? '-2' : '-3'
      if (selectedSpot.spot_number !== currentSpotNumber) {
        updateData.spot_number = selectedSpot.spot_number
      }
      if (selectedSpot.level_code !== currentLevel) {
        updateData.level_code = selectedSpot.level_code
      }

      // Vehicle data
      if (selectedVehicle !== booking.vehicle?.id) {
        updateData.vehicle_id = selectedVehicle || undefined
      }

      await onConfirm(updateData)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'general', label: 'General', icon: FiEdit2 },
    { id: 'spot', label: 'Plaza', icon: FiMapPin },
    { id: 'vehicle', label: 'Vehiculo', icon: FiTruck },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FiEdit2 className="w-5 h-5 text-blue-600" />
              Editar Reserva
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {booking.booking_code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Aviso si la reserva ya tiene check-in */}
              {isCheckedIn && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Esta reserva ya tiene check-in realizado. La fecha de entrada no se puede modificar.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Check-in esperado
                  </label>
                  <input
                    type="datetime-local"
                    value={data.expected_checkin}
                    onChange={(e) => setData({ ...data, expected_checkin: e.target.value })}
                    disabled={isCheckedIn || isCheckinInPast}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                  />
                  {isCheckinInPast && !isCheckedIn && (
                    <p className="text-xs text-gray-500 mt-1">Fecha en el pasado - no editable</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Check-out esperado
                  </label>
                  <input
                    type="datetime-local"
                    value={data.expected_checkout}
                    onChange={(e) => setData({ ...data, expected_checkout: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Importe total
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={data.total_amount}
                    onChange={(e) => setData({ ...data, total_amount: e.target.value })}
                    className="w-full px-3 py-2 pr-8 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Origen de reserva
                  </label>
                  <select
                    value={data.booking_source}
                    onChange={(e) => setData({ ...data, booking_source: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(BOOKING_SOURCES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID Externo
                  </label>
                  <input
                    type="text"
                    value={data.external_booking_id}
                    onChange={(e) => setData({ ...data, external_booking_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BK-123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas
                </label>
                <textarea
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          )}

          {/* Spot Tab */}
          {activeTab === 'spot' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Plaza actual: <strong>{booking.spot.level} - {booking.spot.number}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Planta
                </label>
                <select
                  value={selectedSpot.level_code}
                  onChange={(e) => setSelectedSpot({ ...selectedSpot, level_code: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="-2">Planta -2</option>
                  <option value="-3">Planta -3</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plazas disponibles
                  {loadingSpots && <span className="ml-2 text-gray-400">(cargando...)</span>}
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  {availableSpots
                    .filter((s) => s.level_code === selectedSpot.level_code)
                    .map((spot) => (
                      <button
                        key={spot.id}
                        onClick={() => setSelectedSpot({ ...selectedSpot, spot_number: spot.spot_number })}
                        className={`p-2 text-sm font-medium rounded-lg border transition-colors ${
                          selectedSpot.spot_number === spot.spot_number
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                      >
                        {spot.spot_number}
                        <span className="block text-xs opacity-70">
                          {SPOT_TYPES[spot.spot_type] || spot.spot_type}
                        </span>
                      </button>
                    ))}
                  {availableSpots.filter((s) => s.level_code === selectedSpot.level_code).length === 0 && !loadingSpots && (
                    <p className="col-span-4 text-center text-sm text-gray-500 py-4">
                      No hay plazas disponibles en estas fechas
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Tab */}
          {activeTab === 'vehicle' && (
            <div className="space-y-4">
              {booking.vehicle && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Vehiculo actual: <strong>{booking.vehicle.plate}</strong> - {booking.vehicle.owner}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Buscar vehiculo
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Buscar por matricula o propietario..."
                  />
                </div>
              </div>

              {loadingVehicles && (
                <div className="text-center py-4">
                  <span className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin inline-block" />
                </div>
              )}

              {vehicles.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => setSelectedVehicle(vehicle.id)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedVehicle === vehicle.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                          {vehicle.plate_number}
                        </span>
                        {vehicle.model && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {vehicle.model}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {vehicle.owner_name}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {selectedVehicle && (
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Quitar vehiculo asignado
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiEdit2 className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditBookingModal
