// app/dashboard/parking/rates/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { FiArrowRight } from 'react-icons/fi'

interface Rate {
  id: number
  duration_days: number
  price: string
  description: string
}

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch('http://localhost:4000/parking/rates')
        if (!res.ok) throw new Error('Error loading rates')
        const data = await res.json()
        setRates(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        setError('Unable to load parking rates.')
      } finally {
        setLoading(false)
      }
    }

    fetchRates()
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Parking Rates</h1>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          Choose the best plan for your parking needs
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && rates.length === 0 && (
        <div className="text-center py-8 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">No parking rates available</p>
        </div>
      )}

      {/* Rates Grid */}
      {!loading && !error && rates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
          {rates.map((rate) => (
            <div
              key={rate.id}
              className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-md p-3 hover:border-blue-500 dark:hover:border-blue-400 transition-all group"
            >
              {/* Rate Info */}
              <div className="space-y-3">
                {/* Description */}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {rate.description}
                </p>

                {/* Price & Reserve Button */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {rate.price ? Number(rate.price).toFixed(0) : '0'} €
                  </span>

                  {/* Reserve Button */}
                  <a
                    href="/dashboard/parking/reservation"
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Reserve"
                  >
                    <FiArrowRight className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
