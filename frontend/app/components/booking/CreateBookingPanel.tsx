// app/components/booking/CreateBookingPanel.tsx

'use client'

import { useEffect, useState } from 'react'
import { FiSave, FiCalendar } from 'react-icons/fi'
import { FaSpinner } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { parkingApi } from '@/app/lib/parking'
import type { ParkingSpotDisplay, ParkingVehicle } from '@/app/lib/parking/types'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import TimePicker from '@/app/ui/calendar/timepicker'
import { formatDateForInput, parseInputDate } from '@/app/lib/helpers/date'
import {
  SlidePanel,
  SlidePanelSection,
  SlidePanelFooterButtons,
  FormField,
  inputClassName,
  selectClassName,
  textareaClassName,
  Alert,
} from '@/app/ui/panels'

interface CreateBookingPanelProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  /** Pre-selected spot from parking status */
  preSelectedSpot?: ParkingSpotDisplay | null
  /** Pre-selected date */
  selectedDate?: string
}

interface VehicleSearchResult {
  id: number
  plate_number: string
  owner_name: string
  model?: string
}

export function CreateBookingPanel({
  isOpen,
  onClose,
  onSuccess,
  preSelectedSpot,
  selectedDate,
}: CreateBookingPanelProps) {
  // Form state
  const [plateNumber, setPlateNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  
  const [checkinDate, setCheckinDate] = useState(selectedDate || '')
  const [checkinTime, setCheckinTime] = useState('15:00')
  const [checkoutDate, setCheckoutDate] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('12:00')
  
  const [totalAmount, setTotalAmount] = useState('')
  const [bookingSource, setBookingSource] = useState('direct')
  const [notes, setNotes] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchingVehicles, setSearchingVehicles] = useState(false)
  const [vehicleSearchResults, setVehicleSearchResults] = useState<VehicleSearchResult[]>([])
  const [showVehicleSearch, setShowVehicleSearch] = useState(false)
  const [showCheckinCalendar, setShowCheckinCalendar] = useState(false)
  const [showCheckoutCalendar, setShowCheckoutCalendar] = useState(false)
  const [error, setError] = useState('')

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      setPlateNumber('')
      setOwnerName('')
      setVehicleModel('')
      setVehicleId(null)
      setCheckinDate(selectedDate || '')
      setCheckinTime('15:00')
      setCheckoutDate('')
      setCheckoutTime('12:00')
      setTotalAmount('')
      setBookingSource('direct')
      setNotes('')
      setError('')
      setVehicleSearchResults([])
      setShowVehicleSearch(false)
    }
  }, [isOpen, selectedDate])

  // Update checkin date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setCheckinDate(selectedDate)
    }
  }, [selectedDate])

  // Close calendars on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.calendar-container')) {
        setShowCheckinCalendar(false)
        setShowCheckoutCalendar(false)
      }
    }

    if (showCheckinCalendar || showCheckoutCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCheckinCalendar, showCheckoutCalendar])

  // Search vehicles
  const handleSearchVehicles = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setVehicleSearchResults([])
      setShowVehicleSearch(false)
      return
    }

    setSearchingVehicles(true)
    try {
      const allVehicles = await parkingApi.getAllVehicles()
      const filtered = allVehicles.filter(
        (v: ParkingVehicle) =>
          v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setVehicleSearchResults(filtered.slice(0, 5))
      setShowVehicleSearch(filtered.length > 0)
    } catch (err) {
      console.error('Error searching vehicles:', err)
    } finally {
      setSearchingVehicles(false)
    }
  }

  // Select existing vehicle
  const handleSelectVehicle = (vehicle: VehicleSearchResult) => {
    setPlateNumber(vehicle.plate_number)
    setOwnerName(vehicle.owner_name)
    setVehicleModel(vehicle.model || '')
    setVehicleId(vehicle.id)
    setShowVehicleSearch(false)
    setVehicleSearchResults([])
    toast.success(`Vehículo ${vehicle.plate_number} seleccionado`)
  }

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ''
    const date = parseInputDate(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Calculate days
  const calculateDays = () => {
    if (!checkinDate || !checkoutDate) return 0
    const checkin = new Date(`${checkinDate}T${checkinTime}`)
    const checkout = new Date(`${checkoutDate}T${checkoutTime}`)
    const diffTime = Math.abs(checkout.getTime() - checkin.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Submit form
  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!plateNumber || !ownerName) {
      setError('Matrícula y propietario son obligatorios')
      return
    }

    if (!preSelectedSpot) {
      setError('No hay plaza seleccionada')
      return
    }

    if (!checkinDate || !checkoutDate) {
      setError('Las fechas de entrada y salida son obligatorias')
      return
    }

    const checkin = new Date(`${checkinDate}T${checkinTime}`)
    const checkout = new Date(`${checkoutDate}T${checkoutTime}`)

    if (checkout <= checkin) {
      setError('La fecha de salida debe ser posterior a la entrada')
      return
    }

    setIsSubmitting(true)

    try {
      // Create vehicle if needed
      let finalVehicleId = vehicleId
      if (!finalVehicleId) {
        const vehicleResult = await parkingApi.createVehicle({
          plate_number: plateNumber.toUpperCase(),
          owner_name: ownerName,
          model: vehicleModel || undefined,
        })
        finalVehicleId = vehicleResult.id
        toast.success('Vehículo creado')
      }

      // Create booking
      const payload = {
        spot_number: preSelectedSpot.spot_number,
        level_code: preSelectedSpot.level_code,
        vehicle_id: finalVehicleId,
        expected_checkin: `${checkinDate} ${checkinTime}`,
        expected_checkout: `${checkoutDate} ${checkoutTime}`,
        source: bookingSource,
        total_amount: totalAmount ? parseFloat(totalAmount) : undefined,
        notes: notes || undefined,
      }

      await parkingApi.createBooking(payload)
      toast.success('¡Reserva creada correctamente!')
      onSuccess?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la reserva'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const spotLabel = preSelectedSpot
    ? `Plaza ${preSelectedSpot.level_code.replace('-', '')} · Nº ${preSelectedSpot.spot_number}`
    : ''

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Reserva"
      subtitle={spotLabel || 'Completa los datos de la reserva'}
      size="lg"
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitText="Crear Reserva"
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="success"
        />
      }
    >
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <SlidePanelSection>
        {/* Vehicle Search */}
        <FormField label="Buscar Vehículo Existente">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por matrícula o propietario..."
              onChange={(e) => handleSearchVehicles(e.target.value)}
              className={inputClassName}
            />
            {searchingVehicles && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <FaSpinner className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}

            {showVehicleSearch && vehicleSearchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1c2128] border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {vehicleSearchResults.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => handleSelectVehicle(vehicle)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {vehicle.plate_number}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {vehicle.owner_name} {vehicle.model && `· ${vehicle.model}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </FormField>

        {/* Separator */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-[#151b23] px-2 text-gray-500 dark:text-gray-400">
              o introduce los datos
            </span>
          </div>
        </div>

        {/* Vehicle Data */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Matrícula" required>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => {
                setPlateNumber(e.target.value.toUpperCase())
                setVehicleId(null) // Reset vehicle ID when manually editing
              }}
              placeholder="1234ABC"
              className={inputClassName}
            />
          </FormField>

          <FormField label="Propietario" required>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value)
                setVehicleId(null)
              }}
              placeholder="Nombre del propietario"
              className={inputClassName}
            />
          </FormField>
        </div>

        <FormField label="Modelo del Vehículo" hint="Opcional">
          <input
            type="text"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="BMW X5, Tesla Model 3..."
            className={inputClassName}
          />
        </FormField>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          {/* Check-in Date */}
          <div className="relative calendar-container">
            <FormField label="Fecha de Entrada" required>
              <div className="relative">
                <input
                  type="text"
                  value={formatDateDisplay(checkinDate)}
                  readOnly
                  placeholder="Selecciona fecha"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCheckoutCalendar(false)
                    setShowCheckinCalendar(!showCheckinCalendar)
                  }}
                  className={`${inputClassName} pr-8 cursor-pointer`}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </FormField>

            {showCheckinCalendar && (
              <div className="absolute z-50 mt-1" onClick={(e) => e.stopPropagation()}>
                <SimpleCalendarCompact
                  selectedDate={checkinDate ? parseInputDate(checkinDate) : null}
                  onSelect={(date) => {
                    if (date) {
                      setCheckinDate(formatDateForInput(date))
                    }
                    setShowCheckinCalendar(false)
                  }}
                  onClose={() => setShowCheckinCalendar(false)}
                />
              </div>
            )}
          </div>

          {/* Check-out Date */}
          <div className="relative calendar-container">
            <FormField label="Fecha de Salida" required>
              <div className="relative">
                <input
                  type="text"
                  value={formatDateDisplay(checkoutDate)}
                  readOnly
                  placeholder="Selecciona fecha"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCheckinCalendar(false)
                    setShowCheckoutCalendar(!showCheckoutCalendar)
                  }}
                  className={`${inputClassName} pr-8 cursor-pointer`}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </FormField>

            {showCheckoutCalendar && (
              <div className="absolute z-50 mt-1 right-0" onClick={(e) => e.stopPropagation()}>
                <SimpleCalendarCompact
                  selectedDate={checkoutDate ? parseInputDate(checkoutDate) : null}
                  onSelect={(date) => {
                    if (date) {
                      setCheckoutDate(formatDateForInput(date))
                    }
                    setShowCheckoutCalendar(false)
                  }}
                  onClose={() => setShowCheckoutCalendar(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Time Pickers */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Hora de Entrada">
            <TimePicker
              value={checkinTime}
              onChange={setCheckinTime}
              openTo="right"
            />
          </FormField>

          <FormField label="Hora de Salida">
            <TimePicker
              value={checkoutTime}
              onChange={setCheckoutTime}
              openTo="left"
            />
          </FormField>
        </div>

        {/* Duration Info */}
        {calculateDays() > 0 && (
          <Alert variant="info">
            Duración de la estancia: <strong>{calculateDays()} día(s)</strong>
          </Alert>
        )}

        {/* Amount and Source */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Importe Total (€)" hint="Opcional, se calcula automáticamente">
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className={inputClassName}
            />
          </FormField>

          <FormField label="Origen de Reserva">
            <select
              value={bookingSource}
              onChange={(e) => setBookingSource(e.target.value)}
              className={selectClassName}
            >
              <option value="direct">Directo</option>
              <option value="booking_com">Booking.com</option>
              <option value="airbnb">Airbnb</option>
              <option value="expedia">Expedia</option>
              <option value="phone">Teléfono</option>
              <option value="email">Email</option>
              <option value="walkin">Walk-in</option>
            </select>
          </FormField>
        </div>

        {/* Notes */}
        <FormField label="Notas">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Notas adicionales sobre la reserva..."
            className={textareaClassName}
          />
        </FormField>
      </SlidePanelSection>
    </SlidePanel>
  )
}
