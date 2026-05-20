# Checklist Module

Sistema de checklists operativos diarios para el hotel. Permite al personal registrar el avance de tareas por turno con comentarios, imágenes y trazabilidad completa.

---

## Arquitectura

El módulo usa un modelo **híbrido estático/dinámico**:

- **Contenido estático**: la estructura de las checklists (secciones, pasos, títulos, notas) vive en archivos JSON/Markdown en el sistema de ficheros (`content/checklist/`). La BD no almacena contenido.
- **Estado dinámico**: la BD almacena el estado de completado por ejecución, comentarios, adjuntos y un log de eventos.

### Concepto clave: el "run"

Un `checklist_run` es una instancia de una checklist para un día de hotel. Solo puede haber un run *activo* por checklist por día (`reset_at IS NULL`). A las 06:30 (Madrid) el cron cierra automáticamente los runs del día anterior.

---

## Endpoints

**Base:** `/api/checklists` — todos requieren `authenticateToken` + `excludeMantenimiento`

| Método | Ruta | Acceso extra | Descripción |
|--------|------|-------------|-------------|
| `GET` | `/:id/run` | — | Obtiene (o crea) el run activo del día. Cierra runs caducados de días anteriores. Devuelve run + estado de todos los pasos con conteos de comentarios/adjuntos. |
| `GET` | `/:id/history` | — | Historial de runs cerrados. Query: `limit` (max 100, default 30), `date_from`, `date_to` (YYYY-MM-DD). |
| `PATCH` | `/:id/steps/:stepId` | — | Marcar/desmarcar un paso. Body: `{ done: boolean }`. Valida `stepId` contra el JSON de contenido. |
| `POST` | `/:id/reset` | `canResetChecklist` | Cierra el run activo y crea uno vacío nuevo. Registra evento `reset_manual`. |
| `GET` | `/:id/steps/:stepId/comments` | — | Lista comentarios del paso en el run actual. |
| `POST` | `/:id/steps/:stepId/comments` | — | Añade comentario. Body: `{ body: string }` (1–500 chars). |
| `DELETE` | `/:id/steps/:stepId/comments/:commentId` | — | Elimina comentario. 403 si no es el autor ni admin. |
| `GET` | `/:id/steps/:stepId/attachments` | — | Lista adjuntos del paso. |
| `POST` | `/:id/steps/:stepId/attachments` | — | Sube imagen (`multipart/form-data`, campo `file`). MIME: JPG/PNG/WebP/GIF. Máx 5 MB. Sube a Cloudinary. |
| `DELETE` | `/:id/steps/:stepId/attachments/:attachmentId` | — | Elimina adjunto de Cloudinary y BD. 403 si no es el autor ni admin. |

### IDs de checklist conocidos

| ID | Descripción |
|----|-------------|
| `cl-night-audit` | Auditoría nocturna (recepción) |
| `cl-morning-shift` | Turno mañana (recepción) |
| `cl-afternoon-shift` | Turno tarde (recepción) |
| `cl-housekeeping-daily` | Tareas diarias de housekeeping |

---

## Tablas de BD

Definidas en `backend/db-mysql/aiven/20_checklist.sql` y `backend/db-mysql/scripts/20260512_add_checklist_tables.sql`.

### `checklist_config`
Configuración por hotel (una fila).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `hotel_id` | INT PK | FK hotel |
| `daily_reset_time` | TIME | Hora de reset automático (default `06:30:00`) |
| `timezone` | VARCHAR | Timezone (default `Europe/Madrid`) |

### `checklist_runs`
Una instancia de checklist por día. `reset_at IS NULL` = run activo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT PK | |
| `checklist_id` | VARCHAR(100) | Ej: `cl-night-audit` |
| `hotel_id` | INT | |
| `hotel_date` | DATE | Fecha local Madrid (no UTC) |
| `shift` | ENUM | `morning` / `afternoon` / `night` / NULL |
| `started_at` | DATETIME | |
| `reset_at` | DATETIME | NULL = activo; valor = cerrado |
| `reset_by_user_id` | CHAR(36) | `system-cron` para resets automáticos |
| `reset_reason` | ENUM | `cron` / `manual` |

Unique key: `(hotel_id, checklist_id, hotel_date)`.

### `checklist_step_state`
Estado actual de cada paso. PK compuesta `(run_id, step_id)` → sobrescribible.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `run_id` | BIGINT FK | → `checklist_runs` CASCADE DELETE |
| `step_id` | VARCHAR(100) | ID estable del JSON de contenido |
| `done` | TINYINT | 0/1 |
| `done_by_user_id` | CHAR(36) | |
| `done_at` | DATETIME | |

### `checklist_event_log`
Log de auditoría inmutable. Purgado semanalmente (>7 días).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT PK | |
| `run_id` | BIGINT FK | → `checklist_runs` |
| `step_id` | VARCHAR(100) | NULL para acciones de run (reset) |
| `user_id` | CHAR(36) | |
| `action` | ENUM | `check` / `uncheck` / `comment` / `attach` / `reset_manual` / `reset_cron` |
| `payload_json` | JSON | Detalles opcionales (ej: `{comment_id: 1}`) |
| `at` | DATETIME | |

### `checklist_step_comments`
Comentarios por paso. Inmutables (sin endpoint de edición).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT PK | |
| `run_id` | BIGINT FK | |
| `step_id` | VARCHAR(100) | |
| `user_id` | CHAR(36) | |
| `body` | TEXT | Máx 500 chars |
| `created_at` | DATETIME | |

### `checklist_step_attachments`
Imágenes subidas a Cloudinary.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGINT PK | |
| `run_id` | BIGINT FK | |
| `step_id` | VARCHAR(100) | |
| `user_id` | CHAR(36) | |
| `file_url` | VARCHAR(500) | `secure_url` de Cloudinary |
| `public_id` | VARCHAR(255) | Para eliminación en Cloudinary |
| `mime` | VARCHAR(100) | JPG / PNG / WebP / GIF |
| `size` | INT | Bytes; máx 5 MB |
| `uploaded_at` | DATETIME | |

---

## Archivos Backend

```
backend/
├── routes/checklist/checklist-routes.ts
├── controllers/checklist/
│   ├── checklist-controllers.ts
│   └── checklist-comments-controllers.ts
├── services/checklist/
│   ├── checklist.service.ts
│   ├── checklist-comments.service.ts
│   └── checklist-content.ts          ← carga y cachea los JSON de contenido
├── repositories/checklist/
│   ├── checklist-repository.ts
│   └── checklist-comments.repository.ts
├── models/checklist/index.ts
├── validations/checklist/checklist-schemas.ts
├── content/checklist/tasks/           ← archivos JSON de contenido (sincronizar con frontend)
└── scripts/checklist-report.ts        ← herramienta de debug CLI
```

### Nota de sincronización de contenido

Los archivos JSON de `backend/content/checklist/tasks/` y `frontend/content/checklist/tasks/` son **duplicados**. Si se modifica el contenido de una checklist hay que actualizar **ambas** ubicaciones.

---

## Archivos Frontend

```
frontend/app/
├── dashboard/checklist/
│   ├── layout.tsx                      ← carga catálogo estático, wrapper client
│   ├── page.tsx                        ← landing (sin checklist seleccionada)
│   └── [id]/page.tsx                   ← página por checklist
├── components/checklist/
│   ├── ChecklistTasksContent.tsx       ← lista interactiva; React Query, optimistic updates
│   ├── ChecklistClientWrapper.tsx      ← layout dos paneles (TOC + contenido)
│   ├── ChecklistTOC.tsx                ← menú lateral de categorías
│   ├── ChecklistHeader.tsx             ← título, metadatos, botón reset
│   ├── StepDetailsPanel.tsx            ← panel expandible con tabs comentarios/adjuntos
│   ├── ChecklistGuideContent.tsx       ← renderiza ítems tipo "guide"
│   ├── ChecklistReferenceContent.tsx   ← renderiza ítems tipo "reference"
│   └── ChecklistNoteBanner.tsx         ← banner de nota/aviso por paso
└── lib/checklist/
    ├── api.ts                          ← llamadas API + React Query key factories
    ├── types.ts                        ← tipos TypeScript + constantes de shift/dept
    └── loader.ts                       ← carga server-side de contenido estático (fs)
```

---

## Cron Jobs

Definidos en `backend/services/cron/cron-service.ts`.

| Cron | Horario | Timezone | Acción |
|------|---------|----------|--------|
| Checklist Daily Reset | `30 6 * * *` (06:30) | Europe/Madrid | `closeStaleRuns()` — cierra todos los runs activos con `hotel_date < today` |
| Event Log Purge | `0 4 * * 1` (lunes 04:00) | Europe/Madrid | `purgeOldEventLogs(7)` — elimina eventos de más de 7 días |

**Safety net:** `getRunState()` también llama a `closeStaleRuns()` en cada `GET /:id/run` para cubrir el caso en que el servidor estuviera apagado cuando debía ejecutarse el cron.

---

## Script de debug

```bash
cd backend
pnpm exec tsx --env-file=.env scripts/checklist-report.ts [checklist_id] [YYYY-MM-DD]
```

Imprime pasos completados, pendientes y comentarios de un run directamente desde la BD. Por defecto: `cl-night-audit`, fecha de hoy.
