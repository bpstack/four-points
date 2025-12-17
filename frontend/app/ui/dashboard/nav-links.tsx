// app/ui/dashboard/nav-links.tsx
'use client'

import {
  HomeIcon,
  DocumentDuplicateIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeModernIcon,
  XMarkIcon, // ✅ Añadir este import
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SlBookOpen } from 'react-icons/sl'
import { LiaParkingSolid } from 'react-icons/lia'
import { GiOfficeChair } from 'react-icons/gi'
import { CgDanger } from 'react-icons/cg'
import { MdPointOfSale } from 'react-icons/md'
import { useState } from 'react'
import { IoIosRestaurant } from 'react-icons/io'

const mainLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Logbook', href: '/dashboard/logbooks', icon: SlBookOpen },
  { name: 'Parking', href: '/dashboard/parking', icon: LiaParkingSolid },
  { name: 'Maintenance', href: '/dashboard/maintenance', icon: Cog6ToothIcon },
  { name: 'Restaurant', href: '/dashboard/restaurant', icon: IoIosRestaurant },
  { name: 'Conciliation', href: '/dashboard/conciliation', icon: HomeModernIcon },
  { name: 'Groups', href: '/dashboard/groups', icon: UserGroupIcon },
  { name: 'Blacklist', href: '/dashboard/blacklist', icon: CgDanger },
]

const backOfficeLinks = [
  { name: 'Back Office', href: '/dashboard/bo', icon: GiOfficeChair, adminOnly: true },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentDuplicateIcon },
]

const cashierLinks = [
  { name: 'Hotel Cashier', href: '/dashboard/cashier/hotel' },
  { name: 'Cashier Reports', href: '/dashboard/cashier/reports' },
  { name: 'Cashier Logs', href: '/dashboard/cashier/logs' },
]

const profileLinks = [
  { name: 'Profile', href: '/dashboard/profile', icon: UserIcon },
  { name: 'Settings', href: '/dashboard/profile/settings', icon: Cog6ToothIcon },
]

interface NavLinksProps {
  onClose?: () => void
  currentUserRole?: string
}

export default function NavLinks({ onClose, currentUserRole }: NavLinksProps) {
  const pathname = usePathname()
  const [isCashierOpen, setIsCashierOpen] = useState(false)

  const isCashierActive = pathname.startsWith('/dashboard/cashier')

  const renderLink = (link: any) => {
    const LinkIcon = link.icon
    const isActive = pathname === link.href

    return (
      <Link
        key={link.name}
        href={link.href}
        onClick={onClose}
        className={`
          flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-medium transition-all duration-200
          ${
            isActive
              ? 'bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-white border-l-4 border-blue-600 dark:border-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-l-4 border-transparent'
          }
        `}
      >
        <LinkIcon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
        <span>{link.name}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ✅ Botón de cierre (solo mobile) */}
      {onClose && (
        <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Navigation Group */}
      <div className="flex flex-col gap-1">{mainLinks.map((link) => renderLink(link))}</div>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Back Office Tasks Group */}
      <div className="flex flex-col gap-1">
        <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide mb-1">
          Back office tasks
        </h3>

        {backOfficeLinks.map((link) => {
          // Solo mostrar Back Office si es admin
          if (link.adminOnly && currentUserRole !== 'admin') {
            return null
          }
          return renderLink(link)
        })}

        {/* Cashier Dropdown */}
        <div>
          <button
            onClick={() => setIsCashierOpen(!isCashierOpen)}
            className={`
              w-full flex items-center gap-2 md:gap-3 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-medium transition-all duration-200
              ${
                isCashierActive
                  ? 'bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-white border-l-4 border-blue-600 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-l-4 border-transparent'
              }
            `}
          >
            <MdPointOfSale className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            <span className="flex-1 text-left">Cashier</span>
            {isCashierOpen ? (
              <ChevronDownIcon className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 flex-shrink-0 transition-transform duration-200" />
            )}
          </button>

          {/* Submenu */}
          <div
            className={`
              overflow-hidden transition-all duration-200 ease-in-out
              ${isCashierOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="pl-8 pr-3 py-1 space-y-1">
              {cashierLinks.map((subLink) => {
                const isSubActive = pathname === subLink.href

                return (
                  <Link
                    key={subLink.name}
                    href={subLink.href}
                    onClick={onClose}
                    className={`
                      block px-2.5 md:px-3 py-1 md:py-2 rounded-md text-[11px] md:text-sm transition-all duration-200
                      ${
                        isSubActive
                          ? 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    {subLink.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Profile Group */}
      <div className="flex flex-col gap-1">{profileLinks.map((link) => renderLink(link))}</div>
    </div>
  )
}
