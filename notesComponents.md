# Análisis de Migración y Refactorización - Four Points

**Fecha:** 14 Diciembre 2025

---

## PARTE 1: ANÁLISIS DEL FRONTEND

### 1.1 Estado Actual por Sección

| Sección     | Server Actions    | Client API              | Zustand Store            | Types           | Validation  | Componentes       |
| ----------- | ----------------- | ----------------------- | ------------------------ | --------------- | ----------- | ----------------- |
| Blacklist   | `/actions` folder | `lib/blacklistApi.ts`   | No                       | Completos       | Zod schemas | 17 componentes    |
| Maintenance | `/actions` folder | `lib/maintenanceApi.ts` | `useMaintenanceStore.ts` | Completos       | Zod schemas | 9 componentes     |
| Groups      | Via API routes    | `api/groups/route.ts`   | `useGroupStore.ts`       | Inline en route | Schema file | 21 componentes    |
| Logbooks    | **NINGUNO**       | `api/logbooks/route.ts` | **NINGUNO**              | Parciales       | Zod schemas | **2 componentes** |

---

### 1.2 LOGBOOKS - Análisis Crítico (PRIORIDAD MÁXIMA)

#### Inventario de Archivos

| Archivo                                   | Líneas   | Propósito                  | Problemas          |
| ----------------------------------------- | -------- | -------------------------- | ------------------ |
| `dashboard/logbooks/page.tsx`             | **1224** | Vista principal            | **GOD COMPONENT**  |
| `dashboard/logbooks/layout.tsx`           | 326      | Navegación + data fetching | Mezcla de concerns |
| `lib/logbooks/types.ts`                   | 91       | Definiciones de tipos      | Tipos duplicados   |
| `lib/logbooks/validations.ts`             | 82       | Zod schemas                | Correcto           |
| `lib/logbooks/hooks/useDepartments.ts`    | 175      | Fetch de departamentos     | Buen patrón        |
| `components/logbooks/NewLogbookEntry.tsx` | 299      | Modal crear entrada        | Demasiado grande   |
| `components/logbooks/NewCommentEntry.tsx` | 205      | Modal crear comentario     | Aceptable          |

---

#### Problema 1: GOD COMPONENT (page.tsx - 1224 líneas)

Este archivo contiene TODO en UN solo archivo:

```typescript
// page.tsx contiene:
- ReadByAvatars component (inline)
- getPriorityLabel helper
- getPriorityColor helper
- getPriorityBackground helper
- formatUsername function
- getInitials function
- 19 useState hooks
- 12 handler functions
- 2 modales completos (edit logbook, edit comment)
- Layout desktop
- Layout mobile
- Toda la lógica CRUD
```

**Recomendación:** Dividir en mínimo 8-10 archivos.

---

#### Problema 2: Sin Server Actions

A diferencia de blacklist y maintenance, logbooks NO tiene carpeta `actions/`. Todo el data fetching se hace en layout.tsx con llamadas client-side:

```typescript
// layout.tsx - línea 39-109
const loadEntries = async (year: number, month: number, day: number) => {
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  try {
    const data = await logbooksApi.getLogbooksByDay(dateString)
    // ... 70 líneas de transformación de datos
  }
}
```

**Impacto:** Sin SSR, sin caché, carga inicial lenta, sin beneficio SEO.

---

#### Problema 3: Sin Zustand Store

Maintenance y Groups usan Zustand stores. Logbooks usa **19 useState hooks** en un solo componente:

```typescript
// page.tsx líneas 167-197
const [commentModalOpen, setCommentModalOpen] = useState<number | null>(null)
const [newComment, setNewComment] = useState('')
const [commentPriority, setCommentPriority] = useState<...>('baja')
const [commentDepartment, setCommentDepartment] = useState<number>(1)
const [isSubmitting, setIsSubmitting] = useState(false)
const [localEntries, setLocalEntries] = useState<LogEntry[]>([])
const [editModalOpen, setEditModalOpen] = useState<number | null>(null)
const [editMessage, setEditMessage] = useState('')
const [editPriority, setEditPriority] = useState<...>('baja')
const [editDepartment, setEditDepartment] = useState<number>(1)
const [isEditSubmitting, setIsEditSubmitting] = useState(false)
const [editCommentModalOpen, setEditCommentModalOpen] = useState<...>(null)
const [editCommentText, setEditCommentText] = useState('')
const [editCommentPriority, setEditCommentPriority] = useState<...>('baja')
const [editCommentDepartment, setEditCommentDepartment] = useState<number>(1)
const [isEditCommentSubmitting, setIsEditCommentSubmitting] = useState(false)
const [readByUsers, setReadByUsers] = useState<Record<number, ReadByUser[]>>({})
const [loadingReaders, setLoadingReaders] = useState<Record<number, boolean>>({})
```

---

#### Problema 4: Código Duplicado

- Layouts desktop y mobile tienen renderizado de comentarios casi idéntico (líneas 649-716 y 744-803)
- Dos modales casi idénticos para edición (logbook y comment)
- Funciones helper de prioridad duplicadas de maintenance

---

#### Problema 5: Faltan Componentes

La carpeta `components/logbooks/` solo tiene 2 archivos vs:

- `groups/`: 21 componentes
- `blacklist/`: 17 componentes
- `maintenance/`: 9 componentes

---

#### Problema 6: Uso de `any` en TypeScript

```typescript
// page.tsx línea 302
} catch (error: any) {

// page.tsx línea 438
} catch (error: any) {

// page.tsx línea 520
} catch (error: any) {

// page.tsx línea 657
.map((comment: any) => (   // Dentro de JSX
```

---

#### Problema 7: Imports Dinámicos en Event Handlers

```typescript
// page.tsx - Este patrón se repite 10+ veces
const handleSaveEdit = async () => {
  // ...
  try {
    const { logbooksApi } = await import('@/app/api/logbooks/route')  // ❌
    await logbooksApi.updateLogbook(editModalOpen!, { ... })
```

El API debería importarse al inicio del archivo.

---

#### Problema 8: Nomenclatura de Prioridades Mezclada

```typescript
// Frontend usa 'low' | 'medium' | 'high' | 'critical'
// Backend/API usa 'baja' | 'media' | 'alta' | 'urgente'
// ¡Ambos se usan en el mismo archivo!

// línea 169
const [commentPriority, setCommentPriority] = useState<
  "baja" | "media" | "alta" | "urgente"
>("baja");

// línea 278
let priority: "low" | "medium" | "high" | "critical" = "low";
```

---

### 1.3 Plan de Refactorización para Logbooks

#### Paso 1: Crear carpeta `/dashboard/logbooks/actions/`

```
actions/
├── getLogbooksByDay.ts
├── createLogbook.ts
├── updateLogbook.ts
├── deleteLogbook.ts
├── toggleStatus.ts
├── toggleRead.ts
└── index.ts
```

#### Paso 2: Crear `useLogbookStore.ts`

```typescript
interface LogbookStore {
  entries: LogEntry[];
  selectedDate: Date;
  editingEntry: number | null;
  editingComment: { entryId: number; commentId: number } | null;
  isSubmitting: boolean;
  // ... actions
}
```

#### Paso 3: Dividir page.tsx en componentes

```
components/logbooks/
├── LogbookEntry.tsx           # Card de entrada individual
├── LogbookEntryMobile.tsx     # Variante móvil
├── LogbookComments.tsx        # Sección de comentarios
├── LogbookActions.tsx         # Botones de acción
├── ReadByAvatars.tsx          # Display de avatars
├── EditLogbookModal.tsx       # Modal de edición
├── EditCommentModal.tsx       # Modal edición comentario
├── PriorityBadge.tsx          # Display de prioridad
├── StatusBadge.tsx            # Display de estado
└── shared/
    ├── LoadingSpinner.tsx
    └── EmptyState.tsx
```

#### Paso 4: Extraer funciones helper

Crear `lib/logbooks/helpers.ts`:

```typescript
export const getPriorityLabel = ...
export const getPriorityColor = ...
export const getPriorityBackground = ...
export const formatUsername = ...
export const getInitials = ...
```

---

### 1.4 Problemas en Otras Secciones

#### Maintenance

| Problema                                   | Ubicación                 | Severidad |
| ------------------------------------------ | ------------------------- | --------- |
| MaintenanceListClient.tsx tiene 594 líneas | `components/maintenance/` | Media     |
| Función formatDate inline                  | Línea 179                 | Baja      |
| Objetos de config duplicados               | Líneas 105-177            | Media     |

#### Blacklist

| Problema                                 | Ubicación     | Severidad |
| ---------------------------------------- | ------------- | --------- |
| Usa `as any` para searchParams           | `page.tsx:48` | Baja      |
| Tipos `BlacklistListResponse` duplicados | api y actions | Baja      |

#### Groups

| Problema                            | Ubicación             | Severidad |
| ----------------------------------- | --------------------- | --------- |
| Tipos definidos inline en route.ts  | `api/groups/route.ts` | Media     |
| Sin schemas de validación separados | -                     | Media     |

---

### 1.5 Análisis de Tamaño de Componentes

| Componente                              | Líneas   | Estado      | Acción Necesaria        |
| --------------------------------------- | -------- | ----------- | ----------------------- |
| `logbooks/page.tsx`                     | **1224** | **CRÍTICO** | Dividir en 8+ archivos  |
| `maintenance/MaintenanceListClient.tsx` | 594      | Advertencia | Considerar división     |
| `logbooks/layout.tsx`                   | 326      | Advertencia | Extraer lógica de datos |
| `logbooks/NewLogbookEntry.tsx`          | 299      | Aceptable   | Podría dividir modal    |

---

### 1.6 Estrategias de Renderizado Recomendadas

| Tipo    | Descripción               | Uso en Four-Points                                                  |
| ------- | ------------------------- | ------------------------------------------------------------------- |
| **SSG** | Genera HTML en build time | Páginas públicas (login, landing)                                   |
| **SSR** | Renderiza en cada request | Dashboard y módulos (dependen del usuario)                          |
| **CSR** | Renderiza en navegador    | Componentes interactivos (formularios, modales, tablas con filtros) |

**Buenas Prácticas:**

- Mantén los Client Components lo más abajo posible en el árbol
- Si solo un botón necesita interactividad, solo ese botón debe ser Client Component
- Usa `'use client'` solo cuando sea necesario

---

## PARTE 2: MIGRACIÓN BACKEND JS → TS

### 2.1 Estado Actual

| Categoría    | TypeScript | JavaScript | % Migrado |
| ------------ | ---------- | ---------- | --------- |
| Config       | 1          | 2          | 33%       |
| Types        | 1          | 0          | 100%      |
| Models       | 8          | 0          | 100%      |
| Controllers  | 18         | 10         | 64%       |
| Repositories | 16         | 11         | 59%       |
| Routes       | 9          | 8          | 53%       |
| Services     | 7          | 4          | 64%       |
| Validations  | 4          | 4          | 50%       |
| Middlewares  | 1          | 2          | 33%       |
| **Total**    | **65**     | **43**     | **60%**   |

---

### 2.2 Archivos que Necesitan Migración (43 archivos)

#### Config (2 archivos)

| Archivo                | Líneas | Complejidad |
| ---------------------- | ------ | ----------- |
| `config/config.js`     | ~50    | Baja        |
| `config/date-utils.js` | ~30    | Baja        |

#### Controllers (10 archivos)

| Archivo                                              | Líneas | Complejidad |
| ---------------------------------------------------- | ------ | ----------- |
| `controllers/auth/auth-controllers.js`               | 228    | Media       |
| `controllers/auth/user-controllers.js`               | ~150   | Media       |
| `controllers/logbook/logbook-controllers.js`         | 239    | Media       |
| `controllers/logbook/logbookComments-controllers.js` | ~150   | Media       |
| `controllers/logbook/logbookReads-controllers.js`    | ~100   | Baja        |
| `controllers/departments/departments-controller.js`  | ~100   | Baja        |
| `controllers/parking/parking.controller.js`          | 415    | Alta        |
| `controllers/parking/bookings.controller.js`         | ~300   | Alta        |
| `controllers/parking/stats.controller.js`            | ~150   | Media       |
| `controllers/parking/analytics.controller.js`        | ~200   | Media       |

#### Repositories (11 archivos)

| Archivo                                                     | Líneas | Complejidad |
| ----------------------------------------------------------- | ------ | ----------- |
| `repositories/auth/user-repository.js`                      | 365    | Alta        |
| `repositories/logbook/logbook-repository.js`                | ~200   | Media       |
| `repositories/logbook/logbookComments-repository.js`        | ~150   | Media       |
| `repositories/logbook/logbookHistory-repository.js`         | ~100   | Baja        |
| `repositories/logbook/logbookCommentsHistory-repository.js` | ~100   | Baja        |
| `repositories/logbook/logbookReads-repository.js`           | ~80    | Baja        |
| `repositories/departments/departments-repository.js`        | ~80    | Baja        |
| `repositories/parking/parking.repository.js`                | 288    | Alta        |
| `repositories/parking/bookings.repository.js`               | ~250   | Alta        |
| `repositories/parking/stats.repository.js`                  | ~150   | Media       |

#### Routes (8 archivos)

| Archivo                                    | Líneas | Complejidad |
| ------------------------------------------ | ------ | ----------- |
| `routes/auth/auth-routes.js`               | ~50    | Baja        |
| `routes/auth/user-routes.js`               | ~80    | Baja        |
| `routes/logbook/logbook-routes.js`         | ~100   | Baja        |
| `routes/departments/departments-routes.js` | ~50    | Baja        |
| `routes/parking/parking.routes.js`         | ~80    | Baja        |
| `routes/parking/bookings.routes.js`        | ~100   | Baja        |
| `routes/parking/stats.routes.js`           | ~50    | Baja        |
| `routes/parking/analytics.routes.js`       | ~50    | Baja        |

#### Services (4 archivos)

| Archivo                                      | Líneas | Complejidad |
| -------------------------------------------- | ------ | ----------- |
| `services/tokenService.js`                   | 69     | Baja        |
| `services/logbookHistory-service.js`         | ~100   | Media       |
| `services/logbookCommentsHistory-service.js` | ~80    | Baja        |
| `services/parking/invoicePdfService.js`      | ~200   | Media       |

#### Middlewares (2 archivos)

| Archivo                            | Líneas | Complejidad |
| ---------------------------------- | ------ | ----------- |
| `middlewares/authenticateToken.js` | 67     | Media       |
| `middlewares/roleCheck.js`         | 138    | Media       |

#### Validations (4 archivos)

| Archivo                                     | Líneas | Complejidad |
| ------------------------------------------- | ------ | ----------- |
| `validations/auth/user-validation.js`       | ~80    | Baja        |
| `validations/logbook/logbook-schemas.js`    | ~60    | Baja        |
| `validations/parking/vehicle-validation.js` | 110    | Baja        |
| `validations/parking/booking-validation.js` | ~100   | Baja        |

#### Root (1 archivo)

| Archivo    | Líneas | Complejidad |
| ---------- | ------ | ----------- |
| `index.js` | ~150   | Media       |

---

### 2.3 Orden de Migración Recomendado

#### Fase 1: Infraestructura Compartida (CRÍTICO)

Migrar primero porque son dependencias de otros módulos.

| Orden | Archivo                            | Razón                           |
| ----- | ---------------------------------- | ------------------------------- |
| 1     | `config/config.js`                 | Usado por todos los módulos     |
| 2     | `config/date-utils.js`             | Funciones utilitarias           |
| 3     | `middlewares/authenticateToken.js` | Middleware crítico de seguridad |
| 4     | `middlewares/roleCheck.js`         | Autorización crítica            |
| 5     | `services/tokenService.js`         | Dependencia de auth             |

#### Fase 2: Módulo Auth (ALTA PRIORIDAD)

Crítico para seguridad, módulo independiente.

| Orden | Archivo                                | Razón               |
| ----- | -------------------------------------- | ------------------- |
| 6     | `validations/auth/user-validation.js`  | Baja complejidad    |
| 7     | `repositories/auth/user-repository.js` | Lógica core de auth |
| 8     | `controllers/auth/auth-controllers.js` | Depende del repo    |
| 9     | `controllers/auth/user-controllers.js` | Depende del repo    |
| 10    | `routes/auth/auth-routes.js`           | Capa final          |
| 11    | `routes/auth/user-routes.js`           | Capa final          |

#### Fase 3: Módulo Logbook (PRIORIDAD MEDIA)

Complejidad moderada, módulo aislado.

| Orden | Archivo                                                     |
| ----- | ----------------------------------------------------------- |
| 12    | `validations/logbook/logbook-schemas.js`                    |
| 13    | `services/logbookHistory-service.js`                        |
| 14    | `services/logbookCommentsHistory-service.js`                |
| 15    | `repositories/logbook/logbook-repository.js`                |
| 16    | `repositories/logbook/logbookComments-repository.js`        |
| 17    | `repositories/logbook/logbookHistory-repository.js`         |
| 18    | `repositories/logbook/logbookCommentsHistory-repository.js` |
| 19    | `repositories/logbook/logbookReads-repository.js`           |
| 20    | `controllers/logbook/logbook-controllers.js`                |
| 21    | `controllers/logbook/logbookComments-controllers.js`        |
| 22    | `controllers/logbook/logbookReads-controllers.js`           |
| 23    | `routes/logbook/logbook-routes.js`                          |

#### Fase 4: Módulo Parking (PRIORIDAD MEDIA)

Módulo JavaScript más complejo restante.

| Orden | Archivo                                       |
| ----- | --------------------------------------------- |
| 24    | `validations/parking/vehicle-validation.js`   |
| 25    | `validations/parking/booking-validation.js`   |
| 26    | `services/parking/invoicePdfService.js`       |
| 27    | `repositories/parking/parking.repository.js`  |
| 28    | `repositories/parking/bookings.repository.js` |
| 29    | `repositories/parking/stats.repository.js`    |
| 30    | `controllers/parking/parking.controller.js`   |
| 31    | `controllers/parking/bookings.controller.js`  |
| 32    | `controllers/parking/stats.controller.js`     |
| 33    | `controllers/parking/analytics.controller.js` |
| 34-37 | Todas las rutas de parking                    |

#### Fase 5: Módulo Departments (BAJA PRIORIDAD)

Módulo simple con pocas dependencias.

| Orden | Archivo                                              |
| ----- | ---------------------------------------------------- |
| 38    | `repositories/departments/departments-repository.js` |
| 39    | `controllers/departments/departments-controller.js`  |
| 40    | `routes/departments/departments-routes.js`           |

#### Fase 6: Aplicación Root (BAJA PRIORIDAD)

| Orden | Archivo    |
| ----- | ---------- |
| 41    | `index.js` |

---

### 2.4 Tipos que Necesitan Crearse

#### Auth Module (`models/auth/index.ts`)

```typescript
export interface User {
  id: string; // UUID
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  role_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
}

export type UserRole = "admin" | "recepcionista" | "group-admin";

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: Omit<User, "password">;
  token?: string;
  refreshToken?: string;
}

export interface TokenPayload {
  id: string;
  username: string;
  role: string;
}
```

#### Logbook Module (`models/logbook/index.ts`)

```typescript
export type ImportanceLevel = "baja" | "media" | "alta" | "urgente";

export interface Logbook {
  id: number;
  message: string;
  importance: ImportanceLevel;
  author_id: string;
  department_id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface LogbookComment {
  id: number;
  logbook_id: number;
  comment: string;
  author_id: string;
  created_at: Date;
  deleted_at: Date | null;
}

export interface CreateLogbookDTO {
  message: string;
  importance: ImportanceLevel;
  author_id: string;
  department_id: number;
}
```

#### Parking Module (`models/parking/index.ts`)

```typescript
export type SpotType = "standard" | "large" | "disabled" | "electric";
export type BookingStatus =
  | "reserved"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export interface ParkingSpot {
  id: number;
  spot_number: number;
  level_code: string;
  spot_type: SpotType;
  is_active: boolean;
}

export interface ParkingBooking {
  id: number;
  spot_id: number;
  vehicle_id: number;
  operator_id: string;
  expected_checkin: Date;
  expected_checkout: Date;
  status: BookingStatus;
}
```

---

### 2.5 Patrones a Seguir (de archivos TS existentes)

#### Patrón de Repository

```typescript
import db from "../../config/db";
import { ResultSetHeader } from "mysql2";

export class GroupRepository {
  static async getAll(filters: GroupFilters = {}): Promise<Group[]> {
    const [rows] = await db.query<Group[]>(query, params);
    return rows;
  }

  static async create(data: CreateDTO): Promise<Entity> {
    const [result] = await db.query<ResultSetHeader>(query, params);
    return { id: result.insertId, ...data };
  }
}
```

#### Patrón de Controller

```typescript
import { Request, Response } from "express";

export class GroupController {
  static async getAllGroups(req: Request, res: Response): Promise<Response> {
    try {
      const results = await GroupRepository.getAll();
      return res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: "Error message",
      });
    }
  }
}
```

#### Patrón de Routes

```typescript
import { Router } from "express";
import { authenticateToken } from "../../middlewares/authenticateToken.js";
import { GroupController } from "../../controllers/group/group-controller.js";

const router = Router();

router.get("/", authenticateToken, GroupController.getAllGroups);

export default router;
```

---

### 2.6 Checklist de Migración por Archivo

Para cada archivo, seguir este checklist:

- [ ] Crear tipos/interfaces en archivo `models/` apropiado
- [ ] Cambiar extensión de `.js` a `.ts`
- [ ] Añadir anotaciones de tipo a:
  - [ ] Parámetros de función
  - [ ] Tipos de retorno
  - [ ] Variables donde la inferencia no es suficiente
- [ ] Importar tipos desde `models/`
- [ ] Usar `Request` y `Response` de express
- [ ] Tipar resultados de queries con generics
- [ ] Manejar valores nullable correctamente
- [ ] Actualizar imports en archivos dependientes
- [ ] Añadir extensión `.js` a imports locales (para ESM)
- [ ] Ejecutar `tsc --noEmit` para verificar errores
- [ ] Probar funcionalidad manualmente

---

## PARTE 3: RESUMEN DE PRIORIDADES

### Frontend - Orden de Refactorización

| Prioridad | Tarea                                       | Tiempo Estimado |
| --------- | ------------------------------------------- | --------------- |
| 1         | Dividir `logbooks/page.tsx` en componentes  | 1-2 días        |
| 2         | Crear `useLogbookStore.ts`                  | 2-3 horas       |
| 3         | Crear server actions para logbooks          | 3-4 horas       |
| 4         | Extraer helpers a `lib/logbooks/helpers.ts` | 1 hora          |
| 5         | Estandarizar nomenclatura de prioridades    | 2 horas         |
| 6         | Corregir todos los tipos `any`              | 2-3 horas       |

### Backend - Orden de Migración

| Prioridad | Módulo          | Archivos    | Tiempo Estimado |
| --------- | --------------- | ----------- | --------------- |
| 1         | Infraestructura | 5 archivos  | 2-3 horas       |
| 2         | Auth            | 6 archivos  | 3-4 horas       |
| 3         | Logbook         | 12 archivos | 4-6 horas       |
| 4         | Parking         | 14 archivos | 6-8 horas       |
| 5         | Departments     | 3 archivos  | 1 hora          |
| 6         | Root            | 1 archivo   | 30 min          |

**Tiempo total estimado:**

- Frontend (logbooks): 2-3 días
- Backend (migración completa): 2-3 días

---

## PARTE 4: ARQUITECTURA RECOMENDADA

### Estructura Consistente para Todas las Secciones

```
/dashboard/{section}/
├── page.tsx              # Server component, usa server actions
├── layout.tsx            # Opcional, solo si necesita UI compartida
├── actions/
│   ├── get{Section}.ts   # Server actions
│   ├── create{Section}.ts
│   ├── update{Section}.ts
│   └── index.ts
└── [id]/
    └── page.tsx

/lib/{section}/
├── types.ts              # Todas las interfaces TypeScript
├── schemas.ts            # Esquemas de validación Zod
├── {section}Api.ts       # API client-side (para client components)
├── helpers.ts            # Funciones utilitarias puras
└── hooks/                # Custom hooks si necesarios

/components/{section}/
├── {Section}ListClient.tsx    # Componente cliente principal
├── {Section}Card.tsx          # Display de item individual
├── panels/                    # Side panels para CRUD
├── modals/                    # Modal dialogs
├── shared/                    # Compartidos de la sección
└── ui/                        # UI primitivos de la sección

/stores/
└── use{Section}Store.ts  # Si hay estado cliente significativo
```

---

## NOTAS ADICIONALES

### Sobre el Sistema de Auth

Recuerda que además de esta refactorización, tienes pendiente:

1. Proteger TODAS las rutas de logbooks en backend
2. Decisión sobre migración JWT → Sessions
3. Configurar Next.js rewrites para desarrollo

Ver `notes.md` para el análisis completo del sistema de autenticación.
