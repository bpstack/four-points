# BFF - Backend For Frontend

## Concepto

**BFF (Backend For Frontend)** es un patrón arquitectónico donde el backend actúa como intermediario entre el frontend y servicios externos (APIs de terceros, almacenamiento en la nube, etc.).

### Ventajas del patrón BFF:

1. **Seguridad**: Las credenciales de servicios externos (API keys, secrets) nunca se exponen al cliente
2. **CORS**: El backend puede acceder a recursos que el navegador bloquearía por políticas CORS
3. **Control de headers**: El backend puede manipular headers HTTP (Content-Disposition, Content-Type, etc.)
4. **Transformación de datos**: Puede adaptar las respuestas de servicios externos al formato que necesita el frontend
5. **Caching**: Puede implementar caché a nivel de servidor
6. **Rate limiting**: Puede controlar el acceso a servicios externos

---

## Implementación: PDF Proxy para Cloudinary

### Problema Original

Los PDFs de facturas se almacenan en Cloudinary como `resource_type: raw`. Cuando el usuario descargaba un PDF directamente desde la URL de Cloudinary, el archivo se guardaba **sin extensión `.pdf`** porque:

1. Cloudinary no soporta el flag `fl_attachment:filename` para recursos tipo `raw`
2. Las URLs firmadas de Cloudinary no incluyen metadata de nombre de archivo
3. El navegador usa el último segmento de la URL como nombre, que en Cloudinary es un hash sin extensión

### Solución: Proxy Pattern

El backend actúa como proxy entre el frontend y Cloudinary:

```
Frontend  →  Backend (proxy)  →  Cloudinary
   ↓              ↓                  ↓
 Solicita    Descarga PDF      Almacena PDF
 descarga    y lo sirve con    como recurso
             headers correctos  raw
```

---

## Archivos Modificados

### 1. Backend Controller

**Archivo**: `backend/controllers/backoffice/backoffice-controller.ts`

**Endpoint**: `GET /api/backoffice/invoices/:id/pdf-download`

**Cambios realizados**:

```typescript
// ANTES (línea ~1231)
res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`)

// DESPUÉS
const safeInvoiceNumber = invoice.invoice_number.replace(/[/\\?%*:|"<>]/g, '-')
const filename = `factura_${safeInvoiceNumber}_${type}.pdf`
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
```

**Explicación**:

| Cambio | Antes | Después | Razón |
|--------|-------|---------|-------|
| Disposition | `inline` | `attachment` | `inline` muestra el PDF en el navegador; `attachment` fuerza la descarga |
| Filename | `{numero}.pdf` | `factura_{numero}_{tipo}.pdf` | Nombre más descriptivo que incluye el tipo (original/validated) |
| Sanitización | Básica | Completa | Se eliminan caracteres no válidos para nombres de archivo en Windows/Linux |

**Flujo del endpoint**:

1. Recibe `id` de factura y `type` (original/validated)
2. Busca la factura en la base de datos
3. Obtiene la URL del PDF de Cloudinary
4. Intenta descargar el PDF usando múltiples métodos:
   - URL directa
   - URL con `fl_attachment` (para image/upload)
   - URL firmada
   - URL alternativa con/sin extensión `.pdf`
5. Sirve el PDF al cliente con headers correctos

---

### 2. Frontend API

**Archivo**: `frontend/app/lib/backoffice/backofficeApi.ts`

**Función existente** (no modificada, solo documentada):

```typescript
/**
 * Obtener URL para descargar PDF (proxy del backend)
 */
getInvoicePdfDownloadUrl: (id: number, type: 'original' | 'validated'): string => {
  return `${API_BASE}/api/backoffice/invoices/${id}/pdf-download?type=${type}`
}
```

Esta función ya existía y retorna la URL del endpoint proxy.

---

### 3. Frontend Component

**Archivo**: `frontend/app/components/bo/modals/SupplierInvoicesModal.tsx`

**Cambios realizados**:

```typescript
// ANTES
const handleOpenPdf = async (invoiceId: number, type: 'original' | 'validated') => {
  try {
    const response = await backofficeApi.getInvoicePdfUrl(invoiceId, type)
    window.open(response.url, '_blank')  // Abría URL firmada de Cloudinary
  } catch (err: any) {
    toast.error(err.message || `Error al abrir PDF ${type}`)
  }
}

// DESPUÉS
const handleDownloadPdf = async (
  invoiceId: number, 
  type: 'original' | 'validated', 
  invoiceNumber: string
) => {
  try {
    const token = localStorage.getItem('authToken')
    const url = backofficeApi.getInvoicePdfDownloadUrl(invoiceId, type)
    
    // Fetch del PDF a través del proxy
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      credentials: 'include',
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || `Error ${response.status}`)
    }
    
    // Crear blob y forzar descarga
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    // Crear enlace temporal para descargar con nombre correcto
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `factura_${invoiceNumber.replace(/[/\\?%*:|"<>]/g, '-')}_${type}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Limpiar blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch (err: any) {
    toast.error(err.message || `Error al descargar PDF ${type}`)
  }
}
```

**Explicación del flujo**:

1. **Obtener token**: Se lee el token JWT del localStorage para autenticación
2. **Fetch al proxy**: Se llama al endpoint del backend (no a Cloudinary directamente)
3. **Crear Blob**: Se convierte la respuesta en un Blob de tipo PDF
4. **Crear Blob URL**: `URL.createObjectURL()` crea una URL temporal para el blob
5. **Trigger download**: Se crea un `<a>` temporal con atributo `download` para forzar la descarga
6. **Cleanup**: Se revoca la Blob URL después de 1 segundo para liberar memoria

**Actualización de llamadas en el JSX**:

```typescript
// ANTES
onClick={() => handleOpenPdf(invoice.id, 'original')}
title="Ver PDF Original"

// DESPUÉS  
onClick={() => handleDownloadPdf(invoice.id, 'original', invoice.invoice_number)}
title="Descargar PDF Original"
```

---

## Diagrama de Flujo

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Usuario   │     │     Backend     │     │  Cloudinary │
│  (Browser)  │     │   (Express)     │     │   (Cloud)   │
└──────┬──────┘     └────────┬────────┘     └──────┬──────┘
       │                     │                     │
       │  1. Click "Descargar PDF"                 │
       │─────────────────────>                     │
       │                     │                     │
       │  2. GET /invoices/:id/pdf-download        │
       │     + Authorization header                │
       │─────────────────────>                     │
       │                     │                     │
       │                     │  3. GET pdf_url     │
       │                     │─────────────────────>
       │                     │                     │
       │                     │  4. PDF binary      │
       │                     │<─────────────────────
       │                     │                     │
       │  5. PDF + Content-Disposition: attachment │
       │     filename="factura_XXX_original.pdf"   │
       │<─────────────────────                     │
       │                     │                     │
       │  6. Browser guarda archivo                │
       │     con nombre correcto                   │
       ▼                     ▼                     ▼
```

---

## Endpoints Relacionados

| Endpoint | Método | Descripción | Uso |
|----------|--------|-------------|-----|
| `/api/backoffice/invoices/:id/pdf-url` | GET | Retorna URL firmada de Cloudinary | Visualización en navegador (si se necesita) |
| `/api/backoffice/invoices/:id/pdf-download` | GET | Proxy que descarga y sirve el PDF | **Descarga con nombre correcto** |

**Query parameters**:
- `type`: `'original'` o `'validated'`

---

## Nombres de Archivo Generados

| Tipo | Ejemplo |
|------|---------|
| Original | `factura_FV202312001_original.pdf` |
| Validado | `factura_FV202312001_validated.pdf` |

**Caracteres sanitizados**: `/ \ ? % * : | " < >` se reemplazan por `-`

---

## Consideraciones de Seguridad

1. **Autenticación**: El endpoint requiere token JWT válido
2. **Autorización**: Solo usuarios autenticados pueden descargar PDFs
3. **Credenciales ocultas**: Las API keys de Cloudinary nunca llegan al cliente
4. **URLs temporales**: Las Blob URLs se revocan después de usarse

---

## Pruebas

Para probar la descarga de PDFs:

```http
### Descargar PDF original
GET {{baseUrl}}/api/backoffice/invoices/1/pdf-download?type=original
Authorization: Bearer {{authToken}}

### Descargar PDF validado  
GET {{baseUrl}}/api/backoffice/invoices/1/pdf-download?type=validated
Authorization: Bearer {{authToken}}
```

Ver archivo: `backend/API REST/backoffice/backoffice.http`
