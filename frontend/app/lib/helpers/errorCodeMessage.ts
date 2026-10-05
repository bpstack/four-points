// app/lib/helpers/errorCodeMessage.ts
// Messages for backend error codes, in the page language. The texts live in
// messages/{es,en}/errors.json under `codes`; apiClient has no React context,
// so it reads the language from <html lang>.

import es from '../../../messages/es/errors.json'
import en from '../../../messages/en/errors.json'

// Codes whose backend text is not meant for the user
const TRANSLATED = new Set(['STORAGE_NOT_CONFIGURED'])

const byLocale: Record<string, Record<string, string>> = { es: es.codes, en: en.codes }

export function errorCodeMessage(code: unknown, lang: string): string | undefined {
  if (typeof code !== 'string' || !TRANSLATED.has(code)) return undefined
  return (byLocale[lang] ?? byLocale.es)[code]
}
