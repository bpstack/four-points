// app/components/groups/panels/ContactPanel.tsx

'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'

import { contactSchema, type ContactFormData } from '@/app/lib/schemas/group-schemas'
import { useGroupContacts, useCreateContact, useUpdateContact, type GroupContact } from '@/app/lib/groups'
import { useGroupStore } from '@/app/stores/useGroupStore'
import {
  SlidePanel,
  SlidePanelSection,
  SlidePanelFooterButtons,
  FormField,
  inputClassName,
  checkboxClassName,
} from '@/app/ui/panels'

interface ContactPanelProps {
  isOpen: boolean
  onClose: () => void
  contact?: GroupContact
  groupId: number
}

export function ContactPanel({ isOpen, onClose, contact, groupId }: ContactPanelProps) {
  const { currentGroup } = useGroupStore()
  const isEditing = !!contact

  const groupIdFromStore = currentGroup?.id
  const effectiveGroupId = groupIdFromStore ?? groupId

  const { data: _contactsData } = useGroupContacts(effectiveGroupId)
  const createContactMutation = useCreateContact(effectiveGroupId)
  const updateContactMutation = useUpdateContact(effectiveGroupId, contact?.id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema) as Resolver<ContactFormData>,
    defaultValues: contact
      ? {
          contact_name: contact.contact_name || '',
          contact_email: contact.contact_email ?? undefined,
          contact_phone: contact.contact_phone ?? undefined,
          is_primary: contact.is_primary ?? false,
        }
      : {
          contact_name: '',
          contact_email: undefined,
          contact_phone: undefined,
          is_primary: false,
        },
  })

  // Reset form when panel closes
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = async (data: ContactFormData) => {
    try {
      const payload = {
        contact_name: data.contact_name || '',
        contact_email: data.contact_email ?? undefined,
        contact_phone: data.contact_phone ?? undefined,
        is_primary: data.is_primary ?? false,
      }

      if (!effectiveGroupId) {
        throw new Error('Falta el identificador del grupo')
      }

      if (isEditing && contact) {
        await updateContactMutation.mutateAsync(payload)
        toast.success('Contacto actualizado correctamente')
      } else {
        await createContactMutation.mutateAsync(payload)
        toast.success('Contacto creado correctamente')
      }

      onClose()
      reset()
    } catch (error) {
      console.error('Error saving contact:', error)
      const message = error instanceof Error ? error.message : 'Error al guardar el contacto'
      toast.error(message)
    }
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}
      subtitle={
        isEditing
          ? 'Actualiza la información del contacto'
          : 'Completa los datos del nuevo contacto'
      }
      size="md"
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={
            isSubmitting || createContactMutation.isPending || updateContactMutation.isPending
          }
          submitText={isEditing ? 'Actualizar' : 'Crear Contacto'}
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="primary"
        />
      }
    >
      <SlidePanelSection>
        {/* Contact Name */}
        <FormField label="Nombre del Contacto" required error={errors.contact_name?.message}>
          <input
            {...register('contact_name')}
            type="text"
            placeholder="Ej: Juan Pérez"
            className={inputClassName}
          />
        </FormField>

        {/* Contact Email */}
        <FormField label="Email" error={errors.contact_email?.message}>
          <input
            {...register('contact_email')}
            type="email"
            placeholder="ejemplo@correo.com"
            className={inputClassName}
          />
        </FormField>

        {/* Contact Phone */}
        <FormField label="Teléfono" error={errors.contact_phone?.message}>
          <input
            {...register('contact_phone')}
            type="tel"
            placeholder="+52 123 456 7890"
            className={inputClassName}
          />
        </FormField>

        {/* Is Primary */}
        <div className="flex items-center gap-2">
          <input
            {...register('is_primary')}
            type="checkbox"
            id="is_primary"
            className={checkboxClassName}
          />
          <label
            htmlFor="is_primary"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Marcar como contacto principal
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          El contacto principal será usado para comunicaciones importantes del grupo
        </p>
      </SlidePanelSection>
    </SlidePanel>
  )
}
