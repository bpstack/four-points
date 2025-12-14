// app/components/maintenance/panels/CreateReportPanel.tsx
'use client'

import { useEffect, Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { reportSchema, type ReportFormData } from '@/app/lib/maintenance/maintenance-schemas'
import { maintenanceApi } from '@/app/lib/maintenance/maintenanceApi'
import { FiX, FiSave, FiUpload } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface CreateReportPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateReportPanel({ isOpen, onClose }: CreateReportPanelProps) {
  const router = useRouter()
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      location_type: 'room',
      location_description: '',
      title: '',
      description: '',
      priority: 'medium',
      room_number: '',
      room_out_of_service: false,
      assigned_to: undefined,
      assigned_type: undefined,
      external_company_name: '',
      external_contact: '',
    },
  })

  const locationType = watch('location_type')
  const assignedType = watch('assigned_type')

  useEffect(() => {
    if (!isOpen) {
      reset()
      setPreviewImages([])
      setImageFiles([])
    }
  }, [isOpen, reset])

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPreviews: string[] = []
    const newFiles: File[] = []

    Array.from(files).forEach((file) => {
      if (previewImages.length + newPreviews.length >= 5) {
        toast.error('Máximo 5 imágenes permitidas')
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB`)
        return
      }

      newFiles.push(file)

      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === newFiles.length) {
          setPreviewImages((prev) => [...prev, ...newPreviews].slice(0, 5))
          setImageFiles((prev) => [...prev, ...newFiles].slice(0, 5))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index))
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: ReportFormData) => {
    try {
      // Crear el reporte
      const response = await maintenanceApi.create(data)

      // Subir imágenes si hay
      if (imageFiles.length > 0) {
        try {
          // Por ahora, simplemente adjuntamos las imágenes como base64
          // En producción, se subirían a Cloudinary primero
          const imageData = previewImages.map((preview, index) => ({
            file_name: imageFiles[index]?.name || `image-${index}.jpg`,
            file_path: preview, // base64 o URL de Cloudinary
            file_size: imageFiles[index]?.size || 0,
            mime_type: imageFiles[index]?.type || 'image/jpeg',
          }))

          await maintenanceApi.addImages(response.report.id, imageData)
        } catch (imgError) {
          console.error('Error subiendo imágenes:', imgError)
          toast.error('Reporte creado pero hubo error al subir imágenes')
        }
      }

      toast.success('Reporte creado correctamente')

      router.push(`/dashboard/maintenance/${response.report.id}`)

      onClose()
      reset()
      setPreviewImages([])
      setImageFiles([])
    } catch (error: any) {
      console.error('Error creating report:', error)
      toast.error(error.message || 'Error al crear el reporte')
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
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Nuevo Reporte de Mantenimiento
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
                        Completa los datos del reporte de mantenimiento
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-4">
                        {/* Location Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de Ubicación <span className="text-red-500">*</span>
                          </label>
                          <select
                            {...register('location_type')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            <option value="room">Habitación</option>
                            <option value="common_area">Área Común</option>
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
                              Número de Habitación <span className="text-red-500">*</span>
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
                            Descripción de Ubicación <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('location_description')}
                            type="text"
                            placeholder="Ej: Baño principal, grifo del lavabo"
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
                            Título del Reporte <span className="text-red-500">*</span>
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
                            Descripción Detallada <span className="text-red-500">*</span>
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
                              Habitación fuera de servicio
                            </label>
                          </div>
                        )}

                        {/* Assigned Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Asignación
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
                                placeholder="Ej: Fontanería García S.L."
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
                                placeholder="Ej: +34 600 123 456 - Juan García"
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                              />
                            </div>
                          </>
                        )}

                        {/* Images Upload */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Imágenes (máx. 5, 5MB cada una)
                          </label>
                          <div className="mt-1">
                            <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                              <div className="space-y-1 text-center">
                                <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    Haz clic para subir
                                  </span>{' '}
                                  o arrastra imágenes
                                </div>
                                <p className="text-[10px] text-gray-500">
                                  PNG, JPG, WEBP hasta 5MB
                                </p>
                              </div>
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                disabled={previewImages.length >= 5}
                              />
                            </label>
                          </div>

                          {/* Preview Images */}
                          {previewImages.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {previewImages.map((preview, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-md border border-gray-300 dark:border-gray-700"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <FiX className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
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
                              Crear Reporte
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
