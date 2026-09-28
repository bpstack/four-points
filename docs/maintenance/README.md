# Maintenance

Reports for the hotel's breakdowns and technical incidents. Screens under
`/dashboard/maintenance`. Project overview in
[`../general/README.md`](../general/README.md).

## What problem it solves

A breakdown (a dripping shower, an air conditioner that does not cool, a broken
door) must reach whoever fixes it and not get lost on the way. The module
records each incident as a **report**, with where it is, how urgent it is and
who handles it, and follows it until it is closed, with photos and a history of
everything that has happened to it. It also indicates which rooms are out of
service due to an open breakdown.

## Who uses it

**All roles**, and it is the main module of the `mantenimiento` role, which does
not have access to almost any other. Within the module **there are no
differences between roles**: anyone with access creates, edits, changes the
state of, assigns, deletes and restores any report.

## What it can do

- **List** with filters (state, priority, location type, assigned, creator,
  room, text, date range and include deleted), pagination and statistics.
- **Create a report**: title, description, location, priority and, if known, who
  it is assigned to. If the location is a room, the number is mandatory and it
  can be marked as **out of service**.
- **Detail** in two tabs: the card (with quick actions to change state, priority
  and assignment, and add resolution notes) and the history.
- **Assign** to an application user (**internal**) or to an external company,
  with their name and contact.
- **Photos**: upload images (JPEG, PNG, WebP or GIF, up to 5 MB) and delete
  them.
- **Delete and restore** reports: the deletion is a soft delete.

## What data it handles

Three tables (`backend/db-mysql/aiven/13_maintenance.sql`):

- **`maintenance_reports`**: the report — title, description, location (room,
  common area, exterior, facilities or other), priority, state, assignment,
  start, resolution and closing dates, resolution notes, room out of service and
  soft delete.
- **`maintenance_images`**: the photos, stored in **Cloudinary**; only their
  reference remains here.
- **`maintenance_history`**: each change, with who made it, which field changed
  and the previous and new value.

The **identifier** of a report is `DDMMAA-NNN`: creation date and number of the
day (for example, `280926-001`).

## What rules it follows

**States**

```
reported ─► assigned ─► in_progress ─► completed ─► closed
                             │
                          waiting            (canceled from any)
```

- Seven states: reported, assigned, in progress, waiting, completed, closed and
  canceled. Four priorities: low, medium, high and urgent.
- **The backend does not enforce an order**: any state can go to any other. When
  moving to in progress, completed or closed the corresponding date is saved.
  **Cancel saves the closing date and is recorded in the history as "closed"**:
  a canceled report is not distinguished from a closed one there.
- **The interface does not offer reopening a closed report**, but the API allows
  it.

**Validation and history**

- All routes that write validate data with Zod, including the rule that a room
  needs a number.
- Creating, editing, changing state, priority or assignment, adding notes,
  deleting and restoring are recorded in `maintenance_history`. **Uploading or
  deleting photos, not.**
- The change and its history entry do not go in a transaction.

**Others**

- Photos are accepted according to the type declared by the browser, with a
  maximum of 5 MB, and Cloudinary processes them as an image.
- Each photo saves a "delete on close" (`auto_delete_on_close`) that **nobody
  uses**: when closing a report, its photos stay.
- The number of the day of the identifier is calculated by looking for the last
  report of that date, with the server's time.

## How information flows

```
page.tsx (server) ─► getMaintenance ─► GET /api/maintenance
MaintenanceListClient ─► useMaintenanceList (React Query) ─┐
ReportDetailClient · DetailTab · HistoryTab ───────────────┼─► maintenanceApi ─► apiClient
                                                           │
                                   /api/maintenance/* (Express)
                                                           │
             authenticateToken ─► canAccessMaintenance ─► MaintenanceController
                                                           │
                          MaintenanceRepository ─► MySQL + history
                          CloudinaryService ─► photos
```

1. The list is loaded on the server and arrives already painted; as soon as it
   is filtered, React Query requests the data again.
2. Each action calls its route (state, priority, notes…) or the general edit;
   assigning is done from the general edit, not from the `/assign` route, which
   the interface does not use.
3. The repository writes the change and then its history entry.
4. Photos are uploaded to Cloudinary from the backend and their reference is
   saved in `maintenance_images`.
