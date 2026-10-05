// backend/routes/backoffice/backoffice-routes.ts
/**
 * Rutas para el módulo Back Office
 * Gestión de proveedores, facturas, categorías y assets
 *
 * Permisos:
 * - admin: CRUD completo
 * - demo-admin: solo lectura (GET)
 */

import { Router } from 'express'
import multer from 'multer'
import { BackofficeController } from '../../controllers/backoffice/backoffice-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { canAccessBackoffice, isRealAdmin } from '../../middlewares/roleCheck.js'
import { denyDemo } from '../../middlewares/demoRestriction.js'

const router = Router()

// Configurar multer para uploads en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para PDFs
  },
})

// Aplicar autenticación y verificación de acceso a backoffice
router.use(authenticateToken)
router.use(canAccessBackoffice)

// ========================================
// RUTAS DE ESTADÍSTICAS (solo lectura)
// ========================================

/**
 * @route   GET /api/backoffice/stats
 * @desc    Obtener estadísticas generales
 * @access  Private (admin, demo-admin)
 */
router.get('/stats', BackofficeController.getStats)

/**
 * @route   GET /api/backoffice/stats/monthly
 * @desc    Obtener resumen mensual
 * @access  Private (admin, demo-admin)
 * @query   year (opcional)
 */
router.get('/stats/monthly', BackofficeController.getMonthlySummary)

// ========================================
// RUTAS DE CATEGORÍAS
// ========================================

/**
 * @route   GET /api/backoffice/categories
 * @desc    Obtener todas las categorías
 * @access  Private (admin, demo-admin)
 */
router.get('/categories', BackofficeController.getCategories)

/**
 * @route   GET /api/backoffice/categories/:id
 * @desc    Obtener categoría por ID
 * @access  Private (admin, demo-admin)
 */
router.get('/categories/:id', BackofficeController.getCategoryById)

/**
 * @route   POST /api/backoffice/categories
 * @desc    Crear nueva categoría
 * @access  Private (admin only)
 */
// Categories are a catalog the daily reset keeps: the demo account cannot add them
router.post('/categories', isRealAdmin, denyDemo, BackofficeController.createCategory)

// ========================================
// RUTAS DE PROVEEDORES
// ========================================

/**
 * @route   GET /api/backoffice/suppliers
 * @desc    Obtener todos los proveedores con filtros
 * @access  Private (admin, demo-admin)
 * @query   category_id, periodicity, payment_method, is_active, search
 */
router.get('/suppliers', BackofficeController.getSuppliers)

/**
 * @route   GET /api/backoffice/suppliers/:id
 * @desc    Obtener proveedor por ID con estadísticas y facturas
 * @access  Private (admin, demo-admin)
 */
router.get('/suppliers/:id', BackofficeController.getSupplierById)

/**
 * @route   POST /api/backoffice/suppliers
 * @desc    Crear nuevo proveedor
 * @access  Private (admin only)
 */
router.post('/suppliers', isRealAdmin, BackofficeController.createSupplier)

/**
 * @route   PATCH /api/backoffice/suppliers/:id
 * @desc    Actualizar proveedor
 * @access  Private (admin only)
 */
router.patch('/suppliers/:id', isRealAdmin, BackofficeController.updateSupplier)

/**
 * @route   DELETE /api/backoffice/suppliers/:id
 * @desc    Eliminar proveedor permanentemente (solo si no tiene facturas)
 * @access  Private (admin only)
 */
router.delete('/suppliers/:id', isRealAdmin, BackofficeController.deleteSupplier)

/**
 * @route   POST /api/backoffice/suppliers/:id/inactivate
 * @desc    Marcar proveedor como inactivo (preserva histórico)
 * @access  Private (admin only)
 */
router.post('/suppliers/:id/inactivate', isRealAdmin, BackofficeController.inactivateSupplier)

/**
 * @route   POST /api/backoffice/suppliers/:id/activate
 * @desc    Reactivar proveedor inactivo
 * @access  Private (admin only)
 */
router.post('/suppliers/:id/activate', isRealAdmin, BackofficeController.activateSupplier)

// ========================================
// RUTAS DE FACTURAS
// ========================================

/**
 * @route   GET /api/backoffice/invoices
 * @desc    Obtener todas las facturas con filtros y paginación
 * @access  Private (admin, demo-admin)
 * @query   status, supplier_id, category_id, payment_method, date_from, date_to, search, include_deleted, page, limit
 */
router.get('/invoices', BackofficeController.getInvoices)

/**
 * @route   POST /api/backoffice/invoices/download-zip
 * @desc    Descargar múltiples facturas validadas como ZIP
 * @access  Private (admin, demo-admin)
 * @body    invoice_ids: number[] (max 100)
 */
router.post('/invoices/download-zip', BackofficeController.downloadValidatedInvoicesZip)

/**
 * @route   GET /api/backoffice/invoices/batch-pay/preview
 * @desc    Preview batch payment - muestra cuántas facturas se marcarían como pagadas
 * @access  Private (admin, demo-admin)
 * @query   year, month (opcional, default: mes anterior)
 */
router.get('/invoices/batch-pay/preview', BackofficeController.previewBatchPayment)

/**
 * @route   POST /api/backoffice/invoices/batch-pay
 * @desc    Ejecutar batch payment - marca todas las facturas validated del mes como paid
 * @access  Private (admin only)
 * @body    { year?: number, month?: number } (opcional, default: mes anterior)
 */
router.post('/invoices/batch-pay', isRealAdmin, BackofficeController.executeBatchPayment)

/**
 * @route   GET /api/backoffice/invoices/batch-pay/revert/preview
 * @desc    Preview revert batch payment - muestra cuántas facturas se revertirían a validated
 * @access  Private (admin, demo-admin)
 * @query   year, month (requeridos)
 */
router.get('/invoices/batch-pay/revert/preview', BackofficeController.previewRevertBatchPayment)

/**
 * @route   POST /api/backoffice/invoices/batch-pay/revert
 * @desc    Revertir batch payment - revierte todas las facturas paid del mes a validated
 * @access  Private (admin only)
 * @body    { year: number, month: number } (requeridos)
 */
router.post('/invoices/batch-pay/revert', isRealAdmin, BackofficeController.revertBatchPayment)

/**
 * @route   GET /api/backoffice/invoices/:id
 * @desc    Obtener factura por ID con historial
 * @access  Private (admin, demo-admin)
 */
router.get('/invoices/:id', BackofficeController.getInvoiceById)

/**
 * @route   GET /api/backoffice/invoices/:id/history
 * @desc    Obtener historial de una factura
 * @access  Private (admin, demo-admin)
 */
router.get('/invoices/:id/history', BackofficeController.getInvoiceHistory)

/**
 * @route   POST /api/backoffice/invoices
 * @desc    Crear nueva factura
 * @access  Private (admin only)
 * @body    invoice_number, supplier_id, amount_without_vat, amount_with_vat, invoice_date, payment_method, etc.
 */
router.post('/invoices', isRealAdmin, BackofficeController.createInvoice)

/**
 * @route   PATCH /api/backoffice/invoices/:id
 * @desc    Actualizar factura
 * @access  Private (admin only)
 */
router.patch('/invoices/:id', isRealAdmin, BackofficeController.updateInvoice)

/**
 * @route   POST /api/backoffice/invoices/:id/validate
 * @desc    Validar factura (aprobar con sello/firma)
 * @access  Private (admin only)
 * @body    validated_pdf_url, validated_pdf_public_id, validation_notes (opcional)
 */
router.post('/invoices/:id/validate', isRealAdmin, BackofficeController.validateInvoice)

/**
 * @route   POST /api/backoffice/invoices/:id/reject
 * @desc    Rechazar factura
 * @access  Private (admin only)
 * @body    notes (requerido)
 */
router.post('/invoices/:id/reject', isRealAdmin, BackofficeController.rejectInvoice)

/**
 * @route   POST /api/backoffice/invoices/:id/unvalidate
 * @desc    Revertir validación de factura (validated -> pending)
 * @access  Private (admin only)
 * @body    notes (opcional)
 */
router.post('/invoices/:id/unvalidate', isRealAdmin, BackofficeController.unvalidateInvoice)

/**
 * @route   POST /api/backoffice/invoices/:id/pay
 * @desc    Marcar factura como pagada
 * @access  Private (admin only)
 * @body    paid_date (requerido)
 */
router.post('/invoices/:id/pay', isRealAdmin, BackofficeController.markAsPaid)

/**
 * @route   POST /api/backoffice/invoices/:id/unpay
 * @desc    Revertir el pago de una factura (paid -> validated)
 * @access  Private (admin only)
 */
router.post('/invoices/:id/unpay', isRealAdmin, BackofficeController.revertPayment)

/**
 * @route   DELETE /api/backoffice/invoices/:id
 * @desc    Eliminar factura (hard delete - eliminación permanente)
 * @access  Private (admin only)
 */
router.delete('/invoices/:id', isRealAdmin, BackofficeController.deleteInvoice)

/**
 * @route   POST /api/backoffice/invoices/:id/pdf
 * @desc    Subir PDF de factura
 * @access  Private (admin only)
 * @query   type (original/validated)
 * @file    pdf (multipart/form-data)
 */
router.post(
  '/invoices/:id/pdf',
  isRealAdmin,
  upload.single('pdf'),
  BackofficeController.uploadInvoicePdf
)

/**
 * @route   GET /api/backoffice/invoices/:id/pdf-download
 * @desc    PDF de la factura. Los ficheros son privados en Cloudinary: la API
 *          los descarga y los sirve; su URL firmada no sale nunca del servidor
 * @access  Private (admin, demo-admin)
 * @query   type (original/validated)
 */
router.get('/invoices/:id/pdf-download', BackofficeController.downloadInvoicePdf)

// ========================================
// RUTAS DE ASSETS (SELLOS Y FIRMAS)
// ========================================

/**
 * @route   GET /api/backoffice/assets
 * @desc    Obtener todos los assets
 * @access  Private (admin, demo-admin)
 * @query   type (stamp/signature) opcional
 */
router.get('/assets', BackofficeController.getAssets)

/**
 * @route   GET /api/backoffice/assets/:id/file
 * @desc    Imagen del sello o la firma (fichero privado servido por la API)
 * @access  Private (admin, demo-admin)
 */
router.get('/assets/:id/file', BackofficeController.getAssetFile)

/**
 * @route   POST /api/backoffice/assets
 * @desc    Crear nuevo asset (sello o firma)
 * @access  Private (admin only)
 * @body    type (stamp/signature), name, is_default (opcional)
 * @file    image (multipart/form-data) - PNG o WebP
 */
router.post('/assets', isRealAdmin, upload.single('image'), BackofficeController.createAsset)

/**
 * @route   DELETE /api/backoffice/assets/:id
 * @desc    Eliminar asset
 * @access  Private (admin only)
 */
router.delete('/assets/:id', isRealAdmin, BackofficeController.deleteAsset)

/**
 * @route   PATCH /api/backoffice/assets/:id/default
 * @desc    Establecer asset como predeterminado
 * @access  Private (admin only)
 */
router.patch('/assets/:id/default', isRealAdmin, BackofficeController.setDefaultAsset)

export default router
