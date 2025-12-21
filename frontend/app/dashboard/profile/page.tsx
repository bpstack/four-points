// app/dashboard/profile/page.tsx

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/auth/useAuth'
import { ProfileSidebar, SettingsPanel, MessagesPanel } from '@/app/components/profile'

// Skeleton for loading state
function ProfileSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )
}

// Main content component that reads search params
function ProfileContent() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const activePanel = searchParams.get('panel') // 'settings' | 'messages' | null

  if (loading) {
    return <ProfileSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-500 dark:text-gray-400">Unable to load profile</p>
      </div>
    )
  }

  // Render right panel based on query param
  const renderRightPanel = () => {
    switch (activePanel) {
      case 'settings':
        return <SettingsPanel />
      case 'messages':
        return <MessagesPanel />
      default:
        return null
    }
  }

  const rightPanel = renderRightPanel()

  return (
    <div className="h-full min-h-screen bg-white dark:bg-[#010409]">
      <div className="h-full flex flex-col lg:flex-row gap-6 p-4 md:p-6">
        {/* Left Panel - Profile Sidebar */}
        <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
          <ProfileSidebar />
        </aside>

        {/* Right Panel - Dynamic Content */}
        {rightPanel && <main className="flex-1 min-w-0">{rightPanel}</main>}

        {/* Empty state when no panel selected (desktop only) */}
        {!rightPanel && (
          <main className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Selecciona una opcion
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Usa el menu de la izquierda para navegar
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

// Wrap with Suspense for useSearchParams
export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  )
}
