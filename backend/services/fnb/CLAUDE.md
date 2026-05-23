# CLAUDE.md — F&B / Restaurant

> Food & Beverage module. Recent (2026-05) and evolving. Main tab in production: **Daily Revenue** (Opera PDF parsing + manual entry). The Inventory / Orders / Stats tabs are **mocked** placeholders. **Single file** because the module is still small and the real complexity is concentrated in the backend PDF parser.

## Scope (current)

**Implemented:** daily F&B revenue ingestion. The receptionist uploads the daily Opera PDF (Calendar/Month to Date), the backend parses it, extracts category codes and amounts, and writes them to `fnb_daily_revenue`. The frontend renders aggregated monthly views + daily detail with charts.

**Mocked / placeholder:** the Inventory, Orders, Stats tabs. They have UI but **no real backend** — they're scaffolding for the module's second phase (product inventory, supplier orders, annual aggregates). The summary stats shown in the header (`summaryStats` in `page.tsx`) are hardcoded mock data.

## Layout

```
backend/services/fnb/
   ├── pdf-parser.service.ts            (89 lines — parseOperaPdf: extracts date,
   │                                      per-code entries, grand total)
   └── fnb-categories.cache.ts          (39 lines — caches `trackedCodesSet`, the
                                          active codes used to filter the PDF)

backend/controllers/fnb/
   ├── fnb-upload.controller.ts         (42 lines — POST /upload: orchestrates parser
   │                                      + validation + persistence)
   ├── fnb-revenue.controller.ts        (40 lines — GET /monthly, /daily; DELETE /day/:date)
   └── fnb-manual.controller.ts         (39 lines — POST /entries — manual entry
                                          when no PDF is available)

backend/repositories/fnb/
   └── fnb.repository.ts                (155 lines — monthly pivot with CASE WHEN
                                          per code, totals computed in SQL)

backend/routes/fnb/
   └── fnb-routes.ts                    (34 lines)

frontend/app/dashboard/restaurant/
   ├── page.tsx                         (184 lines — tab switcher + mocked summary stats)
   ├── loading.tsx
   └── error.tsx

frontend/app/components/restaurant/tabs/
   ├── DailyRevenueTab.tsx              (1113 lines — the real tab: PDF upload, manual
   │                                      edit, monthly/daily charts)
   ├── InventoryTab.tsx                 (413 lines — MOCK)
   ├── OrdersTab.tsx                    (416 lines — MOCK)
   └── StatsTab.tsx                     (294 lines — MOCK)
```

## Category codes — sync rule

The system assumes **fixed Opera codes** mapped to 7 stable columns. Defined as `CATEGORY_CODES` in `repositories/fnb/fnb.repository.ts`:

| Column | Opera code | Meaning |
|---|---|---|
| `breakfast_included` | `21110` | Included breakfast (BB rate) |
| `breakfast_excluded` | `21124` | Extra breakfast (non-BB guest who orders it) |
| `breakfast_directo` | `21120` | Walk-in breakfast (not tied to a booking) |
| `lunch_food` | `21111` | Lunch — food |
| `lunch_bev` | `21267` | Lunch — beverages |
| `dinner_food` | `21112` | Dinner — food |
| `dinner_bev` | `21307` | Dinner — beverages |

**If Opera renames a code or you add a new category:**

1. Update `CATEGORY_CODES` in `fnb.repository.ts`.
2. Add the field to `FnbMonthlyRow` (`backend/models/fnb/fnb.models.ts`) and to the frontend's `interface MonthlyRow` (`DailyRevenueTab.tsx`).
3. Update `buildEmptyRow()` to include the new field defaulting to 0.
4. If the new code should affect the parser filter, add it to `fnb_category` (table) — `fnb-categories.cache.ts` picks it up dynamically.

**`trackedCodesSet` code cache:** reads `fnb_category` and caches in process memory. Refreshes every N seconds (TTL defined in `fnb-categories.cache.ts`). If you add a code via direct SQL, the parser takes up to that TTL to start seeing it — alternative: restart the backend.

## PDF parser — `parseOperaPdf(buffer)`

Input: `Buffer` of the uploaded PDF (multer in-memory). Output: `{ date, entries[], grandTotal }`.

**Algorithm:**

1. `pdf-parse` extracts plain text from the PDF.
2. **Date extraction (`extractDate`):** looks for the pattern `Date DD/MM/YY` that appears in Opera's filter line (`Calendar/Month to Date`). Returns `YYYY-MM-DD`. **If no match, returns null** and the controller responds 422 — **there's no fallback** because the PDF header date is +1 day off from the hotel date and would silently corrupt records.
3. **Entry extraction (`extractEntries`):** 3-phase state machine:
   - `codes` — collects lines matching `/^\d{5}$/`.
   - `descriptions` — skipped (descriptive text between codes and values).
   - `values` — collects amounts, pairs them with codes by index.
   Filters by codes in `trackedCodesSet`.
4. **Grand total (`extractGrandTotal`):** numeric match for validation.

**Known limitations:**
- The parser assumes Opera's exact PDF layout. If Opera changes the format, the heuristics need tuning. Not brittle, but not robust against Opera refactors.
- 10 MB hard cap in multer. PDFs that big never come out of Opera in normal conditions, so the cap is defensive, not functional.

## Performance — pdf-parse v1

**Important (commit `954043c`):** `pdf-parse` is pinned to **v1** because v2 OOMs on Render free tier. v2 loads full PDF.js into memory; v1 is light. If at some point Node is upgraded or the host changes, **test v2 before upgrading** — it might become viable again. Don't upgrade without measuring.

## Endpoints

| Method and route | Purpose |
|---|---|
| `GET /api/fnb/categories` | List of active categories (drives `trackedCodesSet`) |
| `GET /api/fnb/monthly?year=YYYY&month=MM` | Monthly pivot: one row per day of the month |
| `GET /api/fnb/daily?date=YYYY-MM-DD` | Detail of a specific day |
| `POST /api/fnb/upload` | PDF upload (`multipart/form-data`, field `pdf`, 10 MB max) |
| `POST /api/fnb/entries` | Manual entry (when no PDF is available) |
| `DELETE /api/fnb/day/:date` | Delete all records for a day |

The whole subroute sits behind `authenticateToken` + `canAccessFnb`. Allowed roles: `admin`, `recepcionista`, `demo-admin`, **`group-admin`** (the last one added in `00bab83`).

**About `/entries` (manual):** the manual path exists for when Opera doesn't generate the PDF, or when the day has F&B revenue without an Opera record (private events, La Caseta, etc.). Uses the same `CATEGORY_CODES` as the parser for consistency.

## Monthly pivot — SQL pattern

`getMonthlyData(year, month)` uses `MAX(CASE WHEN ...)` to pivot long-form (`date, category_code, amount`) into one row per day with one column per category. Efficient for months (max 31 rows) and keeps strong TS typing.

**Totals computed in SQL** (`breakfast_total`, `lunch_total`, `dinner_total`, `la_caseta_total`, `fnb_total`) with `r2()` in JS rounding to 2 decimals **outside the SQL**. Reason: avoid float drift (0.1 + 0.2 = 0.30000000000000004 produces phantom decimals). Any new total replicates this pattern.

**Missing days:** if the DB has no row for a day of the month, `getMonthlyData` injects `buildEmptyRow(date)` with all zeros. The UI expects rows for every day of the month — if you ever decide not to fill them, adjust the UI too or you'll have visual gaps.

## Frontend — Daily Revenue tab

`DailyRevenueTab.tsx` (1113 lines) is the only real tab. Internal structure:

- **Upload PDF section**: drag & drop + apiClient call to `/upload`. Toast with the result.
- **Monthly calendar section**: month navigation, fetches `/monthly`, renders a table with totals.
- **Manual edit section**: if a row has revenue loaded, you can edit it. Calls `/entries`.
- **Charts (recharts)**: BarChart, LineChart, PieChart — service-type distribution (breakfast / lunch / dinner) across the month.
- **Daily section**: drill-down into a day with all detail.

The size (1113 lines) is high. If you're about to touch non-trivial UI here, consider splitting by section. Not urgent.

## Mock tabs (Inventory / Orders / Stats)

`InventoryTab.tsx`, `OrdersTab.tsx`, `StatsTab.tsx` have **UI but no real data**. Hardcoded mocks. They function as **placeholders for the module's phase 2** (internal inventory and supplier orders).

**No backend for these tabs.** If someone asks to implement one:

1. Design the DB schema (probably `fnb_products`, `fnb_orders`, `fnb_suppliers`).
2. Create the matching controller + repo.
3. Wire the existing tab by replacing the mocks with React Query calls.
4. Document here.

`summaryStats` in `page.tsx` (totalProducts, lowStock, pendingOrders, monthlyExpenses) is also hardcoded — part of the mocked phase.

## Auth

`canAccessFnb` allows: `admin`, `group-admin`, `demo-admin`, `recepcionista`. **Mantenimiento blocked.** No admin-only restrictions on endpoints — reception can upload PDFs and edit manually.

## Known gotchas

1. **pdf-parse v1 pinned.** Don't upgrade without testing OOM on Render. Documented in commit `954043c`.
2. **PDF date: filter line vs header.** The parser uses the filter (`Date DD/MM/YY`) **not the header**. The header is +1 day off and would corrupt data.
3. **`trackedCodesSet` cache with TTL.** Changes to `fnb_category` take up to the TTL to propagate to the parser. Restart the server to force.
4. **`CATEGORY_CODES` is hardcoded** in the repo — specific Opera codes for the hotel. If the hotel changes or Opera renumbers, touch here.
5. **Floats: use `r2()`.** Any amount sum must pass through `r2()` before going to the frontend.
6. **Mock tabs are not features.** If asked to "fix the inventory", confirm the scope — the UI exists but there's no real data behind it.
7. **`DailyRevenueTab.tsx` at 1113 lines.** Watch if it grows; consider splitting by section.

## Cross references

- `backend/middlewares/roleCheck.ts → canAccessFnb` — allowed roles.
- `backend/models/fnb/fnb.models.ts` — module types.
- `backend/scripts/import-fnb-2026.ts` — one-off script to import historical data (if present — used in initial setup).
