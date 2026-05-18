'use client'

import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Override body padding/layout. Default: 'px-5 py-4' */
  bodyClassName?: string
  /** Prevent closing by clicking the backdrop */
  static?: boolean
}

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  bodyClassName = 'px-5 py-4',
  static: isStatic = false,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isStatic ? () => {} : onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={`w-full ${sizeMap[size]} overflow-hidden rounded-fp-lg border border-border bg-surface shadow-fp-modal`}
              >
                {/* Header — always rendered so there is always a close button */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  {title ? (
                    <Dialog.Title className="text-base font-semibold text-fg">{title}</Dialog.Title>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={onClose}
                    className="rounded-fp p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
                    aria-label="Cerrar"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div className={bodyClassName}>{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-sunken px-5 py-3">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
