// controllers/backoffice/backoffice-files.ts
// Invoice PDFs, stamps and signatures are private files: the stored Cloudinary
// URL is signed and must not reach the browser (services/uploads/private-files.ts).
// Every invoice or asset the API returns goes through these, which put the
// API path that serves the file in the same field and drop the public ids.

import type { Asset, InvoiceWithDetails } from '../../models/backoffice/index.js'

type Present<T, K extends keyof T> = Omit<T, K> & { [P in K]: string | null }

export function invoicePdfPath(id: number, type: 'original' | 'validated'): string {
  return `/api/backoffice/invoices/${id}/pdf-download?type=${type}`
}

export function presentInvoice<T extends Pick<InvoiceWithDetails, 'id'>>(
  invoice: T
): Omit<T, 'original_pdf_public_id' | 'validated_pdf_public_id'> {
  const out = { ...invoice } as Record<string, unknown>
  if ('original_pdf_url' in out) {
    out.original_pdf_url = out.original_pdf_url ? invoicePdfPath(invoice.id, 'original') : null
  }
  if ('validated_pdf_url' in out) {
    out.validated_pdf_url = out.validated_pdf_url ? invoicePdfPath(invoice.id, 'validated') : null
  }
  delete out.original_pdf_public_id
  delete out.validated_pdf_public_id
  return out as Omit<T, 'original_pdf_public_id' | 'validated_pdf_public_id'>
}

export function presentInvoiceOrNull<T extends Pick<InvoiceWithDetails, 'id'>>(
  invoice: T | null
): ReturnType<typeof presentInvoice<T>> | null {
  return invoice ? presentInvoice(invoice) : null
}

export function presentAsset(
  asset: Asset
): Present<Omit<Asset, 'cloudinary_public_id'>, 'cloudinary_url'> {
  const { cloudinary_public_id: _publicId, ...rest } = asset
  return { ...rest, cloudinary_url: `/api/backoffice/assets/${asset.id}/file` }
}
