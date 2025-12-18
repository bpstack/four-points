// app/components/logbooks/NewCommentEntry.tsx

'use client'

import { useEffect, useState } from 'react'
import { FiSend, FiMessageSquare } from 'react-icons/fi'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import {
  SlidePanel,
  SlidePanelFooterButtons,
  FormField,
  selectClassName,
  textareaClassName,
} from '@/app/ui/panels'

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

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Add a comment to this entry"
      size="xl"
      position="left"
      headerIcon={<FiMessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      footer={
        <SlidePanelFooterButtons
          onCancel={onClose}
          onSubmit={handleSave}
          cancelText="Cancel"
          submitText="Add Comment"
          submitIcon={<FiSend className="w-4 h-4" />}
          isSubmitting={isSubmitting}
          submitDisabled={!comment.trim()}
          submitVariant="success"
        />
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isSubmitting) void handleSave()
        }}
        className="space-y-5"
      >
        <FormField label="Comment" required>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={textareaClassName}
            rows={4}
            placeholder="Add your comment..."
            required
            minLength={3}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ImportanceLevel)}
              className={selectClassName}
              disabled={isSubmitting}
            >
              <option value="baja">Low</option>
              <option value="media">Medium</option>
              <option value="alta">High</option>
              <option value="urgente">Critical</option>
            </select>
          </FormField>

          <FormField label="Department">
            <select
              value={department}
              onChange={(e) => setDepartment(Number(e.target.value))}
              className={selectClassName}
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
          </FormField>
        </div>
      </form>
    </SlidePanel>
  )
}
