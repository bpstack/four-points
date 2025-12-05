// app/components/booking/BookingWizard/steps/DateOnlyStep.tsx

import { FaCalendar } from 'react-icons/fa'
import { formatDateLocal, formatDateForInput } from '@/app/lib/helpers/date'
import SimpleCalendar from '@/app/ui/calendar/simplecalendar'
import TimePicker from '@/app/ui/calendar/timepicker'
import { getStyles } from '../variants'
import type { BookingWizardState, BookingWizardActions } from '../types'

interface DateOnlyStepProps {
  state: BookingWizardState
  actions: BookingWizardActions
}

export default function DateOnlyStep({ state, actions }: DateOnlyStepProps) {
  const styles = getStyles('modal')

  return (
    <div className={styles.card}>
      <div>
        <h3 className={styles.title}>Detalles de la Reserva</h3>
        <p className={styles.subtitle}>Configura las fechas y el precio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHECK-IN */}
        <div className="relative">
          <label className={styles.label}>Fecha Entrada *</label>

          <button
            type="button"
            onClick={() => {
              actions.setShowCheckinCalendar(!state.showCheckinCalendar)
              actions.setShowCheckoutCalendar(false)
            }}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-left flex justify-between items-center"
          >
            <span>
              {state.reservationData.expected_checkin_date
                ? formatDateLocal(new Date(state.reservationData.expected_checkin_date))
                : 'Seleccionar fecha'}
            </span>
            <FaCalendar className="w-4 h-4 text-gray-500 dark:text-gray-300" />
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

          <div className="mt-2 md:w-40">
            <TimePicker
              value={state.reservationData.expected_checkin_time}
              onChange={(t) => actions.setReservationData({ expected_checkin_time: t })}
              openTo="right"
              label="Hora Entrada"
            />
          </div>
        </div>

        {/* CHECK-OUT */}
        <div className="relative">
          <label className={styles.label}>Fecha Salida *</label>

          <button
            type="button"
            onClick={() => {
              actions.setShowCheckoutCalendar(!state.showCheckoutCalendar)
              actions.setShowCheckinCalendar(false)
            }}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-left flex justify-between items-center"
          >
            <span>
              {state.reservationData.expected_checkout_date
                ? formatDateLocal(new Date(state.reservationData.expected_checkout_date))
                : 'Seleccionar fecha'}
            </span>
            <FaCalendar className="w-4 h-4 text-gray-500 dark:text-gray-300" />
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

          <div className="mt-2 md:w-40 md:ml-auto">
            <TimePicker
              value={state.reservationData.expected_checkout_time}
              onChange={(t) => actions.setReservationData({ expected_checkout_time: t })}
              openTo="left"
              label="Hora Salida"
            />
          </div>
        </div>
      </div>

      {actions.calculateDays() > 0 && (
        <div className={styles.alertInfo}>
          <p>
            📅 Duración: <span className="font-bold">{actions.calculateDays()} días</span>
          </p>
        </div>
      )}

      <div>
        <label className={styles.label}>Precio Total (€)</label>
        <input
          type="number"
          step="0.01"
          value={state.reservationData.total_amount}
          onChange={(e) => actions.setReservationData({ total_amount: e.target.value })}
          placeholder="Opcional"
          className={styles.input}
        />
      </div>

      <div>
        <label className={styles.label}>Origen de Reserva</label>
        <select
          value={state.reservationData.booking_source}
          onChange={(e) => actions.setReservationData({ booking_source: e.target.value })}
          className={styles.input}
        >
          <option value="direct">Directo</option>
          <option value="booking">Booking.com</option>
          <option value="airbnb">Airbnb</option>
          <option value="phone">Teléfono</option>
          <option value="email">Email</option>
          <option value="walkin">Walk-in</option>
        </select>
      </div>

      <div>
        <label className={styles.label}>Notas</label>
        <textarea
          value={state.reservationData.notes}
          onChange={(e) => actions.setReservationData({ notes: e.target.value })}
          rows={3}
          placeholder="Información adicional..."
          className={styles.input + ' resize-none'}
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4">
        <button onClick={actions.prevStep} className={styles.buttonSecondary}>
          Atrás
        </button>
        <button
          onClick={actions.nextStep}
          disabled={
            !state.reservationData.expected_checkin_date ||
            !state.reservationData.expected_checkout_date
          }
          className={styles.buttonPrimary}
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
