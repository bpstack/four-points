// app/components/booking/BookingWizard/index.tsx

'use client'

import { useRouter } from 'next/navigation'
import { FaExclamationCircle, FaCheck } from 'react-icons/fa'
import { FiPlus } from 'react-icons/fi'
import { useBookingWizard } from './hooks/useBookingWizard'
import { SlidePanel, SlidePanelFooterButtons, StepIndicator, Alert } from '@/app/ui/panels'
import VehicleStep from './steps/VehicleStep'
import DateSpotStep from './steps/DateSpotStep'
import DateOnlyStep from './steps/DateOnlyStep'
import ConfirmationStep from './steps/ConfirmationStep'
import type { BookingWizardProps } from './types'

// Progress bar styles for full variant
const progressBarClass = (isActive: boolean) =>
  `h-0.5 flex-1 rounded-full transition-colors ${
    isActive ? 'bg-[#0969da] dark:bg-[#1f6feb]' : 'bg-[#d0d7de] dark:bg-[#30363d]'
  }`

// Steps configuration for SlidePanel wizard
const wizardSteps = [
  { number: 1, label: 'Vehículo' },
  { number: 2, label: 'Fechas' },
  { number: 3, label: 'Confirmar' },
]

export default function BookingWizard({
  variant = 'full',
  preSelectedSpot,
  selectedDate,
  onSuccess,
  onCancel,
}: BookingWizardProps) {
  const router = useRouter()
  const { state, actions } = useBookingWizard({
    variant,
    preSelectedSpot,
    selectedDate,
    onSuccess,
    onCancel,
  })

  // Success screen (solo para variant='full')
  if (variant === 'full' && state.step === 4 && state.success) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#010409] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
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

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/dashboard/parking/bookings')}
                  className="flex-1 px-4 py-2 bg-[#0969da] hover:bg-[#0550ae] dark:bg-[#1f6feb] dark:hover:bg-[#1158c7] text-white rounded-md font-medium transition text-sm"
                >
                  Ver Todas las Reservas
                </button>
                <button
                  onClick={() => router.refresh()}
                  className="flex-1 px-4 py-2 bg-[#f6f8fa] hover:bg-[#eaeef2] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#24292f] dark:text-[#c9d1d9] rounded-md font-medium transition text-sm"
                >
                  Crear Otra Reserva
                </button>
              </div>
              <button
                onClick={() => router.push('/dashboard/parking/status')}
                className="w-full px-4 py-2 bg-[#f6f8fa] hover:bg-[#eaeef2] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#24292f] dark:text-[#c9d1d9] rounded-md font-medium transition text-sm"
              >
                Ir al Control de Parking
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render full page variant
  if (variant === 'full') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#010409] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-[#24292f] dark:text-[#f0f6fc] mb-4">
              Nueva Reserva
            </h1>
            <p className="text-sm text-[#57606a] dark:text-[#8b949e]">Paso {state.step} de 3</p>

            <div className="mt-3 flex gap-1">
              {[1, 2, 3].map((s) => (
                <div key={s} className={progressBarClass(s <= state.step)} />
              ))}
            </div>
          </div>

          {/* Alertas */}
          {state.error && (
            <Alert variant="warning" className="mb-4">
              <div className="flex gap-2">
                <FaExclamationCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>{state.error}</p>
              </div>
            </Alert>
          )}

          {state.success && (
            <Alert variant="success" className="mb-4">
              <div className="flex gap-2">
                <FaCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>¡Reserva creada exitosamente!</p>
              </div>
            </Alert>
          )}

          {/* Steps */}
          {state.step === 1 && (
            <VehicleStep
              variant={variant}
              state={state}
              actions={actions}
              onCancel={() => router.push('/dashboard/parking/bookings')}
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

  // Variant modal - using SlidePanel (same as CreateGroupPanel, CreateReportPanel)
  if (variant === 'modal') {
    const subtitle = preSelectedSpot
      ? `Plaza ${preSelectedSpot.level_code.replace('-', '')} · Nº ${preSelectedSpot.spot_number}`
      : 'Completa los datos para crear una reserva'

    // Determine footer buttons based on current step
    const getFooterButtons = () => {
      if (state.step === 1) {
        return (
          <SlidePanelFooterButtons
            onCancel={onCancel || (() => {})}
            onSubmit={actions.handleCreateVehicle}
            cancelText="Cancelar"
            submitText={state.loading ? 'Creando...' : 'Continuar'}
            isSubmitting={state.loading}
            submitDisabled={!state.vehicleData.plate_number || !state.vehicleData.owner_name}
            submitVariant="primary"
          />
        )
      }

      if (state.step === 2) {
        return (
          <SlidePanelFooterButtons
            onCancel={onCancel || (() => {})}
            onBack={actions.prevStep}
            onSubmit={actions.nextStep}
            cancelText="Cancelar"
            submitText="Continuar"
            submitDisabled={
              !state.reservationData.expected_checkin_date ||
              !state.reservationData.expected_checkout_date
            }
            submitVariant="primary"
          />
        )
      }

      if (state.step === 3) {
        return (
          <SlidePanelFooterButtons
            onCancel={onCancel || (() => {})}
            onBack={actions.prevStep}
            onSubmit={actions.handleCreateReservation}
            cancelText="Cancelar"
            submitText={state.loading ? 'Creando...' : 'Confirmar Reserva'}
            isSubmitting={state.loading}
            submitVariant="success"
          />
        )
      }

      return null
    }

    return (
      <SlidePanel
        isOpen={true}
        onClose={onCancel || (() => {})}
        title="Nueva Reserva"
        subtitle={subtitle}
        size="lg"
        headerIcon={<FiPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        steps={wizardSteps}
        currentStep={state.step}
        closeOnBackdrop={false}
        footer={getFooterButtons()}
      >
        {/* Error alert */}
        {state.error && (
          <Alert variant="error" className="mb-4">
            <p>{state.error}</p>
          </Alert>
        )}

        {/* Steps content */}
        {state.step === 1 && <VehicleStep variant={variant} state={state} actions={actions} />}

        {state.step === 2 && <DateOnlyStep state={state} actions={actions} />}

        {state.step === 3 && <ConfirmationStep variant={variant} state={state} actions={actions} />}
      </SlidePanel>
    )
  }

  return null
}
