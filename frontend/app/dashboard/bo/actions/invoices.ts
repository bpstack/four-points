// app/dashboard/bo/actions/invoices.ts
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import type { InvoiceFormData, InvoiceWithDetails } from '@/app/lib/backoffice/types'

const API_BASE = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Cache profile for revalidation (Next.js 16+)
// Using 'seconds' profile for immediate revalidation
const CACHE_PROFILE = 'seconds'

// ========================================
// TYPES
// ========================================

export type ActionState = {
  success?: boolean
  error?: string
  data?: InvoiceWithDetails
}

// ========================================
// HELPER: Get auth headers from cookies
// ========================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  
  // Try to get the access_token cookie
  const accessToken = cookieStore.get('access_token')?.value
  
  console.log('[getAuthHeaders] access_token cookie:', accessToken ? 'found' : 'not found')
  
  if (accessToken) {
    return { 'Authorization': `Bearer ${accessToken}` }
  }
  
  // Forward all cookies as a fallback (for HttpOnly cookies)
  const allCookies = cookieStore.getAll()
  console.log('[getAuthHeaders] All cookies:', allCookies.map(c => c.name))
  
  if (allCookies.length > 0) {
    const cookieHeader = allCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')
    return { 'Cookie': cookieHeader }
  }
  
  console.log('[getAuthHeaders] No auth found!')
  return {}
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
  const authHeaders = await getAuthHeaders()

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
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
// HELPER: Revalidate all backoffice caches
// ========================================

function revalidateBackofficeCaches(invoiceId?: number) {
  revalidateTag('backoffice-invoices', CACHE_PROFILE)
  revalidateTag('backoffice-stats', CACHE_PROFILE)
  if (invoiceId) {
    revalidateTag(`backoffice-invoice-${invoiceId}`, CACHE_PROFILE)
  }
  revalidatePath('/dashboard/bo')
}

// ========================================
// CREATE INVOICE
// ========================================

export async function createInvoice(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const data: InvoiceFormData = {
      invoice_number: formData.get('invoice_number') as string,
      supplier_id: Number(formData.get('supplier_id')),
      category_id: formData.get('category_id') ? Number(formData.get('category_id')) : undefined,
      amount_without_vat: Number(formData.get('amount_without_vat')),
      amount_with_vat: Number(formData.get('amount_with_vat')),
      vat_percentage: formData.get('vat_percentage') ? Number(formData.get('vat_percentage')) : undefined,
      invoice_date: formData.get('invoice_date') as string,
      received_date: (formData.get('received_date') as string) || undefined,
      billing_period_start: (formData.get('billing_period_start') as string) || undefined,
      billing_period_end: (formData.get('billing_period_end') as string) || undefined,
      due_date: (formData.get('due_date') as string) || undefined,
      payment_method: (formData.get('payment_method') as 'transfer' | 'direct_debit') || undefined,
      notes: (formData.get('notes') as string) || undefined,
    }

    // Validation
    if (!data.invoice_number?.trim()) {
      return { error: 'El número de factura es requerido' }
    }
    if (!data.supplier_id || isNaN(data.supplier_id)) {
      return { error: 'El proveedor es requerido' }
    }
    if (!data.amount_with_vat || isNaN(data.amount_with_vat)) {
      return { error: 'El importe con IVA es requerido' }
    }
    if (!data.invoice_date) {
      return { error: 'La fecha de factura es requerida' }
    }

    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      '/api/backoffice/invoices',
      'POST',
      data
    )

    // Revalidate caches
    revalidateBackofficeCaches()

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('createInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al crear la factura' }
  }
}

// ========================================
// UPDATE INVOICE
// ========================================

export async function updateInvoice(
  id: number,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const data: Partial<InvoiceFormData> = {}

    // Only include fields that were provided
    const invoiceNumber = formData.get('invoice_number')
    if (invoiceNumber) data.invoice_number = invoiceNumber as string

    const supplierId = formData.get('supplier_id')
    if (supplierId) data.supplier_id = Number(supplierId)

    const categoryId = formData.get('category_id')
    if (categoryId) data.category_id = Number(categoryId)

    const amountWithoutVat = formData.get('amount_without_vat')
    if (amountWithoutVat) data.amount_without_vat = Number(amountWithoutVat)

    const amountWithVat = formData.get('amount_with_vat')
    if (amountWithVat) data.amount_with_vat = Number(amountWithVat)

    const vatPercentage = formData.get('vat_percentage')
    if (vatPercentage) data.vat_percentage = Number(vatPercentage)

    const invoiceDate = formData.get('invoice_date')
    if (invoiceDate) data.invoice_date = invoiceDate as string

    const receivedDate = formData.get('received_date')
    if (receivedDate) data.received_date = receivedDate as string

    const billingPeriodStart = formData.get('billing_period_start')
    if (billingPeriodStart) data.billing_period_start = billingPeriodStart as string

    const billingPeriodEnd = formData.get('billing_period_end')
    if (billingPeriodEnd) data.billing_period_end = billingPeriodEnd as string

    const dueDate = formData.get('due_date')
    if (dueDate) data.due_date = dueDate as string

    const paymentMethod = formData.get('payment_method')
    if (paymentMethod) data.payment_method = paymentMethod as 'transfer' | 'direct_debit'

    const notes = formData.get('notes')
    if (notes !== null) data.notes = notes as string

    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      `/api/backoffice/invoices/${id}`,
      'PATCH',
      data
    )

    // Revalidate caches
    revalidateBackofficeCaches(id)

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('updateInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al actualizar la factura' }
  }
}

// ========================================
// VALIDATE INVOICE
// ========================================

export async function validateInvoice(id: number): Promise<ActionState> {
  try {
    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      `/api/backoffice/invoices/${id}/validate`,
      'POST',
      {}
    )

    revalidateBackofficeCaches(id)

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('validateInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al validar la factura' }
  }
}

// ========================================
// REJECT INVOICE
// ========================================

export async function rejectInvoice(id: number, notes: string): Promise<ActionState> {
  try {
    if (!notes?.trim()) {
      return { error: 'Debe indicar el motivo del rechazo' }
    }

    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      `/api/backoffice/invoices/${id}/reject`,
      'POST',
      { notes }
    )

    revalidateBackofficeCaches(id)

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('rejectInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al rechazar la factura' }
  }
}

// ========================================
// MARK AS PAID
// ========================================

export async function markInvoiceAsPaid(id: number, paidDate: string): Promise<ActionState> {
  try {
    if (!paidDate) {
      return { error: 'La fecha de pago es requerida' }
    }

    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      `/api/backoffice/invoices/${id}/pay`,
      'POST',
      { paid_date: paidDate }
    )

    revalidateBackofficeCaches(id)

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('markInvoiceAsPaid error:', error)
    return { error: error instanceof Error ? error.message : 'Error al marcar como pagada' }
  }
}

// ========================================
// DELETE INVOICE
// ========================================

export async function deleteInvoice(id: number): Promise<ActionState> {
  try {
    await serverMutate<{ message: string }>(
      `/api/backoffice/invoices/${id}`,
      'DELETE'
    )

    revalidateBackofficeCaches()

    return { success: true }
  } catch (error) {
    console.error('deleteInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al eliminar la factura' }
  }
}

// ========================================
// RESTORE INVOICE
// ========================================

export async function restoreInvoice(id: number): Promise<ActionState> {
  try {
    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      `/api/backoffice/invoices/${id}/restore`,
      'PATCH',
      {}
    )

    revalidateBackofficeCaches(id)

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('restoreInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al restaurar la factura' }
  }
}

// ========================================
// UNVALIDATE INVOICE (Revert validation)
// ========================================

export async function unvalidateInvoice(id: number, notes?: string): Promise<ActionState> {
  try {
    const result = await serverMutate<{ message: string; invoice: InvoiceWithDetails }>(
      `/api/backoffice/invoices/${id}/unvalidate`,
      'POST',
      { notes: notes || null }
    )

    revalidateBackofficeCaches(id)

    return { success: true, data: result.invoice }
  } catch (error) {
    console.error('unvalidateInvoice error:', error)
    return { error: error instanceof Error ? error.message : 'Error al revertir la validación' }
  }
}
