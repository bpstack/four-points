// app/ui/panels/CenterModal.tsx

'use client'

import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { FiX, FiCheck } from 'react-icons/fi'
import { cn } from '@/app/lib/helpers/utils'
import { useTranslations } from 'next-intl'
import type { StepConfig } from './SlidePanel'

// ===============================================
// TYPES
// ===============================================

export type CenterModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'

export interface CenterModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Modal title */
  title: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Modal size */
  size?: CenterModalSize
  /** Modal content */
  children: ReactNode
  /** Footer content (buttons, etc.) */
  footer?: ReactNode
  /** Whether to show close button in header */
  showCloseButton?: boolean
  /** Additional class names */
  className?: string
  /** Whether clicking backdrop closes the modal */
  closeOnBackdrop?: boolean
  /** Step configuration for wizard mode */
  steps?: StepConfig[]
  /** Current step (1-based) for wizard mode */
  currentStep?: number
  /** Header icon */
  headerIcon?: ReactNode
  /** Whether to show gradient header */
  gradientHeader?: boolean
}

// ===============================================
// SIZE MAPPINGS
// ===============================================

const sizeClasses: Record<CenterModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-full mx-4',
}

// ===============================================
// STEP INDICATOR FOR MODAL
// ===============================================

interface ModalStepIndicatorProps {
  steps: StepConfig[]
  currentStep: number
}

function ModalStepIndicator({ steps, currentStep }: ModalStepIndicatorProps) {
  return (
    <div className="px-6 py-4 bg-surface-sunken/50 border-b border-border">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {steps.map((step, idx) => (
          <div key={step.number} className="flex items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                step.number < currentStep
                  ? 'bg-accent text-accent-fg'
                  : step.number === currentStep
                    ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-surface-hover text-fg-subtle'
              )}
            >
              {step.number < currentStep ? (
                <FiCheck className="w-5 h-5" />
              ) : (
                step.icon || step.number
              )}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'w-16 h-1 mx-2 rounded transition-all duration-200',
                  step.number < currentStep
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600'
                    : 'bg-surface-hover'
                )}
              />
            )}
          </div>
        ))}
      </div>
      {/* Step labels */}
      <div className="flex items-center justify-between max-w-md mx-auto mt-2">
        {steps.map((step) => (
          <span
            key={step.number}
            className={cn(
              'text-xs font-medium transition-colors text-center',
              step.number === currentStep
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-fg-subtle'
            )}
            style={{ width: '80px' }}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ===============================================
// MAIN COMPONENT
// ===============================================

export function CenterModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
  showCloseButton = true,
  className,
  closeOnBackdrop = true,
  steps,
  currentStep,
  headerIcon,
  gradientHeader = false,
}: CenterModalProps) {
  const isWizard = steps && steps.length > 0 && currentStep !== undefined

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={closeOnBackdrop ? onClose : () => {}} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform overflow-hidden rounded-2xl bg-surface shadow-2xl transition-all',
                  'border border-border/50',
                  sizeClasses[size],
                  className
                )}
              >
                {/* Header */}
                <div
                  className={cn(
                    'px-6 py-4 border-b flex items-center justify-between',
                    gradientHeader
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-100 dark:border-indigo-900/30'
                      : 'bg-surface-hover border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {headerIcon && (
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          gradientHeader
                            ? 'bg-indigo-100 dark:bg-indigo-900/30'
                            : 'bg-surface-hover'
                        )}
                      >
                        {headerIcon}
                      </div>
                    )}
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-fg">{title}</Dialog.Title>
                      {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
                    </div>
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="text-fg-muted hover:text-fg p-2 rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Step indicator for wizard mode */}
                {isWizard && <ModalStepIndicator steps={steps} currentStep={currentStep} />}

                {/* Body */}
                <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 bg-surface-hover border-t border-border">{footer}</div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

// ===============================================
// FOOTER BUTTONS FOR MODAL
// ===============================================

interface CenterModalFooterButtonsProps {
  onCancel: () => void
  onSubmit?: () => void
  cancelText?: string
  submitText?: string
  submitIcon?: ReactNode
  isSubmitting?: boolean
  submitDisabled?: boolean
  submitVariant?: 'primary' | 'success' | 'danger'
  onBack?: () => void
  backText?: string
}

export function CenterModalFooterButtons({
  onCancel,
  onSubmit,
  cancelText,
  submitText,
  submitIcon,
  isSubmitting = false,
  submitDisabled = false,
  submitVariant = 'primary',
  onBack,
  backText,
}: CenterModalFooterButtonsProps) {
  const t = useTranslations('common')
  const resolvedCancelText = cancelText ?? t('actions.cancel')
  const resolvedSubmitText = submitText ?? t('actions.confirm')
  const resolvedBackText = backText ?? t('actions.back')

  const variantClasses = {
    primary: 'bg-accent hover:bg-accent-hover focus:ring-accent/50',
    success: 'bg-green-600 hover:bg-accent-hover focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-fg bg-surface-hover border border-border rounded-lg hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 transition-colors"
        >
          {resolvedBackText}
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="px-4 py-2 text-sm font-medium text-fg bg-surface-hover border border-border rounded-lg hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 transition-colors"
      >
        {resolvedCancelText}
      </button>
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || submitDisabled}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors',
            variantClasses[submitVariant]
          )}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('actions.processing')}
            </>
          ) : (
            <>
              {submitIcon}
              {resolvedSubmitText}
            </>
          )}
        </button>
      )}
    </div>
  )
}
