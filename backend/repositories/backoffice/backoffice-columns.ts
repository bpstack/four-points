// repositories/backoffice/backoffice-columns.ts

// Columns an edit may change. Status, payment, validation and authorship
// columns have their own endpoints and must not be set through these
export const SUPPLIER_UPDATE_COLUMNS = [
  'name',
  'cif',
  'default_category_id',
  'periodicity',
  'payment_method',
  'bank_account',
  'email',
  'phone',
  'address',
  'notes',
  'is_active',
] as const
export const INVOICE_UPDATE_COLUMNS = [
  'invoice_number',
  'supplier_id',
  'category_id',
  'amount_without_vat',
  'amount_with_vat',
  'vat_percentage',
  'invoice_date',
  'received_date',
  'billing_period_start',
  'billing_period_end',
  'due_date',
  'payment_method',
  'notes',
] as const
