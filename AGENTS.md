# AGENTS.md

This file provides guidance to agent CLIs — Claude Code (through the
`@AGENTS.md` import in `CLAUDE.md`) and **OpenCode** — when working with code in
this repository. It holds only what the whole repo shares; each subproject and
each documented module has its own `AGENTS.md`.

## Project Overview

**Four-Points** is a full-stack hotel Property Management System (PMS). Next.js
16 (App Router) frontend + Express 5 backend. TypeScript throughout. The system
manages hotel operations including logbooks, parking, scheduling, maintenance,
cashier, backoffice, and more.

⚠️ **`frontend/` and `backend/` are two independent pnpm projects, not a
workspace.** There is no root `package.json` and no `pnpm-workspace.yaml`: each
side has its own `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and
`.nvmrc`. Always `cd` into one of them before running `pnpm`, and never assume a
dependency present on one side exists on the other — that is exactly how the two
Zod majors coexist. They do not even share the Node major: `frontend/` runs 24,
`backend/` 22. The root has no `.nvmrc`: a session started here activates each
side's Node before running anything there (Rule 9 under `## Exceptions` in each
subproject's `AGENTS.md`).

## How the docs are layered

Three levels. Read **downwards** before touching code — root, then subproject,
then module — and follow the links **across** when a task crosses from one side
to the other.

- **Root `AGENTS.md`** (this file) — shared by both subprojects: Context7
  policy, Markdown formatting, commits and hooks, the security level, the
  contract between frontend and backend, and the module map.
- **[`backend/AGENTS.md`](backend/AGENTS.md) and
  [`frontend/AGENTS.md`](frontend/AGENTS.md)** — the harness rules (layer 1),
  then the subproject's stack, installed versions, commands, architecture,
  security areas and the list of its module docs.
- **Module `AGENTS.md`** — one per documented module, inside the subproject it
  belongs to. Each one links up to its subproject and across to its counterpart
  on the other side, when there is one.

Every `AGENTS.md` has a one-line `CLAUDE.md` next to it (`@AGENTS.md`), so
Claude Code loads it (ADR-042).

**What gets loaded:**

- **Claude Code** — this file at start; a subproject or module `AGENTS.md` as
  soon as it reads a file in that directory.
- **OpenCode** — at start, every `AGENTS.md` from the directory where it was
  started up to the repo root (started in `backend/`: `backend/AGENTS.md` and
  this file); a module one as soon as it reads a file below it. Checked in its
  source at the installed version, 1.18.12.
- **Neither loads the other side on its own.** A backend module doc does not
  bring in `frontend/AGENTS.md`, nor the reverse: when a task crosses sides,
  follow the links.

Public, human-facing docs per module live in `docs/<module>/` (English). State
and decisions live in `docs/SESSION.md` and `docs/DECISIONS.md`, shared by both
subprojects.

## Up-to-date Documentation (Context7 MCP)

This repository assumes the **Context7** MCP is registered at the user level in
the client (not a project dependency and not in any `package.json`). The policy
is the same whichever client runs it.

Check that it is available before relying on it:

```bash
opencode mcp list     # should show context7 → Connected
```

If it does not appear, add it to `~/.config/opencode/opencode.json` (user
config, not project):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}" }
    }
  }
}
```

The API key is read from the `CONTEXT7_API_KEY` environment variable — never
literal in the file. If the MCP is not available on the current machine, **say
so explicitly in the response** and proceed with your own knowledge; do not
pretend to have consulted documentation.

### When to Use It

**Reactive and scoped** activation: only when writing or modifying code that
touches a library listed in the installed versions of `backend/AGENTS.md` or
`frontend/AGENTS.md`. Never as a sweep ("review the whole project against
current docs") — that generates unrequested cascading refactors.

Flow: `resolve-library-id` → `query-docs` with the ID, **the installed version**
(the lockfile, not the `^` range) and the specific topic. If that exact version
is not indexed, use the closest minor below and state which one you consulted.

**Zod is in two different majors** — v3 in `frontend/`, v4 in `backend/`. Never
copy a schema between the two without consulting docs for both: in v4, custom
error messages, `z.ZodError`, and several `z.string()` helpers changed. Always
indicate the subproject when querying.

### Limits

- Context7 is for **verification**, not migration. Do not upgrade versions or
  "modernize" existing working code without explicit request.
- A module's `AGENTS.md` may pin a version for operational reasons (Render
  memory, host compatibility…). **That note overrides the version lists and
  official docs** — these are infrastructure constraints Context7 does not know
  about. `pdf-parse` in `backend/services/fnb/` is the living example.
- If you detect a deprecated API in existing code, **mention it in the response
  but do not change it**.
- If current docs recommend a different pattern than the repo uses, follow the
  repo convention and mention the discrepancy.
- Does not apply to business logic, internal refactors, or project-specific
  debugging — only to library APIs.

## Development Workflow

1. Start backend: `cd backend && pnpm dev:local`
2. Start frontend: `cd frontend && pnpm dev`
3. Access app at `http://localhost:3000`
4. API available at `http://localhost:4000`

A fresh local install (tables, first admin, departments, mock data) is
`cd backend && pnpm setup:local`. Each subproject's full command list is in its
own `AGENTS.md`.

## Frontend ↔ Backend Contract

What both halves must agree on. The details of each side live in its own
`AGENTS.md`.

- **Auth is custom JWT, not NextAuth.** The backend sets two HttpOnly cookies,
  `access_token` (15 min) and `refresh_token` (7 d), `SameSite=Lax`, both signed
  with `SECRET_JWT_KEY`; in production they are scoped to
  `.four-points.stackbp.es`. The frontend sends `credentials: 'include'` on
  every call and, on a 401, retries through `POST /api/auth/refresh-token`.
  There is no `express-session`, no `sessions` table and no dev-mode bypass.
- **The frontend calls the backend directly** — `NEXT_PUBLIC_API_URL` from the
  browser, `NEXT_SERVER_API_URL` from the server — with no Next.js API routes in
  between. A new frontend origin has to be added to the CORS allowlist in
  `backend/config/cors.ts` (or passed as `FRONTEND_URL`): CORS is also the CSRF
  defence, and any other origin gets a 403.
- **Roles** — `admin`, `recepcionista`, `mantenimiento`, `group-admin` — are
  enforced in the backend. The frontend only hides what a role cannot use.
- **Demo:** one admin account with `users.is_demo = 1`, limited by
  `backend/middlewares/demoRestriction.ts`. It exists only with `DEMO_MODE=true`
  in the backend; `NEXT_PUBLIC_DEMO_MODE=true` shows its button on the login
  page (ADR-038).
- **Shapes are copied by hand, never shared:** Zod schemas (v3 / v4, see above),
  the TS types mirrored in `frontend/app/lib/<module>/types.ts`, and the
  checklist JSON duplicated in `backend/content/` and `frontend/content/`.
  Changing one side means changing the other.
- **The UI is in Spanish**, and so are some code comments.

## Markdown Formatting

Prettier with the root config (`.prettierrc`): aligned GitHub-flavored tables,
`proseWrap: always` (auto re-flowing prose to 80 columns) and
`embeddedLanguageFormatting: off` (**no** reformatting code inside ` ``` `
blocks — respect the original style).

**The same Markdown rule applies everywhere.** Prettier uses the nearest config,
so `backend/.prettierrc` and `frontend/.prettierrc` repeat it in a `*.md`
override (80 columns, `proseWrap: always`, `embeddedLanguageFormatting: off`);
their code settings are unchanged. `frontend/.prettierignore` leaves out the
checklist guides and references in `frontend/content/checklist/`, which the app
renders, until they are edited on purpose.

**Lines over 80 columns are only acceptable** inside code blocks and where the
line is a single unbreakable piece (a long inline code span or link). Prose and
tables are not an exception: see the next rule.

**Tables only for short cells.** Prettier aligns tables but cannot break a cell,
so a long sentence widens the whole table and the editor misaligns it. If any
row exceeds 80 columns (`printWidth`) or a cell has more than one sentence, use
a list (`- **key**: description`) instead of a table. Applies to any `.md` in
the repo (including `docs/`) when creating or editing a table; old ones are
fixed when touched.

**CI checks every tracked `.md`** with the frontend's Prettier. Both projects
pin the same version: a different one wraps some lines differently, so upgrade
them together. Run the same check from the root before committing, and format
only the files you changed:

```bash
git ls-files -z '*.md' | xargs -0 ./frontend/node_modules/.bin/prettier --check --ignore-path .prettierignore --ignore-path frontend/.prettierignore
./frontend/node_modules/.bin/prettier --write <changed files>
```

## Commit and Push Conventions

Rules of **mandatory compliance**. They are also enforced by hooks in
`.githooks/` (see below): if a message violates them, the commit is rejected —
this is not a recommendation.

- **Language: English.** Subject and body, and also PR bodies (`gh pr create`).
  Proper names, technical identifiers and paths can remain in their original
  language.
- **Format: Conventional Commits** — `feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`, `test:`, `perf:`, `build:`, `ci:`, `style:`, `revert:`. Optional
  scope: `feat(scheduling/solver): …`
- **Subject** in imperative mood, ≤ 72 characters, no trailing period.
- **Body**: explain the _why_, not the _what_ (the diff already tells that).
  Bullets when there are 3+ independent points. No vague messages (`fix bug`,
  `update code`, `wip`).
- **No AI trace.** The history must read as human work. **Never**
  `Co-Authored-By:` from an assistant, **never** footers like
  `🤖 Generated with ...`, nor "AI-assisted", "generated by", nor bot emojis.
  Applies to subject, body, footers and PR comments. If your default template
  adds them, remove them before committing.
- **Footers**: only real metadata (`Refs #123`, `Closes #45`).
- **Never `push` without explicit permission.** Creating commits locally is fine
  if the user asked to implement or fix something. Publishing them requires a
  "haz push" / "sube esto" from the owner in the same session. Local commits
  accumulate until then. `--force` against `main` requires a direct order.

### Git Hooks (activate once per clone)

The hooks live in `.githooks/` and **are versioned**, but Git does not activate
them automatically: `core.hooksPath` is local config, so you must run it once on
each machine where you clone the repo.

```bash
git config core.hooksPath .githooks
```

- **`commit-msg`**: Rejects the commit if the message contains AI attribution
  (`Co-Authored-By: Claude`, `Generated with`, `🤖`, `AI-assisted`…)
- **`pre-push`**: Blocks push in **non-interactive** sessions (agents, scripts)
  and rejects any non-fast-forward push to `main`/`master`

Notes:

- They are **local** hooks: they consume nothing from GitHub (not Actions) and
  are not enforced server-side.
- Automated push already authorized by the user: `FP_PUSH_OK=1 git push`. That
  variable does **not** bypass the force-push guard on `main`.
- `--no-verify` skips the hooks. Using it is a conscious owner decision, never
  an agent's.

## Security

**L3** — estimated on 2026-09-28: there is login and user accounts, personal
data (users, guest blacklist with photos, cashier) and own backend; the L3 level
is declared by the owner as the target (`docs/DECISIONS.md` ADR-017), not the
current state. **Re-estimate when:** Aiven starts storing real guest or staff
data.

The same level line is repeated in `backend/AGENTS.md` and `frontend/AGENTS.md`;
a re-estimate changes all three.

**Areas:** each subproject lists its own in its `## Security` section, with
paths relative to it — [`backend/AGENTS.md`](backend/AGENTS.md#security) and
[`frontend/AGENTS.md`](frontend/AGENTS.md#security). A review that spans both
reads both lists; one that spans neither (root config, `.githooks/`, `.github/`)
deduces its areas from the code.

## Module Map

Each entry points to the module's `AGENTS.md`. Some modules have one doc per
side; the smaller ones keep a single doc covering both, where most of their
logic lives.

- **Scheduling** (CP-SAT solver, grid UI) — backend TS:
  `backend/services/scheduling/` · Python solver: `backend/scheduling-solver/` ·
  UI: `frontend/app/components/scheduling/`
- **Parking** (bookings lifecycle, responsive reference) — backend:
  `backend/services/parking/` · UI: `frontend/app/dashboard/parking/`
- **Cashier** (shifts, denominations, vouchers, PDF export) — backend:
  `backend/services/cashier/` · UI: `frontend/app/components/cashier/`
- **Group Tracking** (bookings, payments, 4-status tracks) — backend:
  `backend/services/group/` · UI: `frontend/app/components/groups/`
- **Maintenance** (7-state workflow, Cloudinary images) — both sides:
  `frontend/app/components/maintenance/`
- **Checklist** (daily ops checklists, JSON sync rule) — both sides:
  `backend/services/checklist/`
- **Logbook** (incident log, read/unread, audit trail) — both sides:
  `backend/services/logbook/`. The frontend route is plural
  (`app/dashboard/logbooks/`), the backend folders singular
- **F&B / Restaurant** (Opera PDF parser, daily revenue) — both sides:
  `backend/services/fnb/`
- **Backoffice** (suppliers, invoices, assets, batch-pay) — both sides:
  `backend/services/backoffice/`
- **Blacklist** (banned guests, Cloudinary photos, audit trail) — both sides:
  `backend/services/blacklist/`
- **DB / Migrations** (policy, schema, idempotent scripts) — `backend/db-mysql/`
- **Messaging** — no module doc yet: its paths are in `backend/AGENTS.md` and
  `frontend/AGENTS.md`

## Cross-Module Navigation

When working inside a module and encountering a concept, endpoint, or behaviour
that belongs to another module:

1. **Don't guess** from the 1-line entry in the Module Map above — that entry
   only tells you where the doc is, not what's in it.
2. **Read the target module's `AGENTS.md`** (path shown in the map) before
   making any decision that touches that module.
3. Then return to the original task with full context.

The Module Map is a discovery map, not a summary. If something in the codebase
seems undocumented, check whether a sibling module's `AGENTS.md` covers it
before assuming it isn't documented.

## Adding a New Module

When a new module grows complex enough to warrant its own doc:

1. Create `AGENTS.md` in the most specific relevant directory
   (`backend/services/<module>/` or `frontend/app/components/<module>/`). If no
   `services/` dir exists, create it as a documentation anchor. Add a one-line
   `CLAUDE.md` next to it with `@AGENTS.md`.
2. Write it in idiomatic technical English. Make it self-contained — a reader in
   that directory should not need the root to understand the module.
3. Open it with the up link the other module docs carry (subproject `AGENTS.md`
   and this file), and link its counterpart on the other side, both ways.
4. Add it to the **Module Map** above and to the module list of its subproject's
   `AGENTS.md` (both, when it covers both sides).
5. Commit as `docs(agents): split <module> module context into module file`.

## Common Pitfalls to Avoid

1. **Don't modify code without permission**: always ask before making code
   changes.
2. **Database changes**: coordinate SQL migrations between local and Aiven
   databases — see `backend/AGENTS.md` § Database.
