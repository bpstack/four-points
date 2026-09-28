# AGENTS.md — Group Tracking (frontend)

> Frontend doc for the group tracking module. Covers the route structure,
> Zustand store, tab/panel navigation pattern, component map, and React Query
> hooks. For the data model, enums, endpoints, and role rules see
> `backend/services/group/CLAUDE.md`.

## Route structure

```
app/dashboard/groups/
├── page.tsx               # Groups list (GroupsListClient)
├── error.tsx / loading.tsx
└── [id]/
    ├── page.tsx           # Group detail (GroupDetailClient — server component wrapper)
    └── actions/           # Server actions (if any)
```

## State — Zustand (`useGroupStore`)

All group UI state lives in `frontend/app/stores/useGroupStore.ts`. The store
holds the currently viewed group and UI navigation state.

Key slices:

| Field           | Type                       | Purpose                                                                           |
| --------------- | -------------------------- | --------------------------------------------------------------------------------- |
| `currentGroup`  | `GroupWithDetails \| null` | The group being viewed in the detail page                                         |
| `activeTab`     | `string`                   | Active tab in GroupDetailClient (overview/payments/contacts/rooms/status/history) |
| `activePanelId` | `string \| null`           | Which side panel is open (payment/contact/room/editGroup)                         |

**Note:** The `GroupDetailClient.tsx` uses URL query params
(`?tab=...&panel=...`) as the navigation source of truth — the store's
`activeTab` mirrors this but the params drive the initial render and deep-link
behaviour. `useSearchParams()` is the authoritative source; the store is for
cross-component access without prop drilling.

## Component map

```
dashboard/groups/page.tsx
└── GroupsListClient                  ← list of groups with filters and status badges (457 lines)
    └── CreateGroupPanel              ← slide-in panel to create a new group (277 lines)

dashboard/groups/[id]/page.tsx
└── GroupDetailClient                 ← main orchestrator for detail view (192 lines)
    ├── GroupHeader (layout/)         ← group name, status badge, action buttons
    ├── TabNavigation (layout/)       ← tab switcher (128 lines)
    ├── GroupDetailSummaryPanel (layout/) ← right sidebar: dates, pax, total, contacts (166 lines)
    │
    ├── OverviewTab                   ← summary cards + quick stats (302 lines)
    ├── PaymentsTab                   ← payment list + balance bar (544 lines — largest)
    ├── ContactsTab                   ← contact list
    ├── RoomsTab                      ← room type allocations (132 lines)
    ├── StatusTab                     ← 4 status tracks as cards
    │   ├── BookingCard               (245 lines)
    │   ├── ContractCard              (235 lines)
    │   ├── RoomingCard               (329 lines)
    │   └── BalanceCard               (186 lines)
    └── HistoryTab                    ← audit log (uses HistoryItem — 345 lines)
        └── HistoryItem               ← per-entry renderer with old/new JSON diff

Side panels (slide-in, controlled by store activePanelId):
    ├── PaymentPanel                  ← create/edit payment (379 lines)
    ├── ContactPanel                  ← create/edit contact (178 lines)
    ├── RoomPanel                     ← create/edit room allocation (213 lines)
    └── EditGroupPanel                ← edit group master data (304 lines)

Modal:
    └── NotificationModal             ← create manual notification + email preview (481 lines)
```

## React Query — lib/groups/queries.ts

All data fetching and mutations go through named hooks exported from
`frontend/app/lib/groups/`.

Key hooks:

| Hook                       | Purpose                                                                     |
| -------------------------- | --------------------------------------------------------------------------- |
| `useGroups(filters)`       | Paginated group list                                                        |
| `useGroup(id)`             | Single group with full detail (joined contacts + rooms + payments + status) |
| `useGroupPayments(id)`     | Payment list for a group                                                    |
| `useGroupContacts(id)`     | Contact list                                                                |
| `useGroupRooms(id)`        | Room allocations                                                            |
| `useGroupStatus(id)`       | 4 status tracks                                                             |
| `useGroupHistory(id)`      | Audit history                                                               |
| `useCreateGroup()`         | Mutation — create group                                                     |
| `useUpdateGroup()`         | Mutation — update group master data                                         |
| `useCreatePayment()`       | Mutation — add payment to group                                             |
| `useUpdatePayment()`       | Mutation — update payment fields                                            |
| `useUpdatePaymentStatus()` | Mutation — change payment status                                            |
| `useUpdateBookingStatus()` | Mutation — update booking track                                             |

Cache keys follow the pattern `['groups', id]`, `['groups', id, 'payments']`,
etc.

## Tab and panel navigation pattern

**Tabs** are driven by URL query param `?tab=<tabName>`. `GroupDetailClient.tsx`
reads `useSearchParams()` for the active tab. Switching tabs pushes a new URL
(router.push with merged params) so tabs are deep-linkable and survive page
refresh.

**Panels** (slide-in forms for creating/editing) are driven by URL query param
`?panel=<panelName>`. Opening a panel appends `?panel=payment` (for example);
closing removes it. This allows deep-linking to an open panel and keeps the
browser's back button working correctly.

The `highlight` param (`?highlight=<id>`) causes a specific payment or contact
row to be highlighted on mount — used after creating a resource to draw the
user's attention to the new item.

## Status cards — StatusTab

`StatusTab` renders four status cards as collapsible cards (accordion). Each
card manages one of the four status tracks independently:

- **BookingCard** — `booking_confirmed`, `booking_date` → maps to `GroupStatus`
  on the master record too (design debt, see backend CLAUDE.md).
- **ContractCard** — `contract_status` + `contract_date`, `contract_notes`.
- **RoomingCard** — `rooming_status` + rooming list upload/notes.
- **BalanceCard** — `balance_status` + `balance_date`, `balance_notes`.

Each card has an inline edit mode that patches its own status endpoint. They do
not share a form — each card is self-contained.

## Payment balance bar — PaymentsTab

`PaymentsTab` shows a visual balance bar: paid / remaining / overdue. Computed
client-side from the payments list by summing by status. The bar is part of the
tab header — always visible even if no payment is selected.

The tab also shows an overdue warning banner when any payment has status
`pending` and `due_date < today`.

## i18n

Namespace: `groups`. Used throughout with `useTranslations('groups')`.
Dictionary at `frontend/i18n/<locale>/groups.json`.

## Known gotchas

1. **`PaymentsTab` is 544 lines** — payment list, balance bar, overdue banner,
   and the payment detail overlay are all co-located. Consider extracting the
   balance bar as a standalone component before adding more features there.
2. **URL-driven navigation.** Tabs and panels use URL params, not Zustand. Do
   not move tab or panel state to the store — it would break deep-linking and
   the browser back button. The store's `activeTab` field is a mirror, not the
   source of truth.
3. **Status duplication in the UI.** `GroupDetailClient.tsx` has an explicit
   TODO comment about `hotel_groups.status` vs `group_status.booking_confirmed`
   duplication. If you touch booking status mutations, you must update both
   fields (the backend handles this in
   `group-status-controller.ts:updateBooking`).
4. **`HistoryItem` renders old/new JSON diffs.** It parses the
   `old_value`/`new_value` strings from the history record. If the backend
   changes the JSON structure of history entries, update the renderer
   accordingly.
5. **`NotificationModal` is 481 lines.** It includes a live email preview. If
   SMTP is not configured on the backend, the modal will show success after
   saving the notification but no email will be sent.
6. **`group-admin` role.** This role sees the full group management UI.
   `recepcionista` and `mantenimiento` can view groups (read-only) but the
   create/edit UI should be gated. Currently the frontend does not gate these
   controls — it relies on the backend returning 403. Add a frontend role check
   if the UX needs to hide the controls visually.

## Cross references

- `backend/services/group/CLAUDE.md` — data model, enums, endpoints, role
  middleware.
- `frontend/app/stores/useGroupStore.ts` — Zustand store.
- `frontend/app/lib/groups/queries.ts` — all React Query hooks.
- `frontend/app/lib/groups/types.ts` — TypeScript types.
- `frontend/app/components/groups/GroupDetailClient.tsx:1-13` — TODO comment
  about status duplication (design debt).
