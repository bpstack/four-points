// app/components/blacklist/panels/CreateBlacklistPanel.tsx

'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { blacklistSchema } from '@/app/lib/blacklist/blacklistSchema'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import { createBlacklist } from '@/app/dashboard/blacklist/actions'
import { FiSave, FiCalendar, FiUpload, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import { DOCUMENT_TYPES, SEVERITY_LEVELS } from '@/app/lib/blacklist/types'
import {
  SlidePanel,
  SlidePanelSection,
  SlidePanelFooterButtons,
  FormField,
  inputClassName,
  selectClassName,
  textareaClassName,
} from '@/app/ui/panels'

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

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    setSelectedImages(newImages)
    setValue('images', newImages)
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
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Registro Blacklist"
      subtitle="Registra un nuevo huesped en la lista negra"
      size="lg"
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting || uploadingImages}
          submitText={uploadingImages ? 'Subiendo...' : 'Crear Registro'}
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="success"
        />
      }
    >
      {/* Guest Information */}
      <SlidePanelSection title="Informacion del huesped">
        <FormField label="Nombre completo" required error={errors.guest_name?.message}>
          <input
            {...register('guest_name')}
            type="text"
            placeholder="Nombre y apellidos del huesped"
            className={inputClassName}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Tipo de documento" required error={errors.document_type?.message}>
            <select {...register('document_type')} className={selectClassName}>
              {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Numero de documento" required error={errors.document_number?.message}>
            <input
              {...register('document_number')}
              type="text"
              placeholder="12345678A"
              className={inputClassName}
            />
          </FormField>
        </div>
      </SlidePanelSection>

      {/* Stay Dates */}
      <SlidePanelSection title="Fechas de hospedaje">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Check-in Date */}
          <div className="relative calendar-container">
            <FormField label="Fecha de entrada" required error={errors.check_in_date?.message}>
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
                      className={`${inputClassName} pr-8 cursor-pointer`}
                    />
                  )}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </FormField>

            {showCheckInCalendar && (
              <div className="absolute z-50 mt-1" onClick={(e) => e.stopPropagation()}>
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
            <FormField label="Fecha de salida" required error={errors.check_out_date?.message}>
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
                      className={`${inputClassName} pr-8 cursor-pointer`}
                    />
                  )}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </FormField>

            {showCheckOutCalendar && (
              <div
                className="absolute z-50 mt-1 right-0 sm:right-auto"
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
      </SlidePanelSection>

      {/* Incident Details */}
      <SlidePanelSection title="Detalles del incidente">
        <FormField label="Nivel de gravedad" required error={errors.severity?.message}>
          <select {...register('severity')} className={selectClassName}>
            {Object.entries(SEVERITY_LEVELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Motivo de inclusion" required error={errors.reason?.message}>
          <textarea
            {...register('reason')}
            rows={3}
            placeholder="Describe el motivo por el cual se incluye al huesped en la lista negra..."
            className={textareaClassName}
          />
        </FormField>

        <FormField label="Comentarios adicionales" required error={errors.comments?.message}>
          <textarea
            {...register('comments')}
            rows={3}
            placeholder="Agrega cualquier informacion adicional relevante..."
            className={textareaClassName}
          />
        </FormField>
      </SlidePanelSection>

      {/* Evidence Photos */}
      <SlidePanelSection title="Evidencia fotografica">
        <FormField label="Subir imagenes" hint="Maximo 5 imagenes (PNG, JPG, WEBP - max 5MB c/u)">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg cursor-pointer bg-white dark:bg-[#0d1117] hover:bg-gray-50 dark:hover:bg-[#161B22] transition-colors">
              <div className="flex flex-col items-center justify-center pt-3 pb-4">
                <FiUpload className="w-6 h-6 mb-2 text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click para subir</span> o arrastra las imagenes
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

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {selectedImages.length} imagen(es) seleccionada(s):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedImages.map((file, index) => (
                  <div
                    key={index}
                    className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 group"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <FiX className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </FormField>
      </SlidePanelSection>
    </SlidePanel>
  )
}
