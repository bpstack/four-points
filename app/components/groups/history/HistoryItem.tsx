// app/components/groups/history/HistoryItem.tsx

'use client'

import { GroupHistoryRecord, HistoryAction } from '@/app/api/groups/route'
import { FiPlus, FiEdit, FiTrash2, FiCheckCircle, FiDollarSign, FiClock } from 'react-icons/fi'

interface HistoryItemProps {
  record: GroupHistoryRecord
}

const ACTION_CONFIG = {
  [HistoryAction.CREATED]: {
    icon: FiPlus,
    label: 'Creado',
    color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  },
  [HistoryAction.UPDATED]: {
    icon: FiEdit,
    label: 'Actualizado',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  },
  [HistoryAction.DELETED]: {
    icon: FiTrash2,
    label: 'Eliminado',
    color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  },
  [HistoryAction.STATUS_CHANGED]: {
    icon: FiCheckCircle,
    label: 'Estado cambiado',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
  },
  [HistoryAction.PAYMENT_UPDATED]: {
    icon: FiDollarSign,
    label: 'Pago actualizado',
    color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  },
}

// Campos técnicos que NO deben mostrarse
const IGNORED_FIELDS = [
  'id',
  'group_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'created_by_username',
  'updated_by_username',
]

// Mapeo de nombres técnicos a etiquetas amigables
const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  agency: 'Agencia',
  arrival_date: 'Fecha de llegada',
  departure_date: 'Fecha de salida',
  status: 'Estado',
  total_amount: 'Importe total',
  currency: 'Moneda',
  notes: 'Notas',
  room_type: 'Tipo de habitación',
  quantity: 'Cantidad',
  guests_per_room: 'Huéspedes por habitación',
  contact_name: 'Nombre del contacto',
  contact_email: 'Email',
  contact_phone: 'Teléfono',
  is_primary: 'Contacto principal',
  payment_name: 'Nombre del pago',
  amount: 'Monto',
  amount_paid: 'Monto pagado',
  due_date: 'Fecha de vencimiento',
  percentage: 'Porcentaje',
  booking_confirmed: 'Booking confirmado',
  booking_confirmed_date: 'Fecha de confirmación',
  contract_signed: 'Contrato firmado',
  contract_signed_date: 'Fecha de firma',
  rooming_status: 'Estado de rooming',
  rooming_requested_date: 'Fecha de solicitud',
  rooming_received_date: 'Fecha de recepción',
  rooming_deadline: 'Fecha límite',
  balance_status: 'Estado de balance',
  balance_requested_date: 'Fecha de solicitud',
  balance_paid_date: 'Fecha de pago',
}

// Mapeo de valores técnicos a etiquetas amigables
const VALUE_LABELS: Record<string, string> = {
  // Room types
  single: 'Individual',
  double_bed: 'Doble (1 cama)',
  twin_beds: 'Doble (2 camas)',
  // Status
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  in_progress: 'En curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  // Payment/Balance status
  requested: 'Solicitado',
  partial: 'Parcial',
  paid: 'Pagado',
  // Rooming status
  received: 'Recibido',
  // Boolean
  true: 'Sí',
  false: 'No',
  '1': 'Sí',
  '0': 'No',
}

export function HistoryItem({ record }: HistoryItemProps) {
  const config = ACTION_CONFIG[record.action]
  const Icon = config.icon

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatFieldName = (field: string) => {
    return (
      FIELD_LABELS[field] ||
      field
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
  }

  const formatValue = (value: string, field?: string) => {
    // Check for null/undefined
    if (value === null || value === undefined || value === 'null' || value === 'undefined') {
      return '—'
    }

    // Check if it's a date field
    if (field && field.includes('date') && value && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }

    // Check if it's a currency field
    if (field && (field.includes('amount') || field.includes('total')) && !isNaN(Number(value))) {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(Number(value))
    }

    // Check for predefined labels
    if (VALUE_LABELS[value.toLowerCase()]) {
      return VALUE_LABELS[value.toLowerCase()]
    }

    return value
  }

  const parseJSONChanges = (oldValue: string | null, newValue: string | null) => {
    try {
      const oldObj = oldValue ? JSON.parse(oldValue) : {}
      const newObj = newValue ? JSON.parse(newValue) : {}

      // Find changed fields
      const changes: Array<{ field: string; oldVal: any; newVal: any }> = []

      const allFields = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

      for (const field of allFields) {
        // Skip technical fields and undefined values
        if (IGNORED_FIELDS.includes(field)) continue

        const oldVal = oldObj[field]
        const newVal = newObj[field]

        // Skip if both are null/undefined
        if ((oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined))
          continue

        // Only add if values are actually different
        if (oldVal !== newVal) {
          changes.push({
            field,
            oldVal,
            newVal,
          })
        }
      }

      return changes.length > 0 ? changes : null
    } catch (error) {
      return null
    }
  }

  // Try to parse JSON changes
  const jsonChanges =
    record.old_value && record.new_value
      ? parseJSONChanges(record.old_value, record.new_value)
      : null

  // Get readable description
  const getDescription = () => {
    const table = record.table_affected

    if (record.action === HistoryAction.CREATED) {
      if (table === 'hotel_groups') return 'Grupo creado'
      if (table === 'group_payments') return 'Pago creado'
      if (table === 'group_contacts') return 'Contacto creado'
      if (table === 'group_rooms') return 'Habitación creada'
      return 'Registro creado'
    }

    if (record.action === HistoryAction.UPDATED) {
      if (table === 'hotel_groups') return 'Información del grupo actualizada'
      if (table === 'group_payments') return 'Pago actualizado'
      if (table === 'group_contacts') return 'Contacto actualizado'
      if (table === 'group_rooms') return 'Habitación actualizada'
      if (table === 'group_status') return 'Estado actualizado'
      return 'Registro actualizado'
    }

    if (record.action === HistoryAction.DELETED) {
      if (table === 'group_payments') return 'Pago eliminado'
      if (table === 'group_contacts') return 'Contacto eliminado'
      if (table === 'group_rooms') return 'Habitación eliminada'
      return 'Registro eliminado'
    }

    return config.label
  }

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800 last:hidden" />

      {/* Icon */}
      <div
        className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ${config.color}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-[#151b23] rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getDescription()}
            </p>
            {record.changed_by_username && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Por{' '}
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {record.changed_by_username}
                </span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <FiClock className="w-3 h-3" />
            {formatDate(record.changed_at)}
          </div>
        </div>

        {/* Changes */}
        {jsonChanges && jsonChanges.length > 0 ? (
          <div className="space-y-2">
            {jsonChanges.map((change, index) => (
              <div key={index} className="text-sm">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {formatFieldName(change.field)}
                </p>
                <div className="flex items-center gap-2">
                  {change.oldVal !== null && change.oldVal !== undefined && (
                    <>
                      <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-xs">
                        {formatValue(String(change.oldVal), change.field)}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  )}
                  <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                    {formatValue(String(change.newVal), change.field)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : record.field_changed && (record.old_value || record.new_value) ? (
          <div className="text-sm">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {formatFieldName(record.field_changed)}
            </p>
            <div className="flex items-center gap-2">
              {record.old_value && (
                <>
                  <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-xs">
                    {formatValue(record.old_value, record.field_changed)}
                  </span>
                  <span className="text-gray-400">→</span>
                </>
              )}
              {record.new_value && (
                <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                  {formatValue(record.new_value, record.field_changed)}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* Notes */}
        {record.notes && (
          <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            💬 {record.notes}
          </p>
        )}
      </div>
    </div>
  )
}
