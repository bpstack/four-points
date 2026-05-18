// app/components/dashboard/DashboardSkeleton.tsx
'use client'

import React from 'react'
import { FiServer, FiSearch, FiMenu } from 'react-icons/fi'
import { Fa4 } from 'react-icons/fa6'
import { TbTransformPointTopLeft } from 'react-icons/tb'
import { useTranslations } from 'next-intl'

// Anchos predefinidos para evitar hydration mismatch
const mainLinkWidths = ['70%', '55%', '60%', '75%', '65%', '80%', '50%', '72%']
const backOfficeWidths = ['65%', '58%', '70%']
const profileWidths = ['55%', '60%']

// Skeleton del Sidebar
function SidebarSkeleton() {
  return (
    <div className="hidden md:flex h-full w-64 flex-col bg-surface border-r border-border">
      {/* Logo Section */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border bg-bg">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-info/10">
          <Fa4 className="text-blue-600 dark:text-white text-xl" />
          <TbTransformPointTopLeft className="text-blue-600 dark:text-white text-xl" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-display font-semibold text-fg">Hotel PMS</span>
          <span className="text-sm text-fg-muted">Management</span>
        </div>
      </div>

      {/* Navigation Skeleton */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Main Links */}
        <div className="space-y-1 mb-4">
          {mainLinkWidths.map((width, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="w-5 h-5 bg-surface-hover rounded animate-pulse" />
              <div className="h-4 bg-surface-hover rounded animate-pulse" style={{ width }} />
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-border my-4" />

        {/* Back Office Section */}
        <div className="mb-2 px-3">
          <div className="h-3 w-24 bg-surface-hover rounded animate-pulse" />
        </div>
        <div className="space-y-1 mb-4">
          {backOfficeWidths.map((width, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="w-5 h-5 bg-surface-hover rounded animate-pulse" />
              <div className="h-4 bg-surface-hover rounded animate-pulse" style={{ width }} />
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="border-t border-border my-4" />

        {/* Profile Section */}
        <div className="space-y-1">
          {profileWidths.map((width, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="w-5 h-5 bg-surface-hover rounded animate-pulse" />
              <div className="h-4 bg-surface-hover rounded animate-pulse" style={{ width }} />
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}

// Skeleton del Header
function HeaderSkeleton() {
  return (
    <header className="h-16 border-b border-border bg-bg flex items-center justify-between px-4 md:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button className="md:hidden p-2 text-gray-400">
          <FiMenu className="h-6 w-6" />
        </button>
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 bg-surface-hover rounded animate-pulse" />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Search skeleton */}
        <div className="hidden md:block">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <div className="w-48 lg:w-64 h-9 pl-9 bg-surface-hover rounded-lg" />
          </div>
        </div>
        {/* Theme toggle skeleton */}
        <div className="w-9 h-9 bg-surface-hover rounded-lg animate-pulse" />
        {/* Notification skeleton */}
        <div className="hidden md:block w-9 h-9 bg-surface-hover rounded-lg animate-pulse" />
        {/* Avatar skeleton */}
        <div className="w-9 h-9 bg-surface-hover rounded-full animate-pulse" />
      </div>
    </header>
  )
}

export function DashboardSkeleton() {
  const t = useTranslations('common.skeleton')

  return (
    <div className="flex h-screen bg-bg antialiased">
      {/* Sidebar */}
      <SidebarSkeleton />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <HeaderSkeleton />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-bg">
          <div className="min-h-screen bg-bg px-4 md:px-5 lg:px-6 pt-4 md:pt-4 pb-4">
            <div className="max-w-[1600px] space-y-4">
              {/* Backend Wake-up Notice */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex-shrink-0">
                    <FiServer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      {t('serverStarting')}
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      {t('serverMessage')}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 dark:border-amber-700 border-t-amber-600 dark:border-t-amber-400" />
                      <span className="text-xs text-amber-600 dark:text-amber-500">
                        {t('connecting')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Grid Layout Skeleton */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-6">
                  {/* Quick Actions Skeleton */}
                  <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="h-6 w-32 bg-surface-hover rounded animate-pulse mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-24 bg-surface-hover/50 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Global Status Skeleton */}
                  <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="h-6 w-40 bg-surface-hover rounded animate-pulse mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-20 bg-surface-hover/50 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Contextual Help Skeleton */}
                  <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="h-6 w-36 bg-surface-hover rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 bg-surface-hover/50 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Important Logbooks Skeleton */}
                  <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="h-6 w-44 bg-surface-hover rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-16 bg-surface-hover/50 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity Skeleton */}
                  <div className="bg-surface border border-border rounded-xl p-6">
                    <div className="h-6 w-36 bg-surface-hover rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-surface-hover rounded-full animate-pulse flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-surface-hover rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-surface-hover/50 rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
