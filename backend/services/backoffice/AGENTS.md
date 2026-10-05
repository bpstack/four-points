# AGENTS.md — Backoffice (bo)

> Combined doc for the backoffice module (backend + frontend). Covers the data
> model, invoice lifecycle, PDF handling via Cloudinary, batch payment, and the
> server-component-first frontend pattern.

## What it does

Internal expense management for the hotel: suppliers are organised by category,
each supplier has invoices (with PDF attachments) that flow through a validation
→ payment lifecycle, and the hotel's stamp and signature images (assets) are
stored to mark validated invoices. The module is **admin-only**. Stats and monthly summaries provide spending
visibility. A batch-pay endpoint marks multiple validated invoices as paid in a
single operation.

## DB tables

- **`bo_categories`**: Invoice categories (e.g. food, maintenance, utilities).
  Reference table.
- **`bo_suppliers`**: Suppliers: name, category, contact info, active/inactive
  status
- **`bo_invoices`**: Invoices: amount, due date, status
  (`pending`/`validated`/`rejected`/`paid`), and two PDFs in Cloudinary: the
  original (`original_pdf_url`, `original_pdf_public_id`) and the stamped copy
  (`validated_pdf_url`, `validated_pdf_public_id`)
- **`bo_invoice_history`**: Audit log of invoice status changes (who validated,
  rejected, paid + notes)
- **`bo_assets`**: The hotel's stamp and signature images (`type` ENUM
  `stamp`/`signature`, stored in Cloudinary). One per type can be the default.

**SQL views** (frozen in `16_backoffice.sql`):

- `v_bo_invoices_detail` — invoices joined with supplier + category
- `v_bo_monthly_summary` — monthly spending grouped by category
- `v_bo_suppliers_stats` — supplier invoice counts + total amounts

## Enums / types (backend/models/backoffice/index.ts)

```
InvoiceStatus: 'pending' | 'validated' | 'rejected' | 'paid'
AssetType:     (string — image type/mime)
```

`INVOICE_STATUS` constant maps each status to a display label.

## Backend layout

```
backend/controllers/backoffice/
└── backoffice-controller.ts   (1863 lines — all domains: categories, suppliers,
                                invoices, assets, stats, batch-pay, PDF upload/download/zip)

backend/repositories/backoffice/
└── backoffice-repository.ts   (960 lines)

backend/routes/backoffice/backoffice-routes.ts
backend/services/backoffice/   (this dir — documentation anchor, no service files yet)
```

**Note:** There is no `services/backoffice/` application layer — the controller
calls the repository directly. `CloudinaryService` from
`backend/services/blacklist/cloudinary-service.ts` is shared and used here for
PDF and asset uploads.

## Invoice lifecycle

```
created → pending
pending → validated (isRealAdmin)    validated invoice appears in batch-pay previews
        → rejected  (isRealAdmin)    adds rejection note to bo_invoice_history
validated → paid    (isRealAdmin)    via markAsPaid or executeBatchPayment
validated → unvalidated (isRealAdmin)  back to pending for correction
```

⚠️ This is the intended flow, **not enforced**: the backend does not check the
current status, so a pending or rejected invoice can be paid and a paid one
validated (see `docs/TODO.md`).

Every status change creates a row in `bo_invoice_history` with `changed_by`,
`old_status`, `new_status`, and `notes`.

## PDF handling

PDFs are uploaded to **Cloudinary** (not the server filesystem).
`uploadInvoicePdf` uses `multer` (`upload.single('pdf')`) as middleware to
receive the file, then streams it to Cloudinary via `CloudinaryService`. The
`?type=original|validated` chooses the pair of columns: `original_pdf_url` /
`original_pdf_public_id` or `validated_pdf_url` / `validated_pdf_public_id`.
Replacing a PDF deletes the previous file (only ids inside
`backoffice/invoices/`).

`downloadInvoicePdf` fetches the PDF from Cloudinary via `axios` and streams it
to the response with `Content-Type: application/pdf`. This avoids storing the
PDF on the server. Only URLs of our own cloud are fetched
(`isOwnCloudinaryUrl`); any other stored URL answers 422.

**Deleting an invoice is a hard delete**: it removes its PDFs from Cloudinary,
its `bo_invoice_history` rows and the invoice row. The `deleted_at` columns are
not used.

`downloadValidatedInvoicesZip` downloads all validated invoices' PDFs from
Cloudinary and bundles them into a ZIP using `archiver`, streamed directly to
the response.

## Batch payment

`previewBatchPayment` returns the list of validated invoices that would be
affected (grouped by supplier). `executeBatchPayment` marks them all as paid,
logging each one to `bo_invoice_history`. Both endpoints are `isRealAdmin` only.
A `revertBatchPayment` endpoint exists for undo (also with a preview).

## Role boundaries

- **Read anything** (stats, categories, suppliers, invoices, assets) — `admin`
  (`canAccessBackoffice`)
- **Create/update/delete suppliers, invoices, assets; validate/reject/pay
  invoices; batch operations** — `admin` only (`isAdmin`)

`canAccessBackoffice` = `isAdmin` = `['admin']`. The public demo account is an
admin: it cannot create categories or upload PDFs/assets (`denyDemo`,
`demoRestriction`).

## Frontend layout

The frontend is **server-component-first** — initial data is fetched on the
server in `page.tsx` and passed to client components as props. There are no
React Query hooks; mutations go through `backofficeApi.ts` directly.

```
app/dashboard/bo/
└── page.tsx            ← server component (fetches stats, categories, invoices, suppliers, assets)
    ├── StatsCards      ← summary KPI cards (114 lines)
    ├── TabsNavigation  ← tab switcher: Pending / Paid / Suppliers / Assets (69 lines)
    └── TabContent      ← renders the active tab content (105 lines)

app/components/bo/
├── StatsCards.tsx
├── StatsCardsSkeleton.tsx
├── TabsNavigation.tsx
└── TabContent.tsx

app/lib/backoffice/
├── backofficeApi.ts    ← all HTTP calls via apiClient (528 lines)
├── data.ts             ← server-side fetch helpers (used in page.tsx, 351 lines)
├── types.ts            ← TypeScript types (352 lines)
├── export-utils.ts     ← client-side export helpers (335 lines)
└── index.ts            ← barrel export
```

`data.ts` contains functions (`getStats`, `getCategories`, `getPendingInvoices`,
etc.) used in the server component with `serverFetch`. These are distinct from
`backofficeApi.ts` which uses `apiClient` for client-side calls. Do not mix
them.

## Known gotchas

1. **`CloudinaryService` is shared with Blacklist.**
   `backend/services/blacklist/cloudinary-service.ts` is imported by both the
   blacklist module and the backoffice module. If you refactor or move that
   service, update both importers.
2. **PDF download proxied through the backend.** The frontend never talks to
   Cloudinary directly — it calls
   `GET /api/backoffice/invoices/:id/pdf-download` which proxies through the
   backend. This hides Cloudinary credentials from the browser and allows auth
   on the endpoint.
3. **ZIP download is streaming.** `downloadValidatedInvoicesZip` pipes to the
   response as it builds. Do not buffer the entire ZIP in memory — the current
   implementation uses `archiver`'s pipe correctly. Avoid large refactors that
   switch to buffered approach.
4. **`data.ts` vs `backofficeApi.ts`.** `data.ts` is for server components (uses
   `serverFetch`, runs on the server). `backofficeApi.ts` is for client
   mutations (uses `apiClient`, runs in the browser). Calling a `data.ts`
   function from a client component will fail.
5. **`bo_invoice_history` is append-only.** There is no update or delete on
   history rows. Query it with `ORDER BY created_at DESC` to get the latest
   action first.
6. **No `services/backoffice/` application layer.** This directory exists only
   as a documentation anchor. The controller calls the repository directly. If
   you add business logic that needs to be shared or tested in isolation, add a
   service file here.

## Cross references

- `backend/controllers/backoffice/backoffice-controller.ts` — all 35+ controller
  methods.
- `backend/repositories/backoffice/backoffice-repository.ts` — DB access layer.
- `backend/services/blacklist/cloudinary-service.ts` — shared Cloudinary
  upload/delete helper.
- `backend/middlewares/roleCheck.ts:194` — `canAccessBackoffice` definition.
- `backend/db-mysql/aiven/16_backoffice.sql` — frozen schema (5 tables + 3
  views).
- `frontend/app/lib/backoffice/backofficeApi.ts` — client-side API calls.
- `frontend/app/lib/backoffice/data.ts` — server-side data fetchers.
