// app/dashboard/blacklist/not-found.tsx

/**
 * Página 404 general del módulo Blacklist
 */

import Link from 'next/link'
import { IoAlertCircleOutline, IoChevronBack } from 'react-icons/io5'
import { Button } from '@/app/components/blacklist/ui/Button'
import { Card } from '@/app/components/blacklist/ui/Card'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center bg-white dark:bg-[#0D1117] border-gray-200 dark:border-gray-800">
        {/* Icono */}
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <IoAlertCircleOutline className="text-red-600 dark:text-red-400" size={40} />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Página no encontrada
        </h1>

        {/* Descripción */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          La página que estás buscando no existe o ha sido movida. Verifica la URL o regresa a la
          lista de registros.
        </p>

        {/* Código de error */}
        <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-[#161B22] px-4 py-2 rounded-full mb-8">
          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">Error 404</span>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/blacklist">
            <Button variant="primary" leftIcon={<IoChevronBack size={18} />} fullWidth>
              Volver a Blacklist
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="secondary" fullWidth>
              Ir al dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
