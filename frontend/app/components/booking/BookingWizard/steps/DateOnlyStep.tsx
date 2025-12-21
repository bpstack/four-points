// app/components/booking/BookingWizard/steps/DateOnlyStep.tsx

import { FaCalendar } from 'react-icons/fa'
import { formatDateLocal, formatDateForInput } from '@/app/lib/helpers/date'
import SimpleCalendar from '@/app/ui/calendar/simplecalendar'
import TimePicker from '@/app/ui/calendar/timepicker'
import {
  SlidePanelSection,
  FormField,
  inputClassName,
  selectClassName,
  textareaClassName,
  Alert,
} from '@/app/ui/panels'
import type { BookingWizardState, BookingWizardActions } from '../types'

interface DateOnlyStepProps {
  state: BookingWizardState
  actions: BookingWizardActions
}

export default function DateOnlyStep({ state, actions }: DateOnlyStepProps) {
  return (
    <div className="space-y-6">
      {/* Fechas */}
      <SlidePanelSection title="Fechas de la reserva">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CHECK-IN */}
          <div className="relative calendar-container">
            <FormField label="Fecha de entrada" required>
              <button
                type="button"
                onClick={() => {
                  actions.setShowCheckinCalendar(!state.showCheckinCalendar)
                  actions.setShowCheckoutCalendar(false)
                }}
                className={`${inputClassName} text-left flex justify-between items-center`}
              >
                <span
                  className={state.reservationData.expected_checkin_date ? '' : 'text-gray-400'}
                >
                  {state.reservationData.expected_checkin_date
                    ? formatDateLocal(new Date(state.reservationData.expected_checkin_date))
                    : 'Seleccionar fecha'}
                </span>
                <FaCalendar className="w-4 h-4 text-gray-400" />
              </button>
            </FormField>

            {state.showCheckinCalendar && (
              <div className="absolute z-40 mt-1 left-0 right-0 sm:right-auto sm:w-[290px]">
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
                label="Hora de entrada"
              />
            </div>
          </div>

          {/* CHECK-OUT */}
          <div className="relative calendar-container">
            <FormField label="Fecha de salida" required>
              <button
                type="button"
                onClick={() => {
                  actions.setShowCheckoutCalendar(!state.showCheckoutCalendar)
                  actions.setShowCheckinCalendar(false)
                }}
                className={`${inputClassName} text-left flex justify-between items-center`}
              >
                <span
                  className={state.reservationData.expected_checkout_date ? '' : 'text-gray-400'}
                >
                  {state.reservationData.expected_checkout_date
                    ? formatDateLocal(new Date(state.reservationData.expected_checkout_date))
                    : 'Seleccionar fecha'}
                </span>
                <FaCalendar className="w-4 h-4 text-gray-400" />
              </button>
            </FormField>

            {state.showCheckoutCalendar && (
              <div className="absolute z-40 mt-1 left-0 right-0 sm:left-auto sm:right-0 sm:w-[290px]">
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

            <div className="mt-2">
              <TimePicker
                value={state.reservationData.expected_checkout_time}
                onChange={(t) => actions.setReservationData({ expected_checkout_time: t })}
                openTo="left"
                label="Hora de salida"
              />
            </div>
          </div>
        </div>

        {/* Duration info */}
        {actions.calculateDays() > 0 && (
          <Alert variant="info" className="mt-4">
            <p>
              Duración de la estancia:{' '}
              <span className="font-semibold">{actions.calculateDays()} día(s)</span>
            </p>
          </Alert>
        )}
      </SlidePanelSection>

      {/* Detalles adicionales */}
      <SlidePanelSection title="Detalles de la reserva">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Precio total (€)">
            <input
              type="number"
              step="0.01"
              value={state.reservationData.total_amount}
              onChange={(e) => actions.setReservationData({ total_amount: e.target.value })}
              placeholder="Dejar vacío para cálculo automático"
              className={inputClassName}
            />
          </FormField>

          <FormField label="Origen de reserva">
            <select
              value={state.reservationData.booking_source}
              onChange={(e) => actions.setReservationData({ booking_source: e.target.value })}
              className={selectClassName}
            >
              <option value="direct">Directo</option>
              <option value="booking">Booking.com</option>
              <option value="airbnb">Airbnb</option>
              <option value="phone">Teléfono</option>
              <option value="email">Email</option>
              <option value="walkin">Walk-in</option>
            </select>
          </FormField>
        </div>

        <FormField label="Notas" className="mt-4">
          <textarea
            value={state.reservationData.notes}
            onChange={(e) => actions.setReservationData({ notes: e.target.value })}
            rows={3}
            placeholder="Información adicional sobre la reserva..."
            className={textareaClassName}
          />
        </FormField>
      </SlidePanelSection>
    </div>
  )
}
