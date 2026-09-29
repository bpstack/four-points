// models/backoffice/index.ts
/**
 * Tipos TypeScript para el módulo Back Office
 * Gestión de proveedores, facturas, categorías y assets
 */

// ========================================
// TIPOS BASE
// ========================================

export type InvoiceStatus = 'pending' | 'validated' | 'rejected' | 'paid'
export type PaymentMethod = 'transfer' | 'direct_debit'
export type Periodicity = 'monthly' | 'bimonthly' | 'quarterly' | 'annual' | 'on_demand'
export type AssetType = 'stamp' | 'signature'
export type HistoryAction =
  'created' | 'updated' | 'validated' | 'rejected' | 'paid' | 'deleted' | 'restored'

// ========================================
// CATEGORÍAS
// ========================================

export interface Category {
  id: number
  cost_center: string
  department: string
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

// ========================================
// PROVEEDORES
// ========================================

export interface Supplier {
  id: number
  name: string
  cif: string | null
  default_category_id: number | null
  periodicity: Periodicity
  payment_method: PaymentMethod
  bank_account: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export interface SupplierWithStats extends Supplier {
  cost_center: string | null
  department: string | null
  category_full: string | null
  total_invoices: number
  pending_invoices: number
  paid_invoices: number
  ytd_total: number
  last_invoice_date: Date | null
}

export interface SupplierFilters {
  category_id?: number
  periodicity?: string
  payment_method?: string
  is_active?: boolean
  search?: string
}

// ========================================
// FACTURAS
// ========================================

export interface Invoice {
  id: number
  invoice_number: string
  supplier_id: number
  category_id: number | null
  amount_without_vat: number
  amount_with_vat: number
  vat_percentage: number
  invoice_date: Date
  received_date: Date | null
  billing_period_start: Date | null
  billing_period_end: Date | null
  due_date: Date | null
  paid_date: Date | null
  status: InvoiceStatus
  payment_method: PaymentMethod
  original_pdf_url: string | null
  original_pdf_public_id: string | null
  validated_pdf_url: string | null
  validated_pdf_public_id: string | null
  validated_by: string | null
  validated_at: Date | null
  validation_notes: string | null
  notes: string | null
  created_by: string
  created_at: Date
  updated_by: string | null
  updated_at: Date
  is_deleted: boolean
}

export interface InvoiceWithDetails extends Invoice {
  supplier_name: string
  cost_center: string | null
  department: string | null
  category_full: string | null
  validated_by_name: string | null
  created_by_name: string | null
}

export interface InvoiceFilters {
  status?: string
  supplier_id?: number
  category_id?: number
  payment_method?: string
  date_from?: string
  date_to?: string
  search?: string
  include_deleted?: boolean
}

export interface InvoiceHistory {
  id: number
  invoice_id: number
  action: HistoryAction
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  notes: string | null
  changed_by: string
  changed_at: Date
}

// ========================================
// ASSETS (sellos y firmas)
// ========================================

export interface Asset {
  id: number
  type: AssetType
  name: string
  cloudinary_url: string
  cloudinary_public_id: string
  is_default: boolean
  created_by: string | null
  created_at: Date
}

// ========================================
// ESTADÍSTICAS
// ========================================

export interface SummaryStats {
  pending_count: number
  pending_total: number
  paid_this_month: number
  paid_total_this_month: number
  paid_count: number
  paid_total: number
  overdue_count: number
  suppliers_count: number
}

// ========================================
// CONSTANTES
// ========================================

export const INVOICE_STATUS: Record<InvoiceStatus, string> = {
  pending: 'Pendiente',
  validated: 'Validada',
  rejected: 'Rechazada',
  paid: 'Pagada',
}

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  transfer: 'Transferencia',
  direct_debit: 'Domiciliación',
}

export const PERIODICITIES: Record<Periodicity, string> = {
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  annual: 'Anual',
  on_demand: 'Bajo demanda',
}

export const ASSET_TYPES: Record<AssetType, string> = {
  stamp: 'Sello',
  signature: 'Firma',
}

// ========================================
// VALORES POR DEFECTO
// ========================================

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 100
export const DEFAULT_VAT_PERCENTAGE = 21
