// app/components/bo/modals/PdfUploadModal.tsx
/**
 * Modal para subir PDFs a facturas
 * Permite subir PDF original o validado
 */

'use client'

import { useState, useCallback, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FiUpload, FiFile, FiTrash2 } from 'react-icons/fi'
import { Modal, Button } from '@/app/ui/components'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import toast from 'react-hot-toast'

interface PdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceId: number
  invoiceNumber: string
  type: 'original' | 'validated'
  existingPdfUrl?: string | null
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function PdfUploadModal({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  invoiceNumber,
  type,
  existingPdfUrl,
}: PdfUploadModalProps) {
  const t = useTranslations('backoffice')
  const [isPending, startTransition] = useTransition()
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal closes
  const handleClose = () => {
    setFile(null)
    setError(null)
    setDragActive(false)
    onClose()
  }

  // Handle file selection
  const handleFileChange = useCallback(
    (selectedFile: File | null) => {
      setError(null)

      if (!selectedFile) {
        setFile(null)
        return
      }

      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setError(t('modals.pdfUpload.errors.onlyPdf'))
        return
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(t('modals.pdfUpload.errors.maxSize'))
        return
      }

      setFile(selectedFile)
    },
    [t]
  )

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileChange(e.dataTransfer.files[0])
      }
    },
    [handleFileChange]
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0])
    }
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError(t('modals.pdfUpload.errors.selectFile'))
      return
    }

    startTransition(async () => {
      try {
        await backofficeApi.uploadInvoicePdf(invoiceId, file, type)
        toast.success(
          type === 'original' ? t('toast.pdfOriginalUploaded') : t('toast.pdfValidatedUploaded')
        )
        onSuccess()
        handleClose()
      } catch (error) {
        const message = error instanceof Error ? error.message : t('toast.pdfUploadError')
        toast.error(message)
      }
    })
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        type === 'original'
          ? t('modals.pdfUpload.originalTitle')
          : t('modals.pdfUpload.validatedTitle')
      }
      size="sm"
      static={isPending}
      footer={
        <>
          <Button type="button" variant="default" onClick={handleClose} disabled={isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            form="pdf-upload-form"
            variant="accent"
            loading={isPending}
            disabled={!file}
          >
            <FiUpload className="w-4 h-4" />
            {t('modals.pdfUpload.buttons.upload')}
          </Button>
        </>
      }
    >
      <form id="pdf-upload-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-fg-subtle -mt-1">
          {t('modals.pdfUpload.invoice')} {invoiceNumber}
        </p>

        {existingPdfUrl && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-fp text-xs text-warning">
            {type === 'original'
              ? t('modals.pdfUpload.existingWarning.original')
              : t('modals.pdfUpload.existingWarning.validated')}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-fp-md p-8 text-center transition-colors ${
            dragActive
              ? 'border-accent bg-accent/5'
              : file
                ? 'border-success bg-success/5'
                : 'border-border hover:border-border-strong'
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {file ? (
            <div className="space-y-2">
              <FiFile className="w-10 h-10 mx-auto text-success" />
              <div>
                <p className="text-sm font-medium text-fg truncate max-w-[200px] mx-auto">
                  {file.name}
                </p>
                <p className="text-xs text-fg-subtle">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                }}
                className="inline-flex items-center gap-1 text-xs text-danger hover:opacity-80"
              >
                <FiTrash2 className="w-3 h-3" />
                {t('modals.pdfUpload.buttons.remove')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <FiUpload className="w-10 h-10 mx-auto text-fg-subtle" />
              <div>
                <p className="text-sm font-medium text-fg">{t('modals.pdfUpload.dropzone.drag')}</p>
                <p className="text-xs text-fg-subtle">{t('modals.pdfUpload.dropzone.click')}</p>
              </div>
              <p className="text-xs text-fg-subtle">{t('modals.pdfUpload.dropzone.maxSize')}</p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger text-center">{error}</p>}
      </form>
    </Modal>
  )
}
