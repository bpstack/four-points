// app/components/groups/panels/PaymentPanel.tsx

'use client'

import { useEffect, Fragment, useState, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentFormData } from '@/app/lib/schemas/group-schemas'
import { useGroupStore } from '@/app/stores/useGroupStore'
import { groupsApi, type GroupPayment } from '@/app/api/groups/route'
import { FiX, FiSave, FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi'
import SimpleCalendarCompact from '@/app/ui/calendar/SimpleCalendarCompact'
import { formatDateForInput } from '@/app/lib/helpers/date'
import toast from 'react-hot-toast'

interface PaymentPanelProps {
  isOpen: boolean
  onClose: () => void
  payment?: GroupPayment // Si existe, es edición
  groupId: number
  totalAmount: number
}

// Opciones para el dropdown de orden de pago
const PAYMENT_ORDER_OPTIONS = [
  { value: 1, label: 'Primer Pago' },
  { value: 2, label: 'Segundo Pago' },
  { value: 3, label: 'Tercer Pago' },
  { value: 4, label: 'Cuarto Pago' },
  { value: 5, label: 'Quinto Pago' },
  { value: 99, label: 'Pago Final' },
]

export function PaymentPanel({
  isOpen,
  onClose,
  payment,
  groupId,
  totalAmount,
}: PaymentPanelProps) {
  const { refreshPayments, refreshStatus, deletePayment } = useGroupStore() // ← AÑADIR refreshStatus
  const isEditing = !!payment

  const [showCalendar, setShowCalendar] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: payment
      ? {
          payment_name: payment.payment_name,
          payment_order: payment.payment_order || 1,
          percentage: payment.percentage ?? undefined,
          amount: payment.amount ?? undefined,
          amount_paid: payment.amount_paid ?? undefined, // Cambiado de 0 a undefined
          due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
          status: payment.status || 'pending',
          notes: payment.notes ?? '',
        }
      : {
          payment_name: '',
          payment_order: 1,
          percentage: undefined,
          amount: undefined,
          amount_paid: undefined, // Cambiado de 0 a undefined
          due_date: '',
          status: 'pending',
          notes: '',
        },
  })

  const percentage = watch('percentage')
  const amount = watch('amount')
  const due_date = watch('due_date')

  // Resetear y cargar datos cuando cambia el payment o isOpen
  useEffect(() => {
    if (isOpen && payment) {
      reset({
        payment_name: payment.payment_name,
        payment_order: payment.payment_order || 1,
        percentage: payment.percentage ?? undefined,
        amount: payment.amount ?? undefined,
        amount_paid: payment.amount_paid ?? undefined, // Cambiado de 0 a undefined
        due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
        status: payment.status || 'pending',
        notes: payment.notes ?? '',
      })
    } else if (isOpen && !payment) {
      reset({
        payment_name: '',
        payment_order: 1,
        percentage: undefined,
        amount: undefined,
        amount_paid: undefined, // Cambiado de 0 a undefined
        due_date: '',
        status: 'pending',
        notes: '',
      })
    }
  }, [isOpen, payment, reset])

  // Auto-calcular amount desde percentage
  useEffect(() => {
    if (percentage !== null && percentage !== undefined && totalAmount > 0) {
      const calculatedAmount = (totalAmount * percentage) / 100
      setValue('amount', calculatedAmount)
    }
  }, [percentage, totalAmount, setValue])

  // Resetear form cuando cierra
  useEffect(() => {
    if (!isOpen) {
      setShowCalendar(false)
    }
  }, [isOpen])

  // Click outside calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  const handleDateSelect = (date: Date | null) => {
    if (date) {
      setValue('due_date', formatDateForInput(date))
      setShowCalendar(false)
    }
  }

  // Formatear fecha para mostrar en el input readonly
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString + 'T12:00:00')
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const payload = {
        payment_name: data.payment_name,
        payment_order: data.payment_order,
        percentage: data.percentage ?? undefined,
        amount: data.amount ?? undefined,
        amount_paid: data.amount_paid ?? 0,
        due_date: data.due_date,
        status: data.status as any,
        notes: data.notes || undefined,
      }

      if (isEditing && payment) {
        await groupsApi.updatePayment(groupId, payment.id, payload)
        toast.success('Pago actualizado correctamente')
      } else {
        await groupsApi.createPayment(groupId, payload)
        toast.success('Pago creado correctamente')
      }

      // ✅ CAMBIO: Refrescar pagos (que también refresca status automáticamente)
      await refreshPayments(groupId)

      onClose()
    } catch (error: any) {
      console.error('Error saving payment:', error)
      toast.error(error.message || 'Error al guardar el pago')
    }
  }

  const handleDelete = async () => {
    if (!payment) return

    setIsDeleting(true)
    try {
      await deletePayment(groupId, payment.id)

      // ✅ CAMBIO: Refrescar status después de eliminar
      await refreshStatus(groupId)

      toast.success('Pago eliminado correctamente')
      onClose()
    } catch (error: any) {
      console.error('Error deleting payment:', error)
      toast.error(error.message || 'Error al eliminar el pago')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
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
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg md:max-w-xl lg:max-w-2xl">
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex h-full flex-col bg-white dark:bg-[#151b23] shadow-xl"
                  >
                    {/* Header */}
                    <div className="px-4 py-6 sm:px-6 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {isEditing && <FiEdit2 className="w-5 h-5" />}
                          {isEditing ? 'Editar Pago' : 'Nuevo Pago'}
                        </Dialog.Title>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                        >
                          <FiX className="h-6 w-6" />
                        </button>
                      </div>
                      <p
                        className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                        title={isEditing ? 'Editar este pago' : ''}
                      >
                        {isEditing
                          ? 'Actualiza la información del pago'
                          : 'Completa los datos del nuevo pago'}
                      </p>
                      {isEditing && payment && (
                        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                          Editando:{' '}
                          {PAYMENT_ORDER_OPTIONS.find((opt) => opt.value === payment.payment_order)
                            ?.label || 'Pago'}{' '}
                          - {payment.payment_name}
                        </p>
                      )}
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                      <div className="space-y-4">
                        {/* Payment Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre del Pago <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('payment_name')}
                            type="text"
                            placeholder="Ej: Anticipo 30%"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.payment_name && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.payment_name.message}
                            </p>
                          )}
                        </div>

                        {/* Payment Order - DROPDOWN */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Orden del Pago
                          </label>
                          <select
                            {...register('payment_order', { valueAsNumber: true })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            {PAYMENT_ORDER_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {errors.payment_order && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.payment_order.message}
                            </p>
                          )}
                        </div>

                        {/* Percentage and Amount */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Porcentaje (%)
                            </label>
                            <input
                              {...register('percentage', {
                                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                              })}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="30"
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                            />
                            {errors.percentage && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.percentage.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Monto <span className="text-red-500">*</span>
                            </label>
                            <input
                              {...register('amount', {
                                setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                              })}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                            />
                            {errors.amount && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors.amount.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 Si ingresas el porcentaje, el monto se calcula automáticamente
                        </p>

                        {/* Amount Paid */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Monto Pagado
                          </label>
                          <input
                            {...register('amount_paid', {
                              setValueAs: (v) => (v === '' ? undefined : parseFloat(v)),
                            })}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          />
                          {errors.amount_paid && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.amount_paid.message}
                            </p>
                          )}
                        </div>

                        {/* Due Date with Calendar - MODIFICADO */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Fecha de Vencimiento <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              {...register('due_date')}
                              type="text"
                              readOnly
                              value={formatDisplayDate(due_date)}
                              placeholder="Selecciona una fecha"
                              className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 cursor-pointer"
                              onClick={() => setShowCalendar(!showCalendar)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCalendar(!showCalendar)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                            >
                              <FiCalendar className="w-4 h-4" />
                            </button>
                          </div>
                          {errors.due_date && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {errors.due_date.message}
                            </p>
                          )}

                          {/* Calendar Dropdown */}
                          {showCalendar && (
                            <div ref={calendarRef} className="absolute z-10 mt-1 right-0">
                              <SimpleCalendarCompact
                                selectedDate={due_date ? new Date(due_date + 'T12:00:00') : null}
                                onSelect={handleDateSelect}
                                onClose={() => setShowCalendar(false)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado
                          </label>
                          <select
                            {...register('status')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="requested">Solicitado</option>
                            <option value="partial">Parcial</option>
                            <option value="paid">Pagado</option>
                          </select>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notas
                          </label>
                          <textarea
                            {...register('notes')}
                            rows={3}
                            placeholder="Notas adicionales..."
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
                      <div className="flex flex-col gap-3">
                        {/* Botones de acción principales */}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting || isDeleting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || isDeleting}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <FiSave className="w-4 h-4" />
                                {isEditing ? 'Actualizar' : 'Crear Pago'}
                              </>
                            )}
                          </button>
                        </div>

                        {/* Botón de eliminar (discreto, solo en modo edición) */}
                        {isEditing && payment && (
                          <div className="flex justify-center pt-2 border-t border-gray-100 dark:border-gray-800">
                            {!showDeleteConfirm ? (
                              <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={isSubmitting || isDeleting}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:text-red-600 dark:focus:text-red-400 disabled:opacity-50 transition-colors"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                                Eliminar pago
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  ¿Estás seguro?
                                </span>
                                <button
                                  type="button"
                                  onClick={handleDelete}
                                  disabled={isDeleting}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                  {isDeleting ? 'Eliminando...' : 'Sí'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeleteConfirm(false)}
                                  disabled={isDeleting}
                                  className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 focus:outline-none disabled:opacity-50"
                                >
                                  No
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
