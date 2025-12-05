// app/components/booking/BookingWizard/index.tsx

'use client'

import { FaExclamationCircle, FaCheck } from 'react-icons/fa'
import { FiPlus, FiX } from 'react-icons/fi'
import { useBookingWizard } from './hooks/useBookingWizard'
import { getStyles } from './variants'
import VehicleStep from './steps/VehicleStep'
import DateSpotStep from './steps/DateSpotStep'
import DateOnlyStep from './steps/DateOnlyStep'
import ConfirmationStep from './steps/ConfirmationStep'
import type { BookingWizardProps } from './types'

export default function BookingWizard({
  variant = 'full',
  preSelectedSpot,
  selectedDate,
  onSuccess,
  onCancel,
}: BookingWizardProps) {
  const { state, actions } = useBookingWizard({
    variant,
    preSelectedSpot,
    selectedDate,
    onSuccess,
    onCancel,
  })

  const styles = getStyles(variant)

  // Success screen (solo para variant='full')
  if (variant === 'full' && state.step === 4 && state.success) {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md p-6 text-center">
            <div className="w-16 h-16 bg-[#ddf4ff] dark:bg-[#051d30] rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="w-8 h-8 text-[#0969da] dark:text-[#58a6ff]" />
            </div>

            <h2 className="text-xl font-semibold text-[#24292f] dark:text-[#f0f6fc] mb-2">
              ¡Reserva Creada!
            </h2>

            <p className="text-sm text-[#57606a] dark:text-[#8b949e] mb-6">
              La reserva se ha creado exitosamente y está lista para su uso.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = '/dashboard/parking/bookings')}
                className="flex-1 px-4 py-2 bg-[#0969da] hover:bg-[#0550ae] dark:bg-[#1f6feb] dark:hover:bg-[#1158c7] text-white rounded-md font-medium transition text-sm"
              >
                Ver Todas las Reservas
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-[#f6f8fa] hover:bg-[#eaeef2] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#24292f] dark:text-[#c9d1d9] rounded-md font-medium transition text-sm"
              >
                Crear Otra Reserva
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render wizard según variante
  if (variant === 'full') {
    return (
      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Header */}
          <div className="mb-6">
            <h1 className={styles.title}>Nueva Reserva</h1>
            <p className={styles.subtitle}>Paso {state.step} de 3</p>

            <div className={styles.progressContainer}>
              {[1, 2, 3].map((s) => (
                <div key={s} className={styles.progressBar(s <= state.step)} />
              ))}
            </div>
          </div>

          {/* Alertas */}
          {state.error && (
            <div className={styles.alertError}>
              <FaExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{state.error}</p>
            </div>
          )}

          {state.success && (
            <div className={styles.alertSuccess}>
              <FaCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>¡Reserva creada exitosamente!</p>
            </div>
          )}

          {/* Steps */}
          {state.step === 1 && (
            <VehicleStep
              variant={variant}
              state={state}
              actions={actions}
              onCancel={() => (window.location.href = '/dashboard/parking/bookings')}
            />
          )}

          {state.step === 2 && <DateSpotStep state={state} actions={actions} />}

          {state.step === 3 && (
            <ConfirmationStep variant={variant} state={state} actions={actions} />
          )}
        </div>
      </div>
    )
  }

  // Variant modal - AGREGAR EL WRAPPER DEL MODAL AQUÍ
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl bg-[#f6f8fa] dark:bg-[#0d1117] rounded-2xl shadow-2xl border border-indigo-200/50 dark:border-indigo-800/30 overflow-hidden">
          {/* Header del modal */}
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <FiPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Nueva Reserva
                </h2>
                {preSelectedSpot && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Plaza {preSelectedSpot.level_code.replace('-', '')} ·{' '}
                    {preSelectedSpot.spot_number}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                      num <= state.step
                        ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {num}
                  </div>
                  {num < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 rounded transition-all duration-200 ${
                        num < state.step
                          ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
                          : 'bg-gray-200 dark:bg-slate-800'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content container */}
          <div className={styles.container}>
            {/* Error alert */}
            {state.error && (
              <div className={styles.alertError}>
                <p>{state.error}</p>
              </div>
            )}

            {/* Steps */}
            {state.step === 1 && (
              <VehicleStep variant={variant} state={state} actions={actions} onCancel={onCancel} />
            )}

            {state.step === 2 && <DateOnlyStep state={state} actions={actions} />}

            {state.step === 3 && (
              <ConfirmationStep variant={variant} state={state} actions={actions} />
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
