// app/components/booking/BookingWizard/steps/ConfirmationStep.tsx

import { FaArrowLeft, FaSpinner, FaCar } from 'react-icons/fa'
import { MdLocalParking } from 'react-icons/md'
import { getStyles } from '../variants'
import type { BookingWizardState, BookingWizardActions, WizardVariant } from '../types'
import { stat } from 'fs'

interface ConfirmationStepProps {
  variant: WizardVariant
  state: BookingWizardState
  actions: BookingWizardActions
}

export default function ConfirmationStep({ variant, state, actions }: ConfirmationStepProps) {
  const styles = getStyles(variant)

  if (variant === 'full') {
    return (
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Confirmar Reserva</h2>

        <div className="space-y-2 p-4 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md text-sm">
          {state.vehicleId && (
            <>
              <div className="flex justify-between">
                <span className="text-[#57606a] dark:text-[#8b949e]">Vehículo:</span>
                <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
                  {state.vehicleData.plate_number} - {state.vehicleData.model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#57606a] dark:text-[#8b949e]">Propietario:</span>
                <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
                  {state.vehicleData.owner_name}
                </span>
              </div>
            </>
          )}
          {!state.vehicleId && (
            <div className="text-sm text-[#57606a] dark:text-[#8b949e] italic">
              Sin vehículo asociado
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-[#d0d7de] dark:border-[#30363d]">
            <span className="text-[#57606a] dark:text-[#8b949e]">Plaza:</span>
            <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
              Planta {state.reservationData.level_code.replace('-', '')} - Nº{' '}
              {state.reservationData.spot_number}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57606a] dark:text-[#8b949e]">Check-in:</span>
            <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
              {state.reservationData.expected_checkin_date}{' '}
              {state.reservationData.expected_checkin_time}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57606a] dark:text-[#8b949e]">Check-out:</span>
            <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
              {state.reservationData.expected_checkout_date}{' '}
              {state.reservationData.expected_checkout_time}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#57606a] dark:text-[#8b949e]">Días:</span>
            <span className="font-medium text-[#24292f] dark:text-[#f0f6fc]">
              {actions.calculateDays()}
            </span>
          </div>
          {state.reservationData.total_amount && (
            <div className="flex justify-between pt-2 border-t border-[#d0d7de] dark:border-[#30363d]">
              <span className="font-medium text-[#24292f] dark:text-[#c9d1d9]">Precio:</span>
              <span className="font-bold text-[#1a7f37] dark:text-[#3fb950]">
                €{parseFloat(state.reservationData.total_amount).toFixed(2)}
              </span>
            </div>
          )}
          {!state.reservationData.total_amount && (
            <div className="text-xs text-[#57606a] dark:text-[#8b949e] pt-2 border-t border-[#d0d7de] dark:border-[#30363d]">
              Precio se calculará automáticamente
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={actions.prevStep}
            className={styles.buttonSecondary + ' flex-1 flex items-center justify-center gap-2'}
          >
            <FaArrowLeft className="w-3 h-3" /> Atrás
          </button>
          <button
            onClick={actions.handleCreateReservation}
            disabled={state.loading}
            className={styles.buttonSuccess + ' flex-1 flex items-center justify-center gap-2'}
          >
            {state.loading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              'Confirmar Reserva'
            )}
          </button>
        </div>
      </div>
    )
  }

  // Variant modal
  return (
    <div className={styles.card}>
      <div>
        <h3 className={styles.title}>Confirmar Reserva</h3>
        <p className={styles.subtitle}>Revisa los detalles antes de confirmar</p>
      </div>

      <div className="space-y-4 p-5 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-900/60 rounded-xl border border-gray-100 dark:border-slate-700/50">
        {state.vehicleId && (
          <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <FaCar className="w-4 h-4" />
              Vehículo
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Matrícula:</span>
                <p className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {state.vehicleData.plate_number} - {state.vehicleData.model}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Propietario:</span>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {state.vehicleData.owner_name}
                </p>
              </div>
            </div>
          </div>
        )}
        {!state.vehicleId && (
          <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic text-center">
              Sin vehículo asociado
            </p>
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            <MdLocalParking className="w-4 h-4" />
            Reserva
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Plaza:</span>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {state.reservationData.level_code.replace('-', '')} ·{' '}
                {state.reservationData.spot_number}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Días:</span>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {actions.calculateDays()}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Entrada:</span>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {new Date(
                  `${state.reservationData.expected_checkin_date}T${state.reservationData.expected_checkin_time}`
                ).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Salida:</span>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {new Date(
                  `${state.reservationData.expected_checkout_date}T${state.reservationData.expected_checkout_time}`
                ).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
        {state.reservationData.total_amount && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Precio Total:
              </span>
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                €{parseFloat(state.reservationData.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={actions.prevStep} className={styles.buttonSecondary}>
          Atrás
        </button>
        <button
          onClick={actions.handleCreateReservation}
          disabled={state.loading}
          className={styles.buttonSuccess}
        >
          {state.loading ? (
            <span className="flex items-center justify-center gap-2">
              <FaSpinner className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-spin" />
              Creando...
            </span>
          ) : (
            'Confirmar Reserva'
          )}
        </button>
      </div>
    </div>
  )
}
