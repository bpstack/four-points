// app/components/layout/LanguageSwitcher.tsx
'use client'

import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { locales, localeNames, localeFlags, LOCALE_COOKIE, type Locale } from '@/app/i18n/config'
import { FiGlobe } from 'react-icons/fi'

/**
 * Language switcher component for ProfileDropdown
 * Sets locale cookie and refreshes the page
 */
export default function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale
  const [isPending, startTransition] = useTransition()

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale === currentLocale) return

    // Set the cookie
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000` // 1 year

    // Refresh to apply new locale
    startTransition(() => {
      window.location.reload()
    })
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-2">
        <FiGlobe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Idioma / Language
        </span>
      </div>
      <div className="flex gap-1">
        {locales.map((locale) => (
          <button
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            disabled={isPending}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
              transition-colors duration-150
              ${
                currentLocale === locale
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              }
              ${isPending ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            <span>{localeFlags[locale]}</span>
            <span>{localeNames[locale]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
