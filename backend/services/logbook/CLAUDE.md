# CLAUDE.md — Logbook

> Documentación única del módulo de logbooks (libro de incidencias / notas operativas del hotel). Cubre backend y frontend. La lógica de estado (read/unread per user, solved/pending, soft delete + trashed, history audit) es lo más denso del módulo y vive en el backend; el frontend es un grid + modales que consume los endpoints.

## Propósito

Libro de incidencias operativas del hotel. Cada entrada (logbook entry) registra una nota o tarea, marcada con un nivel de importancia, asignada a un departamento, escrita por un autor. Otros usuarios la leen, comentan, marcan como leída, y eventualmente la "resuelven". Todas las mutaciones quedan auditadas en `logbook_history`. Los borrados son soft (recoverable desde `/trashed`).

## Tablas en BD

| Tabla | Propósito |
|---|---|
| `logbook` | Entradas principales. `is_deleted` para soft delete. |
| `logbook_comments` | Comentarios per entrada. También con `is_deleted` para soft delete. |
| `logbook_history` | Audit log de cambios sobre logbooks (create, update, delete). |
| `logbook_comments_history` | Audit log de cambios sobre comentarios. |
| `logbook_reads` | (user_id, logbook_id, read_at) — quién leyó qué y cuándo. |
| `logbook_solved` | (user_id, logbook_id, solved_at) — quién marcó como resuelta. |
| `logbook_pending` | Histórico de reopens (cuando alguien marca como pending lo que estaba solved). |

**Importancia:** valores backend `baja` / `media` / `alta` / `urgente`. **Frontend usa `low` / `medium` / `high` / `critical`** y mapea via `mapPriorityToBackend()` en `LogbooksList.tsx`. **Gotcha:** si añades un nuevo nivel, actualiza el mapeo en ambos lados — no hay enum compartido.

## Backend — arquitectura

```
backend/services/logbook/
   └── logbookHistory-service.ts    (104 líneas — único service; helpers para
                                     escribir en logbook_history alrededor de
                                     create/update/delete del repo)

backend/controllers/logbook/
   ├── logbook-controllers.ts            (334 líneas — CRUD + filtros: all,
   │                                      byDepartment, byAuthor, byImportance,
   │                                      byDay, soft delete, history)
   ├── logbookComments-controllers.ts    (298 líneas — CRUD comentarios + history)
   └── logbookReads-controllers.ts       (186 líneas — read/unread, solve/reopen,
                                          listar readers y solvers)

backend/repositories/logbook/
   ├── logbook-repository.ts                  (315 líneas — incluye getAllTrashedLogbooks)
   ├── logbookHistory-repository.ts           (150 líneas — addHistory genérico para
   │                                            logbooks y comments)
   ├── logbookComments-repository.ts          (141 líneas)
   ├── logbookCommentsHistory-repository.ts   (55 líneas)
   └── logbookReads-repository.ts             (248 líneas — reads, solved, pending)

backend/routes/logbook/logbook-routes.ts      (143 líneas)
```

### Patrón principal — service + repository + controller

A diferencia de scheduling, aquí los controllers cargan parte de la lógica directamente contra los repos (no hay un service genérico). Solo `logbookHistory-service.ts` envuelve operaciones que necesitan **logging atómico en history**: `logAction()`, `updateLogbookHistory()`, `deleteLogbookHistory()`.

**Regla de oro del módulo:** **toda mutación de logbook o comentario debe registrarse en su tabla `*_history`**. El service es quien lo garantiza para updates/deletes; los creates se logean inline desde el controller (ver `createLogbook` en `logbook-controllers.ts`). Si añades una nueva ruta de mutación, **no la metas sin pasar por history** — la audit trail es un requisito del producto, no un nice-to-have.

### Autoría — solo el autor puede editar/borrar

`updateLogbookHistory()` y `deleteLogbookHistory()` verifican `logbook.author_id === editorId` antes de tocar. Si no coincide, lanzan error. Mismo patrón en comentarios: solo el autor del comentario lo edita/borra. Admins **no son excepción** a nivel de service — si se quiere bypass, va a tener que añadirse explícitamente y registrar quién lo hizo.

### Read/Unread y Solve/Reopen

Estos son los flags que cambian más a menudo desde la UI:

- `readLogbookController` → `INSERT IGNORE` en `logbook_reads` (idempotente).
- `unreadLogbookController` → `DELETE` de la fila correspondiente.
- `solveLogbookController` → `INSERT` en `logbook_solved` + `INSERT` en `logbook_pending` con `pending_at = NULL`. Sobreescribe si ya estaba.
- `reopenLogbookController` → `DELETE FROM logbook_solved` para ese logbook (uno solo solver activo).

Los reads/solves se logean en `logbook_history` también (acción `read`, `unread`, `solve`, `reopen`). Esto da el audit completo: quién leyó qué nota y cuándo, quién la resolvió, quién la reabrió.

### Endpoints

| Método y ruta | Propósito |
|---|---|
| `POST /api/logbook/` | Create logbook |
| `PUT /api/logbook/:id` | Update (solo autor) |
| `DELETE /api/logbook/:id` | Soft delete (solo autor) |
| `GET /api/logbook/all` | All logbooks (filtros via query) |
| `GET /api/logbook/department/:departmentId` | Filtrar por departamento |
| `GET /api/logbook/author/:authorId` | Filtrar por autor |
| `GET /api/logbook/priority/:importance` | Filtrar por importancia |
| `GET /api/logbook/day/:day` | Filtrar por día (YYYY-MM-DD) |
| `GET /api/logbook/trashed` | Lista de borrados (soft delete recovery) |
| `GET /api/logbook/:logbookId/history` | Audit de la entrada |
| `POST/GET/PUT/DELETE /api/logbook/:logbookId/comments[/:id]` | CRUD comentarios |
| `GET /api/logbook/:logbookId/comments/:commentId/history` | Audit de un comentario |
| `POST/DELETE /api/logbook/:logbookId/read` | Marcar/desmarcar como leída |
| `PUT /api/logbook/:logbookId/solve` | Marcar como resuelta |
| `PUT /api/logbook/:logbookId/pending` | Reabrir |
| `GET /api/logbook/:logbookId/readers` | Lista de quién ha leído |
| `GET /api/logbook/:logbookId/solved` | Quién resolvió (si está resuelta) |

Toda la subruta detrás de `authenticateToken` + `excludeMantenimiento`. Mantenimiento no entra al módulo.

**Importante:** `GET /trashed` está antes que las rutas `:id` en el router para que Express no lo capture como id. Si reordenas, cuida ese orden.

## Frontend — arquitectura

```
frontend/app/dashboard/logbooks/
   ├── page.tsx          (6 líneas — entry point que monta LogbooksContainer)
   ├── loading.tsx       (skeleton)
   └── error.tsx         (error boundary)

frontend/app/components/logbooks/
   ├── LogbooksContainer.tsx   (264 líneas — orchestrator: date picker, useLogbooks hook,
   │                            handlers)
   ├── LogbooksList.tsx        (990 líneas — render del feed, modales de read/comments,
   │                            mapeo importance ES↔EN, estilos por prioridad)
   ├── NewLogbookEntry.tsx     (260 líneas — modal de creación)
   ├── NewCommentEntry.tsx     (161 líneas)
   ├── EditLogbookModal.tsx    (118 líneas)
   └── EditCommentModal.tsx    (118 líneas)

frontend/app/lib/logbooks/
   ├── queries.ts           (React Query keys + apiClient calls)
   ├── types.ts             (LogEntry, Comment, etc.)
   ├── validations.ts       (Zod schemas; las mismas keys que el backend pero del lado UI)
   ├── hooks/useLogbooks.ts (hook orchestrator: mutations + cache invalidation + toasts)
   └── hooks/useDepartments.ts
```

### `useLogbooks(date, messages)` — el hook clave

`useLogbooks` es donde vive prácticamente toda la lógica del feed. Recibe la fecha activa y un objeto `messages` con los strings i18n para los toasts (inyectados desde el container para que el hook sea i18n-agnóstico). Devuelve:

- `entries` — los logbooks del día.
- Mutations: `createLogbook`, `updateLogbook`, `deleteLogbook`, `toggleStatus`, `toggleRead`, `createComment`, `updateComment`, `deleteComment`.
- Cada mutation tiene optimistic update + invalidación de la query del día + toast tras éxito/error.

**`messages` injection pattern:** se hace en `LogbooksContainer.tsx` con `useMemo(() => ({...}), [tLogbook])`. La razón es que el hook no puede llamar `useTranslations()` dentro (rompería las reglas de hooks si la key cambia), y queremos que los mensajes se actualicen al cambiar de locale.

### Importance ↔ Priority mapeo

```
Frontend         Backend
'critical'   ↔   'urgente'
'high'       ↔   'alta'
'medium'     ↔   'media'
'low'        ↔   'baja'
```

`mapPriorityToBackend()` en `LogbooksList.tsx`. Estilos por prioridad en `getPriorityBackground()` — bordes rojos en `critical`, naranjas en `high`, neutro en el resto.

### Selector de día

`HorizontalDatePicker` de `@/app/ui/calendar/` muestra una franja horizontal de días del mes seleccionado. El estado activo es `(currentDate, selectedDay)`. El query del backend usa `?day=YYYY-MM-DD`.

## Patrones / convenciones

- **i18n:** namespaces `logbooks` y `logbook` (distintos). El plural se usa para el contenedor (página), el singular para textos de una entrada y los toasts. Diccionarios en `frontend/i18n/`.
- **Toasts:** `react-hot-toast`. Toda mutation tiene mensaje de éxito o error.
- **Auth:** todas las rutas backend tras `authenticateToken` + `excludeMantenimiento`. Mantenimiento no entra al módulo.
- **Soft delete:** los borrados van a `is_deleted=1` y aparecen en `/trashed`. No hay UI todavía para restaurar; restauración es manual desde la BD (puede añadirse fácilmente).
- **Comments con history independiente:** edits a comentarios también se logean, en `logbook_comments_history` (no en `logbook_history`). Si necesitas el audit completo de una entrada con sus comentarios, hay que cruzar las dos tablas.

## Gotchas conocidos

1. **Importance mapping ES↔EN:** dos lugares distintos definen las strings (backend usa ES, frontend usa EN). Si añades un nivel, actualiza ambos y el mapeo en `LogbooksList.tsx` + `getPriorityBackground()`.
2. **Solo el autor edita/borra:** no es admin override. Si en el futuro hace falta, va en `services` con su propio audit trail (`action: 'admin_override'`).
3. **`/trashed` orden en router:** ruta declarada **antes** que las `:id` para no chocar. Mantén esto si reordenas el archivo.
4. **`LogbooksList.tsx` tiene 990 líneas.** Está al borde de necesitar split. Si vas a tocar cosas no triviales ahí, considera extraer subcomponentes (cada entry, modal de readers, etc.) antes de añadir más. No es prioridad pero está en el radar.

## Referencias cruzadas

- `backend/repositories/logbook/` — todos los repos.
- `frontend/app/lib/logbooks/hooks/useLogbooks.ts` — el hook orchestrator del frontend.
- `backend/config/error-codes.ts` — códigos de error específicos del módulo (`LOGBOOK_CREATE_ERROR`, etc.).
