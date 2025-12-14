// app/components/cashier/LoadingState.tsx

import { FiLoader } from 'react-icons/fi'

interface LoadingStateProps {
  message?: string
}

export default function LoadingState({ message = 'Cargando datos...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <FiLoader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}
