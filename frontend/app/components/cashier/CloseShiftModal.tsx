// app/components/cashier/CloseShiftModal.tsx
'use client'

import { FiX, FiCheckCircle, FiAlertCircle, FiDollarSign } from 'react-icons/fi'
import { useCloseShift } from '@/app/lib/cashier/queries'
import { toast } from 'react-hot-toast'
import type { CashierShift } from '@/app/lib/cashier/types'

interface CloseShiftModalProps {
  isOpen: boolean
  onClose: () => void
  shift: CashierShift
  shiftType: string
}

export default function CloseShiftModal({
  isOpen,
  onClose,
  shift,
  shiftType,
}: CloseShiftModalProps) {
  const closeShiftMutation = useCloseShift()

  // Calcular total de vales
  const totalVouchers = shift.vouchers?.reduce((sum, v) => sum + parseFloat(v.amount), 0) || 0

  // ✅ CORREGIDO: Validaciones sin vales pendientes
  const validations = {
    hasDenominations: shift.denominations && shift.denominations.length > 0,
    hasPayments: shift.payments && shift.payments.length > 0,
  }

  // ✅ CORREGIDO: Solo validar denominaciones y pagos
  const canClose = validations.hasDenominations && validations.hasPayments

  // Calcular totales con vales
  const totalDenominations =
    shift.denominations?.reduce((sum, d) => sum + parseFloat(d.total), 0) || 0

  const totalPayments = shift.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0

  const cashExpected = parseFloat(shift.initial_fund) + parseFloat(shift.income) - totalVouchers
  const cashCounted = totalDenominations
  const difference = cashCounted - cashExpected
  const grandTotal = cashCounted + totalPayments

  // Contar vales pendientes (solo informativo)
  const pendingVouchersCount = shift.vouchers?.filter((v) => v.status === 'pending').length || 0

  const handleClose = async () => {
    if (!canClose) {
      toast.error('No se cumplen todos los requisitos para cerrar el turno')
      return
    }

    try {
      await closeShiftMutation.mutateAsync(shift.id)
      toast.success('Turno cerrado correctamente')
      onClose()
    } catch (error) {
      console.error('Error cerrando turno:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al cerrar turno'
      toast.error(errorMessage)
    }
  }

  if (!isOpen) return null

  const isLoading = closeShiftMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1117] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#0d1117] flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FiCheckCircle className="w-5 h-5 text-green-600" />
            Cerrar Turno {shiftType}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Validaciones */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Validaciones:
            </h4>

            {/* Denominaciones */}
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                validations.hasDenominations
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {validations.hasDenominations ? (
                <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  validations.hasDenominations
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {validations.hasDenominations
                  ? 'Conteo de efectivo completado'
                  : 'Falta conteo de efectivo'}
              </span>
            </div>

            {/* Pagos */}
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                validations.hasPayments
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {validations.hasPayments ? (
                <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  validations.hasPayments
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {validations.hasPayments
                  ? 'Pagos electrónicos registrados'
                  : 'Faltan pagos electrónicos'}
              </span>
            </div>

            {/* ✅ Vales - Solo informativo (azul) */}
            {shiftType === 'Cierre' && pendingVouchersCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <FiAlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {pendingVouchersCount} vale(s) pendiente(s)
                  </span>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    Se pueden justificar después del cierre
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Resumen financiero */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Resumen Financiero:
            </h4>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Fondo Inicial:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {parseFloat(shift.initial_fund).toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Ingresos del Turno:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  +{parseFloat(shift.income).toFixed(2)}€
                </span>
              </div>

              {totalVouchers > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Vales del Turno ({shift.vouchers?.length || 0}):
                  </span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    -{totalVouchers.toFixed(2)}€
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Efectivo Esperado:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {cashExpected.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Efectivo Contado:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {cashCounted.toFixed(2)}€
                </span>
              </div>
              <div
                className={`flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700 ${
                  difference === 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                <span className="font-semibold">Descuadre:</span>
                <span className="font-bold">{difference.toFixed(2)}€</span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-blue-700 dark:text-blue-300">Efectivo:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {cashCounted.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-blue-700 dark:text-blue-300">Pagos Electrónicos:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {totalPayments.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t-2 border-blue-200 dark:border-blue-800">
                <span className="font-bold text-blue-900 dark:text-blue-100">Gran Total:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {grandTotal.toFixed(2)}€
                </span>
              </div>
            </div>
          </div>

          {/* Warning si hay descuadre */}
          {difference !== 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
              <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <p className="font-medium">
                  Hay un descuadre de {Math.abs(difference).toFixed(2)}€
                </p>
                <p className="text-xs mt-1">
                  {difference > 0 ? 'Sobra efectivo en caja' : 'Falta efectivo en caja'}
                </p>
              </div>
            </div>
          )}

          {/* Info sobre vales si no es turno Cierre */}
          {shiftType !== 'Cierre' && totalVouchers > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <FiDollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Vales del turno</p>
                <p className="text-xs mt-1">
                  Los vales se justificarán en el turno de Cierre. Total: {totalVouchers.toFixed(2)}
                  €
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-[#0d1117] p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading || !canClose}
            className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cerrando...
              </>
            ) : (
              <>
                <FiCheckCircle className="w-4 h-4" />
                Cerrar Turno
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
