// app/components/bo/tabs/PaidInvoicesTab.tsx
/**
 * Client Component - Paid Invoices Tab
 *
 * Read-only view with export capabilities.
 * Receives initial data from server.
 */

'use client'

import { useState } from 'react'
import { FiSearch, FiDownload, FiFileText, FiCalendar, FiRotateCcw } from 'react-icons/fi'
import type { InvoiceWithDetails, Category } from '@/app/lib/backoffice/types'
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@/app/lib/backoffice/types'
import { PdfViewerModal } from '@/app/components/bo/modals'
import { backofficeApi } from '@/app/lib/backoffice'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface PaidInvoicesTabProps {
  initialInvoices: InvoiceWithDetails[]
  categories: Category[]
  pagination: { page: number; total: number; totalPages: number }
}

export function PaidInvoicesTab({
  initialInvoices,
  categories,
  pagination,
}: PaidInvoicesTabProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'transfer' | 'direct_debit'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'month' | 'quarter' | 'year'>('month')

  // Modal states
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [viewingPdfInvoice, setViewingPdfInvoice] = useState<InvoiceWithDetails | null>(null)

  // Revert batch payment states
  const [revertDialogOpen, setRevertDialogOpen] = useState(false)
  const [revertPreview, setRevertPreview] = useState<{
    year: number
    month: number
    count: number
    total_amount: number
  } | null>(null)
  const [isReverting, setIsReverting] = useState(false)
  const [selectedMonthYear, setSelectedMonthYear] = useState<{ year: number; month: number } | null>(null)

  // Client-side filtering
  // Use initialInvoices directly - it gets updated on router.refresh()
  const filteredInvoices = initialInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || invoice.category_id === categoryFilter
    const matchesPaymentMethod =
      paymentMethodFilter === 'all' || invoice.payment_method === paymentMethodFilter

    // Date filtering
    if (dateFilter !== 'all' && invoice.paid_date) {
      const paidDate = new Date(invoice.paid_date)
      const now = new Date()

      if (dateFilter === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        if (paidDate < monthAgo) return false
      } else if (dateFilter === 'quarter') {
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        if (paidDate < quarterAgo) return false
      } else if (dateFilter === 'year') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        if (paidDate < yearAgo) return false
      }
    }

    return matchesSearch && matchesCategory && matchesPaymentMethod
  })

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Handle PDF viewer
  const handleOpenPdfViewer = (invoice: InvoiceWithDetails) => {
    const hasValidated = !!invoice.validated_pdf_url
    const hasOriginal = !!invoice.original_pdf_url
    
    if (!hasValidated && !hasOriginal) {
      toast.error('Esta factura no tiene PDF adjunto')
      return
    }
    
    setViewingPdfInvoice(invoice)
    setPdfViewerOpen(true)
  }

  // Handle revert batch payment
  const handleOpenRevertDialog = async () => {
    // Get available months from paid invoices
    const months = getAvailableMonths()
    if (months.length === 0) {
      toast.error('No hay facturas pagadas para revertir')
      return
    }
    
    // Default to most recent month
    const latestMonth = months[0]
    setSelectedMonthYear(latestMonth)
    
    try {
      const preview = await backofficeApi.previewRevertBatchPayment(latestMonth.year, latestMonth.month)
      setRevertPreview(preview)
      setRevertDialogOpen(true)
    } catch (error: any) {
      console.error('[handleOpenRevertDialog] Error:', error)
      toast.error(error.message || 'Error al obtener preview')
    }
  }

  // Handle month selection change in revert dialog
  const handleRevertMonthChange = async (year: number, month: number) => {
    setSelectedMonthYear({ year, month })
    try {
      const preview = await backofficeApi.previewRevertBatchPayment(year, month)
      setRevertPreview(preview)
    } catch (error: any) {
      console.error('[handleRevertMonthChange] Error:', error)
      toast.error(error.message || 'Error al obtener preview')
    }
  }

  // Execute revert batch payment
  const handleExecuteRevert = async () => {
    if (!revertPreview) return
    
    setIsReverting(true)
    try {
      const result = await backofficeApi.revertBatchPayment(
        revertPreview.year,
        revertPreview.month
      )
      
      toast.success(result.message)
      setRevertDialogOpen(false)
      setRevertPreview(null)
      setSelectedMonthYear(null)
      router.refresh()
    } catch (error: any) {
      console.error('[handleExecuteRevert] Error:', error)
      toast.error(error.message || 'Error al revertir')
    } finally {
      setIsReverting(false)
    }
  }

  // Get available months from paid invoices
  const getAvailableMonths = (): { year: number; month: number; label: string }[] => {
    const monthsMap = new Map<string, { year: number; month: number; count: number }>()
    
    initialInvoices.forEach((invoice) => {
      if (invoice.invoice_date) {
        const date = new Date(invoice.invoice_date)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const key = `${year}-${month}`
        
        if (!monthsMap.has(key)) {
          monthsMap.set(key, { year, month, count: 0 })
        }
        monthsMap.get(key)!.count++
      }
    })
    
    const months = Array.from(monthsMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })
      .map((m) => ({
        year: m.year,
        month: m.month,
        label: `${getSpanishMonthName(m.month)} ${m.year} (${m.count})`,
      }))
    
    return months
  }

  // Get Spanish month name
  const getSpanishMonthName = (month: number): string => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return months[month - 1] || ''
  }

  // Export to CSV
  const handleExport = () => {
    if (filteredInvoices.length === 0) {
      toast.error('No hay facturas para exportar')
      return
    }

    // Create CSV content
    const headers = [
      'Proveedor',
      'Nº Factura',
      'Fecha Factura',
      'Fecha Pago',
      'Importe sin IVA',
      'Importe con IVA',
      '% IVA',
      'Método de Pago',
      'Centro de Coste',
      'Departamento',
    ]

    const rows = filteredInvoices.map((invoice) => [
      invoice.supplier_name,
      invoice.invoice_number,
      invoice.invoice_date,
      invoice.paid_date || '',
      invoice.amount_without_vat.toFixed(2),
      invoice.amount_with_vat.toFixed(2),
      invoice.vat_percentage.toString(),
      PAYMENT_METHOD_LABELS[invoice.payment_method],
      invoice.cost_center || '',
      invoice.department || '',
    ])

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n')

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `facturas_pagadas_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.success(`${filteredInvoices.length} facturas exportadas`)
  }

  // Calculate totals
  const totalPaid = filteredInvoices.reduce((sum, i) => sum + i.amount_with_vat, 0)
  const byDirectDebit = filteredInvoices
    .filter((i) => i.payment_method === 'direct_debit')
    .reduce((sum, i) => sum + i.amount_with_vat, 0)
  const byTransfer = filteredInvoices
    .filter((i) => i.payment_method === 'transfer')
    .reduce((sum, i) => sum + i.amount_with_vat, 0)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Total Pagado</p>
          <p className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400 mt-0.5">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Domiciliadas</p>
          <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {formatCurrency(byDirectDebit)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Transferencias</p>
          <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {formatCurrency(byTransfer)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por proveedor o nº factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Date Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="month">Último mes</option>
          <option value="quarter">Último trimestre</option>
          <option value="year">Último año</option>
          <option value="all">Todo el histórico</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.cost_center} - {cat.department}
            </option>
          ))}
        </select>

        {/* Payment Method Filter */}
        <select
          value={paymentMethodFilter}
          onChange={(e) =>
            setPaymentMethodFilter(e.target.value as 'all' | 'transfer' | 'direct_debit')
          }
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todos los pagos</option>
          <option value="transfer">Transferencia</option>
          <option value="direct_debit">Domiciliación</option>
        </select>

        {/* Export */}
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FiDownload className="w-3.5 h-3.5" />
          Exportar
        </button>

        {/* Revert Batch Payment */}
        <button
          onClick={handleOpenRevertDialog}
          title="Revertir cierre de mes (devolver facturas a validadas)"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
        >
          <FiRotateCcw className="w-3.5 h-3.5" />
          Reabrir Mes
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nº Factura
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Factura
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Pago
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Importe
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No se encontraron facturas pagadas
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const hasPdf = invoice.original_pdf_url || invoice.validated_pdf_url
                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors"
                    >
                      <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-gray-100">
                        {invoice.supplier_name}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3 text-green-500" />
                          {formatDate(invoice.paid_date)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(invoice.amount_with_vat)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          {PAYMENT_METHOD_LABELS[invoice.payment_method]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-900 dark:text-gray-100">
                          {invoice.cost_center}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-500">
                          {invoice.department}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleOpenPdfViewer(invoice)}
                          disabled={!hasPdf}
                          title={hasPdf ? 'Ver PDF' : 'Sin PDF'}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                            hasPdf
                              ? 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          <FiFileText className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination info */}
        {pagination.total > 0 && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            Mostrando {filteredInvoices.length} de {pagination.total} facturas
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-2">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No se encontraron facturas pagadas
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const hasPdf = invoice.original_pdf_url || invoice.validated_pdf_url
            return (
              <div
                key={invoice.id}
                className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                      {invoice.supplier_name}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                      {invoice.invoice_number}
                    </p>
                  </div>
                  <span className="font-bold text-xs text-green-600 dark:text-green-400">
                    {formatCurrency(invoice.amount_with_vat)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-500">Fecha factura:</span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.invoice_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-500">Fecha pago:</span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.paid_date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">
                    {invoice.cost_center}
                  </span>
                  <button
                    onClick={() => handleOpenPdfViewer(invoice)}
                    disabled={!hasPdf}
                    className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
                      hasPdf
                        ? 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <FiFileText className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* PDF Viewer Modal */}
      {viewingPdfInvoice && (
        <PdfViewerModal
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false)
            setViewingPdfInvoice(null)
          }}
          invoiceId={viewingPdfInvoice.id}
          invoiceNumber={viewingPdfInvoice.invoice_number}
          hasOriginalPdf={!!viewingPdfInvoice.original_pdf_url}
          hasValidatedPdf={!!viewingPdfInvoice.validated_pdf_url}
          invoiceStatus={viewingPdfInvoice.status}
        />
      )}

      {/* Revert Batch Payment Dialog */}
      {revertDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              if (!isReverting) {
                setRevertDialogOpen(false)
                setRevertPreview(null)
                setSelectedMonthYear(null)
              }
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white dark:bg-[#151b23] rounded-lg shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Reabrir Mes - Revertir Cierre
                </h3>
                
                {/* Month selector */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Seleccionar mes a revertir
                  </label>
                  <select
                    value={selectedMonthYear ? `${selectedMonthYear.year}-${selectedMonthYear.month}` : ''}
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-').map(Number)
                      handleRevertMonthChange(year, month)
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-[#0d1117] dark:text-gray-200"
                  >
                    {getAvailableMonths().map((m) => (
                      <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {revertPreview && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4 mb-4">
                    <p className="text-sm text-orange-800 dark:text-orange-300 mb-2">
                      <strong>Mes:</strong> {getSpanishMonthName(revertPreview.month)} {revertPreview.year}
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300 mb-2">
                      <strong>Facturas pagadas:</strong> {revertPreview.count}
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-300">
                      <strong>Importe total:</strong> {formatCurrency(revertPreview.total_amount)}
                    </p>
                  </div>
                )}

                {revertPreview && revertPreview.count === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      No hay facturas pagadas para este mes.
                    </p>
                  </div>
                ) : revertPreview && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Esta acción revertirá todas las facturas pagadas de {getSpanishMonthName(revertPreview.month)} a estado validado.
                      Podrás volver a cerrar el mes posteriormente.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRevertDialogOpen(false)
                      setRevertPreview(null)
                      setSelectedMonthYear(null)
                    }}
                    disabled={isReverting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteRevert}
                    disabled={isReverting || !revertPreview || revertPreview.count === 0}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {isReverting ? 'Procesando...' : `Revertir ${revertPreview?.count || 0} Facturas`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
