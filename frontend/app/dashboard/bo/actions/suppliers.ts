// app/dashboard/bo/actions/suppliers.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import type { SupplierFormData, SupplierWithStats } from '@/app/lib/backoffice/types'

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Cache profile for revalidation (Next.js 16+)
const CACHE_PROFILE = 'seconds'

// ========================================
// TYPES
// ========================================

export type SupplierActionState = {
  success?: boolean
  error?: string
  data?: SupplierWithStats
}

// ========================================
// HELPER: Server-side mutation
// ========================================

async function serverMutate<T>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Error: ${response.status}`)
  }

  return response.json()
}

// ========================================
// HELPER: Revalidate all supplier caches
// ========================================

function revalidateSupplierCaches(supplierId?: number) {
  revalidateTag('backoffice-suppliers', CACHE_PROFILE)
  revalidateTag('backoffice-stats', CACHE_PROFILE)
  if (supplierId) {
    revalidateTag(`backoffice-supplier-${supplierId}`, CACHE_PROFILE)
  }
  revalidatePath('/dashboard/bo')
}

// ========================================
// CREATE SUPPLIER
// ========================================

export async function createSupplier(
  prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const data: SupplierFormData = {
      name: formData.get('name') as string,
      cif: (formData.get('cif') as string) || undefined,
      default_category_id: formData.get('default_category_id')
        ? Number(formData.get('default_category_id'))
        : undefined,
      periodicity: (formData.get('periodicity') as SupplierFormData['periodicity']) || undefined,
      payment_method: (formData.get('payment_method') as SupplierFormData['payment_method']) || undefined,
      bank_account: (formData.get('bank_account') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      address: (formData.get('address') as string) || undefined,
      notes: (formData.get('notes') as string) || undefined,
    }

    // Validation
    if (!data.name?.trim()) {
      return { error: 'El nombre del proveedor es requerido' }
    }

    const result = await serverMutate<{ message: string; supplier: SupplierWithStats }>(
      '/api/backoffice/suppliers',
      'POST',
      data
    )

    // Revalidate caches
    revalidateSupplierCaches()

    return { success: true, data: result.supplier }
  } catch (error) {
    console.error('createSupplier error:', error)
    return { error: error instanceof Error ? error.message : 'Error al crear el proveedor' }
  }
}

// ========================================
// UPDATE SUPPLIER
// ========================================

export async function updateSupplier(
  id: number,
  prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const data: Partial<SupplierFormData> = {}

    // Only include fields that were provided
    const name = formData.get('name')
    if (name) data.name = name as string

    const cif = formData.get('cif')
    if (cif !== null) data.cif = cif as string

    const defaultCategoryId = formData.get('default_category_id')
    if (defaultCategoryId) data.default_category_id = Number(defaultCategoryId)

    const periodicity = formData.get('periodicity')
    if (periodicity) data.periodicity = periodicity as SupplierFormData['periodicity']

    const paymentMethod = formData.get('payment_method')
    if (paymentMethod) data.payment_method = paymentMethod as SupplierFormData['payment_method']

    const bankAccount = formData.get('bank_account')
    if (bankAccount !== null) data.bank_account = bankAccount as string

    const email = formData.get('email')
    if (email !== null) data.email = email as string

    const phone = formData.get('phone')
    if (phone !== null) data.phone = phone as string

    const address = formData.get('address')
    if (address !== null) data.address = address as string

    const notes = formData.get('notes')
    if (notes !== null) data.notes = notes as string

    const result = await serverMutate<{ message: string; supplier: SupplierWithStats }>(
      `/api/backoffice/suppliers/${id}`,
      'PATCH',
      data
    )

    // Revalidate caches
    revalidateSupplierCaches(id)

    return { success: true, data: result.supplier }
  } catch (error) {
    console.error('updateSupplier error:', error)
    return { error: error instanceof Error ? error.message : 'Error al actualizar el proveedor' }
  }
}

// ========================================
// DELETE SUPPLIER (soft delete)
// ========================================

export async function deleteSupplier(id: number): Promise<SupplierActionState> {
  try {
    await serverMutate<{ message: string }>(
      `/api/backoffice/suppliers/${id}`,
      'DELETE'
    )

    revalidateSupplierCaches()

    return { success: true }
  } catch (error) {
    console.error('deleteSupplier error:', error)
    return { error: error instanceof Error ? error.message : 'Error al eliminar el proveedor' }
  }
}
