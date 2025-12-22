// app/dashboard/groups/page.tsx - Server Component with SSR

import { Suspense } from 'react'
import { getGroups } from './actions/getGroups'
import { GroupsListClient } from '@/app/components/groups/GroupsListClient'

function GroupsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#010409] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando grupos...</p>
      </div>
    </div>
  )
}

export default async function GroupsPage() {
  let initialGroups = undefined

  try {
    const response = await getGroups()
    initialGroups = response.data
  } catch (error) {
    // Si falla el fetch inicial, el client component cargará los datos
    console.error('[GroupsPage] Error fetching initial groups:', error)
  }

  return (
    <Suspense fallback={<GroupsLoading />}>
      <GroupsListClient initialGroups={initialGroups} />
    </Suspense>
  )
}
