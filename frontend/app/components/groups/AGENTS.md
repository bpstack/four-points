# AGENTS.md — Group Tracking (frontend)

**Up:** [`frontend/AGENTS.md`](../../../AGENTS.md) — `frontend/` rules ·
[root `AGENTS.md`](../../../../AGENTS.md) — shared rules and module map.

> Frontend doc for the group tracking module. Covers the route structure,
> Zustand store, tab/panel navigation pattern, component map, and React Query
> hooks. For the data model, enums, endpoints, and role rules see
> `backend/services/group/AGENTS.md`.

## Route structure

```
app/dashboard/groups/
├── page.tsx               # Groups list (GroupsListClient)
├── error.tsx / loading.tsx
├── actions/
│   └── getGroups.ts       # Server action that pre-fetches the list
└── [id]/
    └── page.tsx           # Group detail (GroupDetailClient — server component wrapper)
```

## State — Zustand (`useGroupStore`)

All group UI state lives in `frontend/app/stores/useGroupStore.ts`. The store
holds the currently viewed group and UI navigation state.

Key slices:

- **`currentGroup`** (`GroupWithDetails | null`): The group being viewed in the
  detail page
- **`payments` / `contacts` / `rooms` / `status`**: the group's sub-resources,
  copied from the React Query data
- **`activeTab`** (`string`): Active tab in GroupDetailClient
  (overview/payments/contacts/rooms/status/history)
- **`activePanelId`** (`string | null`): Which side panel is open (`'new'`,
  `'edit-5'`…)
- **`highlightId`** and per-resource `isLoading*` flags

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
└── GroupDetailClient                 ← main orchestrator for detail view (213 lines)
    ├── GroupHeader (layout/)         ← group name, status badge, action buttons
    ├── TabNavigation (layout/)       ← tab switcher; hides Contacts for roles without contact access (133 lines)
    ├── GroupDetailSummaryPanel (layout/) ← right sidebar: dates, pax, total, contacts (166 lines)
    │
    ├── OverviewTab                   ← summary cards + quick stats (302 lines)
    ├── PaymentsTab                   ← payment list + balance bar (544 lines — largest)
    ├── ContactsTab                   ← contact list
    ├── RoomsTab                      ← room type allocations (132 lines)
    ├── StatusTab                     ← 4 status tracks as cards + StatusTimeline
    │   ├── BookingCard               (244 lines)
    │   ├── ContractCard              (234 lines)
    │   ├── RoomingCard               (329 lines)
    │   └── BalanceCard               (186 lines)
    └── HistoryTab                    ← audit log (uses HistoryItem — 345 lines)
        └── HistoryItem               ← per-entry renderer with old/new JSON diff

Side panels (slide-in, controlled by store activePanelId):
    ├── PaymentPanel                  ← create/edit payment (379 lines)
    ├── ContactPanel                  ← create/edit contact (172 lines)
    ├── RoomPanel                     ← create/edit room allocation (213 lines)
    └── EditGroupPanel                ← edit group master data (304 lines)

Modal:
    └── NotificationModal             ← create a manual notification, now or scheduled (481 lines)

List rows: cards/ (PaymentCard, ContactCard, RoomCard); shared/ (badges, empty and loading states)
```

## React Query — lib/groups/queries.ts

`groupsApi` (in `queries.ts`) has one method per endpoint. On top of it, the
hooks:

- **Queries:** `useGroup(id)` (detail with contacts + rooms + payments +
  status), `useGroupPayments`, `useGroupContacts`, `useGroupRooms`,
  `useGroupStatus`
- **Mutations:** `useCreatePayment`, `useUpdatePayment`, `useDeletePayment`,
  `useCreateContact`, `useUpdateContact`, `useCreateOrUpdateRoom`,
  `useUpdateRoom`

Not everything goes through hooks: `GroupsListClient` runs its own `useQuery`
over `groupsApi.getAll`, and creating, editing or deleting a group, the status
cards and the history tab call `groupsApi` directly (then invalidate).

Cache keys come from `groupsKeys`: `['groups', 'list', filters]`,
`['groups', id]`, `['groups', id, 'payments']`, `contacts`, `rooms`, `status`,
plus the dashboard and upcoming-payment keys.

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
  on the master record too (design debt, see the backend AGENTS.md).
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
Dictionary at `frontend/messages/<locale>/groups.json`.

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
   duplication. If you touch booking status mutations, both fields must change
   (the backend repositories sync them both ways).
4. **`HistoryItem` renders old/new JSON diffs.** It parses the
   `old_value`/`new_value` strings from the history record. If the backend
   changes the JSON structure of history entries, update the renderer
   accordingly.
5. **`NotificationModal` is 481 lines.** It creates an in-app notification, sent
   now or scheduled (`scheduled_for`). There is no email.
6. **Roles in the UI.** Only the contacts are gated: `TabNavigation` uses
   `canViewGroupContacts` (`app/lib/groups/contact-access.ts`) to leave out the
   Contacts tab, and `?tab=contacts` falls back to the summary. The create/edit
   controls are not gated — `recepcionista` and `mantenimiento` see them and the
   backend answers 403. ⚠️ The group detail (`useGroup`) still receives the
   contacts for every role: see the backend AGENTS.md.

## Cross references

- `backend/services/group/AGENTS.md` — data model, enums, endpoints, role
  middleware.
- `frontend/app/stores/useGroupStore.ts` — Zustand store.
- `frontend/app/lib/groups/queries.ts` — all React Query hooks.
- `frontend/app/lib/groups/types.ts` — TypeScript types.
- `frontend/app/components/groups/GroupDetailClient.tsx:1-13` — TODO comment
  about status duplication (design debt).
