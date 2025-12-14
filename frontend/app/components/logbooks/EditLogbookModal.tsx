// app/components/logbooks/EditLogbookModal.tsx
'use client'

import { FiX, FiSave } from 'react-icons/fi'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'

export interface EditLogbookModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  message: string
  setMessage: (message: string) => void
  priority: 'baja' | 'media' | 'alta' | 'urgente'
  setPriority: (priority: 'baja' | 'media' | 'alta' | 'urgente') => void
  department: number
  setDepartment: (department: number) => void
  isSubmitting: boolean
}

export default function EditLogbookModal({
  isOpen,
  onClose,
  onSave,
  message,
  setMessage,
  priority,
  setPriority,
  department,
  setDepartment,
  isSubmitting,
}: EditLogbookModalProps) {
  const { departments, loading: departmentsLoading } = useDepartments()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0d1117] rounded-lg w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Logbook Entry
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={isSubmitting}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              rows={6}
              placeholder="Edit your message..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 3 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'baja' | 'media' | 'alta' | 'urgente')
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white"
                disabled={isSubmitting}
              >
                <option value="baja">Low</option>
                <option value="media">Medium</option>
                <option value="alta">High</option>
                <option value="urgente">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white"
                disabled={isSubmitting || departmentsLoading}
              >
                {departmentsLoading ? (
                  <option>Cargando...</option>
                ) : departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.displayName}
                    </option>
                  ))
                ) : (
                  <option value={department}>No hay departamentos</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !message.trim() || message.trim().length < 3}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
