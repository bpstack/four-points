// 3️⃣ src/services/invoicePdfService.js – ALMACENAMIENTO DUAL
// // src/services/invoicePdfService.js
// import PDFDocument from 'pdfkit';
// import fs          from 'fs';
// import path        from 'path';
// import { getInvoiceData, updateInvoicePdf } from '../repositories/parking.repository.js';
// import { STORAGE } from '../config.js';
// import AWS from 'aws-sdk';

// // ------------------------------------------------------------
// // AWS S3 solo se inicializa cuando STORAGE.TYPE === 's3'
// // ------------------------------------------------------------
// let s3 = null;
// if (STORAGE.TYPE === 's3') {
//   AWS.config.update({ region: process.env.AWS_REGION });
//   s3 = new AWS.S3();
// }

// /**
//  * 1️⃣  Obtiene los datos de la factura.
//  * 2️⃣  Genera PDF en memoria (Buffer).
//  * 3️⃣  Según STORAGE.TYPE → escribe a disco *o* sube a S3.
//  * 4️⃣  Actualiza la tabla con la clave (`invoices/<id>.pdf`).
//  * @param {number} invoiceId
//  * @returns {Promise<string>}  clave guardada (p. ej. 'invoices/42.pdf')
//  */
// export const generateInvoicePdf = async (invoiceId) => {
//   // ----------- 1️⃣  datos ----------
//   const [rows] = await getInvoiceData(invoiceId);
//   if (!rows[0]) throw new Error('Factura no encontrada');
//   const data = rows[0];

//   // ----------- 2️⃣  PDF en Buffer ----------
//   const doc = new PDFDocument({ size: 'A4', margin: 50 });
//   const buffers = [];
//   doc.on('data', buffers.push.bind(buffers));
//   doc.on('error', err => { throw err; });

//   // (Cabecera, detalle, pagos…) – mismo código que antes
//   doc.fontSize(20).text(`Factura #${data.number}`, { align: 'center' });
//   doc.moveDown();
//   doc.fontSize(12).text(`Fecha: ${new Date(data.issued_at).toLocaleDateString()}`);
//   doc.text(`Cliente: ${data.full_name}`);
//   doc.text(`Vehículo: ${data.vehicle_type} – ${data.licence_plate}`);
//   doc.text(`Check‑in: ${new Date(data.check_in).toLocaleString()}`);
//   doc.text(`Check‑out: ${new Date(data.check_out).toLocaleString()}`);
//   doc.moveDown();
//   doc.text(`Método de pago: ${data.method}`);
//   doc.text(`Monto: €${data.amount.toFixed(2)}`);
//   doc.moveDown();

//   doc.end();

//   const pdfBuffer = await new Promise((resolve, reject) => {
//     doc.on('end', () => resolve(Buffer.concat(buffers)));
//     doc.on('error', reject);
//   });

//   // ----------- 3️⃣  Almacenar ----------
//   const key = `invoices/${invoiceId}.pdf`;   // clave usada tanto en disco como en S3

//   if (STORAGE.TYPE === 'local') {
//     // --> carpeta física dentro del proyecto
//     const localDir = path.resolve(process.cwd(), STORAGE.LOCAL_PATH);
//     if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
//     const localPath = path.join(localDir, `${invoiceId}.pdf`);
//     await fs.promises.writeFile(localPath, pdfBuffer);
//   } else {
//     // --> Amazon S3 (u otro provider compatible)
//     await s3.upload({
//       Bucket: STORAGE.BUCKET,
//       Key: key,
//       Body: pdfBuffer,
//       ContentType: 'application/pdf',
//       ACL: 'private',
//     }).promise();
//   }

//   // ----------- 4️⃣  Actualizar DB ----------
//   await updateInvoicePdf(invoiceId, key);
//   return key;
// };

// /**
//  * Devuelve una URL **firmada** si el storage es S3.
//  * En modo local devuelve la ruta pública del archivo (p.ej. "/uploads/invoices/42.pdf").
//  */
// export const getSignedUrl = async (key) => {
//   if (STORAGE.TYPE === 'local') {
//     // En modo local la ruta que sirve Express es: /uploads/invoices/…
//     const relative = path.join('/', STORAGE.LOCAL_PATH, key.replace('invoices/', ''));
//     return relative;        // ej.: "/uploads/invoices/42.pdf"
//   }

//   // S3 → URL firmada (vence en 5 min)
//   const params = {
//     Bucket: STORAGE.BUCKET,
//     Key: key,
//     Expires: 300,                 // 5 min, puedes ajustar
//   };
//   return s3.getSignedUrlPromise('getObject', params);
// };
