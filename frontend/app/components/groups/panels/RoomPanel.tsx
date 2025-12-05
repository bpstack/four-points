// app/components/groups/panels/RoomPanel.tsx

'use client'

import { useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { roomSchema, type RoomFormData } from '@/app/lib/schemas/group-schemas'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { groupsApi, type GroupRoom } from '@/app/api/groups/route'
import { FiX, FiSave, FiEdit } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { RoomType } from '@/app/api/groups/route'

interface RoomPanelProps {
  isOpen: boolean
  onClose: () => void
  room?: GroupRoom
  groupId: number
}

const ROOM_TYPES = [
  { value: RoomType.SINGLE, label: 'Individual', icon: '🛏️' }, // ← CAMBIAR
  { value: RoomType.DOUBLE_BED, label: 'Doble (1 cama)', icon: '🛏️' }, // ← CAMBIAR
  { value: RoomType.TWIN_BEDS, label: 'Doble (2 camas)', icon: '🛏️🛏️' }, // ← CAMBIAR
] as const

export function RoomPanel({ isOpen, onClose, room, groupId }: RoomPanelProps) {
  const { refreshRooms } = useGroupStore()
  const isEditing = !!room

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema) as Resolver<RoomFormData>,
    defaultValues: room
      ? {
          room_type: room.room_type,
          quantity: room.quantity,
          guests_per_room: room.guests_per_room,
          notes: room.notes || '',
        }
      : {
          room_type: RoomType.DOUBLE_BED, // ← CAMBIAR: usar el enum, no el string
          quantity: 1,
          guests_per_room: 2,
          notes: '',
        },
  })

  // Watch values for live calculations
  const quantity = watch('quantity')
  const guestsPerRoom = watch('guests_per_room')
  const totalGuests = (quantity || 0) * (guestsPerRoom || 0)

  // Resetear form cuando cierra
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const onSubmit = async (data: RoomFormData) => {
    try {
      const payload = {
        room_type: data.room_type,
        quantity: data.quantity,
        guests_per_room: data.guests_per_room,
        notes: data.notes || undefined,
      }

      if (isEditing && room) {
        // Actualizar habitación existente (PUT)
        await groupsApi.updateRoom(groupId, room.id, payload)
        toast.success('Habitación actualizada correctamente')
      } else {
        // Crear nueva habitación (POST - UPSERT)
        await groupsApi.createOrUpdateRoom(groupId, payload)
        toast.success('Habitación creada correctamente')
      }

      await refreshRooms(groupId)
      onClose()
      reset()
    } catch (error: any) {
      console.error('Error saving room:', error)
      toast.error(error.message || 'Error al guardar la habitación')
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
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <FiEdit className="w-5 h-5" />
                          {isEditing ? 'Editar Habitación' : 'Nueva Habitación'}
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
                          ? 'Actualiza los datos de la habitación'
                          : 'Agrega un nuevo tipo de habitación al grupo'}
                      </p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-5">
                        {/* Room Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo de Habitación <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-1 gap-2">
                            {ROOM_TYPES.map((type) => (
                              <label
                                key={type.value}
                                className="relative flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <input
                                  {...register('room_type')}
                                  type="radio"
                                  value={type.value}
                                  className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-2xl">{type.icon}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {type.label}
                                </span>
                              </label>
                            ))}
                          </div>
                          {errors.room_type && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.room_type.message}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cantidad de Habitaciones <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('quantity', { valueAsNumber: true })}
                            type="number"
                            min="1"
                            placeholder="Ej: 10"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.quantity && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.quantity.message}
                            </p>
                          )}
                        </div>

                        {/* Guests per Room */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Personas por Habitación <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('guests_per_room', { valueAsNumber: true })}
                            type="number"
                            min="1"
                            max="10"
                            placeholder="Ej: 2"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.guests_per_room && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.guests_per_room.message}
                            </p>
                          )}
                        </div>

                        {/* Total Guests Calculation */}
                        {quantity > 0 && guestsPerRoom > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Total de Huéspedes:
                              </span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {totalGuests}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {quantity} habitación{quantity !== 1 && 'es'} × {guestsPerRoom}{' '}
                              persona{guestsPerRoom !== 1 && 's'}
                            </p>
                          </div>
                        )}

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notas
                          </label>
                          <textarea
                            {...register('notes')}
                            rows={3}
                            placeholder="Observaciones sobre estas habitaciones..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none"
                          />
                          {errors.notes && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.notes.message}
                            </p>
                          )}
                        </div>
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
                              {isEditing ? 'Actualizar' : 'Crear Habitación'}
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
