# Revision de Arquitectura: Modulo BLACKLIST

**Fecha:** 2025-01-27  
**Score inicial:** 6/10  
**Score revisado:** 7.5/10

---

## 1. ESTRUCTURA DE ARCHIVOS Y CONVENCIONES

### 1.1 Layout de Carpetas

- [x] La estructura sigue el App Router de Next.js 13+
- [x] Hay separacion clara entre `page.tsx`, `components/`, `actions/`
- [x] Los componentes estan organizados por tipo (mains, panels, ui, layout)
- [ ] Existen archivos innecesarios o duplicados - No detectados
- [x] El naming de archivos es consistente

```
frontend/app/
├── dashboard/blacklist/
│   ├── page.tsx              # ❌ 'use client' - PROBLEMA
│   ├── loading.tsx           # ✅ 171 lineas
│   ├── not-found.tsx         # ✅ 58 lineas
│   ├── new/
│   │   └── page.tsx          # 'use client' - 44 lineas
│   ├── [id]/
│   │   ├── page.tsx          # ✅ SERVER COMPONENT - 37 lineas
│   │   ├── not-found.tsx     # ✅
│   │   └── edit/
│   │       └── page.tsx      # 'use client' - 82 lineas
│   └── actions/
│       ├── index.ts          # Barrel exports
│       ├── getBlacklist.ts   # 58 lineas
│       ├── getBlacklistById.ts # 45 lineas
│       ├── createBlacklist.ts  # 88 lineas
│       ├── updateBlacklist.ts  # 96 lineas
│       ├── deleteBlacklist.ts  # 58 lineas
│       └── restoreBlacklist.ts # ~50 lineas
├── lib/blacklist/
│   ├── types.ts              # 169 lineas
│   ├── blacklistApi.ts       # 171 lineas
│   ├── blacklistSchema.ts    # 176 lineas
│   ├── blacklistUtils.ts     # 199 lineas
│   └── blacklistApi.md       # Documentacion
├── components/blacklist/
│   ├── BlacklistDetailClient.tsx
│   ├── layout/
│   │   └── BlacklistDetailSummaryPanel.tsx
│   ├── mains/
│   │   ├── AuditTrail.tsx
│   │   ├── BlacklistForm.tsx
│   │   ├── BlacklistModal.tsx
│   │   ├── BlacklistTable.tsx
│   │   ├── DeleteButton.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── Pagination.tsx
│   │   └── SearchBar.tsx
│   ├── panels/
│   │   ├── CreateBlacklistPanel.tsx
│   │   └── EditBlacklistPanel.tsx
│   └── ui/
│       ├── Badge.tsx, Button.tsx, Card.tsx
│       ├── DataRangePicker.tsx, ImageUploader.tsx
│       ├── Input.tsx, Modal.tsx, Select.tsx, TextArea.tsx
└── messages/es/
    └── blacklist.json        # 252 lineas
```

### 1.2 Archivos de Configuracion

- [x] Hay `types.ts` con todas las interfaces TypeScript (169 lineas)
- [x] Hay `blacklistApi.ts` para la capa de API (171 lineas)
- [x] Hay `actions/` para Server Actions (6 actions)
- [ ] Hay `constants.ts` para valores configurables - **FALTA** (constantes en types.ts)
- [x] Hay `index.ts` con barrel exports (en actions/)
- [x] Las rutas API estan documentadas (`blacklistApi.md`)

---

## 2. SERVER COMPONENTS (Page, Layout)

### 2.1 Page Component

#### Lista (page.tsx) - ❌ CRITICO

- [ ] Es Server Component por defecto (sin 'use client') - **NO, tiene 'use client'**
- [ ] Lee `searchParams` para filtros/paginacion - **NO**
- [ ] Hace data fetching con Server Actions - **NO, usa blacklistApi en cliente**
- [ ] Pasa `initialData` a Client Components - **NO**
- [ ] Tiene manejo de errores try-catch - Si, pero en cliente
- [ ] Usa `Suspense` para streaming de datos - **NO**
- [ ] Tiene fallback loading apropiado - Si, pero en cliente con useState

```typescript
// ❌ ACTUAL - app/dashboard/blacklist/page.tsx
'use client'

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  // ❌ Data fetching en cliente con useEffect
  const loadEntries = useCallback(async () => {
    const response = await blacklistApi.getAll(filters)
    setEntries(response.entries)
  }, [searchTerm, severityFilter, statusFilter])
  
  useEffect(() => {
    loadEntries()
  }, [loadEntries])
}
```

#### Detalle ([id]/page.tsx) - ✅ CORRECTO

- [x] Es Server Component por defecto (sin 'use client')
- [x] Hace data fetching con Server Actions (`getBlacklistById`)
- [x] Pasa `initialData` a Client Components (`entry`, `audit_trail`)
- [x] Tiene manejo de errores try-catch con `notFound()`
- [x] Tiene `revalidate = 30` para ISR

```typescript
// ✅ CORRECTO - app/dashboard/blacklist/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getBlacklistById } from '../actions'
import { BlacklistDetailClient } from '@/app/components/blacklist/BlacklistDetailClient'

export const revalidate = 30

export default async function BlacklistDetailPage({ params }: PageProps) {
  const { id } = await params
  let data
  try {
    data = await getBlacklistById(id)
  } catch {
    notFound()
  }
  const { entry, audit_trail } = data
  return <BlacklistDetailClient entry={entry} audit_trail={audit_trail} />
}
```

### 2.2 Layout Component

- No existe `layout.tsx` especifico para blacklist
- No es necesario ya que usa el layout del dashboard

### 2.3 Loading States

- [x] Existe `loading.tsx` a nivel de ruta (171 lineas)
- [x] El skeleton UI coincide con la estructura real (tabla, cards mobile, stats)
- [x] El skeleton tiene ancho/alto definido para evitar CLS
- [x] Hay animaciones suaves (animate-pulse)

```typescript
// ✅ loading.tsx - Muy completo
function StatsCardSkeleton() { ... }
function TableRowSkeleton() { ... }
function MobileCardSkeleton() { ... }

export default function BlacklistLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      {/* Header skeleton */}
      {/* Stats grid skeleton (mobile/tablet) */}
      {/* Filters skeleton */}
      {/* Table skeleton (desktop) */}
      {/* Cards skeleton (mobile) */}
      {/* Sidebar skeleton (1400px+) */}
    </div>
  )
}
```

### 2.4 Error Handling

- [ ] Existe `error.tsx` - **❌ FALTA**
- [ ] El error boundary captura errores de data fetching - **NO**
- [ ] Hay boton "Reintentar" (reset) - **NO**
- [ ] Se muestra mensaje de error util - **NO**
- [ ] Hay logging del error en consola/monitoring - **NO**

**Solucion propuesta:**

```typescript
// app/dashboard/blacklist/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/app/components/blacklist/ui/Button'
import { IoAlertCircleOutline, IoRefresh } from 'react-icons/io5'

export default function BlacklistError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[Blacklist Error]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <IoAlertCircleOutline className="mx-auto text-red-500" size={48} />
        <h2 className="text-xl font-bold mt-4">Error al cargar Blacklist</h2>
        <p className="text-gray-600 mt-2">{error.message}</p>
        <Button onClick={reset} className="mt-4">
          <IoRefresh className="mr-2" /> Reintentar
        </Button>
      </div>
    </div>
  )
}
```

---

## 3. SERVER ACTIONS

### 3.1 Estructura

- [x] Estan separados en `actions/` (hay 6 actions)
- [x] Tienen directiva 'use server' en cada archivo
- [x] Cada Server Action es una funcion exportada
- [x] Estan tipados con interfaces (request/response)

| Action | Archivo | Lineas | Proposito |
|--------|---------|--------|-----------|
| getBlacklist | getBlacklist.ts | 58 | Lista con filtros y paginacion |
| getBlacklistById | getBlacklistById.ts | 45 | Detalle + audit trail |
| createBlacklist | createBlacklist.ts | 88 | Crear registro |
| updateBlacklist | updateBlacklist.ts | 96 | Actualizar registro |
| deleteBlacklist | deleteBlacklist.ts | 58 | Soft delete |
| restoreBlacklist | restoreBlacklist.ts | ~50 | Restaurar registro eliminado |

### 3.2 Seguridad y Autenticacion

- [x] Obtienen el token desde `cookies()` (server-side)
- [x] Validan el token antes de hacer la request
- [ ] Verifican permisos del usuario - **Solo valida existencia de token**
- [ ] Sanitizan inputs - **Validacion basica, no Zod en server**
- [x] Cachean correctamente con `cache: 'no-store'`

```typescript
// Patron usado en todas las actions
export async function createBlacklist(formData: BlacklistFormData) {
  try {
    // ✅ Token desde cookies
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value

    if (!token) {
      return { success: false, error: 'No autorizado, falta token' }
    }

    // ⚠️ Validacion basica (deberia usar Zod)
    if (!formData.guest_name || !formData.document_number) {
      return { success: false, error: 'Datos incompletos' }
    }

    const response = await fetch(`${API_BASE}/api/blacklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    // ...
  }
}
```

### 3.3 Manejo de Errores

- [x] Tienen try-catch
- [x] Lanzan errores informativos
- [ ] Distinguen entre errores de autorizacion, validacion y servidor - **Parcial**
- [x] Loguean errores para debugging (`console.error`)

### 3.4 Performance

- [x] Usan `cache: 'no-store'` para datos en tiempo real
- [x] Evitan queries innecesarias
- [x] Paginan resultados grandes (limit: 50)
- [ ] Limitan campos retornados (proyeccion) - **Backend retorna todo**

---

## 4. CLIENT COMPONENTS

### 4.1 Identificacion de necesidad 'use client'

| Componente | 'use client' | Justificado | Notas |
|------------|--------------|-------------|-------|
| page.tsx (lista) | Si | ❌ NO | Deberia ser Server Component |
| [id]/page.tsx | No | ✅ | Es Server Component |
| new/page.tsx | Si | ⚠️ Parcial | Solo necesita form |
| edit/page.tsx | Si | ⚠️ Parcial | Podria pasar initialData |
| BlacklistDetailClient | Si | ✅ | Interactividad |
| BlacklistForm | Si | ✅ | Formulario |
| CreateBlacklistPanel | Si | ✅ | Panel animado |

### 4.2 Recepcion de datos iniciales

- [x] BlacklistDetailClient recibe `initialData` como props (entry, audit_trail)
- [ ] page.tsx del listado NO recibe initialData
- [ ] edit/page.tsx NO recibe initialData (hace fetch en cliente)

### 4.3 Estado y Efectos

- [x] Usa `useState` apropiadamente
- [x] Los efectos tienen dependencias correctas (useCallback con deps)
- [ ] Hay efectos que podrian ser Server Components - **Si, page.tsx**
- [ ] Limpia subscripciones en cleanup - **No hay subscripciones**

### 4.4 Event Handlers y Interactividad

- [x] Los handlers estan memoizados (`useCallback` en loadEntries)
- [x] Se previene comportamiento por defecto donde corresponde
- [x] Hay validacion de inputs (Zod en cliente)
- [x] Hay feedback visual inmediato (loading states, disabled buttons)

### 4.5 Accesibilidad

- [x] Los inputs tienen labels asociados
- [ ] Los botones tienen aria-labels si no hay texto - **No verificado**
- [x] Se puede navegar con teclado
- [x] Los colores no son la unica forma de transmitir informacion (iconos + texto)
- [x] Hay suficiente contraste (dark mode soportado)

---

## 5. CUSTOM HOOKS

### 5.1 Proposito y Responsabilidad

- [ ] No existen custom hooks especificos del modulo
- El modulo usa hooks de React directamente (useState, useEffect, useCallback)
- **Deberia tener:** `useBlacklist`, `useBlacklistEntry`, `useBlacklistMutations`

### 5.2 State Management

- [x] Usa `useState` para estado local
- [ ] Usa React Query para remote state - **❌ NO IMPLEMENTADO**
- [ ] Separa estado UI de estado de datos - **Mezclado en page.tsx**
- [ ] Hay state que deberia ser en URL - **Si: filtros, paginacion**

### 5.3 React Query Usage

- [ ] Las queries usan query keys centralizados - **NO HAY REACT QUERY**
- [ ] Estan configuradas `staleTime` y `gcTime` - **N/A**
- [ ] Las mutations invalidan queries correctamente - **N/A**
- [ ] Hay manejo de errores - **N/A**
- [ ] Hay feedback al usuario (toast, etc.) - **Parcial**

### 5.4 Performance

- [ ] Se memo el hook si retorna objetos - **N/A**
- [ ] Se evita re-renders innecesarios - **No optimizado**
- [x] Hay dependencias correctas en useEffect

---

## 6. API LAYER (blacklistApi.ts)

### 6.1 Organizacion

- [x] Las queries estan en `lib/blacklist/blacklistApi.ts`
- [x] Hay un objeto `blacklistApi` que agrupa endpoints
- [x] Estan separadas por recurso/funcionalidad
- [x] Hay documentacion (`blacklistApi.md`)

```typescript
export const blacklistApi = {
  // CRUD
  getAll: async (filters?: BlacklistFilters): Promise<BlacklistResponse> => { ... },
  getById: async (id: string): Promise<BlacklistDetailResponse> => { ... },
  create: async (data: BlacklistFormData): Promise<BlacklistEntry> => { ... },
  update: async (id: string, data: Partial<BlacklistFormData>) => { ... },
  delete: async (id: string): Promise<{ message: string }> => { ... },
  restore: async (id: string): Promise<BlacklistEntry> => { ... },
  
  // Imagenes
  uploadImage: async (file: File): Promise<ImageUploadResponse> => { ... },
  uploadImages: async (files: File[]): Promise<ImageUploadResponse[]> => {
    return Promise.all(files.map(f => blacklistApi.uploadImage(f)))
  },
  deleteImage: async (publicId: string) => { ... },
  
  // Extras
  exportToExcel: async (filters?: BlacklistFilters): Promise<Blob> => { ... },
  getStats: async () => { ... },
}
```

### 6.2 Seguridad

- [x] Se usa un `apiClient` centralizado que maneja autenticacion
- [x] Se envian tokens en header Authorization
- [ ] Se manejan errores de 401 (reintentar con refresh token) - **No implementado**
- [ ] Se sanitizan parametros - **Parcial**

### 6.3 Tipado

- [x] Las funciones de API estan tipadas (request/response)
- [x] Se reutilizan tipos de `types.ts`
- [x] Las respuestas tienen interfaz clara
- [ ] Los errores estan tipados - **No**

### 6.4 Construccion de URLs

- [x] Se usa `URLSearchParams` para query strings
- [x] Se evitan URLs hardcodeadas (usar `API_BASE_URL`)
- [x] Se construyen URLs de forma segura

---

## 7. REACT QUERY INTEGRATION

### 7.1 Query Keys

- [ ] No hay React Query implementado
- **Deberia existir:**

```typescript
// Propuesta: lib/blacklist/queries.ts
export const blacklistKeys = {
  all: ['blacklist'] as const,
  lists: () => [...blacklistKeys.all, 'list'] as const,
  list: (filters: BlacklistFilters) => [...blacklistKeys.lists(), filters] as const,
  details: () => [...blacklistKeys.all, 'detail'] as const,
  detail: (id: string) => [...blacklistKeys.details(), id] as const,
  stats: () => [...blacklistKeys.all, 'stats'] as const,
}
```

### 7.2-7.4 Queries, Mutations, Performance

- **NO IMPLEMENTADO** - El modulo usa fetch directo con useState/useEffect

---

## 8. GESTION DE ESTADO EN URL (searchParams)

### 8.1 Implementacion en Server

- [ ] El Server Component lee `searchParams` - **NO (page.tsx es client)**
- [ ] Usa `await searchParams` (Next.js 15+) - **N/A**
- [ ] Tiene valores por defecto - **N/A**
- [ ] Pasa valores procesados al Client Component - **N/A**

### 8.2 Implementacion en Client

- [x] Usa `useRouter()` y `useSearchParams()` - **Solo para panel**
- [x] Actualiza URL sin scroll (`scroll: false`) - **Solo para panel**
- [ ] Evita re-fetch innecesarios despues de actualizar URL - **N/A**
- [ ] Usa `useRef` para evitar effectos dobles en mount - **No**

```typescript
// Unico uso de URL params actualmente
const handleCreateEntry = () => {
  const params = new URLSearchParams(searchParams.toString())
  params.set('panel', 'create-blacklist')
  router.push(`?${params.toString()}`, { scroll: false })
}
```

### 8.3 Beneficios

- [ ] URLs son compartibles con filtros aplicados - **❌ NO**
- [ ] Back/forward del navegador funciona - **❌ NO para filtros**
- [ ] Se pueden guardar bookmarks - **❌ NO**
- [ ] Estan soportados los filtros mas importantes - **❌ NO**

**Solucion propuesta:**

```typescript
// Nuevo page.tsx como Server Component
export default async function BlacklistPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filters = {
    q: params.q,
    severity: params.severity,
    status: params.status || 'ACTIVE',
    page: parseInt(params.page || '1'),
  }
  const data = await getBlacklist(filters)
  return <BlacklistListClient initialData={data} initialFilters={filters} />
}
```

---

## 9. BARREL EXPORTS

### 9.1 Implementacion

- [x] Existe `index.ts` en `actions/`
- [ ] Existe `index.ts` en `components/blacklist/` - **NO**
- [ ] Existe `index.ts` en `lib/blacklist/` - **NO**

```typescript
// actions/index.ts - ✅ Existe
export { getBlacklist } from './getBlacklist'
export { getBlacklistById } from './getBlacklistById'
export { createBlacklist } from './createBlacklist'
export { updateBlacklist } from './updateBlacklist'
export { deleteBlacklist } from './deleteBlacklist'
export { restoreBlacklist } from './restoreBlacklist'
```

### 9.2 Beneficios

- ⚠️ Parcialmente implementado - Solo en actions/

---

## 10. TIPOS Y INTERFACES

### 10.1 Organizacion

- [x] Existe `types.ts` centralizado en `lib/blacklist/` (169 lineas)
- [x] Se reutilizan tipos entre archivos
- [ ] Hay tipos del servidor que no se necesitan en cliente - **No separados**
- [ ] Hay tipos que podrian simplificarse - **No**

### 10.2 Calidad de Tipos

- [x] Se evita `any`
- [x] Se usan tipos concretos en lugar de `Record<string, any>`
- [ ] Se documentan tipos complejos con JSDoc - **Comentarios simples**
- [x] Hay discriminated unions donde corresponde (severity, status)
- [x] Se heredan tipos de API cuando sea posible

```typescript
// types.ts - Estructura
export interface BlacklistEntry {
  id: string
  guest_name: string
  document_type: 'DNI' | 'PASSPORT' | 'NIE' | 'OTHER'
  document_number: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'ACTIVE' | 'DELETED'
  // ... mas campos
}

export interface AuditEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  changed_fields?: Record<string, { old: unknown; new: unknown }>
  // ...
}

// Constantes tipadas
export const DOCUMENT_TYPES = { ... } as const
export const SEVERITY_LEVELS = { ... } as const
export const SEVERITY_COLORS = { ... } as const
```

### 10.3 Sincronizacion con Backend

- [x] Los tipos corresponden con la API real
- [ ] Se validan respuestas de API (runtime validation) - **No**
- [x] Hay comentarios donde la API es confusa

---

## 11. FORMULARIOS

### 11.1 Validacion

- [x] Se valida en cliente (UX inmediata) - Zod
- [ ] Se valida en servidor (seguridad) - **Solo validacion basica**
- [x] Se usan librerias (Zod)
- [x] Hay mensajes de error claros (en espanol)
- [x] Se previene submit duplicado

```typescript
// blacklistSchema.ts
export const blacklistSchema = z.object({
  guest_name: z.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255, 'El nombre no puede exceder 255 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras y espacios'),
  
  document_number: z.string()
    .min(5).max(20)
    .transform((val) => val.toUpperCase()), // ✅ Transform
  
  images: z.array(z.instanceof(File))
    .max(5, 'No puedes subir mas de 5 imagenes')
    .refine(files => files.every(f => f.size <= 5 * 1024 * 1024), 'Max 5MB'),
  // ...
}).refine(data => data.check_out_date > data.check_in_date, {
  message: 'Fecha salida debe ser posterior a entrada',
  path: ['check_out_date'],
})
```

### 11.2 Estado del Formulario

- [x] Hay feedback visual (disabled buttons en submit)
- [x] Se muestran spinners durante submit
- [ ] Se limpian campos despues de submit - **Cierra panel**
- [x] Se mantiene draft si hay error

### 11.3 UX

- [ ] Se enfoca el primer campo con error - **No implementado**
- [ ] Hay validacion mientras escribes (debounced) - **Solo on blur**
- [ ] Se muestran requisitos (contrasenas, etc.) - **No aplica**
- [ ] Se confirma antes de borrar datos - **Si, en delete**

---

## 12. MODALES Y DIALOGOS

### 12.1 Estructura

- [x] Hay componente base `Modal` en `ui/Modal.tsx`
- [x] Se heredan estilos y comportamiento
- [x] El estado esta en el component padre (URL params)
- [x] Se cierra con ESC

### 12.2 Accesibilidad

- [ ] Se usa `<dialog>` nativo o libreria accesible - **Div con overlay**
- [ ] Hay `aria-label` en botones - **No verificado**
- [ ] El focus se trapa dentro del modal - **No verificado**
- [x] Se puede navegar con Tab

### 12.3 Animaciones

- [x] Las animaciones son suaves (Tailwind transitions)
- [ ] Se pueden deshabilitar para pruebas - **No**

---

## 13. LISTADOS Y PAGINACION

### 13.1 Data Fetching

- [x] Se pagina en servidor (no traer todo) - `limit: 50`
- [x] Se limita cantidad de items
- [ ] Se soportan multiples ordenes - **No**
- [ ] Se cachean resultados - **No (client-side fetch)**

### 13.2 UI

- [x] Hay indicador de paginas actual/total
- [x] Botones prev/next estan deshabilitados cuando corresponde
- [ ] Se puede ir a pagina especifica - **No**
- [ ] Se puede cambiar items per page - **No**

### 13.3 Estado en URL

- [ ] Se guarda pagina en searchParams - **❌ NO**
- [ ] Se guarda cantidad de items - **❌ NO**
- [ ] Vuelve a pagina 1 al cambiar filtros - **Si (en cliente)**

---

## 14. BUSQUEDA Y FILTROS

### 14.1 Busqueda

- [ ] Hay debounce en busqueda - **❌ NO, fetch en cada change**
- [ ] Se guarda en searchParams - **❌ NO**
- [ ] Se limpia cuando se enfoca el input - **NO**
- [x] Se muestra mensaje si no hay resultados

### 14.2 Filtros

- [x] Se pueden combinar filtros (severity + status + search)
- [ ] Hay boton "Limpiar filtros" - **NO**
- [ ] Se guarda seleccion en URL - **❌ NO**
- [ ] Se valida que combinaciones de filtros sean validas - **No**

### 14.3 Performance

- [ ] Se deshabilita busqueda muy corta (< 3 caracteres) - **NO**
- [ ] Se cancela request anterior si hay nueva busqueda - **NO**

**Mejora sugerida - Agregar debounce:**

```typescript
// Usar el debounce que ya existe en blacklistUtils.ts
import { debounce } from '@/app/lib/blacklist/blacklistUtils'

const debouncedSearch = useMemo(
  () => debounce((term: string) => loadEntries(), 300),
  [loadEntries]
)
```

---

## 15. NOTIFICACIONES Y FEEDBACK

### 15.1 Toast Messages

- [ ] Se usan (react-hot-toast, react-toastify) - **No verificado**
- [ ] Hay toast en success de mutaciones - **No visible en page.tsx**
- [ ] Hay toast en error de operaciones - **No visible**
- [ ] Los mensajes son claros y utiles - **N/A**
- [ ] Desaparecen automaticamente - **N/A**

### 15.2 Loading States

- [x] Hay spinners en operaciones async
- [x] Se deshabilitan botones durante carga
- [x] Se muestra "Cargando..." en queries

### 15.3 Estados Vacios

- [x] Hay mensaje cuando listado esta vacio
- [ ] Hay icono o imagen descriptiva - **No**
- [ ] Se sugiere accion siguiente - **No**

```typescript
// Estado vacio actual
{entries.length === 0 && (
  <td colSpan={7} className="px-3 py-8 text-center text-xs text-gray-500">
    {searchTerm ? t('table.noResultsSearch') : t('table.noEntries')}
  </td>
)}
```

---

## 16. INTERNACIONALIZACION (i18n)

### 16.1 Estructura

- [x] Los textos estan externalizados en archivos
- [x] Hay archivo de traducciones por modulo (`blacklist.json`)
- [x] Estructura de carpetas: `messages/es/blacklist.json`

### 16.2 Uso

- [x] Se usa `useTranslations()` en Client Components
- [ ] Se pasan mensajes como props a hooks - **No hay hooks custom**
- [x] Hay namespace correcto (`'blacklist'`)
- [ ] Se soporta pluralizacion - **Parcial**

### 16.3 Completitud

- [x] Todos los textos visibles estan traducidos (252 lineas)
- [x] Error messages estan traducidos
- [x] Validaciones tienen mensajes i18n (en Zod schema)

```json
// blacklist.json - Estructura completa
{
  "title": "Blacklist",
  "page": { "title", "subtitle", "newEntry", "loading" },
  "stats": { "summary", "totalEntries", "critical", "highRisk", "active" },
  "filters": { ... },
  "table": { ... },
  "severity": { "low", "medium", "high", "critical" },
  "status": { "active", "deleted" },
  "detail": { ... },
  "form": { ... },
  "panels": { ... },
  "delete": { ... },
  "restore": { ... },
  "audit": { "actions", "fields", "values" },
  "messages": { ... },
  "notFound": { ... },
  "documentTypes": { ... },
  "modal": { ... },
  "ui": { "imageUploader": { ... } }
}
```

---

## 17. TESTING

### 17.1 Estructura

- [ ] Existen tests unitarios para hooks - **NO HAY TESTS**
- [ ] Existen tests de integracion para flujos - **NO**
- [ ] Framework: Vitest, Jest, Playwright - **N/A**
- [ ] Coverage > 70% - **0%**

### 17.2 Cobertura

- [ ] Se testean Server Actions - **NO**
- [ ] Se testean custom hooks - **NO**
- [ ] Se testean casos de error - **NO**
- [ ] Se testean validaciones - **NO**

### 17.3 Calidad

- **N/A** - No hay tests

---

## 18. PERFORMANCE Y OPTIMIZACIONES

### 18.1 Rendering

- [ ] Se usa `memo()` en componentes que reciben props complejas - **NO**
- [ ] Se evitan re-renders innecesarios - **NO optimizado**
- [x] Se memoizan callbacks con `useCallback` (loadEntries)
- [ ] Se memoizan valores con `useMemo` - **Parcial**

### 18.2 Datos

- [x] Se limita cantidad de datos fetched (50 items)
- [x] Se pagina listados grandes
- [ ] Se cachean resultados apropiadamente - **NO**
- [ ] Se implementa virtualization para listas muy largas - **NO**

### 18.3 Bundle

- [ ] Se importan solo componentes necesarios - **No verificado**
- [ ] Hay dynamic imports para componentes pesados - **NO**
- [ ] Se evitan librerias no usadas - **No verificado**

### 18.4 Medidas

- [ ] Se usa Lighthouse para medir performance - **No verificado**
- [ ] Core Web Vitals estan en verde - **No verificado**
- [ ] Hay plan de optimizacion si no - **No**

---

## 19. SEGURIDAD

### 19.1 Autenticacion

- [x] Se valida token en Server Actions
- [x] Tokens se guardan en httpOnly cookies
- [ ] Se implementa refresh token - **No en este modulo**
- [ ] Se logout limpia cookies - **No en este modulo**

### 19.2 Autorizacion

- [ ] Se verifica rol/permisos en Server Actions - **Solo existencia de token**
- [ ] Se ocultan elementos UI si no autorizados - **No**
- [ ] Se previene acceso directo a URL sin permiso - **Via middleware global**

### 19.3 Validacion

- [x] Se valida en cliente (UX) - Zod
- [ ] Se valida en servidor (seguridad) - **Basica**
- [ ] Se sanitizan inputs - **Parcial (transform uppercase)**
- [x] Se previene SQL injection (usar ORM) - **Backend**

### 19.4 CSRF

- [x] Server Actions son seguros contra CSRF - **Por diseno de Next.js**

---

## 20. DOCUMENTACION

### 20.1 Codigo

- [x] Hay comentarios en logica compleja
- [x] Se documenta por que, no que
- [ ] Hay ejemplos de uso - **No**
- [ ] Hay JSDoc en funciones publicas - **Parcial**

### 20.2 Archivo README o Documentacion

- [x] Existe documentacion para el modulo (`blacklistApi.md`)
- [ ] Documenta estructura de archivos - **No**
- [ ] Documenta Server Actions principales - **No**
- [x] Documenta API endpoints
- [ ] Hay ejemplos de uso - **No**

### 20.3 Commits

- No evaluado

---

## 21. INTEGRACION CON OTROS MODULOS

### 21.1 Dependencies

- [ ] El modulo depende de otros - **Solo auth/apiClient**
- [x] Las dependencias son claras
- [x] Se evitan dependencias circulares

### 21.2 Exports Publicos

- [ ] Se exporta desde `lib/blacklist/index.ts` - **NO EXISTE**
- [ ] Otros modulos pueden usar esto - **Parcial**
- [ ] La interfaz es clara y estable - **Parcial**

### 21.3 Compartir Datos

- [x] Se comparten tipos entre archivos
- [ ] Se evita duplicacion - **UI components duplicados**
- [ ] Hay API para acceder a datos del modulo - **No desde otros modulos**

---

## 22. DATABASE Y BACKEND (Si aplica)

### 22.1 Schema

- [x] Hay soft delete donde corresponde (`status: DELETED`)
- [x] Audit trail implementado

### 22.2 Queries Backend

- [x] Se pagina en backend
- [ ] Se proyectan solo campos necesarios - **No verificado**

### 22.3 Validaciones Backend

- [x] Hay validaciones de negocio en backend
- [ ] Se validan permisos - **No verificado**

---

## 23. AREAS DE MEJORA ESPECIFICAS DEL MODULO

### Top 3 Issues Criticos

1. **❌ page.tsx es 'use client'** - No hay SSR, peor SEO, mas JS
2. **❌ No hay error.tsx** - Sin error boundary a nivel de ruta
3. **❌ No hay React Query** - Sin cache client-side, sin optimistic updates

### Top 5 Mejoras Recomendadas

1. Convertir page.tsx a Server Component con Suspense
2. Crear error.tsx con boton reintentar
3. Implementar React Query con query keys factory
4. Agregar filtros a searchParams (URL state)
5. Crear Zustand store para estado UI

### Nice-to-haves

- Agregar debounce a busqueda
- Implementar virtualization para listas largas
- Agregar tests unitarios
- Crear barrel exports en lib/blacklist/

### Plan de Refactoring

| Fase | Tarea | Esfuerzo | Prioridad |
|------|-------|----------|-----------|
| 1 | Crear error.tsx | 30 min | Alta |
| 1 | Convertir page.tsx a Server Component | 2h | Alta |
| 1 | Crear BlacklistListClient.tsx | 1.5h | Alta |
| 2 | Crear queries.ts con React Query | 3h | Media |
| 2 | Migrar componentes a hooks | 3h | Media |
| 3 | Implementar URL state | 2h | Media |
| 4 | Crear Zustand store | 2h | Baja |

**Tiempo total estimado: 14 horas**

---

## 24. COMPARACION CON PARKING

| Aspecto | Parking (9.5/10) | Blacklist (7.5/10) | Diferencia |
|---------|------------------|-------------------|------------|
| page.tsx Server Component | ✅ | ❌ | Blacklist peor |
| Server Actions | ✅ 8+ | ✅ 6 | Similar |
| React Query (queries.ts) | ✅ | ❌ | Parking mejor |
| Zustand store | ✅ | ❌ | Parking mejor |
| loading.tsx | ✅ | ✅ | Igual |
| error.tsx | ✅ | ❌ | Parking mejor |
| Zod validation | ✅ | ✅ | Igual |
| i18n completo | ✅ | ✅ | Igual |
| URL state (searchParams) | ✅ | ❌ | Parking mejor |
| Utils especificos | ✅ | ✅ | Igual |
| Componentes UI | Usa lib compartida | Tiene propios | Diferente |

---

## 25. RESUMEN Y RECOMENDACIONES

### Estado General: 3/5 ⭐⭐⭐

### Fortalezas Principales

1. **6 Server Actions bien implementadas** - Token desde cookies, try-catch, revalidatePath
2. **Zod validation completa** - Schemas create/edit con .refine() y .transform()
3. **loading.tsx excelente** - 171 lineas con skeletons responsive
4. **i18n completo** - 252 lineas cubriendo todas las secciones
5. **Page de detalle correcta** - Server Component con initialData
6. **Utils especificos utiles** - debounce, highlight, formatDate, etc.

### Debilidades Criticas

1. **page.tsx del listado es Client Component** - No SSR
2. **No hay error.tsx** - Sin error boundary
3. **No hay React Query** - Sin cache ni optimistic updates
4. **Filtros no persisten en URL** - No compartible
5. **No hay Zustand store** - Estado disperso

### Hoja de Ruta de Mejora (2 semanas)

**Semana 1:**
- Dia 1-2: Crear error.tsx, convertir page.tsx a Server Component
- Dia 3-4: Implementar React Query con hooks

**Semana 2:**
- Dia 1-2: Agregar filtros a URL (searchParams)
- Dia 3: Crear Zustand store (opcional)
- Dia 4-5: Testing y ajustes

### Esfuerzo Estimado

- **Fase 1 (Critico):** 4 horas
- **Fase 2 (React Query):** 6 horas
- **Fase 3 (URL State):** 3 horas
- **Fase 4 (Zustand):** 2 horas

**Total: 15 horas**

---

## Score Final

| Categoria | Max | Score |
|-----------|-----|-------|
| Server Components | 15 | 8 |
| Server Actions | 15 | 14 |
| React Query | 10 | 0 |
| Estado URL | 10 | 2 |
| Zod Validation | 10 | 10 |
| TypeScript | 10 | 9 |
| i18n | 10 | 10 |
| Loading/Error | 10 | 7 |
| Componentes | 10 | 8 |

**Total: 68/100 = 6.8/10**

**Score Ajustado: 7.5/10** (considerando calidad de Server Actions y Zod)
