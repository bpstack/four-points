// app/components/cashier/CreateVoucherModal.tsx
'use client'

import { useState } from 'react'
import { FiX, FiSave, FiAlertCircle } from 'react-icons/fi'
import { useCreateVoucher } from '@/app/lib/cashier/queries'
import { useAuth } from '@/app/lib/auth/useAuth' // ✅ AÑADIR
import { toast } from 'react-hot-toast'

interface CreateVoucherModalProps {
  isOpen: boolean
  onClose: () => void
  shiftId: number
  currentVouchersCount: number
}

export default function CreateVoucherModal({
  isOpen,
  onClose,
  shiftId,
  currentVouchersCount,
}: CreateVoucherModalProps) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const createVoucherMutation = useCreateVoucher()
  const { user } = useAuth() // ✅ AÑADIR

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ AÑADIR: Verificar que hay usuario autenticado
    if (!user?.id) {
      toast.error('Usuario no autenticado')
      return
    }

    // Validaciones
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    if (reason.trim().length < 5) {
      toast.error('La razón debe tener al menos 5 caracteres')
      return
    }

    if (currentVouchersCount >= 5) {
      toast.error('Máximo 5 vales por turno')
      return
    }

    try {
      await createVoucherMutation.mutateAsync({
        shiftId,
        data: {
          amount: amountNum,
          reason: reason.trim(),
          created_by: user.id, // ✅ AÑADIR
        },
      })

      toast.success('Vale creado correctamente')
      setAmount('')
      setReason('')
      onClose()
    } catch (error: any) {
      console.error('Error creando vale:', error)
      toast.error(error?.message || 'Error al crear vale')
    }
  }

  const handleCancel = () => {
    setAmount('')
    setReason('')
    onClose()
  }

  if (!isOpen) return null

  const isLoading = createVoucherMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0d1117] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            📝 Nuevo Vale
          </h3>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Alert */}
        {currentVouchersCount >= 4 && (
          <div className="mx-4 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
            <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              <p className="font-medium">Límite casi alcanzado</p>
              <p className="text-xs mt-1">
                Tienes {currentVouchersCount} de 5 vales. Este será el{' '}
                {currentVouchersCount === 4 ? 'último' : 'penúltimo'}.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monto del Vale <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                    setAmount(value)
                  }
                }}
                placeholder="0.00"
                disabled={isLoading}
                className="w-full px-4 py-2 pr-8 text-lg font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-[#151b23] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                €
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ingresa el monto de la salida de efectivo
            </p>
          </div>

          {/* Razón */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Razón / Justificación <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ejemplo: Compra de suministros de limpieza"
              disabled={isLoading}
              rows={3}
              className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-[#151b23] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              required
              minLength={5}
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Mínimo 5 caracteres</span>
              <span
                className={`font-medium ${
                  reason.length < 5
                    ? 'text-gray-400 dark:text-gray-500'
                    : reason.length < 20
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                }`}
              >
                {reason.length} caracteres
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount || reason.length < 5}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Crear Vale
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
