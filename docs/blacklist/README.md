# Blacklist

Registry of guests banned from the hotel. Screens under `/dashboard/blacklist`.
Project overview in [`../general/README.md`](../general/README.md).

## What problem it solves

A guest who caused serious trouble in the past should be flagged before they
book again. The module keeps one entry per banned person, with their identity
document, the stay that led to the ban, why, how severe it was, and photos as
evidence, plus a full trail of who changed what. Entries can be removed and
brought back without losing that trail.

## Who uses it

Every role **except `mantenimiento`**. There are no admin-only actions: any
other authenticated user can create, edit, delete and restore entries — a
deliberate choice, since reception staff need full access to keep the list
current.

## What it can do

- **List** with search (name or document number), filters by severity and by
  stay dates, and pagination.
- **Create an entry**: guest name, document type (DNI, passport, NIE or other)
  and number, the stay dates that led to the ban, the reason, severity (low,
  medium, high or critical), free-text comments and photos.
- **Detail view** with the full audit trail of the entry.
- **Edit** any field.
- **Delete and restore**: deleting does not erase the entry, only marks it; the
  list can be filtered to show active, deleted or all entries.
- **Photos**: uploaded to Cloudinary before the entry is saved, and removed the
  same way.

## What data it handles

One table, `blacklist_entries` (`backend/db-mysql/aiven/12_blacklist.sql`):
guest name, document type and number, check-in and check-out dates, reason,
severity, comments, an `images` JSON array of Cloudinary URLs and public ids,
status (`ACTIVE` or `DELETED`), who deleted it and when, who created it, and an
`audit_trail` JSON array logging every create, update, delete and restore with
who did it, when, and — for updates — what changed.

There is no separate history table: the whole trail lives inside the row, in the
`audit_trail` column.

## What rules it follows

- **Deleting is reversible**: it sets `status` to `DELETED` and records who and
  when; restoring sets it back to `ACTIVE`. The list shows only active entries
  unless the status filter is set to `DELETED` or `ALL`.
- **Every change is logged** in the entry's own `audit_trail`, including the
  previous and new value of each changed field.
- **Photos are uploaded in two steps**: first to Cloudinary, then their URLs are
  saved with the entry. If the form is closed after uploading but before saving,
  the photo stays in Cloudinary with nothing pointing to it.
- **Photos are delivered publicly** from Cloudinary: anyone with the URL can
  open them without logging in.

## How information flows

```
list · detail · create/edit forms ─► lib/blacklist/blacklistApi.ts ─► apiClient
                                                    │
                                   /api/blacklist/* (Express)
                                                    │
                    authenticateToken ─► excludeMantenimiento ─► controller
                                                    │
                          repository ─► MySQL (entry + audit_trail)
                                                    │
                                    CloudinaryService ─► photos
```

1. Creating or editing a photo first uploads it to Cloudinary from the form,
   then the entry is saved with the resulting URLs.
2. Every write appends an entry to `audit_trail` in the same row.
3. The list and detail views read directly from the table; there is no separate
   read model.
