// app/components/groups/panels/CreateGroupPanel.tsx

'use client'

import { useEffect, Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
// useRouter removed - using window.location.href for navigation after group creation
import { groupSchema, type GroupFormData } from '@/app/lib/schemas/group-schemas'
import { groupsApi, GroupStatus } from '@/app/lib/groups'
import { FiX, FiSave, FiCalendar } from 'react-icons/fi'
import toast from 'react-hot-toast'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import { formatDateForInput, parseInputDate } from '@/app/lib/helpers/date' // ← AÑADIR

interface CreateGroupPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateGroupPanel({ isOpen, onClose }: CreateGroupPanelProps) {
  const [showArrivalCalendar, setShowArrivalCalendar] = useState(false)
  const [showDepartureCalendar, setShowDepartureCalendar] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      agency: '',
      arrival_date: '',
      departure_date: '',
      status: GroupStatus.PENDING,
      total_amount: undefined,
      currency: undefined,
      notes: '',
    },
  })

  const arrivalDate = watch('arrival_date')
  const departureDate = watch('departure_date')

  // ✅ AÑADIR: Cerrar calendarios cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.calendar-container')) {
        setShowArrivalCalendar(false)
        setShowDepartureCalendar(false)
      }
    }

    if (showArrivalCalendar || showDepartureCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showArrivalCalendar, showDepartureCalendar])

  // Resetear form cuando cierra
  useEffect(() => {
    if (!isOpen) {
      reset()
      setShowArrivalCalendar(false)
      setShowDepartureCalendar(false)
    }
  }, [isOpen, reset])

  const onSubmit = async (data: GroupFormData) => {
    try {
      const payload = {
        name: data.name,
        agency: data.agency || undefined,
        arrival_date: data.arrival_date,
        departure_date: data.departure_date,
        status: data.status,
        total_amount: data.total_amount,
        currency: data.currency || 'EUR',
        notes: data.notes || undefined,
      }

      const response = await groupsApi.create(payload)
      toast.success('Grupo creado correctamente')

      window.location.href = `/dashboard/groups/${response.data.id}`

      onClose()
      reset()
    } catch (error) {
      console.error('Error creating group:', error)
      const message = error instanceof Error ? error.message : 'Error al crear el grupo'
      toast.error(message)
    }
  }

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ''
    // ✅ Usar la función existente
    const date = parseInputDate(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
          <div className="fixed inset-0 bg-black/30 dark:bg-black/60" aria-hidden="true" />
        </Transition.Child>

        {/* Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg md:max-w-xl lg:max-w-2xl">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex h-full flex-col bg-white dark:bg-[#151b23] shadow-xl"
                  >
                    {/* Header */}
                    <div className="px-4 py-6 sm:px-6 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Nuevo Grupo
                        </Dialog.Title>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                        >
                          <FiX className="h-6 w-6" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Completa los datos del nuevo grupo
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-4">
                        {/* Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del Grupo <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('name')}
                            type="text"
                            placeholder="Ej: Grupo Turístico ABC"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.name && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.name.message}
                            </p>
                          )}
                        </div>

                        {/* Agency */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Agencia
                          </label>
                          <input
                            {...register('agency')}
                            type="text"
                            placeholder="Ej: Viajes Globales S.L."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.agency && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.agency.message}
                            </p>
                          )}
                        </div>

                        {/* ✅ CAMBIO: Arrival and Departure Dates con SimpleCalendarCompact */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Arrival Date */}
                          <div className="relative calendar-container">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fecha de Llegada <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formatDateDisplay(arrivalDate)}
                                readOnly
                                placeholder="Selecciona fecha"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowDepartureCalendar(false)
                                  setShowArrivalCalendar(!showArrivalCalendar)
                                }}
                                className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer"
                              />
                              <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {errors.arrival_date && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.arrival_date.message}
                              </p>
                            )}

                            {/* Calendar Dropdown */}
                            {showArrivalCalendar && (
                              <div
                                className="absolute z-50 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SimpleCalendarCompact
                                  selectedDate={arrivalDate ? parseInputDate(arrivalDate) : null}
                                  onSelect={(date) => {
                                    if (date) {
                                      const formatted = formatDateForInput(date)
                                      setValue('arrival_date', formatted, { shouldValidate: true })
                                    }
                                    setShowArrivalCalendar(false)
                                  }}
                                  onClose={() => setShowArrivalCalendar(false)}
                                />
                              </div>
                            )}
                          </div>

                          {/* Departure Date */}
                          <div className="relative calendar-container">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Fecha de Salida <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formatDateDisplay(departureDate)}
                                readOnly
                                placeholder="Selecciona fecha"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowArrivalCalendar(false)
                                  setShowDepartureCalendar(!showDepartureCalendar)
                                }}
                                className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer"
                              />
                              <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {errors.departure_date && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.departure_date.message}
                              </p>
                            )}

                            {/* Calendar Dropdown */}
                            {showDepartureCalendar && (
                              <div
                                className="absolute z-50 mt-1 right-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SimpleCalendarCompact
                                  selectedDate={
                                    departureDate ? parseInputDate(departureDate) : null
                                  }
                                  onSelect={(date) => {
                                    if (date) {
                                      const formatted = formatDateForInput(date)
                                      setValue('departure_date', formatted, {
                                        shouldValidate: true,
                                      })
                                    }
                                    setShowDepartureCalendar(false)
                                  }}
                                  onClose={() => setShowDepartureCalendar(false)}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado
                          </label>
                          <select
                            {...register('status')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            <option value={GroupStatus.PENDING}>Pendiente</option>
                            <option value={GroupStatus.CONFIRMED}>Confirmado</option>
                            <option value={GroupStatus.IN_PROGRESS}>En Curso</option>
                            <option value={GroupStatus.COMPLETED}>Completado</option>
                            <option value={GroupStatus.CANCELLED}>Cancelado</option>
                          </select>
                          {errors.status && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.status.message}
                            </p>
                          )}
                        </div>

                        {/* Total Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Importe Total (€)
                          </label>
                          <input
                            {...register('total_amount', { valueAsNumber: true })}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.total_amount && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.total_amount.message}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            💡 Puedes dejarlo vacío y añadirlo después
                          </p>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notas
                          </label>
                          <textarea
                            {...register('notes')}
                            rows={4}
                            placeholder="Notas adicionales sobre el grupo..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none"
                          />
                          {errors.notes && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.notes.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 sm:px-6">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={isSubmitting}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Creando...
                            </>
                          ) : (
                            <>
                              <FiSave className="w-4 h-4" />
                              Crear Grupo
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
