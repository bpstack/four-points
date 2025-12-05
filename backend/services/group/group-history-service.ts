// services/group/group-history-service.ts

import { GroupHistoryRepository } from '../../repositories/group/group-history-repository'
import {
  CreateGroupHistoryDTO,
  HistoryAction,
  GroupHistory,
} from '../../models/group/index'

export class GroupHistoryService {
  /**
   * Registrar creación de grupo
   */
  static async logGroupCreated(
    groupId: number,
    createdBy: string,
    groupData: any
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
    oldData: any,
    newData: any,
    changedFields?: string[]
  ): Promise<GroupHistory[]> {
    const historyRecords: GroupHistory[] = []

    const fieldsToLog = changedFields || Object.keys(newData)

    for (const field of fieldsToLog) {
      if (oldData[field] !== newData[field]) {
        const historyData: CreateGroupHistoryDTO = {
          group_id: groupId,
          action: HistoryAction.UPDATED,
          table_affected: 'groups',
          record_id: groupId,
          field_changed: field,
          old_value: this.serializeValue(oldData[field]) ?? undefined, // ✅ FIX
          new_value: this.serializeValue(newData[field]) ?? undefined, // ✅ FIX
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
   * Registrar cambio de estado
   */
  static async logStatusChanged(
    groupId: number,
    changedBy: string,
    statusType: string,
    oldValue: any,
    newValue: any
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
    oldData: any,
    newData: any,
    changedFields?: string[]
  ): Promise<GroupHistory[]> {
    const historyRecords: GroupHistory[] = []
    const fieldsToLog = changedFields || Object.keys(newData)

    for (const field of fieldsToLog) {
      if (oldData[field] !== newData[field]) {
        const historyData: CreateGroupHistoryDTO = {
          group_id: groupId,
          action: HistoryAction.PAYMENT_UPDATED,
          table_affected: 'group_payments',
          record_id: paymentId,
          field_changed: field,
          old_value: this.serializeValue(oldData[field]) ?? undefined, // ✅ FIX
          new_value: this.serializeValue(newData[field]) ?? undefined, // ✅ FIX
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
    deletedData: any
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
    oldValue: any,
    newValue: any,
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
  private static serializeValue(value: any): string | null {
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
