// app/components/groups/cards/PaymentCard.tsx

'use client'

import { GroupPayment, PaymentStatus } from '@/app/lib/groups'
import { formatCurrency, formatDate, daysUntil } from '@/app/lib/helpers/utils'
import { cn } from '@/app/lib/helpers/utils'
import { useGroupStore } from '@/app/stores/useGroupStore'
import {
  FiCalendar,
  FiDollarSign,
  FiEdit,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
} from 'react-icons/fi'

interface PaymentCardProps {
  payment: GroupPayment
  onEdit: () => void
}

export function PaymentCard({ payment, onEdit }: PaymentCardProps) {
  const { highlightId } = useGroupStore()
  const isHighlighted = highlightId === payment.id

  const daysRemaining = daysUntil(payment.due_date)
  const isOverdue = daysRemaining < 0
  const isDueSoon = daysRemaining >= 0 && daysRemaining <= 7

  const getStatusConfig = (status: PaymentStatus) => {
    const configs = {
      pending: {
        color:
          'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        icon: FiClock,
        label: 'Pendiente',
      },
      requested: {
        color:
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        icon: FiClock,
        label: 'Solicitado',
      },
      partial: {
        color:
          'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        icon: FiAlertCircle,
        label: 'Parcial',
      },
      paid: {
        color:
          'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        icon: FiCheckCircle,
        label: 'Pagado',
      },
    }
    return configs[status]
  }

  const statusConfig = getStatusConfig(payment.status)
  const StatusIcon = statusConfig.icon
  const percentagePaid =
    payment.amount > 0 ? Math.round((payment.amount_paid / payment.amount) * 100) : 0

  return (
    <div
      id={`payment-${payment.id}`}
      className={cn(
        'bg-surface rounded-lg border p-4 transition-all duration-300',
        isHighlighted
          ? 'ring-2 ring-blue-500 border-blue-500 dark:ring-blue-400 dark:border-blue-400 shadow-lg'
          : 'border-border hover:shadow-md dark:hover:shadow-gray-900/50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-fg truncate">{payment.payment_name}</h3>
            {payment.payment_order && (
              <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium text-fg-muted bg-surface-sunken rounded-full">
                {payment.payment_order}
              </span>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                statusConfig.color
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>

            {/* Due date warning */}
            {isOverdue && (
              <span className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                Vencido hace {Math.abs(daysRemaining)} días
              </span>
            )}
            {isDueSoon && !isOverdue && (
              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                Vence en {daysRemaining} días
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={onEdit}
          className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-8 h-8 text-fg-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-surface-hover rounded transition-colors"
        >
          <FiEdit className="w-4 h-4" />
        </button>
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <FiDollarSign className="w-4 h-4 text-fg-subtle flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-fg-subtle">Monto Total</p>
            <p className="text-sm font-semibold text-fg truncate">
              {formatCurrency(payment.amount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FiDollarSign className="w-4 h-4 text-fg-subtle flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-fg-subtle">Pagado</p>
            <p className="text-sm font-semibold text-fg truncate">
              {formatCurrency(payment.amount_paid)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {payment.amount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-fg-subtle">Progreso</span>
            <span className="text-[10px] font-medium text-fg">{percentagePaid}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300 rounded-full',
                percentagePaid === 100
                  ? 'bg-green-500 dark:bg-green-400'
                  : percentagePaid > 0
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-border-strong'
              )}
              style={{ width: `${Math.min(percentagePaid, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Due date */}
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <FiCalendar className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Vencimiento: {formatDate(payment.due_date)}</span>
      </div>

      {/* Notes */}
      {payment.notes && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-fg-muted line-clamp-2">{payment.notes}</p>
        </div>
      )}
    </div>
  )
}
