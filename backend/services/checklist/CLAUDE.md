# CLAUDE.md — Checklist

> Documentación única del módulo de checklists. Cubre backend, frontend y la **regla de sync entre los JSONs duplicados** que es el principal gotcha del módulo. No tiene archivo separado en el frontend porque la lógica de estado vive aquí.

## Propósito

Checklists operacionales diarios (turno de mañana / tarde / night audit) para recepción. Cada checklist es un conjunto de **secciones** con **steps** marcables. Los steps se resetean cada día a las 06:30 Madrid; los comentarios y attachments por step se conservan ligados al `run` del día en cuestión.

**Modelo de datos en BD:**
- `checklist_runs` — un "día" del checklist (`checklist_id`, `hotel_date`, `reset_at`).
- `checklist_step_state` — estado done/undone por step de un run.
- `checklist_comments` — comentarios per step.
- `checklist_attachments` — adjuntos per step (subidos vía Cloudinary).
- `checklist_event_log` — auditoría operacional (check, uncheck, reset). **Purgado semanalmente**, no es histórico de largo plazo.

El contenido **definición de steps** (qué pasos tiene el checklist) **NO está en BD**: vive en archivos JSON.

## ⚠️ Regla de sync — DOS COPIAS DE LOS JSONS

```
backend/content/checklist/tasks/<name>.json   ← validación de stepIds (backend)
frontend/content/checklist/tasks/<name>.json  ← renderizado del UI (frontend)
```

**Cuando añadas, renombres o elimines un step, sección o checklist, actualiza AMBOS archivos en el mismo commit.** El backend usa su copia para validar que los `stepId` recibidos en los endpoints existen antes de escribir en BD; el frontend usa su copia para pintar el grid de tareas. Si las copias divergen:

- Frontend nuevo + backend viejo → el usuario marca un step que el backend no conoce → se rechaza silenciosamente o se acepta como step "huérfano".
- Frontend viejo + backend nuevo → el step no aparece en la UI pero la BD lo conoce → orfanato al revés.

**Convención de naming:** el `checklist_id` `cl-<name>` mapea al fichero `<name>.json`. Ejemplo: `cl-morning-shift` → `morning-shift.json` en ambos directorios. El mapeo lo hace `checklistIdToFilename(id)` en `services/checklist/checklist-content.ts`.

**Helper backend:** `getValidStepIds(checklistId)` en `checklist-content.ts` devuelve el `Set<string>` de stepIds válidos para un checklist, o `null` si el JSON no existe (fail-open: permite checklists no documentados). Cacheado in-memory por toda la vida del proceso — los JSONs solo cambian con un deploy.

**Archivos actuales (a 2026-05-23):**
- `morning-shift.json` — Turno de mañana
- `afternoon-shift.json` — Turno de tarde
- `night-audit.json` — Auditoría nocturna

## Estructura del JSON

```jsonc
{
  "id": "cl-morning-shift",
  "type": "tasks",                  // "tasks" | "guide" | "reference"
  "title": "Turno de mañana",
  "category": "daily-tasks",
  "department": "reception",
  "shift": "morning",
  "version": "1.0",
  "author": "Salvador Pérez",
  "updated": "2026-05-07",
  "description": "...",
  "sections": [
    {
      "id": "s1",
      "title": "7:00 - 7:30 — Inicio y preparación",
      "steps": [
        { "id": "s1-1", "text": "..." },
        { "id": "s1-2", "text": "...", "ref": "reference:housekeeping-pisos" }
      ]
    }
  ]
}
```

Los tipos `guide` y `reference` son contenido sin steps marcables — guías y referencias que se enlazan desde los steps con `"ref": "reference:<id>"`. El loader del frontend distingue por `type` y renderiza componentes distintos (`ChecklistGuideContent`, `ChecklistReferenceContent`, `ChecklistTasksContent`).

Hay también ítems en formato Markdown (`.md` con frontmatter YAML) cargados por `gray-matter`. Conviven con los JSON en el mismo catálogo.

## Backend — arquitectura

```
backend/services/checklist/
   ├── checklist.service.ts         (92 líneas — runs, steps, daily reset, purge)
   ├── checklist-comments.service.ts (84 líneas — comments + attachments)
   └── checklist-content.ts          (54 líneas — getValidStepIds + cache JSON)

backend/controllers/checklist/
   ├── checklist-controllers.ts                 (run state, toggle, reset, history)
   └── checklist-comments-controllers.ts        (CRUD comments + attachments)

backend/repositories/checklist/
   ├── checklist-repository.ts                  (runs, step_state, event_log, history)
   └── checklist-comments.repository.ts         (comments + attachments + counts)

backend/routes/checklist/checklist-routes.ts    (61 líneas — todos los endpoints)
```

### Lifecycle del run

```
getRunState(checklistId)
   ↓
closeStaleRuns()            ← UPDATE indexed sobre runs con hotel_date < today (noop tras la 1ª del día)
   ↓
getOrCreateRun(checklistId)
   ↓
  findActiveRun(hotelDate)  ← devuelve si existe
   ↓ si no existe
  createRun(hotelDate)      ← INSERT
   ↓
buildRunState(run)
   ↓
  getStepStates + getStepCounts (paralelo)
   ↓
  enrich con done_by_username, comment_count, attachment_count
```

**`closeStaleRuns()` es el auto-close lazy.** Está pensado para Render free tier: si el cron de 06:30 no disparó (porque el servidor estaba dormido), la primera petición del día cierra los runs viejos y crea el nuevo. Es idempotente y barato — un UPDATE con índice — así que se ejecuta antes de cada `getRunState`.

### Toggle y reset

- `toggleStep(checklistId, stepId, done, userId)` → upsert en `checklist_step_state` + insert en `event_log` (`'check'` o `'uncheck'`).
- `resetRun(checklistId, userId)` → cierra el run actual (`closeRun` con `reason='manual'`), crea uno nuevo, logea `'reset_manual'`. Permisos: middleware `canResetChecklist` en routes.

### Cron jobs (`backend/services/cron/cron-service.ts`)

| Cron | Horario (Madrid) | Función |
|---|---|---|
| `30 6 * * *` | Diario 06:30 | `checklistDailyReset()` → cierra runs del día anterior. |
| `0 4 * * 1` | Lunes 04:00 | `purgeOldEventLogs(7)` → borra `checklist_event_log` con >7 días. |

**Retención del event log: 7 días.** Datos operativos diarios, no auditoría de largo plazo. Si en el futuro se necesita histórico mayor (cumplimiento, KPIs), promover a una tabla agregada separada — no extender la retención sobre la tabla cruda.

### StepId validation flow

```
POST /api/checklists/:id/steps/:stepId/comments
   ↓
addCommentController valida stepId con getValidStepIds(checklistId)
   ↓
  Si el set es null (checklist no en JSON backend) → fail-open, acepta
  Si el set existe y stepId NO está → 422
  Si el set existe y stepId SÍ está → continúa al repo
```

Mismo patrón en attachments. Toggle de step **no** valida — los stepId vienen de la propia UI que renderiza desde el JSON, así que el camino feliz no necesita el cinturón.

## Endpoints

| Método y ruta | Propósito |
|---|---|
| `GET /api/checklists/:id/run` | Estado actual del run del día (auto-create + auto-close stale) |
| `GET /api/checklists/:id/history?limit=N` | Últimos N runs cerrados |
| `PATCH /api/checklists/:id/steps/:stepId` | Toggle done/undone |
| `POST /api/checklists/:id/reset` | Reset manual (requiere `canResetChecklist`) |
| `GET/POST/DELETE /:id/steps/:stepId/comments[/:commentId]` | CRUD comentarios |
| `GET/POST/DELETE /:id/steps/:stepId/attachments[/:attachmentId]` | CRUD adjuntos (multer + Cloudinary) |

Toda la subruta lleva `authenticateToken` + `excludeMantenimiento`. Reset adicional con `canResetChecklist` (admin / recepcionista).

## Frontend — arquitectura

```
frontend/app/dashboard/checklist/
   ├── layout.tsx                  (8 líneas — wrapper de página)
   ├── page.tsx                    (13 líneas — landing del módulo)
   ├── ChecklistClientWrapper.tsx  (61 líneas — TOC sidebar + colapso mobile)
   └── [id]/page.tsx               (19 líneas — dispatch por type a Guide/Reference/Tasks)

frontend/app/components/checklist/
   ├── ChecklistTOC.tsx                (282 líneas — index lateral del catálogo)
   ├── ChecklistTasksContent.tsx       (261 líneas — render del checklist marcable + steps + comentarios)
   ├── StepDetailsPanel.tsx            (292 líneas — panel lateral de detalle de un step: comments, attachments)
   ├── ChecklistGuideContent.tsx       (renderiza items type=guide)
   ├── ChecklistReferenceContent.tsx   (renderiza items type=reference)
   ├── ChecklistHeader.tsx
   ├── ChecklistNoteBanner.tsx
   └── EmailLink.tsx

frontend/app/lib/checklist/
   ├── loader.ts                   (build-time loader del catálogo JSON+MD, cached in-memory)
   ├── api.ts                      (DTOs + apiClient calls a backend)
   └── types.ts                    (Catalog, ChecklistItem, ChecklistMeta, CategoryMeta)

frontend/content/checklist/
   ├── _index.json                 (catálogo: categorías y orden)
   ├── tasks/*.json                (items type=tasks — los duplicados del backend)
   ├── guides/*.md                 (guías markdown con frontmatter)
   └── references/*.md             (referencias markdown)
```

### Loader

`loader.ts` lee el contenido del directorio `frontend/content/checklist/` al boot del server, lo parsea, y construye el `Catalog` en memoria. Se cachea de por vida (`let _catalog: Catalog | null`). Los Server Components (`[id]/page.tsx`) llaman a `getChecklistById(id)` que pega contra este caché.

**Markdown items** se parsean con `gray-matter` (frontmatter YAML + body MD). El loader serializa fechas de YAML a strings (`serializeDates`) para que React no las trate como objetos `Date` que rompen la serialización a client component.

### Render

`[id]/page.tsx` es Server Component que despacha por `item.type`:

- `guide` → `ChecklistGuideContent` (markdown render, no marcable).
- `reference` → `ChecklistReferenceContent`.
- `tasks` → `ChecklistTasksContent` ('use client', llamadas a backend para state).

`ChecklistTasksContent` orquesta la interacción: hace `GET /run`, renderiza secciones+steps con checkboxes, mutations al backend para toggle / reset / add comment / upload attachment. Optimistic updates con invalidación tras éxito.

`ChecklistTOC.tsx` es el sidebar — categorías colapsables, items lineales, link al detalle. En mobile colapsa el sidebar completo (state local en `ChecklistClientWrapper`).

`StepDetailsPanel.tsx` (292 líneas) se monta lateral cuando el usuario abre un step: muestra comments + attachments del step y permite añadir/borrar.

## Convenciones y patrones

- **Mobile responsive:** `ChecklistClientWrapper` usa `flex-col md:flex-row` para apilar TOC encima en mobile, lateral en desktop. El TOC en mobile se colapsa con un botón.
- **Print mode:** las clases `checklist-print-wrapper` y `checklist-print-content` activan estilos específicos para imprimir un checklist completo (ver `global.css`). Útil para auditorías físicas.
- **i18n:** los textos de los steps están en los JSONs (en español, no traducidos). Los wrappers de UI (botones, headers) sí usan `next-intl` con namespace `checklist`.
- **Auth:** todas las rutas backend tras `authenticateToken` + `excludeMantenimiento`. Mantenimiento no entra al módulo. Reset requiere `canResetChecklist` (admin / recepcionista).
- **Subida de attachments:** multer in-memory → Cloudinary. Path en `addAttachmentController`.

## Gotchas conocidos

1. **JSON sync** (ver § "Regla de sync"). Si modificas un JSON y olvidas la otra copia, lo más probable es que se descubra al primer comment o attachment intentado en un step nuevo.
2. **Markdown con dates en frontmatter:** YAML dates se parsean como `Date` por defecto y no son serializables a client components. `loader.ts` ya tiene `serializeDates` — si añades campos date nuevos, asegúrate de que pasen por ahí.
3. **Render free tier + cron 06:30:** si el servicio está dormido a las 06:30, el cron no dispara. El auto-close lazy en `getRunState` cubre ese caso transparentemente. Si en algún momento se cambia a un plan paid (always-on), el lazy sigue siendo correcto (idempotente).
4. **Event log retention 7 días:** datos antes de 7 días simplemente desaparecen. Si auditoría te pide un evento de hace 2 semanas, no existe. Decisión consciente — promover a tabla agregada si cambia el requisito.

## Referencias cruzadas

- `backend/content/checklist/tasks/` y `frontend/content/checklist/tasks/` — los JSONs duplicados que mantener en sync.
- `backend/services/cron/cron-service.ts` — schedule de los 2 cron jobs del módulo.
- `backend/services/checklist/checklist-content.ts` — helper `getValidStepIds`.
- `frontend/app/lib/checklist/loader.ts` — loader build-time del catálogo.
