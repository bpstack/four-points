# Checklist

Daily shift checklists for reception, plus the guides and references they link
to. Screens under `/dashboard/checklist`. Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

Each shift has a list of things that must be done at set times — opening
procedures, reports, night audit — and forgetting one has consequences. The
module shows the day's checklist for each shift, lets staff tick steps as they
go, records who did what and when, and keeps the related procedures one click
away. Every morning the lists start fresh.

## Who uses it

Every role **except `mantenimiento`**. Anyone with access ticks and unticks
steps and adds comments or images. Restarting a checklist by hand is for
`admin`, `recepcionista` and `demo-admin`. A comment or image can be deleted by
its author or by an `admin`.

## What it can do

- **Catalogue** in a side index, grouped by category, with three kinds of item:
  - **Checklists** (`tasks`): three today — morning shift, afternoon shift and
    night audit — each made of timed sections with steps to tick.
  - **Guides** (15) and **references** (13): step-by-step procedures and
    reference sheets, written in Markdown and linked from the steps.
- **Tick and untick steps**, showing who did each one and when.
- **Comments and images per step** (JPEG, PNG, WebP or GIF up to 5 MB, stored in
  Cloudinary), kept for that day's run.
- **Manual restart** of the day's checklist. It does not work today: the
  database allows only one run per checklist and day, so the restart fails and
  the day goes on with the previous run (see the rules).
- **History** of past days, shown to admins in _Profile → Settings → Reports_.
- **Print mode** for paper audits.

## What data it handles

**Content** (what each checklist contains) is not in the database: it lives in
files.

- `frontend/content/checklist/`: `_index.json` (categories and order),
  `tasks/*.json` (the checklists), `guides/*.md` and `references/*.md`.
- `backend/content/checklist/tasks/*.json`: a **second copy of the checklists**,
  which the backend uses to check that a step exists. Both copies must stay
  identical (today they are).

**State** lives in six tables (`backend/db-mysql/aiven/20_checklist.sql`):

- **`checklist_runs`**: one row per checklist and hotel day, with when and why
  it was closed.
- **`checklist_step_state`**: whether each step of a run is done, by whom and
  when.
- **`checklist_step_comments`** and **`checklist_step_attachments`**: comments
  and images per step.
- **`checklist_event_log`**: every tick, untick and restart.
- **`checklist_config`**: exists but is not used.

## What rules it follows

- **One run per checklist and hotel day** (Madrid time). Runs are closed every
  day at 06:30 by the scheduled job; if the server was asleep, the first request
  of the day closes the old runs itself, so the list is always today's.
- **Ticking only accepts steps that exist** in the backend copy of the
  checklist. If a checklist has no backend copy, any step is accepted.
- **Comments and images do not check the step** against the content.
- **The event log keeps 7 days**: every Monday at 04:00 older events are
  deleted. Runs and step states are kept.
- **Step text is in Spanish** and is not translated; the interface around it is.

## How information flows

```
[id]/page.tsx (server) ─► loader.ts ─► frontend/content/checklist/ (files)
        │
        └─► ChecklistTasksContent · StepDetailsPanel ─► lib/checklist/api.ts ─► apiClient
                                                                  │
                                              /api/checklists/* (Express)
                                                                  │
                          authenticateToken ─► excludeMantenimiento ─► controllers
                                                                  │
                      checklist service ─► repositories ─► MySQL · Cloudinary (images)

Scheduled job: 06:30 close yesterday's runs · Monday 04:00 purge event log
```

1. The server reads the content files once and keeps them in memory; each page
   renders a checklist, guide or reference from them.
2. A checklist page asks the backend for today's run, which is created on the
   first request of the day, and gets each step's state with its comment and
   image counts.
3. Ticking a step updates the screen at once and then saves it; the backend
   stores the state and writes an event.
4. Restarting closes the current run and tries to open a new one, which the
   database rejects; the next request goes back to the closed run, with its
   steps still ticked.
