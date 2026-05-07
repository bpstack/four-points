export type ChecklistType = 'tasks' | 'guide' | 'reference'
export type Shift = 'morning' | 'afternoon' | 'night'
export type Department = 'reception' | 'housekeeping' | 'fnb' | 'maintenance' | 'admin'

export interface ChecklistStep {
  id: string
  text: string
  note?: string
  ref?: string | string[]
}

export interface ChecklistSection {
  id: string
  title: string
  steps: ChecklistStep[]
}

export interface ChecklistMeta {
  id: string
  type: ChecklistType
  title: string
  category: string
  department: Department | string
  /** Optional secondary departments — item also appears under these filters. */
  departments?: (Department | string)[]
  shift: Shift | null
  version: string
  author: string
  updated: string
  description: string
}

export interface ChecklistItem extends ChecklistMeta {
  sections: ChecklistSection[]
  /** Raw markdown body — only for guide/reference types */
  body?: string
}

export interface CategoryMeta {
  id: string
  name: string
  icon: string
  subGroupBy?: 'shift'
  shiftOrder?: Shift[]
}

export interface Catalog {
  categories: CategoryMeta[]
  items: ChecklistMeta[]
}

export const SHIFT_LABELS: Record<Shift, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
}

export const SHIFT_COLORS: Record<Shift, string> = {
  morning: 'text-green-600 dark:text-green-400',
  afternoon: 'text-blue-600 dark:text-blue-400',
  night: 'text-orange-600 dark:text-orange-400',
}

export const DEPT_LABELS: Record<string, string> = {
  reception: 'Recepción',
  housekeeping: 'Housekeeping',
  fnb: 'F&B',
  maintenance: 'Mantenimiento',
  admin: 'Administración',
}
