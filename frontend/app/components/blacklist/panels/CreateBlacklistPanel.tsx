// app/components/blacklist/panels/CreateBlacklistPanel.tsx

'use client'

import { useEffect, Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { blacklistSchema } from '@/app/lib/blacklist/blacklistSchema'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import { createBlacklist } from '@/app/dashboard/blacklist/actions'
import { FiX, FiSave, FiCalendar, FiUpload } from 'react-icons/fi'
import toast from 'react-hot-toast'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import { formatDateForInput, parseInputDate } from '@/app/lib/helpers/date'
import { DOCUMENT_TYPES, SEVERITY_LEVELS } from '@/app/lib/blacklist/types'

interface CreateBlacklistPanelProps {
  isOpen: boolean
  onClose: () => void
}

type BlacklistFormValues = {
  guest_name: string
  document_type: 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
  document_number: string
  check_in_date: Date
  check_out_date: Date
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  images?: File[]
  comments: string
}

export function CreateBlacklistPanel({ isOpen, onClose }: CreateBlacklistPanelProps) {
  const [showCheckInCalendar, setShowCheckInCalendar] = useState(false)
  const [showCheckOutCalendar, setShowCheckOutCalendar] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BlacklistFormValues>({
    resolver: zodResolver(blacklistSchema),
    defaultValues: {
      guest_name: '',
      document_type: 'DNI',
      document_number: '',
      check_in_date: new Date(),
      check_out_date: new Date(),
      reason: '',
      severity: 'MEDIUM',
      comments: '',
      images: [],
    },
  })

  const checkInDate = watch('check_in_date')
  const checkOutDate = watch('check_out_date')

  // Close calendars when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.calendar-container')) {
        setShowCheckInCalendar(false)
        setShowCheckOutCalendar(false)
      }
    }

    if (showCheckInCalendar || showCheckOutCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCheckInCalendar, showCheckOutCalendar])

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      reset()
      setShowCheckInCalendar(false)
      setShowCheckOutCalendar(false)
      setSelectedImages([])
    }
  }, [isOpen, reset])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 5) {
      toast.error('Maximo 5 imagenes permitidas')
      return
    }
    setSelectedImages(files)
    setValue('images', files)
  }

  const onSubmit = async (data: BlacklistFormValues) => {
    try {
      let imageUrls: string[] = []

      // Upload images if any
      if (selectedImages.length > 0) {
        setUploadingImages(true)
        toast.loading('Subiendo imagenes...')

        const uploadedImages = await blacklistApi.uploadImages(selectedImages)
        imageUrls = uploadedImages.map((img) => img.secure_url)

        toast.dismiss()
        toast.success(`${imageUrls.length} imagenes subidas correctamente`)
      }

      setUploadingImages(false)

      // Prepare payload
      const payload = {
        guest_name: data.guest_name,
        document_type: data.document_type,
        document_number: data.document_number,
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
        reason: data.reason,
        severity: data.severity,
        comments: data.comments,
        images: imageUrls,
      }

      toast.loading('Creando registro...')
      const result = await createBlacklist(payload)
      toast.dismiss()

      if (result.success) {
        toast.success('Registro creado exitosamente')
        onClose()
        reset()
        setSelectedImages([])
      } else {
        toast.error(result.error || 'Error al crear el registro')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al procesar el formulario'
      console.error('Error en submit:', message)
      toast.dismiss()
      toast.error(message)
    } finally {
      setUploadingImages(false)
    }
  }

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return ''
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
                          Nuevo Registro Blacklist
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
                        Registra un nuevo huesped en la lista negra
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-5">
                        {/* Guest Information Section */}
                        <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Informacion del huesped
                          </h3>
                          <div className="space-y-3">
                            {/* Guest Name */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre completo <span className="text-red-500">*</span>
                              </label>
                              <input
                                {...register('guest_name')}
                                type="text"
                                placeholder="Nombre y apellidos del huesped"
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                              />
                              {errors.guest_name && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {errors.guest_name.message}
                                </p>
                              )}
                            </div>

                            {/* Document Type & Number */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Tipo de documento <span className="text-red-500">*</span>
                                </label>
                                <select
                                  {...register('document_type')}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                >
                                  {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                                {errors.document_type && (
                                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    {errors.document_type.message}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Numero de documento <span className="text-red-500">*</span>
                                </label>
                                <input
                                  {...register('document_number')}
                                  type="text"
                                  placeholder="12345678A"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                                />
                                {errors.document_number && (
                                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                    {errors.document_number.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stay Dates Section */}
                        <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Fechas de hospedaje
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Check-in Date */}
                            <div className="relative calendar-container">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha de entrada <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Controller
                                  name="check_in_date"
                                  control={control}
                                  render={({ field }) => (
                                    <input
                                      type="text"
                                      value={formatDateDisplay(field.value)}
                                      readOnly
                                      placeholder="Selecciona fecha"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowCheckOutCalendar(false)
                                        setShowCheckInCalendar(!showCheckInCalendar)
                                      }}
                                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer"
                                    />
                                  )}
                                />
                                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                              {errors.check_in_date && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {errors.check_in_date.message}
                                </p>
                              )}

                              {showCheckInCalendar && (
                                <div
                                  className="absolute z-50 mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SimpleCalendarCompact
                                    selectedDate={checkInDate || null}
                                    onSelect={(date) => {
                                      if (date) {
                                        setValue('check_in_date', date, { shouldValidate: true })
                                      }
                                      setShowCheckInCalendar(false)
                                    }}
                                    onClose={() => setShowCheckInCalendar(false)}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Check-out Date */}
                            <div className="relative calendar-container">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Fecha de salida <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <Controller
                                  name="check_out_date"
                                  control={control}
                                  render={({ field }) => (
                                    <input
                                      type="text"
                                      value={formatDateDisplay(field.value)}
                                      readOnly
                                      placeholder="Selecciona fecha"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowCheckInCalendar(false)
                                        setShowCheckOutCalendar(!showCheckOutCalendar)
                                      }}
                                      className="w-full px-3 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer"
                                    />
                                  )}
                                />
                                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                              </div>
                              {errors.check_out_date && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {errors.check_out_date.message}
                                </p>
                              )}

                              {showCheckOutCalendar && (
                                <div
                                  className="absolute z-50 mt-1 right-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <SimpleCalendarCompact
                                    selectedDate={checkOutDate || null}
                                    onSelect={(date) => {
                                      if (date) {
                                        setValue('check_out_date', date, { shouldValidate: true })
                                      }
                                      setShowCheckOutCalendar(false)
                                    }}
                                    onClose={() => setShowCheckOutCalendar(false)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Incident Details Section */}
                        <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Detalles del incidente
                          </h3>
                          <div className="space-y-3">
                            {/* Severity */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nivel de gravedad <span className="text-red-500">*</span>
                              </label>
                              <select
                                {...register('severity')}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                              >
                                {Object.entries(SEVERITY_LEVELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              {errors.severity && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {errors.severity.message}
                                </p>
                              )}
                            </div>

                            {/* Reason */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Motivo de inclusion <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                {...register('reason')}
                                rows={3}
                                placeholder="Describe el motivo por el cual se incluye al huesped en la lista negra..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none"
                              />
                              {errors.reason && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {errors.reason.message}
                                </p>
                              )}
                            </div>

                            {/* Comments */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Comentarios adicionales <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                {...register('comments')}
                                rows={3}
                                placeholder="Agrega cualquier informacion adicional relevante..."
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none"
                              />
                              {errors.comments && (
                                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                  {errors.comments.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Images Section */}
                        <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Evidencia fotografica
                          </h3>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Subir imagenes (max. 5)
                            </label>
                            <div className="flex items-center justify-center w-full">
                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white dark:bg-[#0d1117] hover:bg-gray-50 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-[#161B22]">
                                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                                  <FiUpload className="w-6 h-6 mb-2 text-gray-400" />
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">Click para subir</span> o arrastra las imagenes
                                  </p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                    PNG, JPG, WEBP (max. 5MB c/u)
                                  </p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageChange}
                                />
                              </label>
                            </div>
                            {selectedImages.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {selectedImages.length} imagen(es) seleccionada(s):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedImages.map((file, index) => (
                                    <div
                                      key={index}
                                      className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700"
                                    >
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 sm:px-6">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          disabled={isSubmitting || uploadingImages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting || uploadingImages}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {isSubmitting || uploadingImages ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              {uploadingImages ? 'Subiendo...' : 'Creando...'}
                            </>
                          ) : (
                            <>
                              <FiSave className="w-4 h-4" />
                              Crear Registro
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
