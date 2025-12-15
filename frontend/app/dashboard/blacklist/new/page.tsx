// app/dashboard/blacklist/new/page.tsx

/**
 * Página para crear nuevo registro en Blacklist
 */

import { BlacklistForm } from '@/app/components/blacklist/mains/BlacklistForm'
import Link from 'next/link'
import { IoChevronBack } from 'react-icons/io5'

export default function NewBlacklistPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#010409]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb / Back button */}
        <Link
          href="/dashboard/blacklist"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <IoChevronBack size={16} />
          Volver a la lista
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Nuevo Registro en Blacklist
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Completa todos los campos para registrar un huésped con mala conducta
          </p>
        </div>

        {/* Formulario */}
        <BlacklistForm mode="create" />
      </div>
    </div>
  )
}
