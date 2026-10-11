// services/uploads/pdf-signature.ts

const PDF_MAGIC = Buffer.from('%PDF-')

/**
 * True when the bytes are a PDF. PDF readers accept the header anywhere in the
 * first 1024 bytes; the declared mimetype is whatever the client says.
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes(PDF_MAGIC)
}
