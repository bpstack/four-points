# AGENTS.md — Backoffice (bo)

**Up:** [`backend/AGENTS.md`](../../AGENTS.md) — `backend/` rules ·
[`frontend/AGENTS.md`](../../../frontend/AGENTS.md) — `frontend/` rules, since
this doc covers both sides · [root `AGENTS.md`](../../../AGENTS.md) — shared
rules and module map.

> Combined doc for the backoffice module (backend + frontend). Covers the data
> model, invoice lifecycle, PDF handling via Cloudinary, batch payment, and the
> server-component-first frontend pattern.

## What it does

Internal expense management for the hotel: suppliers are organised by category,
each supplier has invoices (with PDF attachments) that flow through a validation
→ payment lifecycle, and the hotel's stamp and signature images (assets) are
stored to mark validated invoices. The module is **admin-only**. Stats and
monthly summaries provide spending visibility. A batch-pay endpoint marks
multiple validated invoices as paid in a single operation.

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
AssetType:     'stamp' | 'signature'
```

`INVOICE_STATUS` constant maps each status to a display label.

## Backend layout

```
backend/controllers/backoffice/
├── backoffice-controller.ts   (~1960 lines — all domains: categories, suppliers,
│                               invoices, assets, stats, batch-pay, PDF upload/download/zip)
└── backoffice-files.ts        (swaps the signed Cloudinary URLs for the API paths
                                that serve them before any invoice/asset leaves the API)

backend/repositories/backoffice/
├── backoffice-repository.ts   (~990 lines)
└── backoffice-columns.ts      (column lists)

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
pending → validated (isAdmin)    validated invoice appears in batch-pay previews
        → rejected  (isAdmin)    adds rejection note to bo_invoice_history
validated → paid    (isAdmin)    via markAsPaid or executeBatchPayment
validated → pending (isAdmin)    unvalidate, for correction
paid → validated    (isAdmin)    unpay (revertPayment) or the batch revert
```

**Enforced in the repository:** each `UPDATE` carries the status it starts from
(`WHERE id = ? AND status = 'pending'`, `'validated'`, `'paid'`), so a
transition from any other status changes nothing. Editing an invoice is also
only possible while `pending`. Rejected invoices have no UI yet
(`docs/TODO.md`).

Every status change creates a row in `bo_invoice_history` with `changed_by`,
`old_status`, `new_status`, and `notes`.

## PDF handling

PDFs are uploaded to **Cloudinary** (not the server filesystem) as **private**
files. `POST /invoices/:id/pdf` runs `requireStorage` and
`singleInvoicePdf('pdf')` from `middlewares/backofficeUpload.ts` (10 MB,
`application/pdf` and real PDF bytes), then `uploadInvoicePdf` sends it to
Cloudinary via `CloudinaryService`. The `?type=original|validated` chooses the
pair of columns: `original_pdf_url` / `original_pdf_public_id` or
`validated_pdf_url` / `validated_pdf_public_id`. Replacing a PDF deletes the
previous file (only ids inside `backoffice/invoices/`).

`downloadInvoicePdf` fetches the private PDF with `fetchStoredFile`
(`services/uploads/private-files.ts`, `axios` inside) and sends it with
`Content-Type: application/pdf`; the signed URL never leaves the server. Only
URLs of our own cloud are fetched (`isOwnCloudinaryUrl`); any other stored URL
answers 422. Stamps and signatures are served the same way by
`GET /assets/:id/file`.

**Deleting an invoice is a hard delete**: it removes its PDFs from Cloudinary,
its `bo_invoice_history` rows and the invoice row. The `deleted_at` columns are
not used.

`downloadValidatedInvoicesZip` downloads all validated invoices' PDFs from
Cloudinary and bundles them into a ZIP using `archiver`, streamed directly to
the response.

## Batch payment

`previewBatchPayment` returns the list of validated invoices that would be
affected (grouped by supplier). `executeBatchPayment` marks them all as paid,
logging each one to `bo_invoice_history`; it needs `isAdmin` (the preview only
the module access, which is admin anyway). A `revertBatchPayment` endpoint
exists for undo (also with a preview).

The same payment runs on its own once a month (`services/cron/`): from day 10 at
23:59 (Madrid) it pays the validated invoices of the previous month, signed by
the inactive user `system-cron`. Render's free plan sleeps, so it runs on the
first start after that time, and `cron_job_runs` keeps it to once per month
(ADR-046). `markValidatedInvoicesAsPaid` locks the invoices it selects and
writes their history in the same transaction.

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
server in `page.tsx` (one `Promise.all`) and passed to client components as
props. The tabs then take over with React Query (`useQuery` with their own keys,
invalidated after each mutation); mutations go through `backofficeApi.ts`.

```
app/dashboard/bo/
└── page.tsx            ← server component (fetches stats, categories, invoices, suppliers, assets)
    ├── StatsCards      ← summary KPI cards (114 lines)
    ├── TabsNavigation  ← tab switcher: pending / paid / suppliers / settings (69 lines)
    └── TabContent      ← renders the active tab content (105 lines)

app/components/bo/
├── StatsCards.tsx, StatsCardsSkeleton.tsx, TabsNavigation.tsx, TabContent.tsx
├── tabs/               ← PendingInvoicesTabLazy (~1140), PaidInvoicesTabLazy (~1010),
│                         SuppliersTabLazy (~670), SettingsTabLazy (stamps/signatures)
└── modals/             ← InvoiceFormModal, SupplierFormModal, SupplierInvoicesModal,
                          PdfUploadModal, PdfViewerModal, PdfEditorModal (~1235 lines:
                          places the stamp/signature on the PDF in the browser
                          with pdf-lib, preview with pdfjs-dist)

app/lib/backoffice/
├── backofficeApi.ts    ← all HTTP calls via apiClient (~530 lines)
├── data.ts             ← server-side fetch helpers (used in page.tsx, ~340 lines)
├── types.ts            ← TypeScript types (~325 lines)
├── export-utils.ts     ← client-side export helpers (~335 lines)
└── index.ts            ← barrel export
```

`data.ts` contains functions (`getStats`, `getCategories`, `getPendingInvoices`,
etc.) used in the server component with `serverFetch`. These are distinct from
`backofficeApi.ts` which uses `apiClient` for client-side calls. Do not mix
them.

## Known gotchas

1. **`CloudinaryService` is shared.**
   `backend/services/blacklist/cloudinary-service.ts` is imported by blacklist,
   backoffice, auth, maintenance and checklist. If you refactor or move that
   service, update every importer.
2. **Files proxied through the backend.** The frontend never talks to Cloudinary
   directly — it calls `GET /api/backoffice/invoices/:id/pdf-download` or
   `GET /assets/:id/file`. The files are private: the signed URL stays on the
   server, and `backoffice-files.ts` replaces it with the API path in every
   response.
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
- `backend/middlewares/backofficeUpload.ts` — PDF and stamp/signature uploads.
- `backend/repositories/backoffice/backoffice-repository.ts` — DB access layer.
- `backend/services/blacklist/cloudinary-service.ts` — shared Cloudinary
  upload/delete helper.
- `backend/middlewares/roleCheck.ts` → `canAccessBackoffice` (admin).
- `backend/db-mysql/aiven/16_backoffice.sql` — frozen schema (5 tables + 3
  views).
- `frontend/app/lib/backoffice/backofficeApi.ts` — client-side API calls.
- `frontend/app/lib/backoffice/data.ts` — server-side data fetchers.
