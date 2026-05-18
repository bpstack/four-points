// app/components/groups/shared/GroupsLoadingState.tsx

'use client'

import { useTranslations } from 'next-intl'

export function GroupsLoadingState() {
  const t = useTranslations('groups')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-fg-muted">{t('loading')}</p>
      </div>
    </div>
  )
}
