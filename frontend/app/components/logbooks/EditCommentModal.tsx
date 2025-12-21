// app/components/logbooks/EditCommentModal.tsx
'use client'

import { FiSave, FiMessageSquare } from 'react-icons/fi'
import { useDepartments } from '@/app/lib/logbooks/hooks/useDepartments'
import {
  CenterModal,
  CenterModalFooterButtons,
  FormField,
  selectClassName,
  textareaClassName,
} from '@/app/ui/panels'

export interface EditCommentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  comment: string
  setComment: (comment: string) => void
  priority: 'baja' | 'media' | 'alta' | 'urgente'
  setPriority: (priority: 'baja' | 'media' | 'alta' | 'urgente') => void
  department: number
  setDepartment: (department: number) => void
  isSubmitting: boolean
}

export default function EditCommentModal({
  isOpen,
  onClose,
  onSave,
  comment,
  setComment,
  priority,
  setPriority,
  department,
  setDepartment,
  isSubmitting,
}: EditCommentModalProps) {
  const { departments, loading: departmentsLoading } = useDepartments()

  return (
    <CenterModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Comment"
      size="lg"
      headerIcon={<FiMessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      footer={
        <CenterModalFooterButtons
          onCancel={onClose}
          onSubmit={onSave}
          cancelText="Cancel"
          submitText="Save Changes"
          submitIcon={<FiSave className="w-4 h-4" />}
          isSubmitting={isSubmitting}
          submitDisabled={!comment.trim() || comment.trim().length < 3}
          submitVariant="primary"
        />
      }
    >
      <div className="space-y-4">
        <FormField label="Comment" required hint="Minimum 3 characters">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={textareaClassName}
            rows={4}
            placeholder="Edit your comment..."
            disabled={isSubmitting}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'baja' | 'media' | 'alta' | 'urgente')}
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
              disabled={isSubmitting || departmentsLoading}
            >
              {departmentsLoading ? (
                <option>Loading...</option>
              ) : departments.length > 0 ? (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.displayName}
                  </option>
                ))
              ) : (
                <option value={department}>No departments</option>
              )}
            </select>
          </FormField>
        </div>
      </div>
    </CenterModal>
  )
}
