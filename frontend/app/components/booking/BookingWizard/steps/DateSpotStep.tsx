// app/components/booking/BookingWizard/steps/DateSpotStep.tsx

import { useRef, useEffect } from 'react'
import { FaCalendar, FaSpinner, FaArrowLeft } from 'react-icons/fa'
import { formatDateLocal, formatDateForInput } from '@/app/lib/helpers/date'
import SimpleCalendar from '@/app/ui/calendar/simplecalendar'
import TimePicker from '@/app/ui/calendar/timepicker'
import { getStyles } from '../variants'
import type { BookingWizardState, BookingWizardActions } from '../types'

interface DateSpotStepProps {
  state: BookingWizardState
  actions: BookingWizardActions
}

export default function DateSpotStep({ state, actions }: DateSpotStepProps) {
  const styles = getStyles('full')
  const checkinRef = useRef<HTMLDivElement>(null)
  const checkoutRef = useRef<HTMLDivElement>(null)

  // Cerrar calendarios al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (checkinRef.current && !checkinRef.current.contains(event.target as Node)) {
        actions.setShowCheckinCalendar(false)
      }
      if (checkoutRef.current && !checkoutRef.current.contains(event.target as Node)) {
        actions.setShowCheckoutCalendar(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [actions])

  return (
    <div className={styles.card}>
      <div className="flex gap-2 items-center mb-4">
        <FaCalendar className="w-5 h-5 text-[#0969da] dark:text-[#58a6ff]" />
        <h2 className={styles.sectionTitle}>Fechas y Plaza</h2>
      </div>

      <div className="space-y-4">
        {/* Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Check-in */}
          <div className="relative" ref={checkinRef}>
            <label className={styles.label}>
              Check-in <span className="text-[#cf222e] dark:text-[#f85149]">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                actions.setShowCheckinCalendar(!state.showCheckinCalendar)
                actions.setShowCheckoutCalendar(false)
              }}
              className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md text-[#24292f] dark:text-[#c9d1d9] focus:outline-none focus:ring-1 focus:ring-[#0969da] dark:focus:ring-[#1f6feb] text-sm text-left flex items-center justify-between"
            >
              <span
                className={
                  state.reservationData.expected_checkin_date
                    ? ''
                    : 'text-[#57606a] dark:text-[#8b949e]'
                }
              >
                {state.reservationData.expected_checkin_date
                  ? formatDateLocal(new Date(state.reservationData.expected_checkin_date))
                  : 'Seleccionar fecha'}
              </span>
              <FaCalendar className="w-4 h-4 text-[#57606a] dark:text-[#8b949e]" />
            </button>

            {state.showCheckinCalendar && (
              <div className="absolute z-40 mt-2 left-0 w-full md:w-[290px] md:left-0">
                <SimpleCalendar
                  selectedDate={
                    state.reservationData.expected_checkin_date
                      ? new Date(state.reservationData.expected_checkin_date)
                      : undefined
                  }
                  onSelect={(d) => {
                    if (d) {
                      actions.setReservationData({ expected_checkin_date: formatDateForInput(d) })
                    }
                    actions.setShowCheckinCalendar(false)
                  }}
                  onClose={() => actions.setShowCheckinCalendar(false)}
                />
              </div>
            )}

            <div className="mt-2">
              <TimePicker
                value={state.reservationData.expected_checkin_time}
                onChange={(t) => actions.setReservationData({ expected_checkin_time: t })}
                openTo="right"
                label="Hora Entrada"
              />
            </div>
          </div>

          {/* Check-out */}
          <div className="relative" ref={checkoutRef}>
            <label className={styles.label}>
              Check-out <span className="text-[#cf222e] dark:text-[#f85149]">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                actions.setShowCheckoutCalendar(!state.showCheckoutCalendar)
                actions.setShowCheckinCalendar(false)
              }}
              className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md text-[#24292f] dark:text-[#c9d1d9] focus:outline-none focus:ring-1 focus:ring-[#0969da] dark:focus:ring-[#1f6feb] text-sm text-left flex items-center justify-between"
            >
              <span
                className={
                  state.reservationData.expected_checkout_date
                    ? ''
                    : 'text-[#57606a] dark:text-[#8b949e]'
                }
              >
                {state.reservationData.expected_checkout_date
                  ? formatDateLocal(new Date(state.reservationData.expected_checkout_date))
                  : 'Seleccionar fecha'}
              </span>
              <FaCalendar className="w-4 h-4 text-[#57606a] dark:text-[#8b949e]" />
            </button>

            {state.showCheckoutCalendar && (
              <div className="absolute z-40 mt-2 left-0 w-full md:w-[290px] md:right-0 md:left-auto">
                <SimpleCalendar
                  selectedDate={
                    state.reservationData.expected_checkout_date
                      ? new Date(state.reservationData.expected_checkout_date)
                      : undefined
                  }
                  onSelect={(d) => {
                    if (d) {
                      actions.setReservationData({ expected_checkout_date: formatDateForInput(d) })
                    }
                    actions.setShowCheckoutCalendar(false)
                  }}
                  onClose={() => actions.setShowCheckoutCalendar(false)}
                />
              </div>
            )}

            <div className="mt-2 md:ml-auto">
              <TimePicker
                value={state.reservationData.expected_checkout_time}
                onChange={(t) => actions.setReservationData({ expected_checkout_time: t })}
                openTo="left"
                label="Hora Salida"
              />
            </div>
          </div>
        </div>

        {/* Info días */}
        {state.reservationData.expected_checkin_date &&
          state.reservationData.expected_checkout_date && (
            <div className="p-2 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded text-sm text-[#57606a] dark:text-[#8b949e]">
              <strong>{actions.calculateDays()}</strong> día(s) de estancia
            </div>
          )}

        {/* Buscar disponibilidad */}
        <button
          onClick={() => {
            if (actions.validateDates()) actions.handleLoadAvailability()
          }}
          disabled={
            state.loading ||
            !state.reservationData.expected_checkin_date ||
            !state.reservationData.expected_checkout_date
          }
          className={
            styles.buttonSecondary +
            ' w-full flex items-center justify-center gap-2 disabled:opacity-50'
          }
        >
          {state.loading ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              Buscando...
            </>
          ) : (
            'Buscar Plazas Disponibles'
          )}
        </button>

        {/* Grid de plazas */}
        {state.availableSpots.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[#24292f] dark:text-[#c9d1d9] mb-2">
              Plazas disponibles ({state.availableSpots.length})
            </h3>
            <div className={styles.spotGrid}>
              {state.availableSpots.map((spot) => {
                const normalizeLevel = (levelCode: string) => levelCode.replace('-', '')
                return (
                  <button
                    key={spot.id}
                    onClick={() => actions.handleSelectSpot(spot)}
                    className={styles.spotCard(state.selectedSpot?.id === spot.id)}
                  >
                    <div className="text-sm font-semibold text-[#24292f] dark:text-[#f0f6fc] mb-1">
                      Planta {normalizeLevel(spot.level_code)}
                    </div>
                    <div className="text-lg font-bold text-[#0969da] dark:text-[#58a6ff]">
                      Nº {spot.spot_number}
                    </div>
                    <div className="text-xs text-[#57606a] dark:text-[#8b949e] capitalize mt-1">
                      {spot.spot_type.replace('_', ' ')}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Campos adicionales */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className={styles.label}>Precio Manual (opcional)</label>
            <input
              type="number"
              step="0.01"
              value={state.reservationData.total_amount}
              onChange={(e) => actions.setReservationData({ total_amount: e.target.value })}
              placeholder="Dejar vacío = auto"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Fuente</label>
            <select
              value={state.reservationData.booking_source}
              onChange={(e) => actions.setReservationData({ booking_source: e.target.value })}
              className={styles.input}
            >
              <option value="direct">Directo</option>
              <option value="booking_com">Booking.com</option>
              <option value="airbnb">Airbnb</option>
              <option value="expedia">Expedia</option>
              <option value="agency_other">Otra Agencia</option>
            </select>
          </div>
        </div>

        <div>
          <label className={styles.label}>Código Externo (opcional)</label>
          <input
            type="text"
            value={state.reservationData.external_booking_id}
            onChange={(e) => actions.setReservationData({ external_booking_id: e.target.value })}
            placeholder="BK123456, AIR789..."
            className={styles.input}
          />
        </div>

        <div>
          <label className={styles.label}>Notas (opcional)</label>
          <textarea
            value={state.reservationData.notes}
            onChange={(e) => actions.setReservationData({ notes: e.target.value })}
            rows={3}
            placeholder="Información adicional sobre la reserva..."
            className={styles.input}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={actions.prevStep}
            className={styles.buttonSecondary + ' flex-1 flex items-center justify-center gap-2'}
          >
            <FaArrowLeft className="w-3 h-3" /> Atrás
          </button>
          <button
            onClick={actions.nextStep}
            disabled={!state.selectedSpot}
            className={styles.buttonPrimary + ' flex-1'}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
