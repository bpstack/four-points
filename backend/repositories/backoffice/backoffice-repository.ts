// repositories/backoffice/backoffice-repository.ts
/**
 * Repositorio para el módulo Back Office
 * Gestión de proveedores, facturas, categorías y assets
 */

import pool from '../../config/db.js'
import { RowDataPacket, ResultSetHeader } from 'mysql2'
import { getNowMadrid } from '../../config/date-utils.js'
import { logger } from '../../config/logger.js'
import { buildSetClause } from '../shared/update-columns.js'
import { SUPPLIER_UPDATE_COLUMNS, INVOICE_UPDATE_COLUMNS } from './backoffice-columns.js'

import {
  Category,
  Supplier,
  SupplierWithStats,
  SupplierFilters,
  Invoice,
  InvoiceWithDetails,
  InvoiceFilters,
  InvoiceHistory,
  Asset,
  SummaryStats,
} from '../../models/backoffice/index.js'
import { likeContains } from '../shared/like.js'

// Re-exportar tipos para mantener compatibilidad
export type {
  Category,
  Supplier,
  SupplierWithStats,
  SupplierFilters,
  Invoice,
  InvoiceWithDetails,
  InvoiceFilters,
  InvoiceHistory,
  Asset,
  SummaryStats,
}

// ========================================
// REPOSITORIO
// ========================================

export class BackofficeRepository {
  // ========================================
  // CATEGORÍAS
  // ========================================

  static async getAllCategories(): Promise<Category[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM bo_categories WHERE is_active = 1 ORDER BY cost_center, department`
    )
    return rows as Category[]
  }

  static async getCategoryById(id: number): Promise<Category | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM bo_categories WHERE id = ?`, [
      id,
    ])
    return rows.length > 0 ? (rows[0] as Category) : null
  }

  static async createCategory(data: {
    cost_center: string
    department: string
    description?: string
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO bo_categories (cost_center, department, description) VALUES (?, ?, ?)`,
      [data.cost_center, data.department, data.description || null]
    )
    return result.insertId
  }

  // ========================================
  // PROVEEDORES
  // ========================================

  static async getAllSuppliers(
    filters?: SupplierFilters,
    page: number = 1,
    limit: number = 100
  ): Promise<{ suppliers: SupplierWithStats[]; total: number }> {
    let baseQuery = `FROM v_bo_suppliers_stats WHERE 1=1`
    const params: any[] = []

    if (filters?.is_active !== undefined) {
      baseQuery += ` AND is_active = ?`
      params.push(filters.is_active)
    } else {
      baseQuery += ` AND is_active = 1`
    }

    if (filters?.category_id) {
      baseQuery += ` AND default_category_id = ?`
      params.push(filters.category_id)
    }

    if (filters?.periodicity) {
      baseQuery += ` AND periodicity = ?`
      params.push(filters.periodicity)
    }

    if (filters?.payment_method) {
      baseQuery += ` AND payment_method = ?`
      params.push(filters.payment_method)
    }

    if (filters?.search) {
      baseQuery += ` AND (name LIKE ? OR notes LIKE ?)`
      const search = likeContains(filters.search)
      params.push(search, search)
    }

    // Get total count
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params
    )
    const total = countResult[0].total

    // Get paginated results
    const offset = (page - 1) * limit
    const query = `SELECT * ${baseQuery} ORDER BY name LIMIT ? OFFSET ?`
    const [rows] = await pool.query<RowDataPacket[]>(query, [...params, limit, offset])

    return {
      suppliers: rows as SupplierWithStats[],
      total,
    }
  }

  static async getSupplierById(id: number): Promise<SupplierWithStats | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_bo_suppliers_stats WHERE id = ?`,
      [id]
    )
    return rows.length > 0 ? (rows[0] as SupplierWithStats) : null
  }

  static async getSupplierByName(name: string): Promise<Supplier | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM bo_suppliers WHERE name = ?`, [
      name,
    ])
    return rows.length > 0 ? (rows[0] as Supplier) : null
  }

  static async createSupplier(data: {
    name: string
    cif?: string
    default_category_id?: number
    periodicity?: string
    payment_method?: string
    bank_account?: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    created_by?: string
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO bo_suppliers 
        (name, cif, default_category_id, periodicity, payment_method, bank_account, email, phone, address, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.cif || null,
        data.default_category_id || null,
        data.periodicity || 'monthly',
        data.payment_method || 'transfer',
        data.bank_account || null,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.notes || null,
        data.created_by || null,
      ]
    )
    return result.insertId
  }

  static async updateSupplier(
    id: number,
    data: Partial<{
      name: string
      cif: string
      default_category_id: number
      periodicity: string
      payment_method: string
      bank_account: string
      email: string
      phone: string
      address: string
      notes: string
      is_active: boolean
    }>
  ): Promise<boolean> {
    // Column names are interpolated: only allow-listed keys reach the SQL
    const { fields, values } = buildSetClause(data, SUPPLIER_UPDATE_COLUMNS)

    if (fields.length === 0) return false

    values.push(id)
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_suppliers SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return result.affectedRows > 0
  }

  static async inactivateSupplier(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_suppliers SET is_active = 0 WHERE id = ?`,
      [id]
    )
    return result.affectedRows > 0
  }

  static async activateSupplier(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_suppliers SET is_active = 1 WHERE id = ?`,
      [id]
    )
    return result.affectedRows > 0
  }

  static async hardDeleteSupplier(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(`DELETE FROM bo_suppliers WHERE id = ?`, [
      id,
    ])
    return result.affectedRows > 0
  }

  // ========================================
  // FACTURAS
  // ========================================

  static async getAllInvoices(
    filters?: InvoiceFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{ invoices: InvoiceWithDetails[]; total: number }> {
    let whereClause = `WHERE 1=1`
    const params: any[] = []

    if (!filters?.include_deleted) {
      whereClause += ` AND is_deleted = 0`
    }

    if (filters?.status) {
      // Soporta múltiples estados separados por coma (ej: "pending,validated")
      const statuses = filters.status.split(',').map((s) => s.trim())
      if (statuses.length === 1) {
        whereClause += ` AND status = ?`
        params.push(statuses[0])
      } else {
        whereClause += ` AND status IN (${statuses.map(() => '?').join(', ')})`
        params.push(...statuses)
      }
    }

    if (filters?.supplier_id) {
      whereClause += ` AND supplier_id = ?`
      params.push(filters.supplier_id)
    }

    if (filters?.category_id) {
      whereClause += ` AND category_id = ?`
      params.push(filters.category_id)
    }

    if (filters?.payment_method) {
      whereClause += ` AND payment_method = ?`
      params.push(filters.payment_method)
    }

    if (filters?.date_from) {
      whereClause += ` AND invoice_date >= ?`
      params.push(filters.date_from)
    }

    if (filters?.date_to) {
      whereClause += ` AND invoice_date <= ?`
      params.push(filters.date_to)
    }

    if (filters?.search) {
      whereClause += ` AND (invoice_number LIKE ? OR supplier_name LIKE ? OR notes LIKE ?)`
      const search = likeContains(filters.search)
      params.push(search, search, search)
    }

    // Count total
    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM v_bo_invoices_detail ${whereClause}`,
      params
    )
    const total = countResult[0].total

    // Get paginated results
    const offset = (page - 1) * limit
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_bo_invoices_detail ${whereClause} ORDER BY invoice_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    return { invoices: rows as InvoiceWithDetails[], total }
  }

  static async getInvoiceById(id: number): Promise<InvoiceWithDetails | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_bo_invoices_detail WHERE id = ?`,
      [id]
    )
    return rows.length > 0 ? (rows[0] as InvoiceWithDetails) : null
  }

  static async getInvoicesBySupplier(supplierId: number): Promise<InvoiceWithDetails[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_bo_invoices_detail 
       WHERE supplier_id = ? AND is_deleted = 0 
       ORDER BY invoice_date DESC`,
      [supplierId]
    )
    return rows as InvoiceWithDetails[]
  }

  /**
   * Get multiple invoices by IDs
   * Used for bulk operations like ZIP download
   */
  static async getInvoicesByIds(ids: number[]): Promise<InvoiceWithDetails[]> {
    if (ids.length === 0) return []

    const placeholders = ids.map(() => '?').join(',')
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_bo_invoices_detail 
       WHERE id IN (${placeholders}) AND is_deleted = 0`,
      ids
    )
    return rows as InvoiceWithDetails[]
  }

  static async createInvoice(data: {
    invoice_number: string
    supplier_id: number
    category_id?: number
    amount_without_vat: number
    amount_with_vat: number
    vat_percentage?: number
    invoice_date: string
    received_date?: string
    billing_period_start?: string
    billing_period_end?: string
    due_date?: string
    payment_method: string
    original_pdf_url?: string
    original_pdf_public_id?: string
    notes?: string
    created_by: string
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO bo_invoices 
        (invoice_number, supplier_id, category_id, amount_without_vat, amount_with_vat, 
         vat_percentage, invoice_date, received_date, billing_period_start, billing_period_end,
         due_date, payment_method, original_pdf_url, original_pdf_public_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.invoice_number,
        data.supplier_id,
        data.category_id || null,
        data.amount_without_vat,
        data.amount_with_vat,
        data.vat_percentage || 21.0,
        data.invoice_date,
        data.received_date || null,
        data.billing_period_start || null,
        data.billing_period_end || null,
        data.due_date || null,
        data.payment_method,
        data.original_pdf_url || null,
        data.original_pdf_public_id || null,
        data.notes || null,
        data.created_by,
      ]
    )

    // Registrar en historial
    await this.addInvoiceHistory(
      result.insertId,
      'created',
      null,
      null,
      null,
      null,
      data.created_by
    )

    return result.insertId
  }

  static async updateInvoice(
    id: number,
    data: Partial<{
      invoice_number: string
      supplier_id: number
      category_id: number
      amount_without_vat: number
      amount_with_vat: number
      vat_percentage: number
      invoice_date: string
      received_date: string
      billing_period_start: string
      billing_period_end: string
      due_date: string
      payment_method: string
      notes: string
    }>,
    userId: string
  ): Promise<boolean> {
    // Column names are interpolated: only allow-listed keys reach the SQL
    const { fields, values } = buildSetClause(data, INVOICE_UPDATE_COLUMNS)

    if (fields.length === 0) return false

    fields.push('updated_by = ?', 'updated_at = NOW()')
    values.push(userId, id)

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET ${fields.join(', ')} WHERE id = ? AND status = 'pending'`,
      values
    )

    if (result.affectedRows > 0) {
      await this.addInvoiceHistory(id, 'updated', null, null, null, null, userId)
    }

    return result.affectedRows > 0
  }

  static async validateInvoice(
    id: number,
    data: {
      validated_pdf_url?: string
      validated_pdf_public_id?: string
      validation_notes?: string
    },
    userId: string
  ): Promise<boolean> {
    // Build dynamic SET clause - only update PDF fields if provided
    const setClauses = [
      `status = 'validated'`,
      `validated_by = ?`,
      `validated_at = NOW()`,
      `updated_by = ?`,
      `updated_at = NOW()`,
    ]
    const params: any[] = [userId, userId]

    // Only update validated_pdf_url if explicitly provided (not undefined)
    if (data.validated_pdf_url !== undefined) {
      setClauses.push(`validated_pdf_url = ?`)
      params.push(data.validated_pdf_url || null)
    }

    if (data.validated_pdf_public_id !== undefined) {
      setClauses.push(`validated_pdf_public_id = ?`)
      params.push(data.validated_pdf_public_id || null)
    }

    if (data.validation_notes !== undefined) {
      setClauses.push(`validation_notes = ?`)
      params.push(data.validation_notes || null)
    }

    params.push(id) // WHERE id = ?

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET ${setClauses.join(', ')} WHERE id = ? AND status = 'pending'`,
      params
    )

    if (result.affectedRows > 0) {
      await this.addInvoiceHistory(
        id,
        'validated',
        'status',
        'pending',
        'validated',
        data.validation_notes || null,
        userId
      )
    }

    return result.affectedRows > 0
  }

  static async rejectInvoice(id: number, notes: string, userId: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        status = 'rejected',
        validation_notes = ?,
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [notes, userId, id]
    )

    if (result.affectedRows > 0) {
      await this.addInvoiceHistory(id, 'rejected', 'status', 'pending', 'rejected', notes, userId)
    }

    return result.affectedRows > 0
  }

  static async unvalidateInvoice(
    id: number,
    notes: string | null,
    userId: string
  ): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        status = 'pending',
        validated_by = NULL,
        validated_at = NULL,
        validation_notes = ?,
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ? AND status = 'validated'`,
      [notes, userId, id]
    )

    if (result.affectedRows > 0) {
      await this.addInvoiceHistory(
        id,
        'updated',
        'status',
        'validated',
        'pending',
        notes || 'Validación revertida',
        userId
      )
    }

    return result.affectedRows > 0
  }

  static async markAsPaid(id: number, paidDate: string, userId: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        status = 'paid',
        paid_date = ?,
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ? AND status = 'validated'`,
      [paidDate, userId, id]
    )

    if (result.affectedRows > 0) {
      await this.addInvoiceHistory(id, 'paid', 'status', 'validated', 'paid', null, userId)
    }

    return result.affectedRows > 0
  }

  /**
   * Revert the payment of one invoice (paid -> validated)
   */
  static async revertPayment(id: number, notes: string | null, userId: string): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        status = 'validated',
        paid_date = NULL,
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ? AND status = 'paid'`,
      [userId, id]
    )

    if (result.affectedRows > 0) {
      await this.addInvoiceHistory(
        id,
        'updated',
        'status',
        'paid',
        'validated',
        notes || 'Pago revertido',
        userId
      )
    }

    return result.affectedRows > 0
  }

  /**
   * Batch mark all validated invoices from a specific month as paid
   * Used by cron job on day 10 to auto-pay previous month's invoices
   *
   * @param year - The year of the invoices to mark as paid
   * @param month - The month (1-12) of the invoices to mark as paid
   * @param userId - The user ID performing the action (system for cron)
   * @returns Object with count of affected invoices and their IDs
   */
  static async markValidatedInvoicesAsPaid(
    year: number,
    month: number,
    userId: string
  ): Promise<{ count: number; invoiceIds: number[] }> {
    // First, get the IDs of invoices that will be updated
    const [invoicesToUpdate] = await pool.query<RowDataPacket[]>(
      `SELECT id, invoice_date FROM bo_invoices 
       WHERE status = 'validated' 
         AND is_deleted = 0
         AND YEAR(invoice_date) = ?
         AND MONTH(invoice_date) = ?`,
      [year, month]
    )

    if (invoicesToUpdate.length === 0) {
      return { count: 0, invoiceIds: [] }
    }

    const invoiceIds = invoicesToUpdate.map((inv) => inv.id)

    // Update all validated invoices for that month
    // paid_date is set to the invoice's own invoice_date
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        status = 'paid',
        paid_date = invoice_date,
        updated_by = ?,
        updated_at = NOW()
       WHERE status = 'validated' 
         AND is_deleted = 0
         AND YEAR(invoice_date) = ?
         AND MONTH(invoice_date) = ?`,
      [userId, year, month]
    )

    // Add history entry for each updated invoice
    for (const invoice of invoicesToUpdate) {
      await this.addInvoiceHistory(
        invoice.id,
        'paid',
        'status',
        'validated',
        'paid',
        `Pago automático de facturas de ${month}/${year}`,
        userId
      )
    }

    logger.info(
      { affectedRows: result.affectedRows, month, year },
      '[BackofficeRepository.markValidatedInvoicesAsPaid] Marked invoices as paid'
    )

    return { count: result.affectedRows, invoiceIds }
  }

  /**
   * Get count of validated invoices for a specific month (preview before batch pay)
   */
  static async getValidatedInvoicesCountByMonth(
    year: number,
    month: number
  ): Promise<{ count: number; total_amount: number }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount_with_vat), 0) as total_amount
       FROM bo_invoices 
       WHERE status = 'validated' 
         AND is_deleted = 0
         AND YEAR(invoice_date) = ?
         AND MONTH(invoice_date) = ?`,
      [year, month]
    )
    return {
      count: rows[0].count,
      total_amount: Number(rows[0].total_amount),
    }
  }

  /**
   * Get count of paid invoices for a specific month (preview before revert batch pay)
   */
  static async getPaidInvoicesCountByMonth(
    year: number,
    month: number
  ): Promise<{ count: number; total_amount: number }> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount_with_vat), 0) as total_amount
       FROM bo_invoices 
       WHERE status = 'paid' 
         AND is_deleted = 0
         AND YEAR(invoice_date) = ?
         AND MONTH(invoice_date) = ?`,
      [year, month]
    )
    return {
      count: rows[0].count,
      total_amount: Number(rows[0].total_amount),
    }
  }

  /**
   * Batch revert all paid invoices from a specific month back to validated
   * This is the reverse of markValidatedInvoicesAsPaid
   *
   * @param year - The year of the invoices to revert
   * @param month - The month (1-12) of the invoices to revert
   * @param userId - The user ID performing the action
   * @returns Object with count of affected invoices and their IDs
   */
  static async revertPaidInvoicesToValidated(
    year: number,
    month: number,
    userId: string
  ): Promise<{ count: number; invoiceIds: number[] }> {
    // First, get the IDs of invoices that will be reverted
    const [invoicesToRevert] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM bo_invoices 
       WHERE status = 'paid' 
         AND is_deleted = 0
         AND YEAR(invoice_date) = ?
         AND MONTH(invoice_date) = ?`,
      [year, month]
    )

    if (invoicesToRevert.length === 0) {
      return { count: 0, invoiceIds: [] }
    }

    const invoiceIds = invoicesToRevert.map((inv) => inv.id)

    // Revert all paid invoices for that month back to validated
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        status = 'validated',
        paid_date = NULL,
        updated_by = ?,
        updated_at = NOW()
       WHERE status = 'paid' 
         AND is_deleted = 0
         AND YEAR(invoice_date) = ?
         AND MONTH(invoice_date) = ?`,
      [userId, year, month]
    )

    // Add history entry for each reverted invoice
    for (const invoice of invoicesToRevert) {
      await this.addInvoiceHistory(
        invoice.id,
        'updated',
        'status',
        'paid',
        'validated',
        `Reversión de cierre de mes ${month}/${year}`,
        userId
      )
    }

    logger.info(
      { affectedRows: result.affectedRows, month, year },
      '[BackofficeRepository.revertPaidInvoicesToValidated] Reverted invoices to validated'
    )

    return { count: result.affectedRows, invoiceIds }
  }

  /**
   * Get invoice PDF info for Cloudinary deletion
   */
  static async getInvoicePdfInfo(id: number): Promise<{
    id: number
    original_pdf_public_id: string | null
    validated_pdf_public_id: string | null
  } | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, original_pdf_public_id, validated_pdf_public_id FROM bo_invoices WHERE id = ?`,
      [id]
    )
    if (rows.length === 0) return null
    return rows[0] as {
      id: number
      original_pdf_public_id: string | null
      validated_pdf_public_id: string | null
    }
  }

  /**
   * Hard delete invoice - permanently removes from database
   * Also deletes associated history records
   */
  static async deleteInvoice(id: number, _userId: string): Promise<boolean> {
    // First delete history records
    await pool.query(`DELETE FROM bo_invoice_history WHERE invoice_id = ?`, [id])

    // Then delete the invoice
    const [result] = await pool.query<ResultSetHeader>(`DELETE FROM bo_invoices WHERE id = ?`, [id])

    logger.info({ id }, '[BackofficeRepository.deleteInvoice] Hard deleted invoice')

    return result.affectedRows > 0
  }

  static async updateInvoicePdf(
    id: number,
    type: 'original' | 'validated',
    url: string,
    publicId: string,
    userId: string
  ): Promise<boolean> {
    const field = type === 'original' ? 'original_pdf' : 'validated_pdf'
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_invoices SET 
        ${field}_url = ?,
        ${field}_public_id = ?,
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [url, publicId, userId, id]
    )
    return result.affectedRows > 0
  }

  // ========================================
  // HISTORIAL DE FACTURAS
  // ========================================

  static async addInvoiceHistory(
    invoiceId: number,
    action: string,
    fieldChanged: string | null,
    oldValue: string | null,
    newValue: string | null,
    notes: string | null,
    changedBy: string
  ): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO bo_invoice_history 
        (invoice_id, action, field_changed, old_value, new_value, notes, changed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, action, fieldChanged, oldValue, newValue, notes, changedBy]
    )
    return result.insertId
  }

  static async getInvoiceHistory(invoiceId: number): Promise<InvoiceHistory[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT h.*, u.username as changed_by_name
       FROM bo_invoice_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.invoice_id = ?
       ORDER BY h.changed_at DESC`,
      [invoiceId]
    )
    return rows as InvoiceHistory[]
  }

  // ========================================
  // ASSETS (SELLOS Y FIRMAS)
  // ========================================

  static async getAllAssets(type?: 'stamp' | 'signature'): Promise<Asset[]> {
    let query = `SELECT * FROM bo_assets`
    const params: any[] = []

    if (type) {
      query += ` WHERE type = ?`
      params.push(type)
    }

    query += ` ORDER BY is_default DESC, name`

    const [rows] = await pool.query<RowDataPacket[]>(query, params)
    return rows as Asset[]
  }

  static async getAssetById(id: number): Promise<Asset | null> {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM bo_assets WHERE id = ?`, [id])
    return rows.length > 0 ? (rows[0] as Asset) : null
  }

  static async createAsset(data: {
    type: 'stamp' | 'signature'
    name: string
    cloudinary_url: string
    cloudinary_public_id: string
    is_default?: boolean
    created_by?: string
  }): Promise<number> {
    // Si es default, quitar el default de otros del mismo tipo
    if (data.is_default) {
      await pool.query(`UPDATE bo_assets SET is_default = 0 WHERE type = ?`, [data.type])
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO bo_assets (type, name, cloudinary_url, cloudinary_public_id, is_default, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.type,
        data.name,
        data.cloudinary_url,
        data.cloudinary_public_id,
        data.is_default || false,
        data.created_by || null,
      ]
    )
    return result.insertId
  }

  static async deleteAsset(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(`DELETE FROM bo_assets WHERE id = ?`, [id])
    return result.affectedRows > 0
  }

  static async setDefaultAsset(id: number, type: 'stamp' | 'signature'): Promise<boolean> {
    await pool.query(`UPDATE bo_assets SET is_default = 0 WHERE type = ?`, [type])
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE bo_assets SET is_default = 1 WHERE id = ? AND type = ?`,
      [id, type]
    )
    return result.affectedRows > 0
  }

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  static async getSummaryStats(): Promise<SummaryStats> {
    const currentMonth = getNowMadrid().format('YYYY-MM') // mes actual en Europe/Madrid

    const [pending] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_with_vat), 0) as total 
       FROM bo_invoices WHERE status IN ('pending', 'validated') AND is_deleted = 0`
    )

    const [paidThisMonth] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_with_vat), 0) as total 
       FROM bo_invoices 
       WHERE status = 'paid' AND is_deleted = 0 
       AND DATE_FORMAT(paid_date, '%Y-%m') = ?`,
      [currentMonth]
    )

    // Total histórico de facturas pagadas (all time)
    const [paidTotal] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount_with_vat), 0) as total 
       FROM bo_invoices 
       WHERE status = 'paid' AND is_deleted = 0`
    )

    const [overdue] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count 
       FROM bo_invoices 
       WHERE status IN ('pending', 'validated') AND is_deleted = 0 
       AND due_date < CURDATE()`
    )

    const [suppliers] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM bo_suppliers WHERE is_active = 1`
    )

    return {
      pending_count: pending[0].count,
      pending_total: parseFloat(pending[0].total) || 0,
      paid_this_month: paidThisMonth[0].count,
      paid_total_this_month: parseFloat(paidThisMonth[0].total) || 0,
      paid_count: paidTotal[0].count,
      paid_total: parseFloat(paidTotal[0].total) || 0,
      overdue_count: overdue[0].count,
      suppliers_count: suppliers[0].count,
    }
  }

  static async getMonthlySummary(year?: number): Promise<any[]> {
    const targetYear = year || getNowMadrid().year()
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM v_bo_monthly_summary WHERE year = ? ORDER BY month DESC`,
      [targetYear]
    )
    return rows
  }
}
