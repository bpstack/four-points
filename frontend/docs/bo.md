# Prompt: Sistema Back Office - Gestión de Facturas y Proveedores

## Contexto del proyecto

Estoy desarrollando un sistema de gestión hotelera (PMS) llamado Four-Points con el siguiente stack:

- **Frontend:** Next.js 14+ (App Router), TypeScript, TailwindCSS, React Query
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** MySQL (Aiven)
- **Almacenamiento de archivos:** Cloudinary
- **Autenticación:** JWT con refresh tokens y HttpOnly cookies
- **Roles:** admin, receptionist, group-admin, maintenance, demo-admin

## Objetivo

Crear un módulo de Back Office para gestión de facturas de proveedores con las siguientes funcionalidades:

1. **Subida y edición de facturas PDF**
2. **Validación de facturas** (añadir sello, firma, highlights)
3. **Gestión de proveedores** con histórico de facturas
4. **Control de facturas pendientes y pagadas**

## Flujo de trabajo detallado

### Proceso de validación de una factura:

1. Usuario sube un PDF de factura (se guarda en Cloudinary como "original")
2. Usuario abre el editor de PDF y puede:
   - Subrayar en amarillo: número de factura, fecha, importe sin IVA, importe con IVA, periodo de facturación
   - Añadir un sello predefinido (imagen) con la categoría/departamento del proveedor
   - Añadir una firma predefinida (imagen)
3. Usuario guarda la factura validada (se genera nuevo PDF y se sube a Cloudinary como "validado")
4. Los datos extraídos se guardan en base de datos
5. La factura aparece en la lista de pendientes hasta que se marca como pagada

### Estados de una factura:
```
PENDIENTE (transferencia) → PAGADA
PENDIENTE (domiciliada) → PAGADA (automático en fecha)
```

## Requisitos técnicos

### Dependencias necesarias

**Frontend:**
- `react-pdf` - Renderizar PDFs
- `pdf-lib` - Manipular/generar PDFs
- `fabric` o `konva` - Canvas para añadir anotaciones (highlights, sello, firma)
- Cloudinary React SDK

**Backend:**
- `cloudinary` - SDK para subida de archivos
- `multer` - Manejo de uploads

### Estructura de base de datos sugerida (esto es una idea primero debes revisar mis tablas en el backend para ver cómo estan los roles y que hay que relacionar de una tabla a otra y luego proponme tu la mejor idea en terminos de consistencia y robustez)
```sql
-- Proveedores
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    cif VARCHAR(20),
    category VARCHAR(100), -- Categoría/departamento
    payment_method ENUM('transfer', 'direct_debit') DEFAULT 'transfer',
    bank_account VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Facturas
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_id INT NOT NULL,
    
    -- Importes
    amount_without_vat DECIMAL(10,2),
    amount_with_vat DECIMAL(10,2),
    vat_percentage DECIMAL(4,2),
    
    -- Fechas
    invoice_date DATE NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    due_date DATE,
    paid_date DATE,
    
    -- Estado y método de pago
    status ENUM('pending', 'paid') DEFAULT 'pending',
    payment_method ENUM('transfer', 'direct_debit') NOT NULL,
    
    -- Archivos en Cloudinary
    original_pdf_url VARCHAR(500),
    original_pdf_public_id VARCHAR(255),
    validated_pdf_url VARCHAR(500),
    validated_pdf_public_id VARCHAR(255),
    
    -- Metadata de validación
    validated_by INT,
    validated_at TIMESTAMP,
    
    -- Auditoría
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (validated_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Categorías/Departamentos para el sello
CREATE TABLE invoice_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- Assets predefinidos (sellos, firmas)
CREATE TABLE invoice_assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('stamp', 'signature') NOT NULL,
    name VARCHAR(100) NOT NULL,
    cloudinary_url VARCHAR(500) NOT NULL,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Endpoints API necesarios
```
# Proveedores
GET    /api/backoffice/suppliers          - Lista proveedores
GET    /api/backoffice/suppliers/:id      - Detalle proveedor
POST   /api/backoffice/suppliers          - Crear proveedor
PUT    /api/backoffice/suppliers/:id      - Actualizar proveedor
DELETE /api/backoffice/suppliers/:id      - Eliminar proveedor
GET    /api/backoffice/suppliers/:id/invoices - Histórico facturas del proveedor

# Facturas
GET    /api/backoffice/invoices           - Lista facturas (con filtros: status, supplier, month)
GET    /api/backoffice/invoices/:id       - Detalle factura
POST   /api/backoffice/invoices           - Crear factura
PUT    /api/backoffice/invoices/:id       - Actualizar factura
DELETE /api/backoffice/invoices/:id       - Eliminar factura
PATCH  /api/backoffice/invoices/:id/pay   - Marcar como pagada

# Upload
POST   /api/backoffice/invoices/upload-original   - Subir PDF original
POST   /api/backoffice/invoices/upload-validated  - Subir PDF validado

# Assets (sellos, firmas)
GET    /api/backoffice/assets             - Lista assets
POST   /api/backoffice/assets             - Subir nuevo asset
DELETE /api/backoffice/assets/:id         - Eliminar asset

# Categorías
GET    /api/backoffice/categories         - Lista categorías
POST   /api/backoffice/categories         - Crear categoría
```

### Estructura Frontend
```
/app/dashboard/backoffice
├── page.tsx                    # Redirect a /invoices
├── layout.tsx                  # Layout con tabs
├── invoices/
│   ├── page.tsx               # Lista facturas con tabs (pending/paid)
│   └── [id]/
│       ├── page.tsx           # Detalle factura
│       └── edit/
│           └── page.tsx       # Editor PDF
├── suppliers/
│   └── page.tsx               # Lista proveedores + panel lateral con histórico
└── settings/
    └── page.tsx               # Gestión de sellos, firmas, categorías
```

### Componentes principales
```
/components/backoffice
├── InvoiceList.tsx            # Tabla de facturas
├── InvoiceForm.tsx            # Formulario crear/editar factura
├── InvoicePDFEditor.tsx       # Editor de PDF con canvas
├── PDFViewer.tsx              # Visualizador de PDF
├── SupplierList.tsx           # Lista de proveedores
├── SupplierPanel.tsx          # Panel lateral con detalle y histórico
├── SupplierInvoiceHistory.tsx # Histórico de facturas de un proveedor
├── AssetManager.tsx           # Gestión de sellos y firmas
└── CategoryManager.tsx        # Gestión de categorías
```

### Componente PDFEditor - Funcionalidades requeridas

El editor debe permitir:
1. **Cargar y visualizar el PDF** original
2. **Herramienta Highlight** - Subrayar texto en amarillo
3. **Herramienta Stamp** - Añadir imagen de sello con texto de categoría
4. **Herramienta Signature** - Añadir imagen de firma
5. **Deshacer/Rehacer** - Ctrl+Z, Ctrl+Y
6. **Zoom** - Acercar/alejar el documento
7. **Guardar** - Generar nuevo PDF con las anotaciones y subirlo a Cloudinary
8. **Añadir texto** - Poder escribir manualmente el departamento

### Permisos

- **admin:** Acceso completo (CRUD todo)
- **demo-admin:** Solo lectura (puede ver todo pero no crear/editar/eliminar)
- **Otros roles:** Sin acceso a este módulo

## Archivos que proporcionaré

1. Excel con listado de categorías/departamentos
2. Excel con estructura actual de facturas (columnas, hojas)
3. Estructura actual del frontend para mantener consistencia de diseño

## Entregables esperados

1. **Migraciones SQL** para todas las tablas
2. **Backend completo:** modelos, repositorios, controladores, rutas
3. **Middleware** de permisos para backoffice
4. **Frontend:** páginas y componentes
5. **Integración Cloudinary** para PDFs e imágenes
6. **Componente PDFEditor** funcional con todas las herramientas

## Notas adicionales

- Mantener consistencia con el diseño actual (GitHub-inspired, TailwindCSS)
- Usar React Query para estado del servidor
- Seguir el patrón de SlidePanel para paneles laterales
- Implementar loading states y manejo de errores
- El sello predefinido debe poder mostrar texto dinámico (la categoría)


Realizame todas las preguntas que estimes oportunas.
Importante revisar el excel donde antes realizaba yo manualmente este sistema JUNIO - HISTORIAL DE FACTURAS 2025.xlsx
y te he adjuntado una factura editada ya como ejemplo NORVEX - FV202500558- Junio.pdf