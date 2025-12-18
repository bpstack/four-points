// app/components/maintenance/panels/CreateReportPanel.tsx

'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { reportSchema, type ReportFormData } from '@/app/lib/maintenance/maintenance-schemas'
import { maintenanceApi } from '@/app/lib/maintenance/maintenanceApi'
import { FiSave, FiUpload, FiX, FiTool } from 'react-icons/fi'
import toast from 'react-hot-toast'
import {
  SlidePanel,
  SlidePanelSection,
  SlidePanelFooterButtons,
  FormField,
  inputClassName,
  selectClassName,
  textareaClassName,
  checkboxClassName,
} from '@/app/ui/panels'

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
      const response = await maintenanceApi.create(data)

      // Upload images if any
      if (imageFiles.length > 0) {
        try {
          const imageData = previewImages.map((preview, index) => ({
            file_name: imageFiles[index]?.name || `image-${index}.jpg`,
            file_path: preview,
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
    } catch (error) {
      console.error('Error creating report:', error)
      const message = error instanceof Error ? error.message : 'Error al crear el reporte'
      toast.error(message)
    }
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Reporte de Mantenimiento"
      subtitle="Completa los datos del reporte de mantenimiento"
      size="lg"
      headerIcon={<FiTool className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          submitText="Crear Reporte"
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="success"
        />
      }
    >
      <SlidePanelSection>
        {/* Location Type */}
        <FormField label="Tipo de Ubicación" required error={errors.location_type?.message}>
          <select {...register('location_type')} className={selectClassName}>
            <option value="room">Habitación</option>
            <option value="common_area">Área Común</option>
            <option value="exterior">Exterior</option>
            <option value="facilities">Instalaciones</option>
            <option value="other">Otro</option>
          </select>
        </FormField>

        {/* Room Number */}
        {locationType === 'room' && (
          <FormField label="Número de Habitación" required error={errors.room_number?.message}>
            <input
              {...register('room_number')}
              type="text"
              placeholder="Ej: 305"
              className={inputClassName}
            />
          </FormField>
        )}

        {/* Location Description */}
        <FormField
          label="Descripción de Ubicación"
          required
          error={errors.location_description?.message}
        >
          <input
            {...register('location_description')}
            type="text"
            placeholder="Ej: Baño principal, grifo del lavabo"
            className={inputClassName}
          />
        </FormField>

        {/* Title */}
        <FormField label="Título del Reporte" required error={errors.title?.message}>
          <input
            {...register('title')}
            type="text"
            placeholder="Ej: Fuga de agua en grifo"
            className={inputClassName}
          />
        </FormField>

        {/* Description */}
        <FormField label="Descripción Detallada" required error={errors.description?.message}>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="Describe el problema en detalle..."
            className={textareaClassName}
          />
        </FormField>

        {/* Priority */}
        <FormField label="Prioridad">
          <select {...register('priority')} className={selectClassName}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </FormField>

        {/* Room Out of Service */}
        {locationType === 'room' && (
          <div className="flex items-center">
            <input
              {...register('room_out_of_service')}
              type="checkbox"
              className={checkboxClassName}
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Habitación fuera de servicio
            </label>
          </div>
        )}

        {/* Assigned Type */}
        <FormField label="Asignación">
          <select {...register('assigned_type')} className={selectClassName}>
            <option value="">Sin asignar</option>
            <option value="internal">Personal interno</option>
            <option value="external">Empresa externa</option>
          </select>
        </FormField>

        {/* External Company */}
        {assignedType === 'external' && (
          <>
            <FormField label="Nombre de Empresa">
              <input
                {...register('external_company_name')}
                type="text"
                placeholder="Ej: Fontanería García S.L."
                className={inputClassName}
              />
            </FormField>

            <FormField label="Contacto Empresa">
              <input
                {...register('external_contact')}
                type="text"
                placeholder="Ej: +34 600 123 456 - Juan García"
                className={inputClassName}
              />
            </FormField>
          </>
        )}

        {/* Images Upload */}
        <FormField label="Imágenes (máx. 5, 5MB cada una)">
          <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
            <div className="space-y-1 text-center">
              <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Haz clic para subir
                </span>{' '}
                o arrastra imágenes
              </div>
              <p className="text-[10px] text-gray-500">PNG, JPG, WEBP hasta 5MB</p>
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
        </FormField>

        {/* Preview Images */}
        {previewImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
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
      </SlidePanelSection>
    </SlidePanel>
  )
}
