# Logbook

Daily register of notices and incidents between shifts. Screen:
`/dashboard/logbooks`. Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

What happens on one shift must reach the next: a complaint, a breakdown, a
pending task. By word of mouth or on paper it gets lost, and it is not known who
has seen it or whether someone has taken care of it. The logbook keeps each
notice with its author, date and importance; it shows who has read it, whether
it is resolved, and preserves the history of everything that has happened to it.

## Who uses it

All roles **except `mantenimiento`**, which does not have access to the module.

- **Any user with access** creates entries, reads them, comments, marks them as
  read and resolves or reopens them, whether they are their own or not.
- **Only the author** edits or deletes their entry, and the same for each
  comment. An `admin` has no exception.
- **Administrators** also see, in _Profile → Settings → Reports_, entries by
  date range, deleted ones and the history of each.

## What it can do

- **See the entries for a day**, chosen from a strip of days of the month.
- **Create an entry**: text (3–5000 characters), importance, department and
  date. The date defaults to today in Madrid, but another can be chosen.
- **Importance** in four levels: low, medium, high and urgent (stored as `baja`,
  `media`, `alta` and `urgente`). High and urgent ones are highlighted in colour
  and also appear on the home panel.
- **Mark as read** (and undo it) and see **who has read it**.
- **Resolve** an entry and **reopen** it as pending.
- **Comment**, and edit or delete own comments.
- **Edit and delete** own entries. Deleting does not remove: the entry goes to
  the trash.

## What data it handles

Four tables (`backend/db-mysql/aiven/03_logbook_tables.sql`):

- **`logbooks`**: the entry — text, author, department, importance, hotel date
  (`date`), whether it is resolved and who resolved it, and `deleted_at` if it
  is in the trash.
- **`logbook_comments`**: comments, also with soft delete.
- **`logbook_reads`**: who has read each entry and when.
- **`logbook_history`**: the history of entries and comments — who did what
  (create, edit, delete, read, unmark, resolve, reopen), with the previous and
  new content.

Departments are the application's general ones (table `departments`).

## What rules it follows

- **Everything is recorded in the history**: creating, editing and deleting
  entries and comments, and also reading, unmarking, resolving and reopening.
- **Nothing is truly deleted**: entries and comments are only marked with
  `deleted_at`. There is no way to restore them from the interface.
- **Only the author edits or deletes** their entry or comment.
- **A resolved entry has a single responsible person**: when reopened, who
  resolved it is deleted; the trace remains in the history.
- **Importance is stored in Spanish** (`baja`, `media`, `alta`, `urgente`); the
  frontend uses `low`, `medium`, `high` and `critical` and translates them when
  sending.
- **An entry's day is its hotel date**; for old entries without `date`, the day
  they were created is used.
- Listings return 100 entries by default and 500 as maximum, from most recent to
  oldest.

## How information flows

```
LogbooksContainer ─► useLogbooks(date) ─► logbooksApi (queries.ts) ─► apiClient
                                                                        │
                                                    /api/logbooks/* (Express)
                                                                        │
      logbook-controllers · logbookComments-controllers · logbookReads-controllers
                                                                        │
                    logbookHistory-service (only edit and delete) · repositories
                                                                        │
                                            logbooks · comments · reads · history
```

1. When choosing a day, `useLogbooks` requests `GET /api/logbooks/day/<fecha>`
   and, for each entry, its comments and readers.
2. Each action (create, edit, read, resolve, comment…) is a React Query
   mutation: it calls the backend and, when it responds, requests the day's data
   again and shows a success or error notice.
3. On the backend, the controller validates with Zod, checks authorship when
   needed and writes to the table and to `logbook_history`.
4. The home panel requests the days of the chosen period (today, week or month)
   and shows only the high and urgent entries.
