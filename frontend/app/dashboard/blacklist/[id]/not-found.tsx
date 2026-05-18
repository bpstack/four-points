// app/dashboard/blacklist/[id]/not-found.tsx
'use client'

/**
 * Página 404 personalizada para registros no encontrados
 */

import Link from 'next/link'
import { IoSearchOutline, IoChevronBack } from 'react-icons/io5'
import { useTranslations } from 'next-intl'
import { Button, Card } from '@/app/ui/components'

export default function NotFound() {
  const t = useTranslations('blacklist')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center bg-surface border-border">
        {/* Icono */}
        <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
          <IoSearchOutline className="text-fg-subtle" size={40} />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-fg mb-3">{t('notFound.entryTitle')}</h1>

        {/* Descripción */}
        <p className="text-fg-muted mb-8">{t('notFound.entryDescription')}</p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/blacklist">
            <Button variant="accent" fullWidth>
              <IoChevronBack size={18} />
              {t('detail.backToList')}
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="default" fullWidth>
              {t('notFound.goToDashboard')}
            </Button>
          </Link>
        </div>

        {/* Ayuda adicional */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-sm text-fg-muted">
            {t('notFound.needHelp')}{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('notFound.contactSupport')}
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}
