// app/components/maintenance/panels/EditReportPanel.tsx

'use client'

import { useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { reportSchema, type ReportFormData } from '@/app/lib/maintenance/maintenance-schemas'
import { maintenanceApi } from '@/app/lib/maintenance/maintenanceApi'
import type { ReportWithDetails } from '@/app/lib/maintenance/maintenance'
import { FiSave, FiTool } from 'react-icons/fi'
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
    } catch (error) {
      console.error('Error updating report:', error)
      const message = error instanceof Error ? error.message : 'Error al actualizar el reporte'
      toast.error(message)
    }
  }

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
          submitDisabled={!isDirty}
          submitText="Guardar Cambios"
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="primary"
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
      </SlidePanelSection>
    </SlidePanel>
  )
}
