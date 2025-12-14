// app/components/groups/panels/EditGroupPanel.tsx

'use client'

import { useEffect, Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editGroupSchema, type EditGroupFormData } from '@/app/lib/schemas/group-schemas'
import { groupsApi, GroupStatus, type GroupWithDetails } from '@/app/lib/groups'
import { FiX, FiSave, FiCalendar, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import { formatDateForInput, parseInputDate } from '@/app/lib/helpers/date'
import { useRouter } from 'next/navigation'

interface EditGroupPanelProps {
  isOpen: boolean
  onClose: () => void
  group: GroupWithDetails
  onSuccess: () => void
}

export function EditGroupPanel({ isOpen, onClose, group, onSuccess }: EditGroupPanelProps) {
  const router = useRouter()
  const datesLocked = group.status === 'in_progress' || group.status === 'completed'
  const [showArrivalCalendar, setShowArrivalCalendar] = useState(false)
  const [showDepartureCalendar, setShowDepartureCalendar] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditGroupFormData>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group.name,
      agency: group.agency || '',
      arrival_date: group.arrival_date.split('T')[0],
      departure_date: group.departure_date.split('T')[0],
      status: group.status,
      total_amount: group.total_amount || undefined,
      currency: group.currency,
      notes: group.notes || '',
    },
  })

  const arrivalDate = watch('arrival_date')
  const departureDate = watch('departure_date')

  // Cerrar calendarios cuando se hace click fuera
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

  useEffect(() => {
    if (isOpen) {
      reset({
        name: group.name,
        agency: group.agency || '',
        arrival_date: group.arrival_date.split('T')[0],
        departure_date: group.departure_date.split('T')[0],
        status: group.status,
        total_amount: group.total_amount || undefined,
        currency: group.currency,
        notes: group.notes || '',
      })
      setShowArrivalCalendar(false)
      setShowDepartureCalendar(false)
      setShowDeleteConfirm(false)
    }
  }, [isOpen, group, reset])

  const onSubmit = async (data: EditGroupFormData) => {
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

      await groupsApi.update(group.id, payload)
      toast.success('Grupo actualizado correctamente')

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating group:', error)
      const message = error instanceof Error ? error.message : 'Error al actualizar el grupo'
      toast.error(message)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await groupsApi.delete(group.id)
      toast.success('Grupo eliminado correctamente')
      onClose()
      router.push('/dashboard/groups')
    } catch (error) {
      console.error('Error deleting group:', error)
      const message = error instanceof Error ? error.message : 'Error al eliminar el grupo'
      toast.error(message)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return ''
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
                          Editar Grupo
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
                        Actualiza la información del grupo
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

                        {/* Dates */}
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
                                disabled={datesLocked}
                                placeholder="Selecciona fecha"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!datesLocked) {
                                    setShowDepartureCalendar(false)
                                    setShowArrivalCalendar(!showArrivalCalendar)
                                  }
                                }}
                                className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {errors.arrival_date && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.arrival_date.message}
                              </p>
                            )}

                            {showArrivalCalendar && !datesLocked && (
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
                                disabled={datesLocked}
                                placeholder="Selecciona fecha"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!datesLocked) {
                                    setShowArrivalCalendar(false)
                                    setShowDepartureCalendar(!showDepartureCalendar)
                                  }
                                }}
                                className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                              <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            {errors.departure_date && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.departure_date.message}
                              </p>
                            )}

                            {showDepartureCalendar && !datesLocked && (
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

                        {datesLocked && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                            <p className="text-xs text-yellow-800 dark:text-yellow-400">
                              ⚠️ Las fechas no se pueden modificar para grupos en curso o
                              completados
                            </p>
                          </div>
                        )}

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
                      <div className="flex flex-col gap-3">
                        {/* Botones de acción principales */}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting || isDeleting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || isDeleting}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Actualizando...
                              </>
                            ) : (
                              <>
                                <FiSave className="w-4 h-4" />
                                Actualizar Grupo
                              </>
                            )}
                          </button>
                        </div>

                        {/* Botón de eliminar (discreto) */}
                        <div className="flex justify-center pt-2 border-t border-gray-100 dark:border-gray-800">
                          {!showDeleteConfirm ? (
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(true)}
                              disabled={isSubmitting || isDeleting}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:text-red-600 dark:focus:text-red-400 disabled:opacity-50 transition-colors"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                              Eliminar grupo
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                ⚠️ Esto eliminará todo: pagos, contactos, habitaciones. ¿Continuar?
                              </span>
                              <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                              >
                                {isDeleting ? 'Eliminando...' : 'Sí'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none disabled:opacity-50"
                              >
                                No
                              </button>
                            </div>
                          )}
                        </div>
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
