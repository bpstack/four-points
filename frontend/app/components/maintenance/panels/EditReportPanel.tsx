// app/components/maintenance/panels/EditReportPanel.tsx

'use client'

import { useEffect, useState } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reportSchema, type ReportFormData } from '@/app/lib/maintenance/maintenance-schemas'
import { maintenanceApi } from '@/app/lib/maintenance/maintenanceApi'
import type { ReportWithDetails, MaintenanceImage } from '@/app/lib/maintenance/maintenance'
import { FiSave, FiTool, FiUpload, FiX, FiTrash2 } from 'react-icons/fi'
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

interface EditReportPanelProps {
  isOpen: boolean
  onClose: () => void
  report: ReportWithDetails
  onSuccess?: () => void
}

export function EditReportPanel({ isOpen, onClose, report, onSuccess }: EditReportPanelProps) {
  // State for new images to upload
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  // State for existing images
  const [existingImages, setExistingImages] = useState<MaintenanceImage[]>([])
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null)

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
      // Load existing images
      setExistingImages(report.images || [])
      // Clear new images
      setPreviewImages([])
      setImageFiles([])
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

  // Calculate total images (existing + new)
  const totalImages = existingImages.length + previewImages.length
  const maxImages = 5
  const canAddMoreImages = totalImages < maxImages

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newPreviews: string[] = []
    const newFiles: File[] = []

    Array.from(files).forEach((file) => {
      if (totalImages + newPreviews.length >= maxImages) {
        toast.error(`Maximo ${maxImages} imagenes permitidas`)
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
          setPreviewImages((prev) => [...prev, ...newPreviews].slice(0, maxImages - existingImages.length))
          setImageFiles((prev) => [...prev, ...newFiles].slice(0, maxImages - existingImages.length))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeNewImage = (index: number) => {
    setPreviewImages((prev) => prev.filter((_, i) => i !== index))
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const deleteExistingImage = async (imageId: number) => {
    try {
      setDeletingImageId(imageId)
      await maintenanceApi.deleteImage(report.id, imageId)
      setExistingImages((prev) => prev.filter((img) => img.id !== imageId))
      toast.success('Imagen eliminada')
    } catch (error) {
      console.error('Error deleting image:', error)
      toast.error('Error al eliminar la imagen')
    } finally {
      setDeletingImageId(null)
    }
  }

  const onSubmit: SubmitHandler<ReportFormData> = async (data) => {
    try {
      await maintenanceApi.update(report.id, data)

      // Upload new images if any
      if (imageFiles.length > 0) {
        try {
          toast.loading('Subiendo imagenes...', { id: 'upload-images' })
          await maintenanceApi.uploadImages(report.id, imageFiles)
          toast.success('Imagenes subidas correctamente', { id: 'upload-images' })
        } catch (imgError) {
          console.error('Error subiendo imagenes:', imgError)
          toast.error('Reporte actualizado pero hubo error al subir imagenes', { id: 'upload-images' })
        }
      }

      toast.success('Reporte actualizado correctamente')
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Error updating report:', error)
      const message = error instanceof Error ? error.message : 'Error al actualizar el reporte'
      toast.error(message)
    }
  }

  // Check if there are pending changes (form dirty or new images)
  const hasPendingChanges = isDirty || imageFiles.length > 0

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Reporte"
      subtitle={`ID: ${report.id}`}
      size="lg"
      headerIcon={<FiTool className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={isSubmitting}
          submitDisabled={!hasPendingChanges}
          submitText="Guardar Cambios"
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="primary"
        />
      }
    >
      <SlidePanelSection>
        {/* Location Type */}
        <FormField label="Tipo de Ubicacion" required error={errors.location_type?.message}>
          <select {...register('location_type')} className={selectClassName}>
            <option value="room">Habitacion</option>
            <option value="common_area">Area Comun</option>
            <option value="exterior">Exterior</option>
            <option value="facilities">Instalaciones</option>
            <option value="other">Otro</option>
          </select>
        </FormField>

        {/* Room Number */}
        {locationType === 'room' && (
          <FormField label="Numero de Habitacion" required error={errors.room_number?.message}>
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
          label="Descripcion de Ubicacion"
          required
          error={errors.location_description?.message}
        >
          <input
            {...register('location_description')}
            type="text"
            placeholder="Ej: Bano principal, grifo del lavabo"
            className={inputClassName}
          />
        </FormField>

        {/* Title */}
        <FormField label="Titulo del Reporte" required error={errors.title?.message}>
          <input
            {...register('title')}
            type="text"
            placeholder="Ej: Fuga de agua en grifo"
            className={inputClassName}
          />
        </FormField>

        {/* Description */}
        <FormField label="Descripcion Detallada" required error={errors.description?.message}>
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
              Habitacion fuera de servicio
            </label>
          </div>
        )}

        {/* Assigned Type */}
        <FormField label="Asignacion">
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
                placeholder="Ej: Fontaneria Garcia S.L."
                className={inputClassName}
              />
            </FormField>

            <FormField label="Contacto Empresa">
              <input
                {...register('external_contact')}
                type="text"
                placeholder="Ej: +34 600 123 456 - Juan Garcia"
                className={inputClassName}
              />
            </FormField>
          </>
        )}

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <FormField label={`Imagenes actuales (${existingImages.length})`}>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.file_path}
                    alt={image.file_name}
                    className="w-full h-24 object-cover rounded-md border border-gray-300 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => deleteExistingImage(image.id)}
                    disabled={deletingImageId === image.id}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Eliminar imagen"
                  >
                    {deletingImageId === image.id ? (
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiTrash2 className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </FormField>
        )}

        {/* New Images Upload */}
        <FormField label={`Anadir imagenes (${totalImages}/${maxImages})`}>
          <label
            className={`flex items-center justify-center w-full px-4 py-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md transition-colors ${
              canAddMoreImages
                ? 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-600'
                : 'cursor-not-allowed opacity-50'
            }`}
          >
            <div className="space-y-1 text-center">
              <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {canAddMoreImages ? (
                  <>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      Haz clic para subir
                    </span>{' '}
                    o arrastra imagenes
                  </>
                ) : (
                  <span>Limite de imagenes alcanzado</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">PNG, JPG, WEBP hasta 5MB</p>
            </div>
            <input
              type="file"
              className="sr-only"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={!canAddMoreImages}
            />
          </label>
        </FormField>

        {/* Preview New Images */}
        {previewImages.length > 0 && (
          <FormField label={`Nuevas imagenes (${previewImages.length})`}>
            <div className="grid grid-cols-3 gap-2">
              {previewImages.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border-2 border-blue-400 dark:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-blue-600 text-white text-[8px] rounded">
                    Nueva
                  </div>
                </div>
              ))}
            </div>
          </FormField>
        )}
      </SlidePanelSection>
    </SlidePanel>
  )
}
