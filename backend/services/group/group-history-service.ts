// services/group/group-history-service.ts

import { GroupHistoryRepository } from '../../repositories/group/group-history-repository'
import {
  CreateGroupHistoryDTO,
  HistoryAction,
  GroupHistory,
  CreateGroupDTO,
} from '../../models/group/index'

export class GroupHistoryService {
  /**
   * Registrar creación de grupo
   */
  static async logGroupCreated(
    groupId: number,
    createdBy: string,
    groupData: CreateGroupDTO
  ): Promise<GroupHistory> {
    const historyData: CreateGroupHistoryDTO = {
      group_id: groupId,
      action: HistoryAction.CREATED,
      table_affected: 'groups',
      record_id: groupId,
      new_value: JSON.stringify(groupData),
      changed_by: createdBy,
      notes: 'Grupo creado',
    }

    return await GroupHistoryRepository.create(historyData)
  }

  /**
   * Registrar actualización de grupo
   */
  static async logGroupUpdated(
    groupId: number,
    updatedBy: string,
    oldData: object,
    newData: object,
    changedFields?: string[]
  ): Promise<GroupHistory[]> {
    const historyRecords: GroupHistory[] = []
    const old = oldData as Record<string, unknown>
    const nw = newData as Record<string, unknown>

    const fieldsToLog = changedFields || Object.keys(nw)

    for (const field of fieldsToLog) {
      if (!this.valuesEqual(old[field], nw[field])) {
        const historyData: CreateGroupHistoryDTO = {
          group_id: groupId,
          action: HistoryAction.UPDATED,
          table_affected: 'groups',
          record_id: groupId,
          field_changed: field,
          old_value: this.serializeValue(old[field]) ?? undefined,
          new_value: this.serializeValue(nw[field]) ?? undefined,
          changed_by: updatedBy,
          notes: `Campo "${field}" actualizado`,
        }

        const record = await GroupHistoryRepository.create(historyData)
        historyRecords.push(record)
      }
    }

    return historyRecords
  }

  /**
   * Comparar dos valores normalizando tipos comunes:
   * - null/undefined son iguales
   * - Date vs Date o Date vs string: comparar por fecha local
   * - número vs string numérico: comparar con Number()
   * - resto: ===
   */
  private static valuesEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null && b == null) return true
    if (a == null || b == null) return false

    const isDateA = a instanceof Date
    const isDateB = b instanceof Date

    if (isDateA || isDateB) {
      const toLocalDays = (v: unknown): string | null => {
        if (v instanceof Date) {
          return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
        }
        // 'AAAA-MM-DD' is already a calendar day: new Date() would read it as UTC
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
          const d = new Date(v)
          if (!isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          }
        }
        return null
      }
      const da = toLocalDays(a)
      const db = toLocalDays(b)
      if (da !== null && db !== null) return da === db
    }

    if (typeof a === 'number' && typeof b === 'string') {
      const nb = Number(b)
      if (!isNaN(nb)) return a === nb
    }
    if (typeof a === 'string' && typeof b === 'number') {
      const na = Number(a)
      if (!isNaN(na)) return na === b
    }

    return false
  }

  /**
   * Registrar cambio de estado
   */
  static async logStatusChanged(
    groupId: number,
    changedBy: string,
    statusType: string,
    oldValue: unknown,
    newValue: unknown
  ): Promise<GroupHistory> {
    const historyData: CreateGroupHistoryDTO = {
      group_id: groupId,
      action: HistoryAction.STATUS_CHANGED,
      table_affected: 'group_status',
      field_changed: statusType,
      old_value: this.serializeValue(oldValue) ?? undefined, // ✅ FIX
      new_value: this.serializeValue(newValue) ?? undefined, // ✅ FIX
      changed_by: changedBy,
      notes: `Estado "${statusType}" actualizado`,
    }

    return await GroupHistoryRepository.create(historyData)
  }

  /**
   * Registrar actualización de pago
   */
  static async logPaymentUpdated(
    groupId: number,
    paymentId: number,
    changedBy: string,
    oldData: object,
    newData: object,
    changedFields?: string[]
  ): Promise<GroupHistory[]> {
    const historyRecords: GroupHistory[] = []
    const old = oldData as Record<string, unknown>
    const nw = newData as Record<string, unknown>
    const fieldsToLog = changedFields || Object.keys(nw)

    for (const field of fieldsToLog) {
      if (old[field] !== nw[field]) {
        const historyData: CreateGroupHistoryDTO = {
          group_id: groupId,
          action: HistoryAction.PAYMENT_UPDATED,
          table_affected: 'group_payments',
          record_id: paymentId,
          field_changed: field,
          old_value: this.serializeValue(old[field]) ?? undefined, // ✅ FIX
          new_value: this.serializeValue(nw[field]) ?? undefined, // ✅ FIX
          changed_by: changedBy,
          notes: `Pago #${paymentId}: Campo "${field}" actualizado`,
        }

        const record = await GroupHistoryRepository.create(historyData)
        historyRecords.push(record)
      }
    }

    return historyRecords
  }

  /**
   * Registrar eliminación
   */
  static async logDeleted(
    groupId: number,
    deletedBy: string,
    tableName: string,
    recordId: number,
    deletedData: unknown
  ): Promise<GroupHistory> {
    const historyData: CreateGroupHistoryDTO = {
      group_id: groupId,
      action: HistoryAction.DELETED,
      table_affected: tableName,
      record_id: recordId,
      old_value: JSON.stringify(deletedData),
      changed_by: deletedBy,
      notes: `Registro eliminado de ${tableName}`,
    }

    return await GroupHistoryRepository.create(historyData)
  }

  /**
   * Registrar cambio genérico
   */
  static async logChange(
    groupId: number,
    changedBy: string,
    action: HistoryAction,
    tableName: string,
    recordId: number | null,
    fieldChanged: string | null,
    oldValue: unknown,
    newValue: unknown,
    notes?: string
  ): Promise<GroupHistory> {
    const historyData: CreateGroupHistoryDTO = {
      group_id: groupId,
      action,
      table_affected: tableName,
      record_id: recordId || undefined,
      field_changed: fieldChanged || undefined,
      old_value: this.serializeValue(oldValue) ?? undefined, // ✅ FIX
      new_value: this.serializeValue(newValue) ?? undefined, // ✅ FIX
      changed_by: changedBy,
      notes,
    }

    return await GroupHistoryRepository.create(historyData)
  }

  /**
   * Serializar valor para guardarlo como string
   * ✅ Ahora retorna string | null (compatible con conversión a undefined)
   */
  private static serializeValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  }

  /**
   * Obtener historial completo de un grupo
   */
  static async getGroupHistory(groupId: number, limit?: number) {
    return await GroupHistoryRepository.getByGroupId(groupId, limit)
  }
}
