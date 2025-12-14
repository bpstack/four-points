// app/components/groups/panels/ContactPanel.tsx

'use client'

import { useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, type ContactFormData } from '@/app/lib/schemas/group-schemas'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { groupsApi, type GroupContact } from '@/app/lib/groups'
import { FiX, FiSave } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface ContactPanelProps {
  isOpen: boolean
  onClose: () => void
  contact?: GroupContact
  groupId: number
}

export function ContactPanel({ isOpen, onClose, contact, groupId }: ContactPanelProps) {
  const { refreshContacts } = useGroupStore()
  const isEditing = !!contact

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
          is_primary: contact.is_primary ?? false, // ← CAMBIAR: asegurar valor por defecto
        }
      : {
          contact_name: '',
          contact_email: undefined,
          contact_phone: undefined,
          is_primary: false,
        },
  })

  // Resetear form cuando cierra
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = async (data: ContactFormData) => {
    try {
      const payload = {
        contact_name: data.contact_name || '', // ← CAMBIAR: asegurar string
        contact_email: data.contact_email ?? undefined,
        contact_phone: data.contact_phone ?? undefined,
        is_primary: data.is_primary ?? false,
      }

      if (isEditing && contact) {
        // Actualizar contacto existente
        await groupsApi.updateContact(groupId, contact.id, payload)
        toast.success('Contacto actualizado correctamente')
      } else {
        // Crear nuevo contacto
        await groupsApi.createContact(groupId, payload)
        toast.success('Contacto creado correctamente')
      }

      await refreshContacts(groupId)
      onClose()
      reset()
    } catch (error) {
      console.error('Error saving contact:', error)
      const message = error instanceof Error ? error.message : 'Error al guardar el contacto'
      toast.error(message)
    }
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
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex h-full flex-col bg-white dark:bg-[#151b23] shadow-xl"
                  >
                    {/* Header */}
                    <div className="px-4 py-6 sm:px-6 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}
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
                        {isEditing
                          ? 'Actualiza la información del contacto'
                          : 'Completa los datos del nuevo contacto'}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-4">
                        {/* Contact Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del Contacto <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('contact_name')}
                            type="text"
                            placeholder="Ej: Juan Pérez"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.contact_name && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.contact_name.message}
                            </p>
                          )}
                        </div>

                        {/* Contact Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Email
                          </label>
                          <input
                            {...register('contact_email')}
                            type="email"
                            placeholder="ejemplo@correo.com"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.contact_email && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.contact_email.message}
                            </p>
                          )}
                        </div>

                        {/* Contact Phone */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Teléfono
                          </label>
                          <input
                            {...register('contact_phone')}
                            type="tel"
                            placeholder="+52 123 456 7890"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.contact_phone && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.contact_phone.message}
                            </p>
                          )}
                        </div>

                        {/* Is Primary */}
                        <div className="flex items-center gap-2">
                          <input
                            {...register('is_primary')}
                            type="checkbox"
                            id="is_primary"
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-700 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-[#0d1117]"
                          />
                          <label
                            htmlFor="is_primary"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Marcar como contacto principal
                          </label>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 El contacto principal será usado para comunicaciones importantes del
                          grupo
                        </p>
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
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <FiSave className="w-4 h-4" />
                              {isEditing ? 'Actualizar' : 'Crear Contacto'}
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
