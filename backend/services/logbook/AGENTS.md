# CLAUDE.md — Logbook

> Single doc for the logbook module (hotel incident log / operational notes). Covers backend and frontend. The state logic (per-user read/unread, solved/pending, soft delete + trashed, history audit) is the densest part of the module and lives in the backend; the frontend is a grid + modals that consume the endpoints.

## What it does

Hotel incident log. Each entry (logbook entry) records a note or task, marked with an importance level, assigned to a department, written by an author. Other users read it, comment, mark it as read, and eventually "solve" it. Every mutation is audited in `logbook_history`. Deletes are soft (recoverable from `/trashed`).

## DB tables

| Table | Purpose |
|---|---|
| `logbook` | Main entries. `is_deleted` for soft delete. |
| `logbook_comments` | Per-entry comments. Also `is_deleted` for soft delete. |
| `logbook_history` | Audit log of changes on logbooks (create, update, delete). |
| `logbook_comments_history` | Audit log of changes on comments. |
| `logbook_reads` | (user_id, logbook_id, read_at) — who read what and when. |
| `logbook_solved` | (user_id, logbook_id, solved_at) — who marked it solved. |
| `logbook_pending` | History of reopens (when someone marks a solved entry as pending again). |

**Importance:** backend values `baja` / `media` / `alta` / `urgente`. **Frontend uses `low` / `medium` / `high` / `critical`** and maps via `mapPriorityToBackend()` in `LogbooksList.tsx`. **Gotcha:** if you add a new level, update the mapping on both sides — there's no shared enum.

## Backend — layout

```
backend/services/logbook/
   └── logbookHistory-service.ts    (104 lines — single service; helpers to write
                                     into logbook_history around the repo's
                                     create/update/delete)

backend/controllers/logbook/
   ├── logbook-controllers.ts            (334 lines — CRUD + filters: all,
   │                                      byDepartment, byAuthor, byImportance,
   │                                      byDay, soft delete, history)
   ├── logbookComments-controllers.ts    (298 lines — comment CRUD + history)
   └── logbookReads-controllers.ts       (186 lines — read/unread, solve/reopen,
                                          list readers and solvers)

backend/repositories/logbook/
   ├── logbook-repository.ts                  (315 lines — includes getAllTrashedLogbooks)
   ├── logbookHistory-repository.ts           (150 lines — generic addHistory for
   │                                            logbooks and comments)
   ├── logbookComments-repository.ts          (141 lines)
   ├── logbookCommentsHistory-repository.ts   (55 lines)
   └── logbookReads-repository.ts             (248 lines — reads, solved, pending)

backend/routes/logbook/logbook-routes.ts      (143 lines)
```

### Main pattern — service + repository + controller

Unlike scheduling, controllers here load part of the logic directly against the repos (no generic service). Only `logbookHistory-service.ts` wraps operations that need **atomic history logging**: `logAction()`, `updateLogbookHistory()`, `deleteLogbookHistory()`.

**Golden rule of the module:** **every logbook or comment mutation must be recorded in its `*_history` table**. The service guarantees this for updates/deletes; creates log inline from the controller (see `createLogbook` in `logbook-controllers.ts`). When you add a new mutation route, **don't skip the history call** — the audit trail is a product requirement, not a nice-to-have.

### Authorship — only the author edits/deletes

`updateLogbookHistory()` and `deleteLogbookHistory()` verify `logbook.author_id === editorId` before touching anything. If it doesn't match, they throw. Same pattern for comments: only the comment's author edits/deletes. Admins **are not exempt** at the service level — if a bypass is needed, it has to be added explicitly and logged with who did it.

### Read/Unread and Solve/Reopen

These are the flags that flip most often from the UI:

- `readLogbookController` → `INSERT IGNORE` on `logbook_reads` (idempotent).
- `unreadLogbookController` → `DELETE` of the corresponding row.
- `solveLogbookController` → `INSERT` on `logbook_solved` + `INSERT` on `logbook_pending` with `pending_at = NULL`. Overwrites if already set.
- `reopenLogbookController` → `DELETE FROM logbook_solved` for that logbook (single active solver).

Reads/solves also log to `logbook_history` (actions `read`, `unread`, `solve`, `reopen`). This gives the full audit: who read what note and when, who solved it, who reopened it.

### Endpoints

| Method and route | Purpose |
|---|---|
| `POST /api/logbook/` | Create logbook |
| `PUT /api/logbook/:id` | Update (author only) |
| `DELETE /api/logbook/:id` | Soft delete (author only) |
| `GET /api/logbook/all` | All logbooks (filters via query) |
| `GET /api/logbook/department/:departmentId` | Filter by department |
| `GET /api/logbook/author/:authorId` | Filter by author |
| `GET /api/logbook/priority/:importance` | Filter by importance |
| `GET /api/logbook/day/:day` | Filter by day (YYYY-MM-DD) |
| `GET /api/logbook/trashed` | List of deleted entries (soft delete recovery) |
| `GET /api/logbook/:logbookId/history` | Audit of the entry |
| `POST/GET/PUT/DELETE /api/logbook/:logbookId/comments[/:id]` | Comment CRUD |
| `GET /api/logbook/:logbookId/comments/:commentId/history` | Audit of a comment |
| `POST/DELETE /api/logbook/:logbookId/read` | Mark/unmark as read |
| `PUT /api/logbook/:logbookId/solve` | Mark as solved |
| `PUT /api/logbook/:logbookId/pending` | Reopen |
| `GET /api/logbook/:logbookId/readers` | List of who has read it |
| `GET /api/logbook/:logbookId/solved` | Who solved it (if it's solved) |

The whole subroute sits behind `authenticateToken` + `excludeMantenimiento`. Mantenimiento doesn't enter.

**Important:** `GET /trashed` is declared **before** the `:id` routes so Express doesn't capture it as an id. If you reorder, mind that order.

## Frontend — layout

```
frontend/app/dashboard/logbooks/
   ├── page.tsx          (6 lines — entry point that mounts LogbooksContainer)
   ├── loading.tsx       (skeleton)
   └── error.tsx         (error boundary)

frontend/app/components/logbooks/
   ├── LogbooksContainer.tsx   (264 lines — orchestrator: date picker, useLogbooks hook, handlers)
   ├── LogbooksList.tsx        (990 lines — feed render, read/comments modals, ES↔EN importance mapping, priority styling)
   ├── NewLogbookEntry.tsx     (260 lines — create modal)
   ├── NewCommentEntry.tsx     (161 lines)
   ├── EditLogbookModal.tsx    (118 lines)
   └── EditCommentModal.tsx    (118 lines)

frontend/app/lib/logbooks/
   ├── queries.ts           (React Query keys + apiClient calls)
   ├── types.ts             (LogEntry, Comment, etc.)
   ├── validations.ts       (Zod schemas; same keys as backend but on the UI side)
   ├── hooks/useLogbooks.ts (orchestrator hook: mutations + cache invalidation + toasts)
   └── hooks/useDepartments.ts
```

### `useLogbooks(date, messages)` — the key hook

`useLogbooks` is where most of the feed logic lives. Takes the active date and a `messages` object with the i18n toast strings (injected from the container so the hook is i18n-agnostic). Returns:

- `entries` — the day's logbooks.
- Mutations: `createLogbook`, `updateLogbook`, `deleteLogbook`, `toggleStatus`, `toggleRead`, `createComment`, `updateComment`, `deleteComment`.
- Every mutation does optimistic update + invalidates the day's query + emits success/error toast.

**`messages` injection pattern:** done in `LogbooksContainer.tsx` with `useMemo(() => ({...}), [tLogbook])`. The reason is that the hook can't call `useTranslations()` inside (would break the rules of hooks if the key changes), and we want messages to update when the locale changes.

### Importance ↔ Priority mapping

```
Frontend         Backend
'critical'   ↔   'urgente'
'high'       ↔   'alta'
'medium'     ↔   'media'
'low'        ↔   'baja'
```

`mapPriorityToBackend()` in `LogbooksList.tsx`. Per-priority styling in `getPriorityBackground()` — red borders for `critical`, orange for `high`, neutral for the rest.

### Day picker

`HorizontalDatePicker` from `@/app/ui/calendar/` shows a horizontal strip of days for the selected month. Active state is `(currentDate, selectedDay)`. The backend query uses `?day=YYYY-MM-DD`.

## Conventions and patterns

- **i18n:** namespaces `logbooks` and `logbook` (distinct). Plural for the container (page), singular for entry-level text and toasts. Dictionaries in `frontend/i18n/`.
- **Toasts:** `react-hot-toast`. Every mutation has success or error messaging.
- **Auth:** every backend route sits behind `authenticateToken` + `excludeMantenimiento`. Mantenimiento doesn't enter.
- **Soft delete:** deletes go to `is_deleted=1` and show up in `/trashed`. No restore UI yet; restoration is manual via SQL (easy to add).
- **Comments with independent history:** comment edits also log, but to `logbook_comments_history` (not `logbook_history`). If you need the full audit of an entry including its comments, you have to join the two tables.

## Known gotchas

1. **ES↔EN importance mapping:** two places define the strings (backend uses ES, frontend uses EN). If you add a level, update both ends and the mapping in `LogbooksList.tsx` + `getPriorityBackground()`.
2. **Only the author edits/deletes:** no admin override. If you need one in the future, put it in `services` with its own audit trail (`action: 'admin_override'`).
3. **`/trashed` route order:** declared **before** the `:id` routes to avoid the clash. Keep that order if you reorder the file.
4. **`LogbooksList.tsx` is 990 lines.** Approaching split territory. If you're about to add non-trivial work in there, consider extracting subcomponents (each entry, readers modal, etc.) first. Not urgent but on the radar.

## Cross references

- `backend/repositories/logbook/` — all repos.
- `frontend/app/lib/logbooks/hooks/useLogbooks.ts` — the frontend orchestrator hook.
- `backend/config/error-codes.ts` — module-specific error codes (`LOGBOOK_CREATE_ERROR`, etc.).
