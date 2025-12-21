// app/components/bo/StatsCards.tsx
/**
 * Server Component - Stats Cards
 * 
 * Fetches and displays summary statistics.
 * Runs on the server, no JavaScript sent to client.
 */

import { getStats } from '@/app/lib/backoffice/data'
import { formatCurrency } from '@/app/lib/backoffice/types'
import {
  FiFileText,
  FiCheckCircle,
  FiUsers,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
} from 'react-icons/fi'

export async function StatsCards() {
  const stats = await getStats()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
      {/* Facturas Pendientes */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
              Facturas Pendientes
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {stats.pending_count}
            </p>
          </div>
          <FiFileText className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 dark:text-yellow-400" />
        </div>
      </div>

      {/* Total Pendiente */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
              Total Pendiente
            </p>
            <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400 mt-0.5">
              {formatCurrency(stats.pending_total)}
            </p>
          </div>
          <FiDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 dark:text-orange-400" />
        </div>
      </div>

      {/* Vencidas */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
              Vencidas
            </p>
            <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400 mt-0.5">
              {stats.overdue_count}
            </p>
          </div>
          <FiAlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 dark:text-red-400" />
        </div>
      </div>

      {/* Pagadas (Mes) */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
              Pagadas (Mes)
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {stats.paid_this_month}
            </p>
          </div>
          <FiCheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
        </div>
      </div>

      {/* Total Pagado (Histórico) */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
              Total Pagado
            </p>
            <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">
              {formatCurrency(stats.paid_total)}
            </p>
          </div>
          <FiTrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 dark:text-green-400" />
        </div>
      </div>

      {/* Proveedores */}
      <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
              Proveedores
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
              {stats.suppliers_count}
            </p>
          </div>
          <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 dark:text-blue-400" />
        </div>
      </div>
    </div>
  )
}

// Skeleton for loading state
export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
