// app/dashboard/blacklist/components/mains/BlacklistForm.tsx

'use client'

/**
 * Formulario de Blacklist (crear/editar)
 * - React Hook Form + Zod
 * - Upload de imágenes a Cloudinary
 * - Validación en tiempo real
 * - Estados de loading y errores
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Input } from '@/app/components/blacklist/ui/Input'
import { TextArea } from '@/app/components/blacklist/ui/TextArea'
import { Select } from '@/app/components/blacklist/ui/Select'
import { Button } from '@/app/components/blacklist/ui/Button'
import { ImageUploader } from '@/app/components/blacklist/ui/ImageUploader'
import { blacklistSchema, blacklistEditSchema } from '@/app/lib/blacklist/blacklistSchema'
import { blacklistApi } from '@/app/lib/blacklist/blacklistApi'
import { createBlacklist, updateBlacklist } from '@/app/dashboard/blacklist/actions'

// ✅ CRÍTICO: Asegúrate de que estos tipos estén importados
import type {
  BlacklistEntry,
  BlacklistCreateFormData,
  BlacklistEditFormData,
} from '@/app/lib/blacklist/types'

// ✅ Y también las constantes
import { DOCUMENT_TYPES, SEVERITY_LEVELS } from '@/app/lib/blacklist/types'

interface BlacklistFormProps {
  mode: 'create' | 'edit'
  initialData?: BlacklistEntry
  onSuccess?: () => void
}

// Tipo flexible para el formulario
type FormData = {
  guest_name: string
  document_type: 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
  document_number: string
  check_in_date: Date
  check_out_date: Date
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  images: File[]
  comments: string
}

export function BlacklistForm({ mode, initialData, onSuccess }: BlacklistFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)

  // ========================================
  // REACT HOOK FORM - UN SOLO FORMULARIO
  // ========================================
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(blacklistSchema),
    defaultValues:
      mode === 'edit' && initialData
        ? {
            guest_name: initialData.guest_name,
            document_type: initialData.document_type,
            document_number: initialData.document_number,
            check_in_date: new Date(initialData.check_in_date),
            check_out_date: new Date(initialData.check_out_date),
            reason: initialData.reason,
            severity: initialData.severity,
            comments: initialData.comments,
            images: [], // Nuevas imágenes en modo edición
          }
        : {
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

  const images = watch('images')

  // ========================================
  // SUBMIT HANDLER
  // ========================================
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)

    try {
      let imageUrls: string[] = []

      // 1. MODO CREAR: Validar y subir imágenes
      if (mode === 'create') {
        if (data.images.length === 0) {
          toast.error('Debes subir al menos una imagen')
          setIsSubmitting(false)
          return
        }

        setUploadingImages(true)
        toast.loading('Subiendo imágenes...')

        const uploadedImages = await blacklistApi.uploadImages(data.images)
        imageUrls = uploadedImages.map((img) => img.secure_url)

        toast.dismiss()
        toast.success(`${imageUrls.length} imágenes subidas correctamente`)
      }
      // 2. MODO EDITAR: Mantener existentes + nuevas
      else {
        // Mantener imágenes existentes
        imageUrls = initialData?.images || []

        // Si hay nuevas imágenes, subirlas
        if (data.images.length > 0) {
          setUploadingImages(true)
          toast.loading('Subiendo nuevas imágenes...')

          const uploadedImages = await blacklistApi.uploadImages(data.images)
          const newImageUrls = uploadedImages.map((img) => img.secure_url)
          imageUrls = [...imageUrls, ...newImageUrls]

          toast.dismiss()
          toast.success(`${newImageUrls.length} nuevas imágenes subidas`)
        }
      }

      setUploadingImages(false)

      // 3. Preparar payload
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

      // 4. Crear o actualizar
      let result

      if (mode === 'create') {
        toast.loading('Creando registro...')
        result = await createBlacklist(payload)
      } else {
        toast.loading('Actualizando registro...')
        result = await updateBlacklist(initialData!.id, payload)
      }

      toast.dismiss()

      if (result.success) {
        toast.success(
          mode === 'create' ? 'Registro creado exitosamente' : 'Registro actualizado exitosamente'
        )

        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/dashboard/blacklist')
        }
      } else {
        toast.error(result.error || 'Error al guardar el registro')
      }
    } catch (error: any) {
      console.error('Error en submit:', error)
      toast.dismiss()
      toast.error(error.message || 'Error al procesar el formulario')
    } finally {
      setIsSubmitting(false)
      setUploadingImages(false)
    }
  }

  const handleCancel = () => {
    if (confirm('¿Estás seguro de cancelar? Se perderán los cambios no guardados.')) {
      router.back()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información del huésped */}
      <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Información del huésped
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nombre completo"
              placeholder="Nombre y apellidos del huésped"
              {...register('guest_name')}
              error={errors.guest_name?.message}
              required
            />
          </div>

          <Select
            label="Tipo de documento"
            {...register('document_type')}
            error={errors.document_type?.message}
            options={Object.entries(DOCUMENT_TYPES).map(([value, label]) => ({
              value,
              label,
            }))}
            required
          />

          <Input
            label="Número de documento"
            placeholder="12345678A"
            {...register('document_number')}
            error={errors.document_number?.message}
            required
          />
        </div>
      </div>

      {/* Fechas de hospedaje */}
      <div className="bg-gray-100 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Fechas de hospedaje
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="check_in_date"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                  Fecha de entrada <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161B22] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                />
                {errors.check_in_date && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errors.check_in_date.message}
                  </p>
                )}
              </div>
            )}
          />

          <Controller
            name="check_out_date"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                  Fecha de salida <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161B22] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                />
                {errors.check_out_date && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {errors.check_out_date.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* Motivo y gravedad */}
      <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Detalles del incidente
        </h3>

        <div className="space-y-4">
          <Select
            label="Nivel de gravedad"
            {...register('severity')}
            error={errors.severity?.message}
            options={Object.entries(SEVERITY_LEVELS).map(([value, label]) => ({
              value,
              label,
            }))}
            required
          />

          <TextArea
            label="Motivo de inclusión en blacklist"
            placeholder="Describe el motivo por el cual se incluye al huésped en la lista negra..."
            {...register('reason')}
            error={errors.reason?.message}
            rows={4}
            required
          />

          <TextArea
            label="Comentarios adicionales del recepcionista"
            placeholder="Agrega cualquier información adicional relevante..."
            {...register('comments')}
            error={errors.comments?.message}
            rows={4}
            required
          />
        </div>
      </div>

      {/* Imágenes */}
      <div className="bg-gray-50 dark:bg-[#0D1117] border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Evidencia fotográfica
        </h3>

        <Controller
          name="images"
          control={control}
          render={({ field }) => (
            <ImageUploader
              label={mode === 'create' ? 'Subir imágenes' : 'Agregar nuevas imágenes'}
              value={field.value}
              onChange={field.onChange}
              error={errors.images?.message}
              helperText={
                mode === 'create'
                  ? 'Sube entre 1 y 5 imágenes como evidencia del incidente (máx. 5MB cada una)'
                  : 'Puedes agregar más imágenes al registro existente'
              }
              maxFiles={5}
              maxSizeMB={5}
              required={mode === 'create'}
            />
          )}
        />

        {/* Mostrar imágenes existentes en modo edición */}
        {mode === 'edit' && initialData?.images && initialData.images.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Imágenes actuales ({initialData.images.length}):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {initialData.images.map((url, index) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800"
                >
                  <img
                    src={url}
                    alt={`Imagen existente ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
          Cancelar
        </Button>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting || uploadingImages}
          disabled={isSubmitting || uploadingImages}
        >
          {isSubmitting || uploadingImages
            ? uploadingImages
              ? 'Subiendo imágenes...'
              : 'Guardando...'
            : mode === 'create'
              ? 'Crear registro'
              : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}

// ✅ Features del BlacklistForm:

// ✅ React Hook Form + Zod - Validación robusta y type-safe
// ✅ Modo create/edit - Reutilizable para crear y editar
// ✅ Campos completos:

// Nombre del huésped
// Tipo y número de documento
// Fechas de hospedaje (date inputs)
// Nivel de gravedad
// Motivo detallado
// Comentarios adicionales
// Upload de imágenes

// ✅ Upload de imágenes:

// Sube a Cloudinary antes de guardar
// Manejo de errores
// Loading states
// Toast notifications

// ✅ Validación en tiempo real - Errores bajo cada campo
// ✅ Estados de loading:

// "Subiendo imágenes..."
// "Guardando..."
// Botones deshabilitados

// ✅ Manejo de errores - Toast notifications con mensajes claros
// ✅ Modo edición:

// Muestra imágenes existentes
// Permite agregar nuevas imágenes
// Pre-llena formulario con datos actuales

// ✅ UX mejorada:

// Confirmación al cancelar
// Redirección automática al éxito
// Callback opcional

// ✅ Responsive - Grid adaptable
// ✅ Dark mode completo
// ✅ Secciones organizadas - Cards por categorías
