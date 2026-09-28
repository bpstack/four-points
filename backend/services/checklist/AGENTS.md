# AGENTS.md — Checklist

> Single doc for the checklist module. Covers backend, frontend and the **JSON
> sync rule** that is the module's main gotcha. No separate frontend file
> because the state logic lives here.

## What it does

Daily operational checklists for reception (morning / afternoon / night audit).
Each checklist is a set of **sections** with checkable **steps**. Steps reset
every day at 06:30 Madrid; comments and attachments per step are kept tied to
that day's `run`.

**DB model:**

- `checklist_runs` — one "day" of the checklist (`checklist_id`, `hotel_date`,
  `reset_at`).
- `checklist_step_state` — done/undone state per step of a run.
- `checklist_comments` — comments per step.
- `checklist_attachments` — per-step attachments (uploaded via Cloudinary).
- `checklist_event_log` — operational audit (check, uncheck, reset). **Purged
  weekly**, not long-term history.

The **step definition** content (what steps the checklist has) is **NOT in the
DB**: it lives in JSON files.

## ⚠️ Sync rule — TWO COPIES OF THE JSONs

```
backend/content/checklist/tasks/<name>.json   ← stepId validation (backend)
frontend/content/checklist/tasks/<name>.json  ← UI rendering (frontend)
```

**When you add, rename or remove a step, section or checklist, update BOTH files
in the same commit.** The backend uses its copy to validate that incoming
`stepId`s exist before writing to the DB; the frontend uses its copy to render
the task grid. When the copies drift:

- Frontend new + backend old → user marks a step the backend doesn't know about
  → silently rejected or accepted as an "orphan" step.
- Frontend old + backend new → step doesn't appear in the UI but the DB knows
  about it → orphan the other way.

**Naming convention:** the `checklist_id` `cl-<name>` maps to file
`<name>.json`. Example: `cl-morning-shift` → `morning-shift.json` in both
directories. The mapping is done by `checklistIdToFilename(id)` in
`services/checklist/checklist-content.ts`.

**Backend helper:** `getValidStepIds(checklistId)` in `checklist-content.ts`
returns the `Set<string>` of valid stepIds for a checklist, or `null` if the
JSON is missing (fail-open: undocumented checklists are allowed). In-memory
cached for the lifetime of the process — JSONs only change on deploy.

**Current files (as of 2026-05-23):**

- `morning-shift.json`
- `afternoon-shift.json`
- `night-audit.json`

## JSON structure

```jsonc
{
  "id": "cl-morning-shift",
  "type": "tasks", // "tasks" | "guide" | "reference"
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
        { "id": "s1-2", "text": "...", "ref": "reference:housekeeping-pisos" },
      ],
    },
  ],
}
```

The `guide` and `reference` types are non-checkable content — guides and
references that steps link to via `"ref": "reference:<id>"`. The frontend loader
dispatches by `type` and renders distinct components (`ChecklistGuideContent`,
`ChecklistReferenceContent`, `ChecklistTasksContent`).

There are also Markdown items (`.md` with YAML frontmatter) loaded via
`gray-matter`. They live in the same catalog as the JSON items.

## Backend — layout

```
backend/services/checklist/
   ├── checklist.service.ts         (92 lines — runs, steps, daily reset, purge)
   ├── checklist-comments.service.ts (84 lines — comments + attachments)
   └── checklist-content.ts          (54 lines — getValidStepIds + JSON cache)

backend/controllers/checklist/
   ├── checklist-controllers.ts                 (run state, toggle, reset, history)
   └── checklist-comments-controllers.ts        (CRUD comments + attachments)

backend/repositories/checklist/
   ├── checklist-repository.ts                  (runs, step_state, event_log, history)
   └── checklist-comments.repository.ts         (comments + attachments + counts)

backend/routes/checklist/checklist-routes.ts    (61 lines — all endpoints)
```

### Run lifecycle

```
getRunState(checklistId)
   ↓
closeStaleRuns()            ← indexed UPDATE on runs with hotel_date < today (noop after the day's first call)
   ↓
getOrCreateRun(checklistId)
   ↓
  findActiveRun(hotelDate)  ← returns if it exists
   ↓ if not
  createRun(hotelDate)      ← INSERT
   ↓
buildRunState(run)
   ↓
  getStepStates + getStepCounts (parallel)
   ↓
  enrich with done_by_username, comment_count, attachment_count
```

**`closeStaleRuns()` is the lazy auto-close.** It exists to cover Render free
tier: if the 06:30 cron didn't fire (server was asleep), the first request of
the day closes the old runs and opens the new one. Idempotent and cheap — an
indexed UPDATE — so it runs before every `getRunState`.

### Toggle and reset

- `toggleStep(checklistId, stepId, done, userId)` → upsert on
  `checklist_step_state` + insert into `event_log` (`'check'` or `'uncheck'`).
- `resetRun(checklistId, userId)` → closes the current run (`closeRun` with
  `reason='manual'`), creates a new one, logs `'reset_manual'`. Permissions:
  `canResetChecklist` middleware in routes.

### Cron jobs (`backend/services/cron/cron-service.ts`)

- **`30 6 * * *`** — Daily 06:30 — `checklistDailyReset()` → closes the previous
  day's runs.
- **`0 4 * * 1`** — Monday 04:00 — `purgeOldEventLogs(7)` → drops
  `checklist_event_log` rows older than 7 days.

**Event log retention: 7 days.** Operational data, not long-term audit. If at
some point you need a longer history (compliance, KPIs), promote to a separate
aggregated table — don't extend the retention on the raw table.

### StepId validation flow

```
POST /api/checklists/:id/steps/:stepId/comments
   ↓
addCommentController validates stepId with getValidStepIds(checklistId)
   ↓
  Set is null (checklist not in backend JSON) → fail-open, accept
  Set exists and stepId NOT in it → 422
  Set exists and stepId IS in it → continue to repo
```

Same pattern on attachments. Toggle doesn't validate — stepIds come from the UI
that renders from the same JSON, so the happy path doesn't need the belt.

## Endpoints

- **`GET /api/checklists/:id/run`**: Current run state for today (auto-create
  - auto-close stale)
- **`GET /api/checklists/:id/history?limit=N`**: Last N closed runs
- **`PATCH /api/checklists/:id/steps/:stepId`**: Toggle done/undone
- **`POST /api/checklists/:id/reset`**: Manual reset (requires
  `canResetChecklist`)
- **`GET/POST/DELETE /:id/steps/:stepId/comments[/:commentId]`**: Comment CRUD
- **`GET/POST/DELETE /:id/steps/:stepId/attachments[/:attachmentId]`**:
  Attachment CRUD (multer + Cloudinary)

The whole subroute sits behind `authenticateToken` + `excludeMantenimiento`.
Mantenimiento doesn't enter. Reset additionally requires `canResetChecklist`
(admin / recepcionista).

## Frontend — layout

```
frontend/app/dashboard/checklist/
   ├── layout.tsx                  (8 lines — page wrapper)
   ├── page.tsx                    (13 lines — module landing)
   ├── ChecklistClientWrapper.tsx  (61 lines — TOC sidebar + mobile collapse)
   └── [id]/page.tsx               (19 lines — dispatch by type to Guide/Reference/Tasks)

frontend/app/components/checklist/
   ├── ChecklistTOC.tsx                (282 lines — side index of the catalog)
   ├── ChecklistTasksContent.tsx       (261 lines — checkable checklist render + steps + comments)
   ├── StepDetailsPanel.tsx            (292 lines — side detail panel of a step: comments, attachments)
   ├── ChecklistGuideContent.tsx       (renders items of type=guide)
   ├── ChecklistReferenceContent.tsx   (renders items of type=reference)
   ├── ChecklistHeader.tsx
   ├── ChecklistNoteBanner.tsx
   └── EmailLink.tsx

frontend/app/lib/checklist/
   ├── loader.ts                   (build-time loader for the JSON+MD catalog, cached in-memory)
   ├── api.ts                      (DTOs + apiClient calls to the backend)
   └── types.ts                    (Catalog, ChecklistItem, ChecklistMeta, CategoryMeta)

frontend/content/checklist/
   ├── _index.json                 (catalog: categories and order)
   ├── tasks/*.json                (type=tasks items — the duplicates of the backend)
   ├── guides/*.md                 (markdown guides with frontmatter)
   └── references/*.md             (markdown references)
```

### Loader

`loader.ts` reads `frontend/content/checklist/` at server boot, parses it, and
builds the `Catalog` in memory. Cached for the lifetime of the server
(`let _catalog: Catalog | null`). Server Components (`[id]/page.tsx`) call
`getChecklistById(id)` which hits the cache.

**Markdown items** are parsed with `gray-matter` (YAML frontmatter + body MD).
The loader serializes YAML dates to strings (`serializeDates`) so React doesn't
treat them as `Date` objects, which would break serialization into client
components.

### Render

`[id]/page.tsx` is a Server Component that dispatches by `item.type`:

- `guide` → `ChecklistGuideContent` (markdown render, non-checkable).
- `reference` → `ChecklistReferenceContent`.
- `tasks` → `ChecklistTasksContent` ('use client', backend calls for state).

`ChecklistTasksContent` drives the interaction: `GET /run`, renders
sections+steps with checkboxes, mutations to the backend for toggle / reset /
add comment / upload attachment. Optimistic updates with invalidation after
success.

`ChecklistTOC.tsx` is the sidebar — collapsible categories, flat item list, link
to the detail. On mobile the whole sidebar collapses (local state in
`ChecklistClientWrapper`).

`StepDetailsPanel.tsx` (292 lines) opens to the side when a step is selected:
shows comments + attachments for the step and lets you add/remove.

## Conventions and patterns

- **Mobile responsive:** `ChecklistClientWrapper` uses `flex-col md:flex-row` to
  stack the TOC on top in mobile, beside in desktop. The mobile TOC collapses
  with a button.
- **Print mode:** classes `checklist-print-wrapper` and
  `checklist-print-content` enable print-specific styles (see `global.css`).
  Useful for physical audits.
- **i18n:** the step text lives in the JSONs (Spanish, untranslated). UI
  wrappers (buttons, headers) use `next-intl` with the `checklist` namespace.
- **Auth:** every backend route sits behind `authenticateToken` +
  `excludeMantenimiento`. Mantenimiento doesn't enter the module. Reset requires
  `canResetChecklist` (admin / recepcionista).
- **Attachment upload:** multer in-memory → Cloudinary. Wiring in
  `addAttachmentController`.

## Known gotchas

1. **JSON sync** (see § "Sync rule"). If you modify a JSON and forget the other
   copy, the first comment or attachment on a new step will surface the bug.
2. **YAML dates in Markdown frontmatter:** YAML dates parse as `Date` by default
   and aren't serializable to client components. `loader.ts` already handles it
   via `serializeDates` — if you add new date-typed fields, make sure they go
   through it.
3. **Render free tier + 06:30 cron:** if the service is asleep at 06:30, the
   cron doesn't fire. The lazy auto-close in `getRunState` covers it
   transparently. If we ever upgrade to a paid (always-on) plan, the lazy path
   is still correct (idempotent).
4. **7-day event log retention:** events older than 7 days simply disappear. If
   audit asks for an event from two weeks ago, it doesn't exist. Conscious
   decision — promote to an aggregated table if the requirement changes.

## Cross references

- `backend/content/checklist/tasks/` and `frontend/content/checklist/tasks/` —
  the duplicate JSONs to keep in sync.
- `backend/services/cron/cron-service.ts` — schedule for the module's two cron
  jobs.
- `backend/services/checklist/checklist-content.ts` — `getValidStepIds` helper.
- `frontend/app/lib/checklist/loader.ts` — build-time catalog loader.
