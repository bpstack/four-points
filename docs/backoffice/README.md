# Backoffice

Supplier invoices for the hotel: from receiving a bill to validating and paying
it. Screen: `/dashboard/bo`. Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

Supplier invoices arrive by email and on paper, need someone to check and sign
them off, and are paid in batches every month. Without a single place it is hard
to know what is pending, what was approved and by whom, and what has been paid.
The module keeps every supplier and invoice with its PDF, lets an admin validate
it by stamping and signing the PDF, and pays the validated invoices of a month
in one step.

## Who uses it

Only **`admin`**. `demo-admin` can see it but not change anything. No other role
has access.

## What it can do

The screen has four tabs, with summary figures on top:

- **Pending**: invoices received and waiting for validation. An invoice can be
  created with its PDF, edited, rejected, exported to Excel or PDF, or
  **validated**: the admin places the hotel's stamp and signature on the PDF,
  and the stamped copy is stored next to the original.
- **Paid**: paid invoices, with filters.
- **Suppliers**: name, tax id (CIF), default category, billing periodicity,
  payment method, bank account and contact details; each supplier's invoices;
  deactivation.
- **Settings**: the stamp and signature images.
- **Batch payment**: preview and pay every validated invoice of a month at once,
  and undo it; the same payment also runs automatically on the 10th of each
  month.
- **ZIP download** of the validated PDFs of a selection.

## What data it handles

Five tables and three views (`backend/db-mysql/aiven/16_backoffice.sql`):

- **`bo_suppliers`**: suppliers, including tax id and bank account.
- **`bo_categories`**: cost centre and department used to classify invoices.
- **`bo_invoices`**: number, supplier, category, amounts with and without VAT,
  VAT rate, invoice, received, billing-period, due and paid dates, status,
  payment method, the original PDF and the validated PDF, and who validated it
  and when. It also has soft-delete columns that are not used.
- **`bo_invoice_history`**: every change to an invoice, with previous and new
  value and who made it.
- **`bo_assets`**: the stamp and signature images.
- **Views** `v_bo_invoices_detail`, `v_bo_monthly_summary` and
  `v_bo_suppliers_stats` for the lists and figures.

PDFs and images are stored in **Cloudinary**; the database keeps their URLs.

## What rules it follows

- **Invoice statuses**: the intended flow is `pending` → `validated` or
  `rejected`, and `validated` → `paid`; a validated invoice can go back to
  pending. The backend does not enforce it: paying, validating and rejecting do
  not check the current status, and amounts can still be edited after validation
  or payment.
- **The batch payment only takes validated invoices**, and only validated or
  paid invoices with a stamped PDF can go into a ZIP.
- **Changes are logged** in `bo_invoice_history`.
- **Deleting an invoice is permanent** and also deletes its history.
- **The automatic payment on the 10th does not work today**: it records the
  change as a system user that does not exist, and the database rejects it.
- **PDFs are downloaded through the backend**, which fetches them from
  Cloudinary. The files themselves are uploaded with public delivery, so their
  Cloudinary URLs also work without logging in.

## How information flows

```
page.tsx (server) ─► lib/backoffice/data.ts (serverFetch) ─► GET /api/backoffice/*
tabs and modals ─► lib/backoffice/backofficeApi.ts (apiClient) ─► /api/backoffice/*
PdfEditorModal ─► pdf-lib (stamp + signature in the browser) ─► upload ─► validate
                                                     │
                     authenticateToken ─► canAccessBackoffice ─► isRealAdmin (writes)
                                                     │
                   backoffice controller ─► repository ─► MySQL · Cloudinary

Scheduled job (day 10, 23:59) ─► batch payment of last month's validated invoices
```

1. The page loads its figures and lists on the server; every action in the tabs
   goes through `backofficeApi.ts`.
2. Creating an invoice uploads its PDF to Cloudinary and saves the record as
   pending.
3. Validating opens the PDF in the browser, stamps and signs it, uploads the new
   copy and marks the invoice as validated, with an entry in the history.
4. The batch payment marks the month's validated invoices as paid and logs each
   one.
