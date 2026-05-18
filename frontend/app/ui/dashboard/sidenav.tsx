//app/ui/dashboard/sidenav.tsx
'use client'

import Link from 'next/link'
import NavLinks from '@/app/ui/dashboard/nav-links'
import { Fa4 } from 'react-icons/fa6'
import { TbTransformPointTopLeft } from 'react-icons/tb'
import {
  XMarkIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/app/lib/auth/useAuth'

interface SideNavProps {
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function SideNav({ onClose, collapsed = false, onToggleCollapse }: SideNavProps) {
  const { user } = useAuth()

  // Mobile sidebar (when onClose is provided) should always be expanded
  const isMobile = !!onClose
  const isCollapsed = isMobile ? false : collapsed

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Logo Section with Close button on mobile */}
      <div className="flex h-16 items-center justify-between border-b border-border bg-bg">
        <Link
          className={`flex flex-1 h-full items-center gap-3 hover:bg-surface-hover transition-colors duration-200 group ${isCollapsed ? 'justify-center px-2' : 'px-6'}`}
          href="/dashboard"
          onClick={onClose}
        >
          <div className="flex items-center gap-1.5">
            <Fa4 className="text-accent text-xl group-hover:scale-110 transition-transform duration-300" />
            {!isCollapsed && (
              <TbTransformPointTopLeft className="text-accent text-xl group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-display font-semibold text-fg group-hover:text-accent transition-colors duration-200">
                Hotel PMS
              </span>
              <span className="text-sm text-fg-muted transition-colors duration-200">
                Management
              </span>
            </div>
          )}
        </Link>

        {/* Close button - mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-3 mr-2 rounded-lg text-fg-subtle hover:bg-surface-hover hover:text-fg transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 md:pt-8">
        <div className={isCollapsed ? 'px-2' : 'px-3'}>
          <NavLinks onClose={onClose} currentUserRole={user?.role} collapsed={isCollapsed} />
        </div>
      </nav>

      {/* Collapse Toggle Button - Desktop/Tablet only */}
      {onToggleCollapse && (
        <div className="hidden md:block border-t border-border p-2">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-fg-subtle hover:bg-surface-hover hover:text-fg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronDoubleRightIcon className="w-5 h-5" />
            ) : (
              <>
                <ChevronDoubleLeftIcon className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
