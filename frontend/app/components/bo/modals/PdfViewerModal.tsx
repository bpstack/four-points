// app/components/bo/modals/PdfViewerModal.tsx
/**
 * Modal para visualizar PDFs de facturas
 * - Vista previa embebida del PDF
 * - Tabs para cambiar entre PDF original y validado
 * - Opciones de descargar y abrir en nueva pestaña
 * - Obtiene datos frescos del servidor al abrir (no depende de props que pueden estar desactualizados)
 */

'use client'

import { useEffect, useState } from 'react'
import {
  FiX,
  FiExternalLink,
  FiDownload,
  FiLoader,
  FiAlertCircle,
  FiFileText,
  FiCheck,
} from 'react-icons/fi'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import toast from 'react-hot-toast'

interface PdfViewerModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: number
  invoiceNumber: string
  // These props are used as initial hints, but we fetch fresh data from server
  hasOriginalPdf: boolean
  hasValidatedPdf: boolean
  invoiceStatus: 'pending' | 'validated' | 'rejected' | 'paid'
}

export function PdfViewerModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  hasOriginalPdf: initialHasOriginal,
  hasValidatedPdf: initialHasValidated,
  invoiceStatus: initialStatus,
}: PdfViewerModalProps) {
  // Fresh data from server (overrides initial props)
  const [hasOriginalPdf, setHasOriginalPdf] = useState(initialHasOriginal)
  const [hasValidatedPdf, setHasValidatedPdf] = useState(initialHasValidated)
  const [invoiceStatus, setInvoiceStatus] = useState(initialStatus)
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  
  const [activePdfType, setActivePdfType] = useState<'original' | 'validated'>('original')
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  // Fetch fresh invoice data when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Cleanup blob URL when modal closes
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }
      return
    }

    const fetchInvoiceData = async () => {
      setLoadingInvoice(true)
      setError(null)
      
      try {
        // Get fresh invoice data from server
        const { invoice } = await backofficeApi.getInvoiceById(invoiceId)
        
        console.log('[PdfViewerModal] Fresh invoice data:', {
          id: invoice.id,
          original_pdf_url: invoice.original_pdf_url,
          validated_pdf_url: invoice.validated_pdf_url,
          status: invoice.status
        })
        
        const freshHasOriginal = !!invoice.original_pdf_url
        const freshHasValidated = !!invoice.validated_pdf_url
        const freshStatus = invoice.status
        
        setHasOriginalPdf(freshHasOriginal)
        setHasValidatedPdf(freshHasValidated)
        setInvoiceStatus(freshStatus)
        
        // Determine initial PDF type based on fresh data
        let initialType: 'original' | 'validated' = 'original'
        if ((freshStatus === 'validated' || freshStatus === 'paid') && freshHasValidated) {
          initialType = 'validated'
        } else if (freshHasOriginal) {
          initialType = 'original'
        } else if (freshHasValidated) {
          initialType = 'validated'
        }
        
        setActivePdfType(initialType)
      } catch (err: any) {
        console.error('[PdfViewerModal] Error fetching invoice:', err)
        // Fall back to initial props if fetch fails
        setHasOriginalPdf(initialHasOriginal)
        setHasValidatedPdf(initialHasValidated)
        setInvoiceStatus(initialStatus)
        
        // Set initial type based on props
        if ((initialStatus === 'validated' || initialStatus === 'paid') && initialHasValidated) {
          setActivePdfType('validated')
        } else if (initialHasOriginal) {
          setActivePdfType('original')
        } else {
          setActivePdfType('validated')
        }
      } finally {
        setLoadingInvoice(false)
      }
    }

    fetchInvoiceData()
  }, [isOpen, invoiceId, initialHasOriginal, initialHasValidated, initialStatus])

  // Fetch PDF when activePdfType changes (after invoice data is loaded)
  useEffect(() => {
    if (!isOpen || loadingInvoice) return

    // Check if we have the selected PDF type
    const hasPdf = activePdfType === 'original' ? hasOriginalPdf : hasValidatedPdf
    if (!hasPdf) {
      setError(`No hay PDF ${activePdfType === 'original' ? 'original' : 'validado'} disponible`)
      setPdfBlobUrl(null)
      return
    }

    const fetchPdf = async () => {
      setLoading(true)
      setError(null)

      // Cleanup previous blob URL
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
        setPdfBlobUrl(null)
      }

      try {
        // Use the backend proxy endpoint to get the PDF
        const blob = await backofficeApi.getBlob(
          backofficeApi.getInvoicePdfDownloadUrl(invoiceId, activePdfType)
        )
        const url = URL.createObjectURL(blob)
        setPdfBlobUrl(url)
      } catch (err: any) {
        console.error('Error fetching PDF:', err)
        setError(err.message || 'Error al obtener el PDF')
      } finally {
        setLoading(false)
      }
    }

    fetchPdf()

    // Cleanup on unmount
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl)
      }
    }
  }, [isOpen, invoiceId, activePdfType, hasOriginalPdf, hasValidatedPdf, loadingInvoice])

  if (!isOpen) return null

  // Handle open in new tab
  const handleOpenInNewTab = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank')
    }
  }

  // Handle download
  const handleDownload = async () => {
    if (!pdfBlobUrl) return

    setDownloading(true)
    try {
      const link = document.createElement('a')
      link.href = pdfBlobUrl
      const suffix = activePdfType === 'validated' ? '_validado' : ''
      link.download = `${invoiceNumber.replace(/[/\\?%*:|"<>]/g, '-')}${suffix}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('PDF descargado')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Error al descargar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  // Check which tabs should be shown
  const showTabs = hasOriginalPdf && hasValidatedPdf
  const isLoadingInitial = loadingInvoice

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Full screen on mobile, large on desktop */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-[#151b23] rounded-lg shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiFileText className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {invoiceNumber}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activePdfType === 'validated' ? 'PDF Validado' : 'PDF Original'}
                  {invoiceStatus === 'validated' && activePdfType === 'validated' && (
                    <span className="inline-flex items-center gap-1 ml-2 text-green-600 dark:text-green-400">
                      <FiCheck className="w-3 h-3" />
                      Validado
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Action buttons */}
              {pdfBlobUrl && (
                <>
                  <button
                    onClick={handleOpenInNewTab}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Abrir en nueva pestaña"
                  >
                    <FiExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Nueva pestaña</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                    title="Descargar PDF"
                  >
                    {downloading ? (
                      <FiLoader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FiDownload className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden md:inline">Descargar</span>
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                title="Cerrar"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs (if both PDFs exist) - only show after loading invoice data */}
          {!isLoadingInitial && showTabs && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 flex-shrink-0">
              <button
                onClick={() => setActivePdfType('original')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activePdfType === 'original'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setActivePdfType('validated')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activePdfType === 'validated'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FiCheck className="w-3.5 h-3.5" />
                Validado
              </button>
            </div>
          )}

          {/* Content - PDF Viewer */}
          <div className="flex-1 min-h-0 p-2 sm:p-4 bg-gray-100 dark:bg-gray-900">
            {isLoadingInitial ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <FiLoader className="w-12 h-12 animate-spin mb-4" />
                <p className="text-sm">Cargando datos de factura...</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <FiLoader className="w-12 h-12 animate-spin mb-4" />
                <p className="text-sm">Cargando PDF...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500">
                <FiAlertCircle className="w-12 h-12 mb-4" />
                <p className="font-medium">Error al cargar el PDF</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{error}</p>
                <button
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                    backofficeApi
                      .getBlob(backofficeApi.getInvoicePdfDownloadUrl(invoiceId, activePdfType))
                      .then((blob) => {
                        const url = URL.createObjectURL(blob)
                        setPdfBlobUrl(url)
                      })
                      .catch((err) => setError(err.message || 'Error al obtener el PDF'))
                      .finally(() => setLoading(false))
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Reintentar
                </button>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white"
                title={`PDF - ${invoiceNumber}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <FiFileText className="w-12 h-12 mb-4" />
                <p className="text-sm">No hay PDF disponible</p>
              </div>
            )}
          </div>

          {/* Mobile action buttons */}
          {pdfBlobUrl && (
            <div className="sm:hidden flex gap-2 p-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={handleOpenInNewTab}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
                Nueva pestaña
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiDownload className="w-4 h-4" />
                )}
                Descargar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
