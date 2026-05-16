# PDF Proxy para Cloudinary

## Problema Original

Los PDFs de facturas se almacenan en Cloudinary como `resource_type: raw`. Cuando el usuario descargaba un PDF directamente desde la URL de Cloudinary, el archivo se guardaba **sin extensión `.pdf`** porque:

1. Cloudinary no soporta el flag `fl_attachment:filename` para recursos tipo `raw`
2. Las URLs firmadas de Cloudinary no incluyen metadata de nombre de archivo
3. El navegador usa el último segmento de la URL como nombre, que en Cloudinary es un hash sin extensión

## Solución: Proxy Pattern

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

### Backend Controller

**Archivo:** `backend/controllers/backoffice/backoffice-controller.ts`

**Endpoint:** `GET /api/backoffice/invoices/:id/pdf-download`

**Cambios clave:**

| Antes | Después | Razón |
|-------|---------|-------|
| `inline` | `attachment` | `inline` muestra el PDF en el navegador; `attachment` fuerza la descarga |
| `{numero}.pdf` | `factura_{numero}_{tipo}.pdf` | Nombre más descriptivo que incluye el tipo |

**Sanitización:** `/ \ ? % * : | " < >` se reemplazan por `-`

### Frontend Component

**Archivo:** `frontend/app/components/bo/modals/SupplierInvoicesModal.tsx`

```typescript
// Fetch del PDF a través del proxy
const response = await fetch(url, {
  headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  credentials: 'include',
})

// Crear blob y forzar descarga
const blob = await response.blob()
const blobUrl = URL.createObjectURL(blob)

const link = document.createElement('a')
link.href = blobUrl
link.download = `factura_${invoiceNumber}_${type}.pdf`
document.body.appendChild(link)
link.click()
document.body.removeChild(link)
```

---

## Diagrama de Flujo

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Usuario   │     │     Backend     │     │  Cloudinary │
│  (Browser)  │     │   (Express)     │     │   (Cloud)  │
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

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/backoffice/invoices/:id/pdf-url` | GET | Retorna URL firmada de Cloudinary |
| `/api/backoffice/invoices/:id/pdf-download` | GET | Proxy que descarga y sirve el PDF |

**Query parameters:** `type`: `'original'` o `'validated'`

---

## Nombres de Archivo Generados

| Tipo | Ejemplo |
|------|---------|
| Original | `factura_FV202312001_original.pdf` |
| Validado | `factura_FV202312001_validated.pdf` |

---

## Consideraciones de Seguridad

1. **Autenticación**: El endpoint requiere token JWT válido
2. **Autorización**: Solo usuarios autenticados pueden descargar PDFs
3. **Credenciales ocultas**: Las API keys de Cloudinary nunca llegan al cliente
4. **URLs temporales**: Las Blob URLs se revocan después de usarse

---

## Ver también

- `server/cors-configuration.md` - Configuración CORS
