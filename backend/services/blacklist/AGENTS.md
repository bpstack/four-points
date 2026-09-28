# AGENTS.md — Blacklist

> Combined doc for the blacklist module (backend + frontend). Covers the data
> model, audit trail pattern, image handling via Cloudinary, soft
> delete/restore, and the frontend component map.

## What it does

Registry of individuals banned from the hotel. Each entry records the person's
name, document type and number (DNI/Passport/NIE/Other), reason for the ban, one
or more photos (stored in Cloudinary as a JSON array), a free-text description,
and a full audit trail of all changes. Entries can be soft-deleted and later
restored. All users except `mantenimiento` can read the list; creating, editing,
and deleting requires authentication.

## DB table — `blacklist_entries`

Single table: `id`, `name`, `document_type` (enum: DNI/PASSPORT/NIE/OTHER),
`document_number`, `reason`, `description`, `images` (JSON array of Cloudinary
URLs + public IDs), `audit_trail` (JSON array of `AuditEntry` objects),
`is_deleted` (soft delete flag), `deleted_by`, `deleted_at`, `created_by`,
`created_at`, `updated_at`.

The `audit_trail` column is an in-row JSON log — every create, update, and
delete appends an `AuditEntry` `{ action, changed_by, timestamp, changes }` to
the array. There is no separate history table.

## Backend layout

```
backend/controllers/blacklist/
└── blacklist-controller.ts    (517 lines)

backend/repositories/blacklist/
└── blacklist-repository.ts    (565 lines — includes audit trail management)

backend/services/blacklist/
└── cloudinary-service.ts      (shared with backoffice — Cloudinary upload/delete)

backend/routes/blacklist/blacklist-routes.ts
backend/validations/blacklist/schemas.ts   (Zod — createBlacklistSchema, updateBlacklistSchema, blacklistFiltersSchema)
backend/models/blacklist/index.ts          (types: BlacklistEntry, AuditEntry, BlacklistFilters, etc.)
```

## Audit trail pattern

Every mutation builds an `AuditEntry` and appends it to the `audit_trail` JSON
column:

```ts
const auditEntry: AuditEntry = {
  action: 'created' | 'updated' | 'deleted' | 'restored',
  changed_by: userId,
  timestamp: new Date().toISOString(),
  changes: { field: { old, new } },  // only on 'updated'
}
```

On `create`: initializes the column as `[auditEntry]`. On
`update`/`delete`/`restore`: reads the current column, parses the JSON, appends
the new entry, writes back. The repository handles this internally — callers
just pass the action context.

**Gotcha:** because `audit_trail` is JSON-in-a-column, it is parsed on every
`getById` and `getAll` query (`JSON.parse(row.audit_trail)`). If you add a bulk
export, consider streaming rows rather than loading all at once.

## Image handling (Cloudinary)

Images are uploaded in two steps:

1. `POST /api/blacklist/upload` — uploads the file to Cloudinary via
   `CloudinaryService`. Returns `{ url, publicId }`. Frontend calls this before
   saving the entry.
2. The frontend collects the returned URLs/publicIds and includes them in the
   `images` array when calling `POST /` or `PATCH /:id`.

`DELETE /api/blacklist/upload/:publicId` — deletes an image from Cloudinary
(used when the user removes a photo before saving).

**Important:** `CloudinaryService` is in
`backend/services/blacklist/cloudinary-service.ts` and is also imported by the
backoffice module. Do not move or rename it without updating both importers.

## Soft delete / restore

- `DELETE /:id` — sets `is_deleted = 1`, records `deleted_by` and `deleted_at`,
  appends `{ action: 'deleted' }` to audit trail.
- `PATCH /:id/restore` — sets `is_deleted = 0`, clears
  `deleted_by`/`deleted_at`, appends `{ action: 'restored' }` to audit trail.
- `getAll` by default excludes soft-deleted entries. To include them, pass
  `includeDeleted=true` in filters.

## Endpoints

- **GET** `/api/blacklist` — all (excl. mantenimiento) · Paginated list with
  filters
- **GET** `/api/blacklist/stats` — all · Entry counts + stats
- **GET** `/api/blacklist/:id` — all · Full entry with audit trail
- **POST** `/api/blacklist` — all · Create entry
- **PATCH** `/api/blacklist/:id` — all · Update entry
- **DELETE** `/api/blacklist/:id` — all · Soft delete
- **PATCH** `/api/blacklist/:id/restore` — all · Restore soft-deleted entry
- **POST** `/api/blacklist/upload` — all · Upload image to Cloudinary
- **DELETE** `/api/blacklist/upload/:publicId` — all · Delete image from
  Cloudinary

All routes sit behind `authenticateToken` + `excludeMantenimiento`. No
admin-only mutations — any authenticated non-maintenance user can create, edit,
and delete entries.

**Route order:** `POST /upload` and `DELETE /upload/:publicId` are declared
**before** `GET /:id` and `DELETE /:id` to prevent Express matching `upload` as
an ID parameter.

## Frontend layout

```
app/dashboard/blacklist/
├── page.tsx              ← list page
├── new/page.tsx          ← create form
├── [id]/page.tsx         ← detail page
└── [id]/edit/page.tsx    ← edit form (with not-found.tsx)

app/components/blacklist/
├── BlacklistDetailClient.tsx      ← detail orchestrator (323 lines)
├── mains/
│   ├── BlacklistTable.tsx         ← list table with filters + pagination (327 lines)
│   ├── BlacklistModal.tsx         ← detail view modal from list (395 lines)
│   ├── BlacklistForm.tsx          ← shared create/edit form (435 lines)
│   ├── ImageGallery.tsx           ← photo display + delete (339 lines)
│   ├── SearchBar.tsx              ← search + filter bar (337 lines)
│   ├── AuditTrail.tsx             ← renders the JSON audit trail (308 lines)
│   ├── Pagination.tsx             (206 lines)
│   └── DeleteButton.tsx           (56 lines)
├── panels/
│   ├── CreateBlacklistPanel.tsx   ← slide-in create panel (418 lines)
│   └── EditBlacklistPanel.tsx     ← slide-in edit panel (563 lines — largest)
├── layout/
│   └── BlacklistDetailSummaryPanel.tsx  (157 lines)
└── ui/
    ├── ImageUploader.tsx          ← handles Cloudinary upload flow (287 lines)
    └── DataRangePicker.tsx        (81 lines)

app/lib/blacklist/
├── blacklistApi.ts   ← all HTTP calls
├── blacklistSchema.ts ← Zod schemas (client-side validation)
├── blacklistUtils.ts  ← helper functions
└── types.ts           ← TypeScript types
```

## Known gotchas

1. **Two-step image upload.** The image is uploaded to Cloudinary first
   (`POST /upload`), then the returned URL/publicId is included in the entry
   payload. If the user cancels after uploading, the image stays in Cloudinary
   orphaned. There is no cleanup job for orphaned images — they accumulate until
   manually purged from the Cloudinary dashboard.
2. **`audit_trail` JSON column grows unboundedly.** Each edit appends a new
   entry. For long-lived entries with many edits, this column can grow large.
   Currently there is no truncation. If you notice slow queries on
   heavily-edited entries, consider offloading history to a separate table.
3. **`EditBlacklistPanel` is 563 lines.** It handles the full edit form
   including image management and audit trail display. If adding non-trivial
   features, extract subcomponents first.
4. **`CloudinaryService` shared with backoffice.** Lives in
   `backend/services/blacklist/cloudinary-service.ts` but is imported by both
   modules. Treat it as a shared utility.
5. **No admin-only mutations.** Unlike most other modules, any authenticated
   non-maintenance user can create/edit/delete blacklist entries. This is
   intentional — reception staff need full access to manage the list.

## Cross references

- `backend/repositories/blacklist/blacklist-repository.ts` — audit trail append
  logic, soft delete, restore.
- `backend/services/blacklist/cloudinary-service.ts` — Cloudinary upload/delete
  (shared with backoffice).
- `backend/db-mysql/aiven/12_blacklist.sql` — frozen schema.
- `frontend/app/lib/blacklist/blacklistApi.ts` — client-side API calls.
- `frontend/app/components/blacklist/ui/ImageUploader.tsx` — two-step Cloudinary
  upload flow.
