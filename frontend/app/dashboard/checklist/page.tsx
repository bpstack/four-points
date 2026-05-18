import { FiCheckSquare } from 'react-icons/fi'

export default function ChecklistLandingPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center">
      <FiCheckSquare className="w-10 h-10 text-fg-subtle mb-4" />
      <h2 className="text-base font-semibold text-fg mb-1">Check List operativo</h2>
      <p className="text-sm text-fg-subtle max-w-xs">
        Selecciona un procedimiento o tarea en el panel izquierdo para empezar.
      </p>
    </div>
  )
}
