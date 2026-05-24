# Claude Code — CLAUDE.md System

Reference doc for how the layered `CLAUDE.md` system works in this project. Read this before creating a new module file or opening Claude for cross-module work.

---

## How loading works

When you open Claude from a directory, it auto-loads **every `CLAUDE.md` from that directory upward to the root**. Sibling directories are NOT loaded.

```
Opened from: backend/services/logbook/
Loaded:       backend/services/logbook/CLAUDE.md
              backend/CLAUDE.md  (if it exists)
              CLAUDE.md  (root)

NOT loaded:   frontend/app/components/logbooks/CLAUDE.md
              backend/services/parking/CLAUDE.md
```

**Operational rule: always open Claude from the most specific directory for the task.** Opening from the root loads only global context — use it only for cross-module work that genuinely spans multiple domains.

---

## Module index

| Module | CLAUDE.md location(s) |
|---|---|
| **Scheduling** (CP-SAT solver, grid UI) | `backend/services/scheduling/` · `backend/scheduling-solver/` · `frontend/app/components/scheduling/` |
| **Checklist** (daily ops, JSON sync rule) | `backend/services/checklist/` |
| **Logbook** (incident log, read/unread, audit trail) | `backend/services/logbook/` |
| **Parking** (bookings lifecycle, responsive reference) | `backend/services/parking/` · `frontend/app/dashboard/parking/` |
| **Maintenance** (7-state workflow, Cloudinary images) | `frontend/app/components/maintenance/` |
| **F&B / Restaurant** (Opera PDF parser, daily revenue) | `backend/services/fnb/` |
| **Cashier** (shifts, denominations, vouchers, PDF export) | `backend/services/cashier/` · `frontend/app/components/cashier/` |
| **Group Tracking** (bookings, payments, 4-status tracks) | `backend/services/group/` · `frontend/app/components/groups/` |
| **Backoffice** (suppliers, invoices, assets, batch-pay) | `backend/services/backoffice/` |
| **Blacklist** (banned guests, Cloudinary photos, audit trail) | `backend/services/blacklist/` |
| **DB / Migrations** (policy, schema, idempotent scripts) | `backend/db-mysql/` |

**Decided as root-only** (transversal or low complexity): Auth, Messaging, Notifications, Activity, Demo, Departments, Search, Profile, Cron.

**Skipped by explicit decision**: Conciliation (2026-05-24).

---

## Cross-module navigation

When working inside a module and hitting a concept from a sibling module:

1. **Don't guess** from the 1-line Module Index entry — it only tells you where the doc is, not what's in it.
2. **Read the target module's CLAUDE.md** before making any decision that touches that module.
3. Return to the original task with full context.

The root `CLAUDE.md` Module Index is a discovery map, not a summary.

---

## Principles for creating a module file

Create a `CLAUDE.md` only where it adds real value — not for completeness, not one-per-folder.

A module warrants its own file when it has:
- Non-obvious design decisions or invariants (lifecycle states, role boundaries, audit patterns)
- Gotchas that would surprise a reader coming in cold
- Conventions not derivable from reading the code (enums defined elsewhere, sync rules between two directories, shared services)

Low-complexity modules (Messaging, Notifications, etc.) stay in the root — adding a file would just be noise.

**Granularity by complexity, not file count.** Logbook fits in one file. Scheduling needs three (solver Python, backend TS, frontend grid).

---

## Conventions

### Language
All `CLAUDE.md` files are written in **idiomatic technical English**. Not literal translation — use natural phrases: "stays in sync", "drop in", "wire up", "gotcha". Code comments and UI strings may remain in their original language.

### Structure
Each module file must be **self-contained** — a reader opening Claude from that directory should not need the root to understand the module. Include:
- What it does (1 paragraph)
- DB tables (if applicable)
- Enums / status types
- Backend + frontend layout (file sizes help orient quickly)
- Key patterns / services
- Endpoints (table format)
- Known gotchas
- Cross references

### File placement
- `backend/services/<module>/CLAUDE.md` — preferred for backend-heavy modules
- `frontend/app/components/<module>/CLAUDE.md` — preferred for frontend-heavy modules
- If no `services/<module>/` directory exists, **create it as a documentation anchor** (Opción A). Coherence with the convention outweighs structural purity.
- Modules with both backend density and frontend density get two files (e.g. cashier, parking, group).

---

## Adding a new module

1. Create `CLAUDE.md` in the most specific relevant directory.
2. Write in idiomatic technical English, self-contained.
3. Add a row to the Module Index in the root `CLAUDE.md` AND in this file.
4. Commit as `docs(claude): split <module> module context into module file`.

---

## Commit strategy

One commit per module, not per file and not bundled at the end.

- **Multi-file modules** (e.g. scheduling: solver + backend + frontend): one commit when all files in the module are done.
- **Single-file modules**: one commit with the new file + any root CLAUDE.md cleanup.
- **Root restructure phases** (slim root, add index): separate commits at the end.

Never commit a module half-done. If a session ends mid-module, leave it unstaged — the root CLAUDE.md stays intact as the safety net.

---

## History

| Date | Action |
|---|---|
| 2026-05-23 | Fase 1: inventory. Fase 2 started: Scheduling (3 files), Checklist, Logbook, Parking (2 files), Maintenance, F&B. All translated to English same session. |
| 2026-05-24 | Fase 2 continued: Cashier (2 files), Group (2 files), DB/migrations, Backoffice, Blacklist. Fase 3: root slimmed 286→101 lines. Fase 4: module index + cross-module navigation guide added to root. |
