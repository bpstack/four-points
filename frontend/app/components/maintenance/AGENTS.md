# AGENTS.md — Maintenance

> Hotel maintenance report module. **Single file** because the module isn't big
> enough to justify a backend/frontend split; the file lives in
> `frontend/app/components/maintenance/` where most of the code surface area is.

## What it does

Maintenance reports (faults, technical incidents). Each **report** describes an
incident with location, priority, assignment, workflow status, attached images
and a full history of changes. The module covers the whole chain: created →
assigned → in progress → resolved → closed, with soft delete + restore.

## Status workflow

```
reported ──► assigned ──► in_progress ──► completed ──► closed
   │                          │                │
   │                          ▼                │
   │                       waiting             │
   │                          │                │
   ▼                          ▼                ▼
                          canceled ◄──────────┘
```

**7 statuses** defined in `frontend/app/lib/maintenance/maintenance.ts`:

- **`reported`**: Just created, unassigned
- **`assigned`**: Assigned to someone (internal or external) but not started
- **`in_progress`**: Work is happening
- **`waiting`**: Blocked on something external (waiting for parts, quote, etc.)
- **`completed`**: Resolved, pending formal closure
- **`closed`**: Closed for good. The UI doesn't expose a reopen from `closed`,
  but the API allows it.
- **`canceled`**: Canceled (duplicate, doesn't apply, etc.)

**The backend does NOT enforce the status workflow:** any status can go to any
other, and a `closed` report can be reopened through the API. Canceling sets
`closed_at` and logs history action `closed` (not `canceled`).

**4 priorities:** `low`, `medium`, `high`, `urgent`. **5 location types:**
`room`, `common_area`, `exterior`, `facilities`, `other`. **2 assigned types:**
`internal` (assigned to a system user) or `external` (third-party company with
`external_company_name` + `external_contact`).

**Constraint:** if `location_type === 'room'`, `room_number` is required.
Validated by the frontend Zod schema (`reportSchema.refine()` in
`maintenance-schemas.ts`) and by the backend (`createReportSchema.refine()` in
`backend/validations/maintenance/schemas.ts`).

## Layout

```
backend/controllers/maintenance/
   └── maintenance-controller.ts        (753 lines — class with static methods
                                          MaintenanceController.getAll, create, etc.)

backend/repositories/maintenance/
   └── maintenance-repository.ts        (970 lines — all module SQL;
                                          includes images and history)

backend/routes/maintenance/
   └── maintenance-routes.ts            (155 lines — 14 routes)

backend/validations/maintenance/
   └── schemas.ts                       (Zod schemas: create, update, status, priority,
                                          resolution, filters, idParam, assign)

frontend/app/dashboard/maintenance/
   ├── page.tsx                         (64 lines — Server: SSR for the initial list)
   ├── error.tsx / loading.tsx
   ├── [id]/page.tsx                    (detail by ID)
   └── actions/getMaintenance.ts        (server action for SSR)

frontend/app/components/maintenance/
   ├── MaintenanceListClient.tsx        (766 lines — list with filters and modals)
   ├── ReportDetailClient.tsx           (124 lines — detail wrapper)
   ├── hooks/useMaintenanceList.ts      (185 lines — React Query with keys factory)
   ├── layout/
   │   ├── ReportHeader.tsx
   │   └── TabNavigation.tsx
   ├── panels/
   │   ├── CreateReportPanel.tsx        (359 lines — create form)
   │   └── EditReportPanel.tsx          (454 lines — edit form)
   ├── tabs/
   │   ├── DetailTab.tsx                (634 lines — main tab of the detail view)
   │   └── HistoryTab.tsx               (166 lines — change history)
   └── shared/                          (EmptyState, LoadingSpinner)

frontend/app/lib/maintenance/
   ├── maintenance.ts                   (types: ReportStatus, ReportPriority, etc.)
   ├── maintenanceApi.ts                (apiClient calls)
   └── maintenance-schemas.ts           (Zod on the UI side)
```

## Backend — endpoints

- `GET /api/maintenance` — List with filters: status, priority, location_type,
  assigned_to, created_by, room_number, search, date_from, date_to,
  include_deleted (admin only, 403 otherwise); pagination `page` + `limit`. A
  deleted report takes no edits, notes or photo changes (400), and for anyone
  but admin its detail, images and history answer 404.
- `GET /api/maintenance/stats` — Aggregate statistics
- `GET /api/maintenance/:id` — Detail with images + history
- `POST /api/maintenance` — Create report
- `PATCH /api/maintenance/:id` — General update
- `PATCH /api/maintenance/:id/status` — Status-only change (with `notes?`)
- `PATCH /api/maintenance/:id/priority` — Priority-only change
- `PATCH /api/maintenance/:id/resolution-notes` — Append resolution notes
- `PATCH /api/maintenance/:id/assign` — Assign (internal or external)
- `DELETE /api/maintenance/:id` — Soft delete
- `PATCH /api/maintenance/:id/restore` — Restore
- `GET /api/maintenance/:id/images` — List images
- `POST /api/maintenance/:id/images` — Upload image (multipart, 5 MB max)
- `DELETE /api/maintenance/:id/images/:imageId` — Delete image
- `GET /api/maintenance/:id/history` — Change history

**Middleware:** every route sits behind `authenticateToken` +
`canAccessMaintenance`. This middleware **lets the mantenimiento role in** —
unlike most modules that exclude it.

**Images:** multer in-memory + Cloudinary. Hard cap of 5 MB per file in the
multer middleware. Accepted types: jpeg, png, webp, gif (by client-declared
mimetype).

## Class-based controller pattern

`MaintenanceController` is a **class with static methods**, same pattern as
parking (`ParkingBookingsController`). It's not the project's default pattern
(most use free-standing exported functions), but it's internally consistent
within the module. If you add a new controller here, follow the class pattern.

## History (`maintenance_history`)

Every important change is logged with one of these `action` values:

- `created`
- `status_changed`
- `priority_changed`
- `updated`
- `assigned`
- `resolved`
- `closed`
- `deleted`
- `restored`

Visible in `HistoryTab.tsx`. **Rule:** any mutation that touches the report's
status or assignment must go through the repo via a call that also writes to
`maintenance_history`. If you add a new mutation, make sure it logs; if the
`action` doesn't fit the existing set, extend the enum on the TS side and on the
DB side (CHECK constraint). **Uploading or deleting images is NOT written to
`maintenance_history`.**

## Frontend — patterns

### `useMaintenanceList(filters, page, limit, initialData, messages)`

List orchestrator hook. Takes `initialData` from SSR (for first paint with no
spinner) and only uses it when no filters are active — once the user filters,
the server cache is discarded and a fresh fetch runs. Same `messages` injection
pattern as logbook: i18n toasts are passed in from the container so the hook
stays i18n-agnostic.

### `maintenanceKeys` factory

```ts
maintenanceKeys.list(filters) // ['maintenance', 'list', filters]
maintenanceKeys.detail(id) // ['maintenance', 'detail', id]
maintenanceKeys.stats() // ['maintenance', 'stats']
```

Unlike parking (which has no factory), there's one here because the invalidation
hierarchy is more complex (editing a report has to invalidate both its detail
and any lists containing it).

### Tabbed detail

`ReportDetailClient` mounts `TabNavigation` + the active tab (`DetailTab` or
`HistoryTab`). The URL preserves the active tab in the query string so F5 keeps
the view.

`DetailTab.tsx` (634 lines) is the bulk of the detail UI: header, description,
location, assignment, image preview gallery, inline actions to change
status/priority/assignment, resolution-notes form.

### CreateReportPanel + EditReportPanel

Two separate panels (not a shared modal) because the flows diverge: create
requires minimum fields and auto-sets `status: 'reported'`; edit lets you touch
any field within permissions. Both validate against the same `reportSchema` Zod
(`maintenance-schemas.ts`).

## Auth / permissions

`canAccessMaintenance` allows:

- `admin`, `group-admin`, `demo-admin`
- `recepcionista`
- **`mantenimiento`** (this is the module they do enter)

It's one of the few modules accessible to the mantenimiento role — in fact it's
**their main work module**. Keep that in mind if you touch permissions: the UX
for mantenimiento is key.

## Known gotchas

1. **`canAccessMaintenance` lets mantenimiento in.** Other modules block them.
   If you add a global endpoint that crosses modules, mind which roles can reach
   it.
2. **`location_type='room' ⇒ room_number` required.** Cross-field validation in
   Zod (`.refine`). If you add a new `location_type` with a similar rule, repeat
   the pattern.
3. **`closed` status is final in the UI, but not in the backend.** The UI
   doesn't expose a reopen from `closed`, but the API allows it. If you need a
   reopen in the UI, add it; check `maintenance_history.action` for coherence.
4. **`DetailTab.tsx` at 634 lines and `MaintenanceListClient.tsx` at 766
   lines.** On the radar for split if they grow more, not urgent.
5. **Image upload capped at 5 MB.** Hardcoded in the multer config in
   `routes/maintenance/maintenance-routes.ts`. Accepted types: jpeg, png, webp,
   gif. If the requirement changes, adjust there.

## Cross references

- `backend/middlewares/roleCheck.ts → canAccessMaintenance` — the allowed roles.
- `backend/services/blacklist/cloudinary-service.ts` — the Cloudinary helper
  this module also uses for image uploads.
- `frontend/app/lib/maintenance/maintenance.ts` — all types and enums.
