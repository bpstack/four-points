// services/parking/invoicePdfService.ts
// ALMACENAMIENTO DUAL - PDF Generation Service
// TODO: Descomentar y configurar cuando se implemente facturación

// import PDFDocument from 'pdfkit'
// import fs from 'fs'
// import path from 'path'
// import { getInvoiceData, updateInvoicePdf } from '../../repositories/parking/parking.repository.js'
// import { STORAGE } from '../../config/config.js'
// import AWS from 'aws-sdk'

// interface InvoiceData {
//   number: string
//   issued_at: Date
//   full_name: string
//   vehicle_type: string
//   licence_plate: string
//   check_in: Date
//   check_out: Date
//   method: string
//   amount: number
// }

// interface StorageConfig {
//   TYPE: 'local' | 's3'
//   LOCAL_PATH: string
//   BUCKET?: string
// }

// // ------------------------------------------------------------
// // AWS S3 solo se inicializa cuando STORAGE.TYPE === 's3'
// // ------------------------------------------------------------
// let s3: AWS.S3 | null = null
// if ((STORAGE as StorageConfig).TYPE === 's3') {
//   AWS.config.update({ region: process.env.AWS_REGION })
//   s3 = new AWS.S3()
// }

// /**
//  * 1. Obtiene los datos de la factura.
//  * 2. Genera PDF en memoria (Buffer).
//  * 3. Según STORAGE.TYPE → escribe a disco *o* sube a S3.
//  * 4. Actualiza la tabla con la clave (`invoices/<id>.pdf`).
//  * @param invoiceId - ID de la factura
//  * @returns clave guardada (p. ej. 'invoices/42.pdf')
//  */
// export const generateInvoicePdf = async (invoiceId: number): Promise<string> => {
//   // ----------- 1. datos ----------
//   const [rows] = await getInvoiceData(invoiceId)
//   if (!rows[0]) throw new Error('Factura no encontrada')
//   const data = rows[0] as InvoiceData

//   // ----------- 2. PDF en Buffer ----------
//   const doc = new PDFDocument({ size: 'A4', margin: 50 })
//   const buffers: Buffer[] = []
//   doc.on('data', (chunk: Buffer) => buffers.push(chunk))
//   doc.on('error', (err: Error) => { throw err })

//   // Cabecera, detalle, pagos
//   doc.fontSize(20).text(`Factura #${data.number}`, { align: 'center' })
//   doc.moveDown()
//   doc.fontSize(12).text(`Fecha: ${new Date(data.issued_at).toLocaleDateString()}`)
//   doc.text(`Cliente: ${data.full_name}`)
//   doc.text(`Vehículo: ${data.vehicle_type} – ${data.licence_plate}`)
//   doc.text(`Check-in: ${new Date(data.check_in).toLocaleString()}`)
//   doc.text(`Check-out: ${new Date(data.check_out).toLocaleString()}`)
//   doc.moveDown()
//   doc.text(`Método de pago: ${data.method}`)
//   doc.text(`Monto: €${data.amount.toFixed(2)}`)
//   doc.moveDown()

//   doc.end()

//   const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
//     doc.on('end', () => resolve(Buffer.concat(buffers)))
//     doc.on('error', reject)
//   })

//   // ----------- 3. Almacenar ----------
//   const key = `invoices/${invoiceId}.pdf`
//   const storage = STORAGE as StorageConfig

//   if (storage.TYPE === 'local') {
//     // --> carpeta física dentro del proyecto
//     const localDir = path.resolve(process.cwd(), storage.LOCAL_PATH)
//     if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true })
//     const localPath = path.join(localDir, `${invoiceId}.pdf`)
//     await fs.promises.writeFile(localPath, pdfBuffer)
//   } else if (s3) {
//     // --> Amazon S3 (u otro provider compatible)
//     await s3.upload({
//       Bucket: storage.BUCKET!,
//       Key: key,
//       Body: pdfBuffer,
//       ContentType: 'application/pdf',
//       ACL: 'private',
//     }).promise()
//   }

//   // ----------- 4. Actualizar DB ----------
//   await updateInvoicePdf(invoiceId, key)
//   return key
// }

// /**
//  * Devuelve una URL **firmada** si el storage es S3.
//  * En modo local devuelve la ruta pública del archivo (p.ej. "/uploads/invoices/42.pdf").
//  */
// export const getSignedUrl = async (key: string): Promise<string> => {
//   const storage = STORAGE as StorageConfig

//   if (storage.TYPE === 'local') {
//     // En modo local la ruta que sirve Express es: /uploads/invoices/…
//     const relative = path.join('/', storage.LOCAL_PATH, key.replace('invoices/', ''))
//     return relative // ej.: "/uploads/invoices/42.pdf"
//   }

//   if (!s3) throw new Error('S3 not configured')

//   // S3 → URL firmada (vence en 5 min)
//   const params = {
//     Bucket: storage.BUCKET!,
//     Key: key,
//     Expires: 300, // 5 min
//   }
//   return s3.getSignedUrlPromise('getObject', params)
// }

// Placeholder exports para evitar errores de importación
export const generateInvoicePdf = async (_invoiceId: number): Promise<string> => {
  throw new Error('Invoice PDF generation not implemented yet')
}

export const getSignedUrl = async (_key: string): Promise<string> => {
  throw new Error('Signed URL generation not implemented yet')
}
