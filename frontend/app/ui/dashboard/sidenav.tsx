//app/ui/dashboard/sidenav.tsx
'use client'

import Link from 'next/link'
import NavLinks from '@/app/ui/dashboard/nav-links'
import { Fa4 } from 'react-icons/fa6'
import { TbTransformPointTopLeft } from 'react-icons/tb'
import { useAuth } from '@/app/lib/auth/useAuth'
import { useRouter } from 'next/navigation'

interface SideNavProps {
  onClose?: () => void
}

export default function SideNav({ onClose }: SideNavProps) {
  const { user } = useAuth()
  const _router = useRouter()

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#0d1117]">
      {/* Logo Section - Iconos blancos en dark mode */}
      <Link
        className="flex h-16 items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#010409] hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors group"
        href="/dashboard"
        onClick={onClose}
      >
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-500 dark:group-hover:bg-blue-600 transition-colors">
          <Fa4 className="text-blue-600 dark:text-white group-hover:text-white text-xl group-hover:scale-110 transition-all duration-300" />
          <TbTransformPointTopLeft className="text-blue-600 dark:text-white group-hover:text-white text-xl group-hover:rotate-12 group-hover:scale-110 transition-all duration-300" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-display font-semibold text-gray-900 dark:text-gray-100 group-hover:text-white dark:group-hover:text-white transition-colors">
            Hotel PMS
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-200 dark:group-hover:text-gray-200 transition-colors">
            Management
          </span>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          <NavLinks onClose={onClose} currentUserRole={user?.role} />
        </div>
      </nav>
    </div>
  )
}
