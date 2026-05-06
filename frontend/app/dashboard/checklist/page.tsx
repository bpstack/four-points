import { FiCheckSquare } from 'react-icons/fi'

export default function ChecklistLandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
      <FiCheckSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-4" />
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
        Check List operativo
      </h2>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
        Selecciona un procedimiento o tarea en el panel izquierdo para empezar.
      </p>
    </div>
  )
}
