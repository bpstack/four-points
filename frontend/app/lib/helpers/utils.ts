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
 * Verifica si el usuario tiene rol de administrador
 * Usado para mostrar/ocultar elementos de UI admin-only
 *
 * La cuenta demo pública también es admin: el backend limita lo que puede
 * cambiar (demoRestriction).
 */
export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false
  const normalizedRole = role.toLowerCase().trim()
  return normalizedRole === 'admin'
}

/**
 * Roles del middleware canRunNotificationCheck del backend: lanzan a mano la
 * generación de avisos pendientes
 */
export function canRunNotificationCheckRole(role: string | undefined | null): boolean {
  const normalizedRole = role?.toLowerCase().trim()
  return normalizedRole === 'admin' || normalizedRole === 'group-admin'
}
