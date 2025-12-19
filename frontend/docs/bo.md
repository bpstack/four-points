# Back Office - Sistema de Gestion de Facturas

## Descripcion General

El modulo Back Office permite gestionar facturas de proveedores, incluyendo la carga, validacion con sellos/firmas digitales, y seguimiento del estado de cada factura.

---

## Arquitectura de Autenticacion

### Server Actions y Tokens

**Problema resuelto:** Los Server Actions de Next.js se ejecutan en el servidor y no tienen acceso automatico al token de autenticacion almacenado en el cliente.

**Solucion implementada:**

Los Server Actions en `app/dashboard/bo/actions/invoices.ts` utilizan una funcion helper para obtener el token desde las cookies del servidor:

```typescript
import { cookies } from 'next/headers'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  
  // Intenta obtener el access_token de las cookies
  const accessToken = cookieStore.get('access_token')?.value
  
  if (accessToken) {
    return { 'Authorization': `Bearer ${accessToken}` }
  }
  
  // Fallback: reenviar todas las cookies (para HttpOnly cookies)
  const allCookies = cookieStore.getAll()
  if (allCookies.length > 0) {
    const cookieHeader = allCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ')
    return { 'Cookie': cookieHeader }
  }
  
  return {}
}
```

Esta funcion se usa en `serverMutate()` para incluir los headers de autenticacion en todas las peticiones al backend:

```typescript
async function serverMutate<T>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const authHeaders = await getAuthHeaders()

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,  // <-- Incluye el token
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  // ...
}
```

### Flujo de Autenticacion

1. Usuario hace login -> Token se guarda en `localStorage` (cliente) y como cookie `access_token`
2. Llamadas desde cliente (ej: `backofficeApi`) -> Usan token de `localStorage`
3. Server Actions (ej: `validateInvoice`) -> Usan token de cookies via `getAuthHeaders()`

---

## Editor de PDF

### Funcionalidad

El componente `PdfEditorModal.tsx` permite:

- Visualizar el PDF original de la factura
- Anadir sellos y firmas (assets pre-cargados)
- Anadir texto (multilinea con word-wrap automatico)
- Anadir resaltados/highlights
- Redimensionar todos los elementos
- Deshacer acciones (Ctrl+Z o boton)
- Eliminar elementos (tecla Delete/Supr)

### Librerias Utilizadas

- **pdfjs-dist**: Renderizado del PDF en canvas para visualizacion
- **pdf-lib**: Modificacion del PDF (anadir elementos) al guardar

### Consideraciones Tecnicas

#### ArrayBuffer Detachment

**Problema:** Al pasar un `ArrayBuffer` a `pdfjs-dist` para renderizar, este puede "detach" (invalidar) el buffer, haciendolo inutilizable para operaciones posteriores.

**Solucion:** Usar copias del ArrayBuffer con `.slice(0)`:

```typescript
// Al guardar los bytes del PDF
setPdfBytes(bytes.slice(0))

// Al renderizar con pdfjs-dist
pdfDocRef.current = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise

// Al guardar con pdf-lib
const pdfDoc = await PDFDocument.load(pdfBytes.slice(0))
```

#### Texto Multilinea con Word-Wrap

El texto se adapta automaticamente al ancho del contenedor:

1. **En el overlay (visualizacion):** Usando CSS `word-wrap: break-word` y `white-space: pre-wrap`

2. **Al guardar en PDF:** Funcion `wrapText()` que calcula el ancho de cada palabra usando `font.widthOfTextAtSize()` y divide las lineas segun el ancho del contenedor

---

## Proceso de Validacion de Factura

1. Usuario abre el editor PDF desde una factura pendiente
2. Anade sellos, firmas, texto o highlights segun necesite
3. Hace clic en "Guardar y Validar"
4. El sistema:
   - Genera el PDF modificado con pdf-lib
   - Sube el PDF validado al servidor (`uploadInvoicePdf`)
   - Marca la factura como validada (`validateInvoice`)
   - Actualiza la cache y refresca la lista

---

## Archivos Principales

| Archivo | Descripcion |
|---------|-------------|
| `app/components/bo/modals/PdfEditorModal.tsx` | Editor de PDF con canvas y elementos |
| `app/components/bo/tabs/PendingInvoicesTab.tsx` | Lista de facturas pendientes |
| `app/dashboard/bo/actions/invoices.ts` | Server Actions para CRUD de facturas |
| `app/lib/backoffice/backofficeApi.ts` | Cliente API para llamadas desde el navegador |
| `app/lib/backoffice/data.ts` | Funciones de fetch server-side |
