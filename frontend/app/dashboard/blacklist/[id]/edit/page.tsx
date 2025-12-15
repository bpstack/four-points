// app/dashboard/blacklist/[id]/edit/page.tsx

/**
 * Página para editar registro en Blacklist
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { IoChevronBack } from 'react-icons/io5'
import { BlacklistForm } from '@/app/components/blacklist/mains/BlacklistForm'
import { getBlacklistById } from '../../actions'

interface PageProps {
  params: Promise<{
    // ✅ CAMBIO 1: Ahora es Promise
    id: string
  }>
}

export default async function EditBlacklistPage({ params }: PageProps) {
  // ✅ CAMBIO 2: AWAIT params
  const { id } = await params

  let data

  try {
    data = await getBlacklistById(id)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen dark:bg-[#010409]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/dashboard/blacklist/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <IoChevronBack size={16} />
          Volver al detalle
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Editar Registro</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{data.entry.guest_name}</p>
        </div>

        <BlacklistForm mode="edit" initialData={data.entry} />
      </div>
    </div>
  )
}
