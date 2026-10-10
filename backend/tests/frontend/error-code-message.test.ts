// tests/frontend/error-code-message.test.ts
// The text the user sees for a backend error code, in each page language.

import { describe, it, expect } from 'vitest'
import { errorCodeMessage } from '../../../frontend/app/lib/helpers/errorCodeMessage.js'

describe('errorCodeMessage', () => {
  it('gives the storage message in Spanish and in English', () => {
    expect(errorCodeMessage('STORAGE_NOT_CONFIGURED', 'es')).toMatch(
      /^El almacenamiento de archivos no está configurado/
    )
    expect(errorCodeMessage('STORAGE_NOT_CONFIGURED', 'en')).toMatch(
      /^File storage is not configured/
    )
  })

  it('gives activity messages in Spanish and in English', () => {
    expect(errorCodeMessage('ACTIVITY_INVALID_SOURCE', 'es')).toMatch(
      /^Fuente inválida/
    )
    expect(errorCodeMessage('ACTIVITY_INVALID_SOURCE', 'en')).toMatch(
      /^Invalid source/
    )
    expect(errorCodeMessage('ACTIVITY_INVALID_DATE_FORMAT', 'es')).toMatch(
      /^Formato de fecha inválido/
    )
    expect(errorCodeMessage('ACTIVITY_INVALID_DATE_FORMAT', 'en')).toMatch(
      /^Invalid date format/
    )
    expect(errorCodeMessage('ACTIVITY_FETCH_ERROR', 'es')).toMatch(
      /^Error al obtener actividad/
    )
    expect(errorCodeMessage('ACTIVITY_FETCH_ERROR', 'en')).toMatch(
      /^Error fetching recent activity/
    )
  })

  it('gives departments messages in Spanish and in English', () => {
    expect(errorCodeMessage('DEPARTMENTS_NAME_REQUIRED', 'es')).toMatch(
      /^El nombre del departamento es requerido/
    )
    expect(errorCodeMessage('DEPARTMENTS_NAME_REQUIRED', 'en')).toMatch(
      /^Department name is required/
    )
    expect(errorCodeMessage('DEPARTMENTS_DUPLICATE', 'es')).toMatch(
      /^Ya existe un departamento/
    )
    expect(errorCodeMessage('DEPARTMENTS_DUPLICATE', 'en')).toMatch(
      /^A department with that name already exists/
    )
    expect(errorCodeMessage('DEPARTMENTS_HAS_RECORDS', 'es')).toMatch(
      /^No se puede eliminar un departamento/
    )
    expect(errorCodeMessage('DEPARTMENTS_HAS_RECORDS', 'en')).toMatch(
      /^Cannot delete department/
    )
    expect(errorCodeMessage('DEPARTMENTS_NOT_FOUND', 'es')).toMatch(
      /^Departamento no encontrado/
    )
    expect(errorCodeMessage('DEPARTMENTS_NOT_FOUND', 'en')).toMatch(
      /^Department not found/
    )
    expect(errorCodeMessage('DEPARTMENTS_CREATE_ERROR', 'es')).toMatch(
      /^Error al crear departamento/
    )
    expect(errorCodeMessage('DEPARTMENTS_CREATE_ERROR', 'en')).toMatch(
      /^Error creating department/
    )
    expect(errorCodeMessage('DEPARTMENTS_FETCH_ERROR', 'es')).toMatch(
      /^Error al recuperar departamentos/
    )
    expect(errorCodeMessage('DEPARTMENTS_FETCH_ERROR', 'en')).toMatch(
      /^Error fetching departments/
    )
    expect(errorCodeMessage('DEPARTMENTS_FETCH_ONE_ERROR', 'es')).toMatch(
      /^Error al obtener departamento/
    )
    expect(errorCodeMessage('DEPARTMENTS_FETCH_ONE_ERROR', 'en')).toMatch(
      /^Error fetching department/
    )
    expect(errorCodeMessage('DEPARTMENTS_UPDATE_ERROR', 'es')).toMatch(
      /^Error al actualizar departamento/
    )
    expect(errorCodeMessage('DEPARTMENTS_UPDATE_ERROR', 'en')).toMatch(
      /^Error updating department/
    )
    expect(errorCodeMessage('DEPARTMENTS_DELETE_ERROR', 'es')).toMatch(
      /^Error al eliminar departamento/
    )
    expect(errorCodeMessage('DEPARTMENTS_DELETE_ERROR', 'en')).toMatch(
      /^Error deleting department/
    )
  })

  it('falls back to Spanish for a language without messages', () => {
    expect(errorCodeMessage('STORAGE_NOT_CONFIGURED', 'fr')).toBe(
      errorCodeMessage('STORAGE_NOT_CONFIGURED', 'es')
    )
  })

  it('leaves other codes and missing codes to the backend text', () => {
    expect(errorCodeMessage(undefined, 'es')).toBeUndefined()
    expect(errorCodeMessage(42, 'es')).toBeUndefined()
  })

  describe('BACKOFFICE codes', () => {
    const backofficeCodes = [
      'BACKOFFICE_ASSET_NOT_FOUND',
      'BACKOFFICE_BATCH_PAYMENT_ERROR',
      'BACKOFFICE_BATCH_PAYMENT_PREVIEW_ERROR',
      'BACKOFFICE_CATEGORY_NOT_FOUND',
      'BACKOFFICE_COST_CENTER_DEPARTMENT_REQUIRED',
      'BACKOFFICE_CREATE_ASSET_ERROR',
      'BACKOFFICE_CREATE_CATEGORY_ERROR',
      'BACKOFFICE_CREATE_INVOICE_ERROR',
      'BACKOFFICE_CREATE_SUPPLIER_ERROR',
      'BACKOFFICE_CREATE_ZIP_ERROR',
      'BACKOFFICE_DEACTIVATE_SUPPLIER_ERROR',
      'BACKOFFICE_DELETE_ASSET_ERROR',
      'BACKOFFICE_DELETE_INVOICE_ERROR',
      'BACKOFFICE_DOWNLOAD_PDF_ERROR',
      'BACKOFFICE_FETCH_ASSETS_ERROR',
      'BACKOFFICE_FETCH_CATEGORIES_ERROR',
      'BACKOFFICE_FETCH_CATEGORY_ERROR',
      'BACKOFFICE_FETCH_HISTORY_ERROR',
      'BACKOFFICE_FETCH_INVOICE_ERROR',
      'BACKOFFICE_FETCH_INVOICES_ERROR',
      'BACKOFFICE_FETCH_MONTHLY_SUMMARY_ERROR',
      'BACKOFFICE_FETCH_STATS_ERROR',
      'BACKOFFICE_FETCH_SUPPLIER_ERROR',
      'BACKOFFICE_FETCH_SUPPLIERS_ERROR',
      'BACKOFFICE_FILE_TOO_LARGE',
      'BACKOFFICE_GET_PDF_URL_ERROR',
      'BACKOFFICE_INVALID_ASSET_TYPE',
      'BACKOFFICE_INVALID_IMAGE_TYPE',
      'BACKOFFICE_INVALID_MONTH',
      'BACKOFFICE_INVALID_STATUS',
      'BACKOFFICE_INVOICE_FIELDS_REQUIRED',
      'BACKOFFICE_INVOICE_IDS_REQUIRED',
      'BACKOFFICE_INVOICE_NOT_FOUND',
      'BACKOFFICE_INVOICE_NOT_VALIDATED',
      'BACKOFFICE_INVOICES_NOT_FOUND',
      'BACKOFFICE_MARK_PAID_ERROR',
      'BACKOFFICE_MAX_INVOICES_EXCEEDED',
      'BACKOFFICE_NAME_REQUIRED',
      'BACKOFFICE_NO_FILE_SENT',
      'BACKOFFICE_NO_IMAGE_SENT',
      'BACKOFFICE_PDF_ONLY',
      'BACKOFFICE_PDF_TYPE_REQUIRED',
      'BACKOFFICE_PAYMENT_DATE_REQUIRED',
      'BACKOFFICE_REJECT_INVOICE_ERROR',
      'BACKOFFICE_REJECTION_REASON_REQUIRED',
      'BACKOFFICE_REVERT_BATCH_ERROR',
      'BACKOFFICE_REVERT_BATCH_PREVIEW_ERROR',
      'BACKOFFICE_REVERT_PAYMENT_ERROR',
      'BACKOFFICE_REVERT_VALIDATION_ERROR',
      'BACKOFFICE_SET_DEFAULT_ERROR',
      'BACKOFFICE_SUPPLIER_EXISTS',
      'BACKOFFICE_SUPPLIER_NOT_FOUND',
      'BACKOFFICE_UPDATE_INVOICE_ERROR',
      'BACKOFFICE_UPDATE_SUPPLIER_ERROR',
      'BACKOFFICE_UPLOAD_PDF_ERROR',
      'BACKOFFICE_VALIDATE_INVOICE_ERROR',
      'BACKOFFICE_YEAR_MONTH_REQUIRED',
    ]

    it.each(backofficeCodes)('%s returns non-empty text in es and en', (code) => {
      const esText = errorCodeMessage(code, 'es')
      const enText = errorCodeMessage(code, 'en')
      expect(esText).toBeTruthy()
      expect(typeof esText).toBe('string')
      expect(esText!.length).toBeGreaterThan(0)
      expect(enText).toBeTruthy()
      expect(typeof enText).toBe('string')
      expect(enText!.length).toBeGreaterThan(0)
    })

    it('excludes BACKOFFICE codes without translation', () => {
      expect(errorCodeMessage('BACKOFFICE_SUPPLIER_INACTIVE_EXISTS', 'es')).toBeUndefined()
      expect(errorCodeMessage('BACKOFFICE_SUPPLIER_HAS_INVOICES', 'es')).toBeUndefined()
      expect(errorCodeMessage('BACKOFFICE_INACTIVATE_SUPPLIER_ERROR', 'es')).toBeUndefined()
      expect(errorCodeMessage('BACKOFFICE_ACTIVATE_SUPPLIER_ERROR', 'es')).toBeUndefined()
      expect(errorCodeMessage('BACKOFFICE_DELETE_SUPPLIER_ERROR', 'es')).toBeUndefined()
    })
  })

  describe('NOTIFICATIONS codes', () => {
    const notificationsCodes = [
      'NOTIFICATIONS_CREATE_ERROR',
      'NOTIFICATIONS_DELETE_ERROR',
      'NOTIFICATIONS_FETCH_COUNT_ERROR',
      'NOTIFICATIONS_FETCH_ERROR',
      'NOTIFICATIONS_FETCH_GROUP_ERROR',
      'NOTIFICATIONS_FETCH_UNREAD_ERROR',
      'NOTIFICATIONS_INVALID_GROUP_ID',
      'NOTIFICATIONS_INVALID_ID',
      'NOTIFICATIONS_INVALID_MODULE',
      'NOTIFICATIONS_INVALID_SCHEDULED_DATE',
      'NOTIFICATIONS_MARK_ALL_ERROR',
      'NOTIFICATIONS_MARK_ERROR',
      'NOTIFICATIONS_MARK_READ_ERROR',
      'NOTIFICATIONS_MISSING_REQUIRED_FIELDS',
      'NOTIFICATIONS_NOT_FOUND',
      'NOTIFICATIONS_PROCESS_ERROR',
    ]

    it.each(notificationsCodes)('%s returns non-empty text in es and en', (code) => {
      const esText = errorCodeMessage(code, 'es')
      const enText = errorCodeMessage(code, 'en')
      expect(esText).toBeTruthy()
      expect(typeof esText).toBe('string')
      expect(esText!.length).toBeGreaterThan(0)
      expect(enText).toBeTruthy()
      expect(typeof enText).toBe('string')
      expect(enText!.length).toBeGreaterThan(0)
    })

    it('excludes codes without translation', () => {
      expect(errorCodeMessage('AUTH_DEMO_UNAVAILABLE', 'es')).toBeUndefined()
      expect(errorCodeMessage('AUTH_DEMO_UNAVAILABLE', 'en')).toBeUndefined()
      // Success messages are in "success" section, not "codes"
      expect(errorCodeMessage('NOTIFICATIONS_PROCESSED', 'es')).toBeUndefined()
      expect(errorCodeMessage('NOTIFICATIONS_CREATED', 'es')).toBeUndefined()
      expect(errorCodeMessage('BLACKLIST_RECORD_CREATED', 'es')).toBeUndefined()
      // Orphan code (in ES/EN but not in ERROR_CODES)
      expect(errorCodeMessage('BLACKLIST_PUBLIC_ID_MISSING', 'es')).toBeUndefined()
      // Success messages are in "success" section, not "codes"
      expect(errorCodeMessage('LOGBOOK_UPDATED', 'es')).toBeUndefined()
      expect(errorCodeMessage('LOGBOOK_COMMENT_DELETED', 'es')).toBeUndefined()
      expect(errorCodeMessage('CONCILIATION_CREATED', 'es')).toBeUndefined()
      expect(errorCodeMessage('CONCILIATION_DELETED', 'es')).toBeUndefined()
    })
  })

  describe('BLACKLIST codes', () => {
    const blacklistCodes = [
      'BLACKLIST_CREATE_RECORD_ERROR',
      'BLACKLIST_DELETE_IMAGE_ERROR',
      'BLACKLIST_DELETE_RECORD_ERROR',
      'BLACKLIST_DOCUMENT_EXISTS',
      'BLACKLIST_FETCH_RECORD_ERROR',
      'BLACKLIST_FETCH_RECORDS_ERROR',
      'BLACKLIST_FETCH_STATS_ERROR',
      'BLACKLIST_FILE_TOO_LARGE',
      'BLACKLIST_IMAGE_NOT_FOUND',
      'BLACKLIST_INVALID_FILE_TYPE',
      'BLACKLIST_INVALID_SEARCH_PARAMS',
      'BLACKLIST_NO_IMAGE_SENT',
      'BLACKLIST_RECORD_NOT_FOUND',
      'BLACKLIST_RESTORE_RECORD_ERROR',
      'BLACKLIST_UPDATE_RECORD_ERROR',
      'BLACKLIST_UPLOAD_IMAGE_ERROR',
    ]

    it.each(blacklistCodes)('%s returns non-empty text in es and en', (code) => {
      const esText = errorCodeMessage(code, 'es')
      const enText = errorCodeMessage(code, 'en')
      expect(esText).toBeTruthy()
      expect(typeof esText).toBe('string')
      expect(esText!.length).toBeGreaterThan(0)
      expect(enText).toBeTruthy()
      expect(typeof enText).toBe('string')
      expect(enText!.length).toBeGreaterThan(0)
    })
  })

  describe('LOGBOOK codes', () => {
    const logbookCodes = [
      'LOGBOOK_COMMENT_CREATE_ERROR',
      'LOGBOOK_COMMENT_DELETE_ERROR',
      'LOGBOOK_COMMENT_NOT_FOUND',
      'LOGBOOK_COMMENT_NOT_IN_LOGBOOK',
      'LOGBOOK_COMMENT_NO_PERMISSION',
      'LOGBOOK_COMMENT_UPDATE_ERROR',
      'LOGBOOK_CREATE_ERROR',
      'LOGBOOK_DELETE_ERROR',
      'LOGBOOK_FETCH_BY_AUTHOR_ERROR',
      'LOGBOOK_FETCH_BY_DAY_ERROR',
      'LOGBOOK_FETCH_BY_DEPARTMENT_ERROR',
      'LOGBOOK_FETCH_BY_IMPORTANCE_ERROR',
      'LOGBOOK_FETCH_ERROR',
      'LOGBOOK_FETCH_READERS_ERROR',
      'LOGBOOK_FETCH_SOLVER_ERROR',
      'LOGBOOK_INVALID_IMPORTANCE',
      'LOGBOOK_NOT_FOUND',
      'LOGBOOK_NOT_SOLVED',
      'LOGBOOK_ONLY_AUTHOR_DELETE',
      'LOGBOOK_ONLY_AUTHOR_UPDATE',
      'LOGBOOK_READ_ERROR',
      'LOGBOOK_REOPEN_ERROR',
      'LOGBOOK_SOLVE_ERROR',
      'LOGBOOK_UNREAD_ERROR',
    ]

    it.each(logbookCodes)('%s returns non-empty text in es and en', (code) => {
      const esText = errorCodeMessage(code, 'es')
      const enText = errorCodeMessage(code, 'en')
      expect(esText).toBeTruthy()
      expect(typeof esText).toBe('string')
      expect(esText!.length).toBeGreaterThan(0)
      expect(enText).toBeTruthy()
      expect(typeof enText).toBe('string')
      expect(enText!.length).toBeGreaterThan(0)
    })
  })

  describe('CONCILIATION codes', () => {
    const conciliationCodes = [
      'CONCILIATION_ADMIN_ONLY_CLOSE',
      'CONCILIATION_ALREADY_EXISTS',
      'CONCILIATION_CLOSED_CANNOT_MODIFY',
      'CONCILIATION_CREATE_ERROR',
      'CONCILIATION_DATE_REQUIRED',
      'CONCILIATION_DELETE_ERROR',
      'CONCILIATION_FETCH_ERROR',
      'CONCILIATION_FETCH_ONE_ERROR',
      'CONCILIATION_INCOMPLETE_DATA',
      'CONCILIATION_INVALID_HOUSEKEEPING_ENTRIES',
      'CONCILIATION_INVALID_MONTH',
      'CONCILIATION_INVALID_RECEPTION_ENTRIES',
      'CONCILIATION_INVALID_STATUS',
      'CONCILIATION_INVALID_YEAR',
      'CONCILIATION_INVALID_YEAR_MONTH',
      'CONCILIATION_MONTHLY_FETCH_ERROR',
      'CONCILIATION_MONTHLY_MISSING_DAYS_ERROR',
      'CONCILIATION_MONTHLY_UPDATE_STATUS_ERROR',
      'CONCILIATION_MONTHLY_VALIDATE_ERROR',
      'CONCILIATION_NOT_FOUND',
      'CONCILIATION_RECALCULATE_ERROR',
      'CONCILIATION_UPDATE_FORM_ERROR',
      'CONCILIATION_UPDATE_STATUS_ERROR',
    ]

    it.each(conciliationCodes)('%s returns non-empty text in es and en', (code) => {
      const esText = errorCodeMessage(code, 'es')
      const enText = errorCodeMessage(code, 'en')
      expect(esText).toBeTruthy()
      expect(typeof esText).toBe('string')
      expect(esText!.length).toBeGreaterThan(0)
      expect(enText).toBeTruthy()
      expect(typeof enText).toBe('string')
      expect(enText!.length).toBeGreaterThan(0)
    })
  })
})
