// app/components/groups/panels/ContactPanel.tsx

'use client'

import { useEffect } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useTranslations } from 'next-intl'

import { contactSchema, type ContactFormData } from '@/app/lib/schemas/group-schemas'
import {
  useGroupContacts,
  useCreateContact,
  useUpdateContact,
  type GroupContact,
} from '@/app/lib/groups'
import { useGroupStore } from '@/app/stores/useGroupStore'
import {
  SlidePanel,
  SlidePanelSection,
  SlidePanelFooterButtons,
  FormField,
  inputClassName,
} from '@/app/ui/panels'
import { Checkbox } from '@/app/ui/components'

interface ContactPanelProps {
  isOpen: boolean
  onClose: () => void
  contact?: GroupContact
  groupId: number
}

export function ContactPanel({ isOpen, onClose, contact, groupId }: ContactPanelProps) {
  const t = useTranslations('groups')
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
    control,
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
        throw new Error(t('contactPanel.missingGroupId'))
      }

      if (isEditing && contact) {
        await updateContactMutation.mutateAsync(payload)
        toast.success(t('contactPanel.updateSuccess'))
      } else {
        await createContactMutation.mutateAsync(payload)
        toast.success(t('contactPanel.createSuccess'))
      }

      onClose()
      reset()
    } catch (error) {
      console.error('Error saving contact:', error)
      const message = error instanceof Error ? error.message : t('contactPanel.error')
      toast.error(message)
    }
  }

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('contactPanel.editContact') : t('contactPanel.newContact')}
      subtitle={isEditing ? t('contactPanel.editSubtitle') : t('contactPanel.subtitle')}
      size="md"
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          isSubmitting={
            isSubmitting || createContactMutation.isPending || updateContactMutation.isPending
          }
          submitText={isEditing ? t('contactPanel.updateContact') : t('contactPanel.createContact')}
          submitIcon={<FiSave className="w-4 h-4" />}
          submitVariant="primary"
        />
      }
    >
      <SlidePanelSection>
        {/* Contact Name */}
        <FormField label={t('contactPanel.name')} required error={errors.contact_name?.message}>
          <input
            {...register('contact_name')}
            type="text"
            placeholder={t('contactPanel.namePlaceholder')}
            className={inputClassName}
          />
        </FormField>

        {/* Contact Email */}
        <FormField label={t('contactPanel.email')} error={errors.contact_email?.message}>
          <input
            {...register('contact_email')}
            type="email"
            placeholder={t('contactPanel.emailPlaceholder')}
            className={inputClassName}
          />
        </FormField>

        {/* Contact Phone */}
        <FormField label={t('contactPanel.phone')} error={errors.contact_phone?.message}>
          <input
            {...register('contact_phone')}
            type="tel"
            placeholder={t('contactPanel.phonePlaceholder')}
            className={inputClassName}
          />
        </FormField>

        {/* Is Primary */}
        <Controller
          name="is_primary"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={!!field.value}
              onCheckedChange={field.onChange}
              label={t('contactPanel.isPrimary')}
              strikeOnCheck={false}
              id="is_primary"
            />
          )}
        />

        <p className="text-xs text-fg-subtle">{t('contactPanel.isPrimaryHint')}</p>
      </SlidePanelSection>
    </SlidePanel>
  )
}
