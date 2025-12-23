// app/i18n/request.ts
// next-intl request configuration for App Router

import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './config'

export default getRequestConfig(async () => {
  // 1. Try to get locale from cookie
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined

  if (cookieLocale && locales.includes(cookieLocale)) {
    const messages = await loadMessages(cookieLocale)
    return { locale: cookieLocale, messages }
  }

  // 2. Try to detect from Accept-Language header
  const headerStore = await headers()
  const acceptLanguage = headerStore.get('accept-language')
  const detectedLocale = detectLocaleFromHeader(acceptLanguage)

  if (detectedLocale) {
    const messages = await loadMessages(detectedLocale)
    return { locale: detectedLocale, messages }
  }

  // 3. Fall back to default locale
  const messages = await loadMessages(defaultLocale)
  return { locale: defaultLocale, messages }
})

/**
 * Detect locale from Accept-Language header
 */
function detectLocaleFromHeader(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null

  // Parse Accept-Language header (e.g., "es-ES,es;q=0.9,en;q=0.8")
  const languages = acceptLanguage.split(',').map((lang) => {
    const [code] = lang.trim().split(';')
    return code.split('-')[0].toLowerCase() // Get base language code
  })

  // Find first matching locale
  for (const lang of languages) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale
    }
  }

  return null
}

/**
 * Load messages for a locale (merging all module files)
 */
async function loadMessages(locale: Locale) {
  const modules = [
    'common',
    'dashboard',
    'parking',
    'logbooks',
    'groups',
    'cashier',
    'maintenance',
    'blacklist',
    'backoffice',
    'messages',
    'profile',
    'auth',
    'errors',
    'validation',
  ]

  const allMessages: Record<string, Record<string, unknown>> = {}

  for (const mod of modules) {
    try {
      const moduleMessages = (await import(`../../messages/${locale}/${mod}.json`)).default
      allMessages[mod] = moduleMessages
    } catch {
      // Module file doesn't exist yet, skip
      console.warn(`[i18n] Missing translation file: messages/${locale}/${mod}.json`)
    }
  }

  return allMessages
}
