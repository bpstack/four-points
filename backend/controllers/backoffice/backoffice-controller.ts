// backend/controllers/backoffice/backoffice-controller.ts
/**
 * Controller para el módulo Back Office
 * Gestión de proveedores, facturas, categorías y assets
 */

import type { Request, Response } from 'express'
import axios from 'axios'
import archiver from 'archiver'
import {
  BackofficeRepository,
  type InvoiceFilters,
  type SupplierFilters,
} from '../../repositories/backoffice/backoffice-repository.js'
import { CloudinaryService } from '../../services/blacklist/cloudinary-service.js'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'

// ========================================
// CONTROLLER
// ========================================

export class BackofficeController {
  // ========================================
  // CATEGORÍAS
  // ========================================

  /**
   * GET /api/backoffice/categories
   * Obtener todas las categorías activas
   */
  static async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await BackofficeRepository.getAllCategories()
      res.json({ success: true, categories })
    } catch (error: any) {
      console.error('[BackofficeController.getCategories] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_CATEGORIES_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_CATEGORIES_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/categories/:id
   * Obtener categoría por ID
   */
  static async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const category = await BackofficeRepository.getCategoryById(Number(id))

      if (!category) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_CATEGORY_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_CATEGORY_NOT_FOUND,
        })
        return
      }

      res.json({ success: true, category })
    } catch (error: any) {
      console.error('[BackofficeController.getCategoryById] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_CATEGORY_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_CATEGORY_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/categories
   * Crear nueva categoría
   */
  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { cost_center, department, description } = req.body

      if (!cost_center || !department) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_COST_CENTER_DEPARTMENT_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_COST_CENTER_DEPARTMENT_REQUIRED,
        })
        return
      }

      const id = await BackofficeRepository.createCategory({
        cost_center,
        department,
        description,
      })

      const category = await BackofficeRepository.getCategoryById(id)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_CATEGORY_CREATED,
        code: SUCCESS_CODES.BACKOFFICE_CATEGORY_CREATED,
        category,
      })
    } catch (error: any) {
      console.error('[BackofficeController.createCategory] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_CREATE_CATEGORY_ERROR,
        code: ERROR_CODES.BACKOFFICE_CREATE_CATEGORY_ERROR,
      })
    }
  }

  // ========================================
  // PROVEEDORES
  // ========================================

  /**
   * GET /api/backoffice/suppliers
   * Obtener todos los proveedores con filtros y paginación
   */
  static async getSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const filters: SupplierFilters = {
        category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
        periodicity: req.query.periodicity as string,
        payment_method: req.query.payment_method as string,
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        search: req.query.search as string,
      }

      // Pagination: default 100 per page, max 100
      const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 100

      const { suppliers, total } = await BackofficeRepository.getAllSuppliers(filters, page, limit)

      res.json({
        success: true,
        suppliers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error: any) {
      console.error('[BackofficeController.getSuppliers] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_SUPPLIERS_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_SUPPLIERS_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/suppliers/:id
   * Obtener proveedor por ID con estadísticas
   */
  static async getSupplierById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const supplier = await BackofficeRepository.getSupplierById(Number(id))

      if (!supplier) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
        })
        return
      }

      // Obtener también las facturas del proveedor
      const invoices = await BackofficeRepository.getInvoicesBySupplier(Number(id))

      res.json({ success: true, supplier, invoices })
    } catch (error: any) {
      console.error('[BackofficeController.getSupplierById] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_SUPPLIER_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_SUPPLIER_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/suppliers
   * Crear nuevo proveedor
   */
  static async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { name } = req.body

      if (!name) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_NAME_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_NAME_REQUIRED,
        })
        return
      }

      // Verificar que no exista un proveedor con el mismo nombre
      const existing = await BackofficeRepository.getSupplierByName(name)
      if (existing) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_SUPPLIER_EXISTS,
          code: ERROR_CODES.BACKOFFICE_SUPPLIER_EXISTS,
        })
        return
      }

      const id = await BackofficeRepository.createSupplier({
        ...req.body,
        created_by: req.user.id,
      })

      const supplier = await BackofficeRepository.getSupplierById(id)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_SUPPLIER_CREATED,
        code: SUCCESS_CODES.BACKOFFICE_SUPPLIER_CREATED,
        supplier,
      })
    } catch (error: any) {
      console.error('[BackofficeController.createSupplier] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_CREATE_SUPPLIER_ERROR,
        code: ERROR_CODES.BACKOFFICE_CREATE_SUPPLIER_ERROR,
      })
    }
  }

  /**
   * PATCH /api/backoffice/suppliers/:id
   * Actualizar proveedor
   */
  static async updateSupplier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      // Si se intenta cambiar el nombre, verificar que no exista otro con ese nombre
      if (req.body.name) {
        const existing = await BackofficeRepository.getSupplierByName(req.body.name)
        if (existing && existing.id !== Number(id)) {
          res.status(400).json({
            success: false,
            error: ERROR_CODES.BACKOFFICE_SUPPLIER_EXISTS,
            code: ERROR_CODES.BACKOFFICE_SUPPLIER_EXISTS,
          })
          return
        }
      }

      const updated = await BackofficeRepository.updateSupplier(Number(id), req.body)

      if (!updated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
        })
        return
      }

      const supplier = await BackofficeRepository.getSupplierById(Number(id))

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_SUPPLIER_UPDATED,
        code: SUCCESS_CODES.BACKOFFICE_SUPPLIER_UPDATED,
        supplier,
      })
    } catch (error: any) {
      console.error('[BackofficeController.updateSupplier] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_UPDATE_SUPPLIER_ERROR,
        code: ERROR_CODES.BACKOFFICE_UPDATE_SUPPLIER_ERROR,
      })
    }
  }

  /**
   * DELETE /api/backoffice/suppliers/:id
   * Desactivar proveedor (soft delete)
   */
  static async deleteSupplier(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const deleted = await BackofficeRepository.deleteSupplier(Number(id))

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
        })
        return
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_SUPPLIER_DEACTIVATED,
        code: SUCCESS_CODES.BACKOFFICE_SUPPLIER_DEACTIVATED,
      })
    } catch (error: any) {
      console.error('[BackofficeController.deleteSupplier] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_DEACTIVATE_SUPPLIER_ERROR,
        code: ERROR_CODES.BACKOFFICE_DEACTIVATE_SUPPLIER_ERROR,
      })
    }
  }

  // ========================================
  // FACTURAS
  // ========================================

  /**
   * GET /api/backoffice/invoices
   * Obtener todas las facturas con filtros y paginación
   */
  static async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const filters: InvoiceFilters = {
        status: req.query.status as string,
        supplier_id: req.query.supplier_id ? Number(req.query.supplier_id) : undefined,
        category_id: req.query.category_id ? Number(req.query.category_id) : undefined,
        payment_method: req.query.payment_method as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        search: req.query.search as string,
        include_deleted: req.query.include_deleted === 'true',
      }

      const page = req.query.page ? Number(req.query.page) : 1
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50

      const { invoices, total } = await BackofficeRepository.getAllInvoices(filters, page, limit)

      res.json({
        success: true,
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        filters_applied: filters,
      })
    } catch (error: any) {
      console.error('[BackofficeController.getInvoices] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_INVOICES_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_INVOICES_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/invoices/:id
   * Obtener factura por ID con historial
   */
  static async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const invoice = await BackofficeRepository.getInvoiceById(Number(id))

      if (!invoice) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      // Obtener historial de la factura
      const history = await BackofficeRepository.getInvoiceHistory(Number(id))

      res.json({ success: true, invoice, history })
    } catch (error: any) {
      console.error('[BackofficeController.getInvoiceById] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_INVOICE_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_INVOICE_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices
   * Crear nueva factura
   */
  static async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { invoice_number, supplier_id, amount_without_vat, amount_with_vat, invoice_date, payment_method } =
        req.body

      // Validaciones básicas
      if (!invoice_number || !supplier_id || !amount_without_vat || !amount_with_vat || !invoice_date) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_FIELDS_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_INVOICE_FIELDS_REQUIRED,
        })
        return
      }

      // Verificar que el proveedor existe
      const supplier = await BackofficeRepository.getSupplierById(Number(supplier_id))
      if (!supplier) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_SUPPLIER_NOT_FOUND,
        })
        return
      }

      const id = await BackofficeRepository.createInvoice({
        ...req.body,
        payment_method: payment_method || supplier.payment_method,
        category_id: req.body.category_id || supplier.default_category_id,
        created_by: req.user.id,
      })

      const invoice = await BackofficeRepository.getInvoiceById(id)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_INVOICE_CREATED,
        code: SUCCESS_CODES.BACKOFFICE_INVOICE_CREATED,
        invoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.createInvoice] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_CREATE_INVOICE_ERROR,
        code: ERROR_CODES.BACKOFFICE_CREATE_INVOICE_ERROR,
      })
    }
  }

  /**
   * PATCH /api/backoffice/invoices/:id
   * Actualizar factura
   */
  static async updateInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params

      const updated = await BackofficeRepository.updateInvoice(Number(id), req.body, req.user.id)

      if (!updated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_INVOICE_UPDATED,
        code: SUCCESS_CODES.BACKOFFICE_INVOICE_UPDATED,
        invoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.updateInvoice] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_UPDATE_INVOICE_ERROR,
        code: ERROR_CODES.BACKOFFICE_UPDATE_INVOICE_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/:id/validate
   * Validar factura (aprobar)
   */
  static async validateInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params
      const { validated_pdf_url, validated_pdf_public_id, validation_notes } = req.body

      console.log('[BackofficeController.validateInvoice] Starting validation:', {
        id,
        userId: req.user.id,
        validated_pdf_url: validated_pdf_url || '(not provided)',
        validated_pdf_public_id: validated_pdf_public_id || '(not provided)',
        validation_notes: validation_notes || '(not provided)'
      })

      const validated = await BackofficeRepository.validateInvoice(
        Number(id),
        { validated_pdf_url, validated_pdf_public_id, validation_notes },
        req.user.id
      )

      if (!validated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))
      console.log('[BackofficeController.validateInvoice] Result:', {
        id: invoice?.id,
        status: invoice?.status,
        validated_pdf_url: invoice?.validated_pdf_url || '(null)'
      })

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_INVOICE_VALIDATED,
        code: SUCCESS_CODES.BACKOFFICE_INVOICE_VALIDATED,
        invoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.validateInvoice] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_VALIDATE_INVOICE_ERROR,
        code: ERROR_CODES.BACKOFFICE_VALIDATE_INVOICE_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/:id/reject
   * Rechazar factura
   */
  static async rejectInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params
      const { notes } = req.body

      if (!notes) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_REJECTION_REASON_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_REJECTION_REASON_REQUIRED,
        })
        return
      }

      const rejected = await BackofficeRepository.rejectInvoice(Number(id), notes, req.user.id)

      if (!rejected) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_INVOICE_REJECTED,
        code: SUCCESS_CODES.BACKOFFICE_INVOICE_REJECTED,
        invoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.rejectInvoice] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_REJECT_INVOICE_ERROR,
        code: ERROR_CODES.BACKOFFICE_REJECT_INVOICE_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/:id/unvalidate
   * Revertir validación de factura (validated -> pending)
   */
  static async unvalidateInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params
      const { notes } = req.body

      const unvalidated = await BackofficeRepository.unvalidateInvoice(
        Number(id),
        notes || null,
        req.user.id
      )

      if (!unvalidated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_VALIDATED,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_VALIDATED,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_VALIDATION_REVERTED,
        code: SUCCESS_CODES.BACKOFFICE_VALIDATION_REVERTED,
        invoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.unvalidateInvoice] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_REVERT_VALIDATION_ERROR,
        code: ERROR_CODES.BACKOFFICE_REVERT_VALIDATION_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/:id/pay
   * Marcar factura como pagada
   */
  static async markAsPaid(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params
      const { paid_date } = req.body

      if (!paid_date) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_PAYMENT_DATE_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_PAYMENT_DATE_REQUIRED,
        })
        return
      }

      const paid = await BackofficeRepository.markAsPaid(Number(id), paid_date, req.user.id)

      if (!paid) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_INVOICE_PAID,
        code: SUCCESS_CODES.BACKOFFICE_INVOICE_PAID,
        invoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.markAsPaid] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_MARK_PAID_ERROR,
        code: ERROR_CODES.BACKOFFICE_MARK_PAID_ERROR,
      })
    }
  }

  /**
   * DELETE /api/backoffice/invoices/:id
   * Eliminar factura (hard delete - eliminación permanente)
   */
  static async deleteInvoice(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params

      // Obtener factura para eliminar PDFs de Cloudinary
      const invoice = await BackofficeRepository.getInvoicePdfInfo(Number(id))
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      console.log('[BackofficeController.deleteInvoice] Deleting invoice:', {
        id: invoice.id,
        original_pdf_public_id: invoice.original_pdf_public_id,
        validated_pdf_public_id: invoice.validated_pdf_public_id,
      })

      // Eliminar PDFs de Cloudinary (opción estricta: falla todo si Cloudinary falla)
      if (invoice.original_pdf_public_id) {
        await CloudinaryService.deleteFile(invoice.original_pdf_public_id, 'raw')
        console.log('[BackofficeController.deleteInvoice] Original PDF deleted from Cloudinary')
      }

      if (invoice.validated_pdf_public_id) {
        await CloudinaryService.deleteFile(invoice.validated_pdf_public_id, 'raw')
        console.log('[BackofficeController.deleteInvoice] Validated PDF deleted from Cloudinary')
      }

      // Solo eliminar de BD si Cloudinary fue exitoso
      const deleted = await BackofficeRepository.deleteInvoice(Number(id), req.user.id)

      if (!deleted) {
        res.status(500).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_DELETE_INVOICE_ERROR,
          code: ERROR_CODES.BACKOFFICE_DELETE_INVOICE_ERROR,
        })
        return
      }

      console.log('[BackofficeController.deleteInvoice] Invoice deleted from DB')
      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_INVOICE_DELETED,
        code: SUCCESS_CODES.BACKOFFICE_INVOICE_DELETED,
      })
    } catch (error: any) {
      console.error('[BackofficeController.deleteInvoice] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_DELETE_INVOICE_ERROR,
        code: ERROR_CODES.BACKOFFICE_DELETE_INVOICE_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/invoices/:id/history
   * Obtener historial de una factura
   */
  static async getInvoiceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const history = await BackofficeRepository.getInvoiceHistory(Number(id))

      res.json({ success: true, history })
    } catch (error: any) {
      console.error('[BackofficeController.getInvoiceHistory] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_HISTORY_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_HISTORY_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/:id/pdf
   * Subir PDF de factura
   */
  static async uploadInvoicePdf(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { id } = req.params
      const { type } = req.query // 'original' o 'validated'

      console.log('[BackofficeController.uploadInvoicePdf] Starting upload:', { id, type, userId: req.user.id })

      if (!type || !['original', 'validated'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_PDF_TYPE_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_PDF_TYPE_REQUIRED,
        })
        return
      }

      // Verificar que la factura existe y obtener public_id anterior
      const invoice = await BackofficeRepository.getInvoiceById(Number(id))
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      // Obtener los public_ids para poder borrar el anterior después
      const pdfInfo = await BackofficeRepository.getInvoicePdfInfo(Number(id))
      const previousPublicId = type === 'original' 
        ? pdfInfo?.original_pdf_public_id 
        : pdfInfo?.validated_pdf_public_id

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_NO_FILE_SENT,
          code: ERROR_CODES.BACKOFFICE_NO_FILE_SENT,
        })
        return
      }

      // Validar tipo de archivo
      if (req.file.mimetype !== 'application/pdf') {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_PDF_ONLY,
          code: ERROR_CODES.BACKOFFICE_PDF_ONLY,
        })
        return
      }

      // Validar tamaño (máx 10MB)
      const maxSize = 10 * 1024 * 1024
      if (req.file.size > maxSize) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_FILE_TOO_LARGE,
          code: ERROR_CODES.BACKOFFICE_FILE_TOO_LARGE,
        })
        return
      }

      console.log('[BackofficeController.uploadInvoicePdf] Uploading to Cloudinary...')

      // Subir a Cloudinary (usar uploadPdf para archivos PDF)
      const cloudinaryResult = await CloudinaryService.uploadPdf(
        req.file.buffer,
        req.file.originalname,
        'backoffice/invoices'
      )

      console.log('[BackofficeController.uploadInvoicePdf] Cloudinary result:', {
        secure_url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id
      })

      // Actualizar en BD
      console.log('[BackofficeController.uploadInvoicePdf] Updating DB with type:', type)
      const updateResult = await BackofficeRepository.updateInvoicePdf(
        Number(id),
        type as 'original' | 'validated',
        cloudinaryResult.secure_url,
        cloudinaryResult.public_id,
        req.user.id
      )
      console.log('[BackofficeController.uploadInvoicePdf] DB update result:', updateResult)

      // Borrar el archivo anterior de Cloudinary (solo si había uno y el upload fue exitoso)
      if (previousPublicId && updateResult) {
        try {
          console.log('[BackofficeController.uploadInvoicePdf] Deleting previous PDF:', previousPublicId)
          await CloudinaryService.deleteFile(previousPublicId, 'raw')
          console.log('[BackofficeController.uploadInvoicePdf] Previous PDF deleted successfully')
        } catch (deleteError: any) {
          // Log pero no fallar - el nuevo archivo ya está subido
          console.warn('[BackofficeController.uploadInvoicePdf] Failed to delete previous PDF:', deleteError.message)
        }
      }

      const updatedInvoice = await BackofficeRepository.getInvoiceById(Number(id))
      console.log('[BackofficeController.uploadInvoicePdf] Updated invoice:', {
        id: updatedInvoice?.id,
        original_pdf_url: updatedInvoice?.original_pdf_url,
        validated_pdf_url: updatedInvoice?.validated_pdf_url
      })

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_PDF_UPLOADED,
        code: SUCCESS_CODES.BACKOFFICE_PDF_UPLOADED,
        invoice: updatedInvoice,
      })
    } catch (error: any) {
      console.error('[BackofficeController.uploadInvoicePdf] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_UPLOAD_PDF_ERROR,
        code: ERROR_CODES.BACKOFFICE_UPLOAD_PDF_ERROR,
      })
    }
  }

  // ========================================
  // ASSETS (SELLOS Y FIRMAS)
  // ========================================

  /**
   * GET /api/backoffice/assets
   * Obtener todos los assets (sellos y firmas)
   */
  static async getAssets(req: Request, res: Response): Promise<void> {
    try {
      const type = req.query.type as 'stamp' | 'signature' | undefined

      const assets = await BackofficeRepository.getAllAssets(type)

      res.json({ success: true, assets })
    } catch (error: any) {
      console.error('[BackofficeController.getAssets] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_ASSETS_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_ASSETS_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/assets
   * Crear nuevo asset (sello o firma)
   */
  static async createAsset(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { type, name, is_default } = req.body

      if (!type || !['stamp', 'signature'].includes(type)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVALID_ASSET_TYPE,
          code: ERROR_CODES.BACKOFFICE_INVALID_ASSET_TYPE,
        })
        return
      }

      if (!name) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_NAME_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_NAME_REQUIRED,
        })
        return
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_NO_IMAGE_SENT,
          code: ERROR_CODES.BACKOFFICE_NO_IMAGE_SENT,
        })
        return
      }

      // Validar tipo de archivo
      const allowedTypes = ['image/png', 'image/webp']
      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVALID_IMAGE_TYPE,
          code: ERROR_CODES.BACKOFFICE_INVALID_IMAGE_TYPE,
        })
        return
      }

      // Subir a Cloudinary
      const cloudinaryResult = await CloudinaryService.uploadImage(
        req.file.buffer,
        req.file.originalname,
        `backoffice/assets/${type}s`
      )

      // Guardar en BD
      const id = await BackofficeRepository.createAsset({
        type,
        name,
        cloudinary_url: cloudinaryResult.secure_url,
        cloudinary_public_id: cloudinaryResult.public_id,
        is_default: is_default === 'true' || is_default === true,
        created_by: req.user.id,
      })

      const asset = await BackofficeRepository.getAssetById(id)

      res.status(201).json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_ASSET_CREATED,
        code: SUCCESS_CODES.BACKOFFICE_ASSET_CREATED,
        asset,
      })
    } catch (error: any) {
      console.error('[BackofficeController.createAsset] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_CREATE_ASSET_ERROR,
        code: ERROR_CODES.BACKOFFICE_CREATE_ASSET_ERROR,
      })
    }
  }

  /**
   * DELETE /api/backoffice/assets/:id
   * Eliminar asset
   */
  static async deleteAsset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      // Obtener asset para eliminar de Cloudinary
      const asset = await BackofficeRepository.getAssetById(Number(id))
      if (!asset) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_ASSET_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_ASSET_NOT_FOUND,
        })
        return
      }

      console.log('[BackofficeController.deleteAsset] Deleting asset:', {
        id: asset.id,
        name: asset.name,
        cloudinary_public_id: asset.cloudinary_public_id,
      })

      // Eliminar de Cloudinary primero (opción estricta: falla todo si Cloudinary falla)
      if (asset.cloudinary_public_id) {
        await CloudinaryService.deleteImage(asset.cloudinary_public_id)
        console.log('[BackofficeController.deleteAsset] Cloudinary image deleted successfully')
      }

      // Solo eliminar de BD si Cloudinary fue exitoso
      await BackofficeRepository.deleteAsset(Number(id))
      console.log('[BackofficeController.deleteAsset] Asset deleted from DB')

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_ASSET_DELETED,
        code: SUCCESS_CODES.BACKOFFICE_ASSET_DELETED,
      })
    } catch (error: any) {
      console.error('[BackofficeController.deleteAsset] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_DELETE_ASSET_ERROR,
        code: ERROR_CODES.BACKOFFICE_DELETE_ASSET_ERROR,
      })
    }
  }

  /**
   * PATCH /api/backoffice/assets/:id/default
   * Establecer asset como predeterminado
   */
  static async setDefaultAsset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      // Obtener el asset para saber su tipo
      const asset = await BackofficeRepository.getAssetById(Number(id))
      if (!asset) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_ASSET_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_ASSET_NOT_FOUND,
        })
        return
      }

      await BackofficeRepository.setDefaultAsset(Number(id), asset.type)

      res.json({
        success: true,
        message: SUCCESS_CODES.BACKOFFICE_ASSET_DEFAULT_SET,
        code: SUCCESS_CODES.BACKOFFICE_ASSET_DEFAULT_SET,
        asset: { ...asset, is_default: true },
      })
    } catch (error: any) {
      console.error('[BackofficeController.setDefaultAsset] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_SET_DEFAULT_ERROR,
        code: ERROR_CODES.BACKOFFICE_SET_DEFAULT_ERROR,
      })
    }
  }

  // ========================================
  // DESCARGA ZIP DE FACTURAS VALIDADAS
  // ========================================

  /**
   * POST /api/backoffice/invoices/download-zip
   * Descargar múltiples facturas validadas como ZIP
   * Body: { invoice_ids: number[] }
   * 
   * Rules:
   * - Max 100 invoices per ZIP
   * - All invoices must be validated or paid (status = 'validated' or 'paid')
   * - All invoices must have validated_pdf_url
   * - Filename format: {SupplierName}_{InvoiceNumber}_{InvoiceMonth}_validado.pdf
   */
  static async downloadValidatedInvoicesZip(req: Request, res: Response): Promise<void> {
    try {
      const { invoice_ids } = req.body

      // Validate input
      if (!invoice_ids || !Array.isArray(invoice_ids) || invoice_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_IDS_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_INVOICE_IDS_REQUIRED,
        })
        return
      }

      // Max 100 invoices
      if (invoice_ids.length > 100) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_MAX_INVOICES_EXCEEDED,
          code: ERROR_CODES.BACKOFFICE_MAX_INVOICES_EXCEEDED,
        })
        return
      }

      // Get invoices
      const invoices = await BackofficeRepository.getInvoicesByIds(invoice_ids)

      if (invoices.length === 0) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICES_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICES_NOT_FOUND,
        })
        return
      }

      // Check if all requested invoices were found
      const foundIds = new Set(invoices.map(inv => inv.id))
      const notFoundIds = invoice_ids.filter((id: number) => !foundIds.has(id))
      if (notFoundIds.length > 0) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICES_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICES_NOT_FOUND,
          not_found_ids: notFoundIds
        })
        return
      }

      // Check all invoices are validated or paid and have validated_pdf_url
      // Note: 'paid' invoices were previously validated, so they should also be allowed
      const invalidInvoices = invoices.filter(
        inv => (inv.status !== 'validated' && inv.status !== 'paid') || !inv.validated_pdf_url
      )

      if (invalidInvoices.length > 0) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_VALIDATED,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_VALIDATED,
          invalid_invoices: invalidInvoices.map(inv => ({
            id: inv.id,
            invoice_number: inv.invoice_number,
            status: inv.status,
            has_validated_pdf: !!inv.validated_pdf_url
          }))
        })
        return
      }

      console.log(`[BackofficeController.downloadValidatedInvoicesZip] Creating ZIP for ${invoices.length} invoices`)

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 5 } })

      // Set response headers
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="facturas_validadas_${timestamp}.zip"`)

      // Pipe archive to response
      archive.pipe(res)

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('[BackofficeController.downloadValidatedInvoicesZip] Archive error:', err)
        throw err
      })

      // Helper to sanitize filename
      const sanitizeFilename = (str: string): string => {
        return str.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_')
      }

      // Helper to get month name in Spanish
      const getSpanishMonth = (date: Date): string => {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return months[date.getMonth()]
      }

      // Download and add each PDF to the archive
      for (const invoice of invoices) {
        try {
          const pdfUrl = invoice.validated_pdf_url!
          console.log(`[BackofficeController.downloadValidatedInvoicesZip] Downloading: ${invoice.invoice_number}`)

          // Try to download the PDF
          let pdfBuffer: Buffer | null = null

          // Method 1: Direct URL
          try {
            const response = await axios.get(pdfUrl, {
              responseType: 'arraybuffer',
              timeout: 30000,
            })
            pdfBuffer = Buffer.from(response.data)
          } catch (err: any) {
            console.log(`[downloadValidatedInvoicesZip] Direct download failed for ${invoice.invoice_number}: ${err.message}`)
          }

          // Method 2: Signed URL
          if (!pdfBuffer) {
            try {
              const signedUrl = CloudinaryService.generateSignedUrlFromUrl(pdfUrl, 3600)
              const response = await axios.get(signedUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
              })
              pdfBuffer = Buffer.from(response.data)
            } catch (err: any) {
              console.log(`[downloadValidatedInvoicesZip] Signed URL failed for ${invoice.invoice_number}: ${err.message}`)
            }
          }

          if (!pdfBuffer) {
            console.error(`[downloadValidatedInvoicesZip] Failed to download PDF for invoice ${invoice.invoice_number}`)
            continue // Skip this invoice but continue with others
          }

          // Generate filename: {SupplierName}_{InvoiceNumber}_{InvoiceMonth}_validado.pdf
          const invoiceDate = new Date(invoice.invoice_date)
          const monthName = getSpanishMonth(invoiceDate)
          const supplierName = sanitizeFilename(invoice.supplier_name)
          const invoiceNumber = sanitizeFilename(invoice.invoice_number)
          const filename = `${supplierName}_${invoiceNumber}_${monthName}_validado.pdf`

          // Add to archive
          archive.append(pdfBuffer, { name: filename })
          console.log(`[downloadValidatedInvoicesZip] Added: ${filename}`)

        } catch (err: any) {
          console.error(`[downloadValidatedInvoicesZip] Error processing invoice ${invoice.id}:`, err.message)
          // Continue with other invoices
        }
      }

      // Finalize the archive
      await archive.finalize()
      console.log(`[BackofficeController.downloadValidatedInvoicesZip] ZIP created successfully`)

    } catch (error: any) {
      console.error('[BackofficeController.downloadValidatedInvoicesZip] Error:', error.message)
      // Only send error if headers haven't been sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_CREATE_ZIP_ERROR,
          code: ERROR_CODES.BACKOFFICE_CREATE_ZIP_ERROR,
        })
      }
    }
  }

  // ========================================
  // ESTADÍSTICAS
  // ========================================

  /**
   * GET /api/backoffice/invoices/:id/pdf-url
   * Obtener URL firmada para visualizar PDF
   */
  static async getInvoicePdfUrl(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { type } = req.query // 'original' o 'validated'

      if (!type || !['original', 'validated'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_PDF_TYPE_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_PDF_TYPE_REQUIRED,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      const pdfUrl = type === 'original' ? invoice.original_pdf_url : invoice.validated_pdf_url

      if (!pdfUrl) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      // Generar URL firmada válida por 1 hora
      const signedUrl = CloudinaryService.generateSignedUrlFromUrl(pdfUrl, 3600)

      res.json({
        success: true,
        url: signedUrl,
        expires_in: 3600,
      })
    } catch (error: any) {
      console.error('[BackofficeController.getInvoicePdfUrl] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_GET_PDF_URL_ERROR,
        code: ERROR_CODES.BACKOFFICE_GET_PDF_URL_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/invoices/:id/pdf-download
   * Descargar PDF (proxy para evitar CORS)
   */
  static async downloadInvoicePdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { type } = req.query // 'original' o 'validated'

      if (!type || !['original', 'validated'].includes(type as string)) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_PDF_TYPE_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_PDF_TYPE_REQUIRED,
        })
        return
      }

      const invoice = await BackofficeRepository.getInvoiceById(Number(id))
      if (!invoice) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      const pdfUrl = type === 'original' ? invoice.original_pdf_url : invoice.validated_pdf_url

      if (!pdfUrl) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
          code: ERROR_CODES.BACKOFFICE_INVOICE_NOT_FOUND,
        })
        return
      }

      console.log('[BackofficeController.downloadInvoicePdf] Downloading from:', pdfUrl)

      // Intentar múltiples métodos de descarga
      let pdfBuffer: Buffer | null = null
      let lastError: any = null

      // Método 1: URL directa (funciona para archivos públicos)
      try {
        console.log('[BackofficeController.downloadInvoicePdf] Trying direct URL...')
        const response = await axios.get(pdfUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        })
        pdfBuffer = Buffer.from(response.data)
        console.log('[BackofficeController.downloadInvoicePdf] Downloaded successfully from direct URL')
      } catch (err: any) {
        lastError = err
        console.log('[BackofficeController.downloadInvoicePdf] Direct URL failed:', err.message)
      }

      // Método 2: Si es una URL de Cloudinary image/upload, intentar añadir fl_attachment
      if (!pdfBuffer && pdfUrl.includes('/image/upload/')) {
        try {
          // Añadir fl_attachment para forzar descarga
          const attachmentUrl = pdfUrl.replace('/image/upload/', '/image/upload/fl_attachment/')
          console.log('[BackofficeController.downloadInvoicePdf] Trying attachment URL:', attachmentUrl)
          const response = await axios.get(attachmentUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
          })
          pdfBuffer = Buffer.from(response.data)
          console.log('[BackofficeController.downloadInvoicePdf] Downloaded successfully from attachment URL')
        } catch (err: any) {
          lastError = err
          console.log('[BackofficeController.downloadInvoicePdf] Attachment URL failed:', err.message)
        }
      }

      // Método 3: Intentar URL firmada
      if (!pdfBuffer) {
        try {
          const signedUrl = CloudinaryService.generateSignedUrlFromUrl(pdfUrl, 3600)
          console.log('[BackofficeController.downloadInvoicePdf] Trying signed URL:', signedUrl)
          const response = await axios.get(signedUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
          })
          pdfBuffer = Buffer.from(response.data)
          console.log('[BackofficeController.downloadInvoicePdf] Downloaded successfully from signed URL')
        } catch (err: any) {
          lastError = err
          console.log('[BackofficeController.downloadInvoicePdf] Signed URL failed:', err.message)
        }
      }

      // Método 4: Si tiene .pdf en la URL, intentar sin extensión o vice versa
      if (!pdfBuffer) {
        try {
          let altUrl = pdfUrl
          if (pdfUrl.endsWith('.pdf')) {
            altUrl = pdfUrl.replace('.pdf', '')
          } else {
            altUrl = pdfUrl + '.pdf'
          }
          console.log('[BackofficeController.downloadInvoicePdf] Trying alternate URL:', altUrl)
          const response = await axios.get(altUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
          })
          pdfBuffer = Buffer.from(response.data)
          console.log('[BackofficeController.downloadInvoicePdf] Downloaded successfully from alternate URL')
        } catch (err: any) {
          lastError = err
          console.log('[BackofficeController.downloadInvoicePdf] Alternate URL failed:', err.message)
        }
      }

      if (!pdfBuffer) {
        console.error('[BackofficeController.downloadInvoicePdf] All download methods failed')
        throw lastError || new Error('No se pudo descargar el PDF')
      }

      // Generar nombre de archivo descriptivo
      // Formato: factura_NUMERO_TIPO.pdf (ej: factura_FV202312001_original.pdf)
      const safeInvoiceNumber = invoice.invoice_number.replace(/[/\\?%*:|"<>]/g, '-')
      const filename = `factura_${safeInvoiceNumber}_${type}.pdf`
      
      // Enviar el PDF al cliente
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', pdfBuffer.length)
      res.send(pdfBuffer)
    } catch (error: any) {
      console.error('[BackofficeController.downloadInvoicePdf] Error:', error.message)
      if (error.response) {
        console.error('[BackofficeController.downloadInvoicePdf] Response status:', error.response.status)
      }
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_DOWNLOAD_PDF_ERROR,
        code: ERROR_CODES.BACKOFFICE_DOWNLOAD_PDF_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/stats
   * Obtener estadísticas generales del backoffice
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await BackofficeRepository.getSummaryStats()

      res.json({ success: true, ...stats })
    } catch (error: any) {
      console.error('[BackofficeController.getStats] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_STATS_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_STATS_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/stats/monthly
   * Obtener resumen mensual
   */
  static async getMonthlySummary(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined

      const summary = await BackofficeRepository.getMonthlySummary(year)

      res.json({ success: true, summary })
    } catch (error: any) {
      console.error('[BackofficeController.getMonthlySummary] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_FETCH_MONTHLY_SUMMARY_ERROR,
        code: ERROR_CODES.BACKOFFICE_FETCH_MONTHLY_SUMMARY_ERROR,
      })
    }
  }

  // ========================================
  // BATCH PAYMENT
  // ========================================

  /**
   * GET /api/backoffice/invoices/batch-pay/preview
   * Preview batch payment - shows how many invoices would be marked as paid
   * Query params: year, month (optional, defaults to previous month)
   */
  static async previewBatchPayment(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined
      const month = req.query.month ? Number(req.query.month) : undefined

      // Import CronService dynamically to avoid circular dependency
      const { CronService } = await import('../../services/cron/cron-service.js')
      const preview = await CronService.previewBatchPayment(year, month)

      res.json({
        success: true,
        ...preview,
      })
    } catch (error: any) {
      console.error('[BackofficeController.previewBatchPayment] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_BATCH_PAYMENT_PREVIEW_ERROR,
        code: ERROR_CODES.BACKOFFICE_BATCH_PAYMENT_PREVIEW_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/batch-pay
   * Execute batch payment - marks all validated invoices of target month as paid
   * Body: { year?: number, month?: number } (optional, defaults to previous month)
   */
  static async executeBatchPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { year, month } = req.body

      // Import CronService dynamically to avoid circular dependency
      const { CronService } = await import('../../services/cron/cron-service.js')
      
      console.log(`[BackofficeController.executeBatchPayment] User ${req.user.id} executing batch payment for ${month || 'prev'}/${year || 'prev'}`)
      
      const result = await CronService.runBatchPaymentNow(year, month, req.user.id)

      if (result.success) {
        res.json({
          success: true,
          ...result,
        })
      } else {
        res.status(500).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_BATCH_PAYMENT_ERROR,
          code: ERROR_CODES.BACKOFFICE_BATCH_PAYMENT_ERROR,
        })
      }
    } catch (error: any) {
      console.error('[BackofficeController.executeBatchPayment] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_BATCH_PAYMENT_ERROR,
        code: ERROR_CODES.BACKOFFICE_BATCH_PAYMENT_ERROR,
      })
    }
  }

  /**
   * GET /api/backoffice/invoices/batch-pay/revert/preview
   * Preview revert batch payment - shows how many invoices would be reverted to validated
   * Query params: year, month (required)
   */
  static async previewRevertBatchPayment(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? Number(req.query.year) : undefined
      const month = req.query.month ? Number(req.query.month) : undefined

      if (!year || !month) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_YEAR_MONTH_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_YEAR_MONTH_REQUIRED,
        })
        return
      }

      if (month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVALID_MONTH,
          code: ERROR_CODES.BACKOFFICE_INVALID_MONTH,
        })
        return
      }

      const preview = await BackofficeRepository.getPaidInvoicesCountByMonth(year, month)

      res.json({
        success: true,
        year,
        month,
        count: preview.count,
        total_amount: preview.total_amount,
      })
    } catch (error: any) {
      console.error('[BackofficeController.previewRevertBatchPayment] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_REVERT_BATCH_PREVIEW_ERROR,
        code: ERROR_CODES.BACKOFFICE_REVERT_BATCH_PREVIEW_ERROR,
      })
    }
  }

  /**
   * POST /api/backoffice/invoices/batch-pay/revert
   * Revert batch payment - reverts all paid invoices of target month back to validated
   * Body: { year: number, month: number } (required)
   */
  static async revertBatchPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      const { year, month } = req.body

      if (!year || !month) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_YEAR_MONTH_REQUIRED,
          code: ERROR_CODES.BACKOFFICE_YEAR_MONTH_REQUIRED,
        })
        return
      }

      if (month < 1 || month > 12) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.BACKOFFICE_INVALID_MONTH,
          code: ERROR_CODES.BACKOFFICE_INVALID_MONTH,
        })
        return
      }

      console.log(`[BackofficeController.revertBatchPayment] User ${req.user.id} reverting batch payment for ${month}/${year}`)

      const startTime = Date.now()
      const result = await BackofficeRepository.revertPaidInvoicesToValidated(year, month, req.user.id)
      const duration = Date.now() - startTime

      res.json({
        success: true,
        count: result.count,
        invoiceIds: result.invoiceIds,
        year,
        month,
        duration,
      })
    } catch (error: any) {
      console.error('[BackofficeController.revertBatchPayment] Error:', error.message)
      res.status(500).json({
        success: false,
        error: ERROR_CODES.BACKOFFICE_REVERT_BATCH_ERROR,
        code: ERROR_CODES.BACKOFFICE_REVERT_BATCH_ERROR,
      })
    }
  }
}
