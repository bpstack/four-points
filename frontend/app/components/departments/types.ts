// app/components/departments/types.ts

import { Department } from '@/app/lib/departments'

export interface FormattedDepartment extends Department {
  displayName: string
}

export interface DepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export interface EditDepartmentModalProps extends DepartmentModalProps {
  department: Department
}
