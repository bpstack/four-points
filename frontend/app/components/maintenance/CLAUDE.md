# CLAUDE.md — Maintenance

> Módulo de partes de mantenimiento del hotel. **Un único archivo** porque el módulo no es lo bastante grande para justificar split backend/frontend; el archivo vive en `frontend/app/components/maintenance/` que es donde está la mayor superficie de código.

## Propósito

Reportes de mantenimiento (averías, incidencias técnicas). Cada **report** describe una incidencia con ubicación, prioridad, asignación, estado de workflow, imágenes adjuntas y un historial completo de cambios. El módulo cubre toda la cadena: alta → asignación → en curso → resuelto → cerrado, con soft delete + restore.

## Workflow de estado

```
reported ──► assigned ──► in_progress ──► completed ──► closed
   │                          │                │
   │                          ▼                │
   │                       waiting             │
   │                          │                │
   ▼                          ▼                ▼
                          canceled ◄──────────┘
```

**7 estados** definidos en `frontend/app/lib/maintenance/maintenance.ts`:

| Estado | Significado |
|---|---|
| `reported` | Recién creado, sin asignar |
| `assigned` | Asignado a alguien (interno o externo) pero sin empezar |
| `in_progress` | Trabajando en ello |
| `waiting` | Bloqueado por algo externo (esperando pieza, presupuesto, etc.) |
| `completed` | Resuelto, pendiente de cierre formal |
| `closed` | Cerrado definitivamente, no se reabre |
| `canceled` | Cancelado (duplicado, no procede, etc.) |

**4 prioridades:** `low`, `medium`, `high`, `urgent`. **5 location types:** `room`, `common_area`, `exterior`, `facilities`, `other`. **2 assigned types:** `internal` (asignado a usuario del sistema) o `external` (empresa externa con `external_company_name` + `external_contact`).

**Constraint:** si `location_type === 'room'`, `room_number` es obligatorio. Validado en el schema Zod del frontend (`reportSchema.refine()` en `maintenance-schemas.ts`) y en el backend (`reportFiltersSchema`).

## Estructura

```
backend/controllers/maintenance/
   └── maintenance-controller.ts        (753 líneas — clase con métodos estáticos
                                          MaintenanceController.getAll, create, etc.)

backend/repositories/maintenance/
   └── maintenance-repository.ts        (970 líneas — todo el SQL del módulo;
                                          incluye imágenes e historial)

backend/routes/maintenance/
   └── maintenance-routes.ts            (155 líneas — 14 rutas)

backend/validations/maintenance/
   └── schemas.ts                       (Zod schemas: create, update, status, priority,
                                          resolution, filters, idParam, assign)

frontend/app/dashboard/maintenance/
   ├── page.tsx                         (64 líneas — Server: SSR de la lista inicial)
   ├── error.tsx / loading.tsx
   ├── [id]/page.tsx                    (detalle por ID)
   └── actions/getMaintenance.ts        (server action para SSR)

frontend/app/components/maintenance/
   ├── MaintenanceListClient.tsx        (766 líneas — la lista con filtros y modales)
   ├── ReportDetailClient.tsx           (124 líneas — wrapper del detalle)
   ├── hooks/useMaintenanceList.ts      (185 líneas — React Query con keys factory)
   ├── layout/
   │   ├── ReportHeader.tsx
   │   └── TabNavigation.tsx
   ├── panels/
   │   ├── CreateReportPanel.tsx        (359 líneas — formulario create)
   │   └── EditReportPanel.tsx          (454 líneas — formulario edit)
   ├── tabs/
   │   ├── DetailTab.tsx                (634 líneas — el tab principal de la vista detalle)
   │   └── HistoryTab.tsx               (166 líneas — historial de cambios)
   └── shared/                          (EmptyState, LoadingSpinner)

frontend/app/lib/maintenance/
   ├── maintenance.ts                   (types: ReportStatus, ReportPriority, etc.)
   ├── maintenanceApi.ts                (apiClient calls)
   └── maintenance-schemas.ts           (Zod del lado UI)
```

## Backend — endpoints

| Método y ruta | Propósito |
|---|---|
| `GET /api/maintenance` | Lista con filtros: status, priority, location_type, assigned_to, created_by, room_number, search, date_from, date_to, include_deleted; paginación `page` + `limit` |
| `GET /api/maintenance/stats` | Estadísticas agregadas |
| `GET /api/maintenance/:id` | Detalle con imágenes + historial |
| `POST /api/maintenance` | Crear report |
| `PATCH /api/maintenance/:id` | Update general |
| `PATCH /api/maintenance/:id/status` | Cambiar solo estado (con `notes?`) |
| `PATCH /api/maintenance/:id/priority` | Cambiar solo prioridad |
| `PATCH /api/maintenance/:id/resolution-notes` | Añadir notas de resolución |
| `PATCH /api/maintenance/:id/assign` | Asignar (interno o externo) |
| `DELETE /api/maintenance/:id` | Soft delete |
| `PATCH /api/maintenance/:id/restore` | Restaurar |
| `GET /api/maintenance/:id/images` | Listar imágenes |
| `POST /api/maintenance/:id/images` | Subir imagen (multipart, 5 MB máx) |
| `DELETE /api/maintenance/:id/images/:imageId` | Borrar imagen |
| `GET /api/maintenance/:id/history` | Historial de cambios |

**Middleware:** todas las rutas tras `authenticateToken` + `canAccessMaintenance`. Este middleware permite **al rol mantenimiento entrar** — al contrario de la mayoría de módulos que lo excluyen.

**Imágenes:** multer in-memory + Cloudinary. Hardcap 5 MB por archivo en el middleware multer.

## Patrón controllers-as-class

`MaintenanceController` es **clase con métodos estáticos**, mismo patrón que parking (`ParkingBookingsController`). No es el patrón estándar del proyecto (la mayoría usa funciones exportadas sueltas), pero es coherente dentro de este módulo. Si añades un controller nuevo aquí, sigue el patrón clase.

## Historial (`maintenance_history`)

Cada cambio importante se logea con un `action` de este set:

- `created`
- `status_changed`
- `priority_changed`
- `updated`
- `assigned`
- `resolved`
- `closed`
- `deleted`
- `restored`

Visible en `HistoryTab.tsx`. **Regla:** toda mutación que afecte el estado o la asignación del report debe pasar por el repo en una llamada que también escribe en `maintenance_history`. Si añades una mutation nueva, asegúrate de añadir el log; si el `action` no encaja en los actuales, extiende el enum del lado TS y del lado DB (CHECK constraint).

## Frontend — patterns

### `useMaintenanceList(filters, page, limit, initialData, messages)`

Hook orchestrator del listado. Recibe el `initialData` del SSR (para el primer paint sin spinner) y solo lo usa cuando no hay filtros activos — si el usuario filtra, se descarta el cache server y se hace fetch fresh. Mismo patrón `messages` injection que logbook: los toasts i18n se pasan desde el contenedor para que el hook sea i18n-agnostic.

### `maintenanceKeys` factory

```ts
maintenanceKeys.list(filters)    // ['maintenance', 'list', filters]
maintenanceKeys.detail(id)       // ['maintenance', 'detail', id]
maintenanceKeys.stats()          // ['maintenance', 'stats']
```

A diferencia de parking (que no tiene factory), aquí sí porque la jerarquía de invalidaciones es más compleja (un edit de un report debe invalidar tanto su detail como las lists que lo contengan).

### Detalle por tabs

`ReportDetailClient` monta `TabNavigation` + el tab activo (`DetailTab` o `HistoryTab`). La URL preserva el tab activo en query string para que F5 mantenga la vista.

`DetailTab.tsx` (634 líneas) es el grueso de la UI de detalle: cabecera, descripción, ubicación, asignación, imágenes con preview, acciones inline para cambiar estado/prioridad/asignación, formularios de resolution-notes.

### CreateReportPanel + EditReportPanel

Dos paneles separados (no un modal reutilizado) porque los flujos divergen: el create exige campos mínimos y autocompleta `status: 'reported'`; el edit permite tocar cualquier campo según los permisos. Ambos validan con el mismo `reportSchema` de Zod (`maintenance-schemas.ts`).

## Auth / permisos

`canAccessMaintenance` permite a:
- `admin`, `group-admin`, `demo-admin`
- `recepcionista`
- **`mantenimiento`** (este es el módulo donde sí entra)

Es uno de los pocos módulos accesibles para el rol mantenimiento — de hecho es **su módulo principal de trabajo**. Tenlo en cuenta si vas a tocar permisos: la UX para mantenimiento es clave.

## Gotchas conocidos

1. **`canAccessMaintenance` permite mantenimiento.** Los demás módulos lo bloquean. Si añades un endpoint global que cruza módulos, ten en cuenta qué roles pueden llegar.
2. **`location_type='room' ⇒ room_number` requerido.** Validación cruzada en Zod (`.refine`). Si añades un nuevo `location_type` con regla similar, repite el patrón.
3. **Status `closed` es definitivo.** El UI no expone reopen desde `closed`. Si lo necesitas, hay que añadir tanto endpoint backend como UI; revisar `maintenance_history.action` para coherencia.
4. **`DetailTab.tsx` con 634 líneas y `MaintenanceListClient.tsx` con 766 líneas.** En el radar para split si crece más, no urgente.
5. **Image upload max 5 MB.** Hardcoded en el multer config en `routes/maintenance/maintenance-routes.ts`. Si cambia el requisito, ajustar ahí.

## Referencias cruzadas

- `backend/middlewares/roleCheck.ts → canAccessMaintenance` — los roles permitidos.
- `backend/services/blacklist/cloudinary-service.ts` — el helper Cloudinary que también usa este módulo para subir imágenes.
- `frontend/app/lib/maintenance/maintenance.ts` — todos los types y enums.
