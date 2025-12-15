// app/components/cashier/ErrorState.tsx

import { FiAlertCircle } from 'react-icons/fi'

interface ErrorStateProps {
  title?: string
  message: string
}

export default function ErrorState({ title = 'Error al cargar datos', message }: ErrorStateProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-start gap-3">
        <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">{title}</h3>
          <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
      </div>
    </div>
  )
}
