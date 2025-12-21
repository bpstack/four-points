// app/components/groups/panels/EditGroupPanel.tsx

'use client'

import { useEffect, useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editGroupSchema, type EditGroupFormData } from '@/app/lib/schemas/group-schemas'
import { groupsApi, GroupStatus, type GroupWithDetails } from '@/app/lib/groups'
import { FiCalendar } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import { formatDateForInput, formatDateDisplayShort, parseInputDate } from '@/app/lib/helpers/date'
import {
  SlidePanel,
  SlidePanelSection,
  FormField,
  Alert,
  SlidePanelFooterWithDelete,
  inputClassName,
  selectClassName,
  textareaClassName,
} from '@/app/ui/panels'

interface EditGroupPanelProps {
  isOpen: boolean
  onClose: () => void
  group: GroupWithDetails
  onSuccess: () => void
}

export function EditGroupPanel({ isOpen, onClose, group, onSuccess }: EditGroupPanelProps) {
  const router = useRouter()
  const datesLocked = group.status === 'in_progress' || group.status === 'completed'

  // Calendar state
  const [showArrivalCal, setShowArrivalCal] = useState(false)
  const [showDepartureCal, setShowDepartureCal] = useState(false)
  const arrivalCalRef = useRef<HTMLDivElement>(null)
  const departureCalRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
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

  // Reset form when panel opens with new group data
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
      setShowArrivalCal(false)
      setShowDepartureCal(false)
    }
  }, [isOpen, group, reset])

  // Click outside to close calendars
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (arrivalCalRef.current && !arrivalCalRef.current.contains(event.target as Node)) {
        setShowArrivalCal(false)
      }
      if (departureCalRef.current && !departureCalRef.current.contains(event.target as Node)) {
        setShowDepartureCal(false)
      }
    }

    if (showArrivalCal || showDepartureCal) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showArrivalCal, showDepartureCal])

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
    await groupsApi.delete(group.id)
    toast.success('Grupo eliminado correctamente')
    onClose()
    router.push('/dashboard/groups')
  }

  const handleArrivalDateSelect = (date: Date | null) => {
    if (date) {
      setValue('arrival_date', formatDateForInput(date), { shouldValidate: true })
    }
    setShowArrivalCal(false)
  }

  const handleDepartureDateSelect = (date: Date | null) => {
    if (date) {
      setValue('departure_date', formatDateForInput(date), { shouldValidate: true })
    }
    setShowDepartureCal(false)
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Grupo"
      subtitle="Actualiza la información del grupo"
      size="lg"
      footer={
        <SlidePanelFooterWithDelete
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}
          submitText="Actualizar Grupo"
          submitDisabled={!isDirty}
          deleteText="Eliminar grupo"
          deleteConfirmText="Esto eliminará todo: pagos, contactos, habitaciones. ¿Continuar?"
        />
      }
    >
      <SlidePanelSection>
        {/* Name */}
        <FormField label="Nombre del Grupo" required error={errors.name?.message}>
          <input
            {...register('name')}
            type="text"
            placeholder="Ej: Grupo Turístico ABC"
            className={inputClassName}
          />
        </FormField>

        {/* Agency */}
        <FormField label="Agencia" error={errors.agency?.message}>
          <input
            {...register('agency')}
            type="text"
            placeholder="Ej: Viajes Globales S.L."
            className={inputClassName}
          />
        </FormField>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Arrival Date */}
          <div className="relative" ref={arrivalCalRef}>
            <FormField label="Fecha de Llegada" required error={errors.arrival_date?.message}>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled={datesLocked}
                  value={arrivalDate ? formatDateDisplayShort(parseInputDate(arrivalDate)!) : ''}
                  placeholder="Selecciona fecha"
                  onClick={() => {
                    if (!datesLocked) {
                      setShowArrivalCal(!showArrivalCal)
                      setShowDepartureCal(false)
                    }
                  }}
                  className={`${inputClassName} pr-10 ${datesLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </FormField>
            {showArrivalCal && !datesLocked && (
              <div className="absolute z-50 mt-1">
                <SimpleCalendarCompact
                  selectedDate={arrivalDate ? parseInputDate(arrivalDate) : null}
                  onSelect={handleArrivalDateSelect}
                  onClose={() => setShowArrivalCal(false)}
                />
              </div>
            )}
          </div>

          {/* Departure Date */}
          <div className="relative" ref={departureCalRef}>
            <FormField label="Fecha de Salida" required error={errors.departure_date?.message}>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled={datesLocked}
                  value={
                    departureDate ? formatDateDisplayShort(parseInputDate(departureDate)!) : ''
                  }
                  placeholder="Selecciona fecha"
                  onClick={() => {
                    if (!datesLocked) {
                      setShowDepartureCal(!showDepartureCal)
                      setShowArrivalCal(false)
                    }
                  }}
                  className={`${inputClassName} pr-10 ${datesLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <FiCalendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </FormField>
            {showDepartureCal && !datesLocked && (
              <div className="absolute z-50 mt-1 right-0">
                <SimpleCalendarCompact
                  selectedDate={departureDate ? parseInputDate(departureDate) : null}
                  onSelect={handleDepartureDateSelect}
                  onClose={() => setShowDepartureCal(false)}
                />
              </div>
            )}
          </div>
        </div>

        {datesLocked && (
          <Alert variant="warning">
            Las fechas no se pueden modificar para grupos en curso o completados
          </Alert>
        )}

        {/* Status */}
        <FormField label="Estado" error={errors.status?.message}>
          <select {...register('status')} className={selectClassName}>
            <option value={GroupStatus.PENDING}>Pendiente</option>
            <option value={GroupStatus.CONFIRMED}>Confirmado</option>
            <option value={GroupStatus.IN_PROGRESS}>En Curso</option>
            <option value={GroupStatus.COMPLETED}>Completado</option>
            <option value={GroupStatus.CANCELLED}>Cancelado</option>
          </select>
        </FormField>

        {/* Total Amount */}
        <FormField label="Importe Total (€)" error={errors.total_amount?.message}>
          <input
            {...register('total_amount', { valueAsNumber: true })}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className={inputClassName}
          />
        </FormField>

        {/* Notes */}
        <FormField label="Notas" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={4}
            placeholder="Notas adicionales sobre el grupo..."
            className={textareaClassName}
          />
        </FormField>
      </SlidePanelSection>
    </SlidePanel>
  )
}
