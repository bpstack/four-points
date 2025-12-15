// app/components/logbooks/NewCommentEntry.tsx

'use client'

import { useEffect, useState } from 'react'
import { FiSend, FiX, FiMessageSquare } from 'react-icons/fi'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'

type ImportanceLevel = 'baja' | 'media' | 'alta' | 'urgente'

export interface NewCommentPayload {
  comment: string
  importance_level: ImportanceLevel
  department_id: number
}

export default function NewCommentEntry({
  isOpen,
  onClose,
  onSubmit,
  title = 'Add Comment',
  initialComment = '',
  initialPriority = 'baja',
  initialDepartment = 1,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: NewCommentPayload) => Promise<void>
  title?: string
  initialComment?: string
  initialPriority?: ImportanceLevel
  initialDepartment?: number
}) {
  const [comment, setComment] = useState<string>(initialComment)
  const [priority, setPriority] = useState<ImportanceLevel>(initialPriority)
  const [department, setDepartment] = useState<number>(initialDepartment)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { departments } = useDepartments()

  useEffect(() => {
    if (isOpen) {
      setComment(initialComment)
      setPriority(initialPriority)
      setDepartment(initialDepartment)
      setIsSubmitting(false)
    }
  }, [isOpen, initialComment, initialPriority, initialDepartment])

  const handleSave = async () => {
    if (!comment.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        comment: comment.trim(),
        importance_level: priority,
        department_id: department,
      })
      onClose()
    } catch {
      // toast/parent error handling expected outside
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-start">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-[1024px] bg-white dark:bg-[#0d1117] border-r border-gray-200 dark:border-[#30363d] shadow-2xl overflow-y-auto animate-slide-in-left">
        <div className="sticky top-0 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-sm border-b border-gray-200 dark:border-[#30363d] p-6 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FiMessageSquare className="w-5 h-5 text-blue-600 dark:text-[#1f6feb]" />
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add a comment to this entry
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-md transition-colors"
            disabled={isSubmitting}
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!isSubmitting) void handleSave()
          }}
          className="p-6 space-y-5"
        >
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FiMessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              Comment <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
              rows={4}
              placeholder="Add your comment..."
              required
              minLength={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ImportanceLevel)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
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
                className="w-full px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#1f6feb] focus:border-transparent transition-all"
                disabled={isSubmitting}
              >
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>Recepción</option>
                    <option value={2}>Housekeeping</option>
                    <option value={3}>Mantenimiento</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-[#1f6feb] dark:hover:bg-[#1a5ecf] text-white rounded-md font-medium transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting || !comment.trim()}
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <FiSend className="w-4 h-4" /> Add Comment
                </>
              )}
            </button>
          </div>
        </form>

        <style jsx>{`
          @keyframes slide-in-left {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          .animate-slide-in-left {
            animation: slide-in-left 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  )
}
