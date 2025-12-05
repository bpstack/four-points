// app/components/booking/BookingWizard/steps/VehicleStep.tsx

import { FaCar, FaSpinner } from 'react-icons/fa'
import { getStyles } from '../variants'
import type { BookingWizardState, BookingWizardActions, WizardVariant } from '../types'

interface VehicleStepProps {
  variant: WizardVariant
  state: BookingWizardState
  actions: BookingWizardActions
  onCancel?: () => void
}

export default function VehicleStep({ variant, state, actions, onCancel }: VehicleStepProps) {
  const styles = getStyles(variant)

  return (
    <div className={styles.card}>
      {variant === 'full' && (
        <div className="flex gap-2 items-center mb-4">
          <FaCar className="w-5 h-5 text-[#0969da] dark:text-[#58a6ff]" />
          <h2 className={styles.sectionTitle}>Datos del Vehículo</h2>
        </div>
      )}

      {variant === 'full' && (
        <div className={styles.alertInfo}>
          <p>Tienes que crear la reserva con un vehículo asociado, puedes modificarlo después.</p>
        </div>
      )}

      {/* Búsqueda de vehículos existentes */}
      <div className="mb-4">
        <label className={styles.label}>
          {variant === 'full' ? 'Buscar Vehículo Existente' : 'Buscar Vehículo'}
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder={
              variant === 'full'
                ? 'Buscar por matrícula o propietario...'
                : 'Escribe la matrícula...'
            }
            onChange={(e) => actions.handleSearchVehicles(e.target.value)}
            className={styles.input}
          />
          {state.searchingVehicles && (
            <div
              className={variant === 'full' ? 'absolute right-3 top-2.5' : 'absolute right-3 top-3'}
            >
              <FaSpinner className="w-4 h-4 animate-spin text-[#57606a] dark:text-[#8b949e]" />
            </div>
          )}

          {state.showVehicleSearch && state.vehicleSearchResults.length > 0 && (
            <div
              className={
                variant === 'full'
                  ? 'absolute z-10 w-full mt-1 bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md shadow-lg max-h-48 overflow-y-auto'
                  : 'absolute z-10 mt-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto'
              }
            >
              {state.vehicleSearchResults.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => actions.handleSelectExistingVehicle(vehicle)}
                  className={
                    variant === 'full'
                      ? 'w-full px-3 py-2 text-left hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] transition-colors border-b border-[#d0d7de] dark:border-[#30363d] last:border-b-0'
                      : 'w-full px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0'
                  }
                >
                  <div
                    className={
                      variant === 'full'
                        ? 'font-medium text-[#24292f] dark:text-[#f0f6fc]'
                        : 'text-sm font-semibold text-gray-900 dark:text-gray-100'
                    }
                  >
                    {vehicle.plate_number}
                  </div>
                  <div
                    className={
                      variant === 'full'
                        ? 'text-xs text-[#57606a] dark:text-[#8b949e]'
                        : 'text-xs text-gray-600 dark:text-gray-400'
                    }
                  >
                    {vehicle.owner_name} {vehicle.model && `• ${vehicle.model}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {variant === 'full' && (
          <p className="text-xs text-[#57606a] dark:text-[#8b949e] mt-1">
            O crea uno nuevo a continuación
          </p>
        )}
      </div>

      {/* Separador */}
      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center">
          <div
            className={
              variant === 'full'
                ? 'w-full border-t border-[#d0d7de] dark:border-[#30363d]'
                : 'w-full border-t border-gray-200 dark:border-gray-700'
            }
          ></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span
            className={
              variant === 'full'
                ? 'bg-white dark:bg-[#161b22] px-2 text-[#57606a] dark:text-[#8b949e]'
                : 'px-3 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400'
            }
          >
            {variant === 'full' ? 'Nuevo Vehículo' : 'o crea uno nuevo'}
          </span>
        </div>
      </div>

      {/* Formulario nuevo vehículo */}
      <div className={variant === 'full' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
        <div className={variant === 'modal' ? '' : ''}>
          <label className={styles.label}>Matrícula {variant === 'modal' && '*'}</label>
          <input
            type="text"
            value={state.vehicleData.plate_number}
            onChange={(e) => actions.setVehicleData({ plate_number: e.target.value.toUpperCase() })}
            className={styles.input + (variant === 'full' ? ' uppercase' : '')}
            placeholder="1234ABC"
          />
        </div>

        <div className={variant === 'modal' ? '' : ''}>
          <label className={styles.label}>Propietario {variant === 'modal' && '*'}</label>
          <input
            type="text"
            value={state.vehicleData.owner_name}
            onChange={(e) => actions.setVehicleData({ owner_name: e.target.value })}
            className={styles.input}
            placeholder={variant === 'full' ? 'Juan García' : 'Nombre del propietario'}
          />
        </div>

        <div className={variant === 'modal' ? 'md:col-span-2' : ''}>
          <label className={styles.label}>Modelo {variant === 'full' && '(opcional)'}</label>
          <input
            type="text"
            value={state.vehicleData.model}
            onChange={(e) => actions.setVehicleData({ model: e.target.value })}
            className={styles.input}
            placeholder={variant === 'full' ? 'BMW X5, Tesla Model 3...' : 'Marca y modelo'}
          />
        </div>
      </div>

      {/* Botones */}
      <div className={variant === 'full' ? 'grid grid-cols-2 gap-2 pt-3' : 'flex gap-3 pt-4'}>
        <button
          onClick={onCancel}
          className={
            variant === 'full' ? styles.buttonSecondary : `${styles.buttonSecondary} flex-1`
          }
        >
          Cancelar
        </button>
        <button
          onClick={actions.handleCreateVehicle}
          disabled={
            state.loading || !state.vehicleData.plate_number || !state.vehicleData.owner_name
          }
          className={
            variant === 'full'
              ? styles.buttonPrimary + ' flex items-center justify-center gap-2'
              : styles.buttonPrimary
          }
        >
          {state.loading ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              {variant === 'full' ? 'Creando...' : 'Creando...'}
            </>
          ) : variant === 'full' ? (
            'Crear y Continuar'
          ) : (
            'Continuar'
          )}
        </button>
      </div>
    </div>
  )
}
