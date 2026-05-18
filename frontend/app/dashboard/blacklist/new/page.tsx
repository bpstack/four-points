// app/dashboard/blacklist/new/page.tsx
'use client'

/**
 * Página para crear nuevo registro en Blacklist
 */

import { BlacklistForm } from '@/app/components/blacklist/mains/BlacklistForm'
import Link from 'next/link'
import { IoChevronBack } from 'react-icons/io5'
import { useTranslations } from 'next-intl'

export default function NewBlacklistPage() {
  const t = useTranslations('blacklist')

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb / Back button */}
        <Link
          href="/dashboard/blacklist"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg mb-6 transition-colors"
        >
          <IoChevronBack size={16} />
          {t('newPage.backToList')}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fg">{t('newPage.title')}</h1>
          <p className="text-fg-muted mt-1">{t('newPage.subtitle')}</p>
        </div>

        {/* Formulario */}
        <BlacklistForm mode="create" />
      </div>
    </div>
  )
}
