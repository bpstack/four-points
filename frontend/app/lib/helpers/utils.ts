// app/lib/utils.ts

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with clsx
 * Útil para componentes reutilizables con clases dinámicas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea moneda en EUR
 */
export function formatCurrency(amount: number | null, currency: string = 'EUR'): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Formatea fecha en español
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (format === 'short') {
    return dateObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return dateObj.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Calcula días hasta una fecha (positivo = futuro, negativo = pasado)
 */
export function daysUntil(date: string | Date): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  const diffTime = targetDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Verifica si el usuario tiene rol de administrador (incluye demo-admin)
 * Usado para mostrar/ocultar elementos de UI admin-only
 *
 * NOTA: demo-admin puede VER todo pero sus escrituras están limitadas
 * por el middleware demoRestriction en el backend.
 */
export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false
  const normalizedRole = role.toLowerCase().trim()
  return normalizedRole === 'admin' || normalizedRole === 'demo-admin'
}

/**
 * Roles del middleware canManageGroups del backend (admin, group-admin,
 * demo-admin): gestionan grupos y lanzan a mano los avisos pendientes
 */
export function canManageGroupsRole(role: string | undefined | null): boolean {
  if (!role) return false
  const normalizedRole = role.toLowerCase().trim()
  return isAdminRole(normalizedRole) || normalizedRole === 'group-admin'
}
