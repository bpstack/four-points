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
    expect(errorCodeMessage('AUTH_INVALID_CREDENTIALS', 'en')).toBeUndefined()
    expect(errorCodeMessage(undefined, 'es')).toBeUndefined()
    expect(errorCodeMessage(42, 'es')).toBeUndefined()
  })
})
