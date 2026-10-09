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
})
