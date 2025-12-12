// app/components/maintenance/panels/EditReportPanel.tsx
'use client'

import { useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reportSchema, type ReportFormData } from '@/app/lib/maintenance/maintenance-schemas'
import { maintenanceApi } from '@/app/lib/maintenance/maintenanceApi'
import type { ReportWithDetails } from '@/app/lib/maintenance/maintenance'
import { FiX, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface EditReportPanelProps {
  isOpen: boolean
  onClose: () => void
  report: ReportWithDetails
}

export function EditReportPanel({ isOpen, onClose, report }: EditReportPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      location_type: report.location_type,
      location_description: report.location_description,
      title: report.title,
      description: report.description,
      priority: report.priority,
      room_number: report.room_number || '',
      room_out_of_service: report.room_out_of_service ?? false,
      assigned_to: report.assigned_to || undefined,
      assigned_type: report.assigned_type || undefined,
      external_company_name: report.external_company_name || '',
      external_contact: report.external_contact || '',
    },
  })

  const locationType = watch('location_type')
  const assignedType = watch('assigned_type')

  // Reset form when report changes or panel opens
  useEffect(() => {
    if (isOpen && report) {
      reset({
        location_type: report.location_type,
        location_description: report.location_description,
        title: report.title,
        description: report.description,
        priority: report.priority,
        room_number: report.room_number || '',
        room_out_of_service: report.room_out_of_service ?? false,
        assigned_to: report.assigned_to || undefined,
        assigned_type: report.assigned_type || undefined,
        external_company_name: report.external_company_name || '',
        external_contact: report.external_contact || '',
      })
    }
  }, [isOpen, report, reset])

  useEffect(() => {
    if (locationType !== 'room') {
      setValue('room_number', '')
      setValue('room_out_of_service', false)
    }
  }, [locationType, setValue])

  useEffect(() => {
    if (assignedType === 'internal') {
      setValue('external_company_name', '')
      setValue('external_contact', '')
    } else if (assignedType === 'external') {
      setValue('assigned_to', undefined)
    }
  }, [assignedType, setValue])

  const onSubmit: SubmitHandler<ReportFormData> = async (data) => {
    try {
      await maintenanceApi.update(report.id, data)
      toast.success('Reporte actualizado correctamente')
      onClose()
    } catch (error: any) {
      console.error('Error updating report:', error)
      toast.error(error.message || 'Error al actualizar el reporte')
    }
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
                        <div>
                          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Editar Reporte
                          </Dialog.Title>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            ID: {report.id}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                        >
                          <FiX className="h-6 w-6" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-4">
                        {/* Location Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de Ubicacion <span className="text-red-500">*</span>
                          </label>
                          <select
                            {...register('location_type')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            <option value="room">Habitacion</option>
                            <option value="common_area">Area Comun</option>
                            <option value="exterior">Exterior</option>
                            <option value="facilities">Instalaciones</option>
                            <option value="other">Otro</option>
                          </select>
                          {errors.location_type && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.location_type.message}
                            </p>
                          )}
                        </div>

                        {/* Room Number */}
                        {locationType === 'room' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Numero de Habitacion <span className="text-red-500">*</span>
                            </label>
                            <input
                              {...register('room_number')}
                              type="text"
                              placeholder="Ej: 305"
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                            />
                            {errors.room_number && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.room_number.message}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Location Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descripcion de Ubicacion <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('location_description')}
                            type="text"
                            placeholder="Ej: Bano principal, grifo del lavabo"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.location_description && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.location_description.message}
                            </p>
                          )}
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Titulo del Reporte <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('title')}
                            type="text"
                            placeholder="Ej: Fuga de agua en grifo"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.title && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.title.message}
                            </p>
                          )}
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descripcion Detallada <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            {...register('description')}
                            rows={4}
                            placeholder="Describe el problema en detalle..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none"
                          />
                          {errors.description && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.description.message}
                            </p>
                          )}
                        </div>

                        {/* Priority */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Prioridad
                          </label>
                          <select
                            {...register('priority')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>

                        {/* Room Out of Service */}
                        {locationType === 'room' && (
                          <div className="flex items-center">
                            <input
                              {...register('room_out_of_service')}
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              Habitacion fuera de servicio
                            </label>
                          </div>
                        )}

                        {/* Assigned Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Asignacion
                          </label>
                          <select
                            {...register('assigned_type')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            <option value="">Sin asignar</option>
                            <option value="internal">Personal interno</option>
                            <option value="external">Empresa externa</option>
                          </select>
                        </div>

                        {/* External Company */}
                        {assignedType === 'external' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre de Empresa
                              </label>
                              <input
                                {...register('external_company_name')}
                                type="text"
                                placeholder="Ej: Fontaneria Garcia S.L."
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Contacto Empresa
                              </label>
                              <input
                                {...register('external_contact')}
                                type="text"
                                placeholder="Ej: +34 600 123 456 - Juan Garcia"
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                              />
                            </div>
                          </>
                        )}
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
                          disabled={isSubmitting || !isDirty}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <FiSave className="w-4 h-4" />
                              Guardar Cambios
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
