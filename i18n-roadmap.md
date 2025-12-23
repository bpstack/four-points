# i18n Implementation Roadmap

## Branch: `languagesystem`
## Started: 23-dic-2025

---

## Overview

Implementing internationalization (i18n) for Four Points Hotel PMS using `next-intl`.

| Language | Code | Status |
|----------|------|--------|
| Español | `es` | Default |
| English | `en` | Secondary |

---

## Phase 1: Setup & Infrastructure

| Task | Status | Commit |
|------|--------|--------|
| Create branch `languagesystem` | ✅ | - |
| Create language.md with decisions | ✅ | - |
| Create roadmap.md | ✅ | - |
| Install next-intl | ⬜ | |
| Create i18n config files | ⬜ | |
| Create messages folder structure | ⬜ | |
| Update middleware.ts for locale | ⬜ | |
| Create LanguageSwitcher component | ⬜ | |
| Add switcher to ProfileDropdown | ⬜ | |

---

## Phase 2: Common & Navigation

| Task | Status | Commit |
|------|--------|--------|
| Extract common.json (ES) | ⬜ | |
| Translate common.json (EN) | ⬜ | |
| Migrate nav-links.tsx | ⬜ | |
| Migrate sidenav.tsx | ⬜ | |
| Migrate ProfileDropdown.tsx | ⬜ | |
| Migrate DashboardHeader.tsx | ⬜ | |
| Migrate QuickActionsCard.tsx | ⬜ | |
| Migrate GlobalStatusGrid.tsx | ⬜ | |

---

## Phase 3: Dashboard Module

| Task | Status | Commit |
|------|--------|--------|
| Extract dashboard.json (ES) | ⬜ | |
| Translate dashboard.json (EN) | ⬜ | |
| Migrate dashboard/page.tsx | ⬜ | |
| Migrate ImportantLogbooksCard.tsx | ⬜ | |
| Migrate RecentActivityCard.tsx | ⬜ | |
| Migrate DashboardSkeleton.tsx | ⬜ | |

---

## Phase 4: Parking Module

| Task | Status | Commit |
|------|--------|--------|
| Extract parking.json (ES) | ⬜ | |
| Translate parking.json (EN) | ⬜ | |
| Migrate ParkingDashboardClient.tsx | ⬜ | |
| Migrate BookingsListClient.tsx | ⬜ | |
| Migrate BookingDetailClient.tsx | ⬜ | |
| Migrate PaymentModal.tsx | ⬜ | |
| Migrate VehicleSearchModal.tsx | ⬜ | |
| Migrate ParkingStatusClient.tsx | ⬜ | |

---

## Phase 5: Logbooks Module

| Task | Status | Commit |
|------|--------|--------|
| Extract logbooks.json (ES) | ⬜ | |
| Translate logbooks.json (EN) | ⬜ | |
| Migrate LogbooksList.tsx | ⬜ | |
| Migrate NewLogbookEntry.tsx | ⬜ | |
| Migrate NewCommentEntry.tsx | ⬜ | |
| Migrate EditLogbookModal.tsx | ⬜ | |
| Migrate EditCommentModal.tsx | ⬜ | |

---

## Phase 6: Groups Module

| Task | Status | Commit |
|------|--------|--------|
| Extract groups.json (ES) | ⬜ | |
| Translate groups.json (EN) | ⬜ | |
| Migrate GroupsListClient.tsx | ⬜ | |
| Migrate GroupDetailClient.tsx | ⬜ | |
| Migrate GroupForm components | ⬜ | |
| Migrate Panel components | ⬜ | |

---

## Phase 7: Cashier Module

| Task | Status | Commit |
|------|--------|--------|
| Extract cashier.json (ES) | ⬜ | |
| Translate cashier.json (EN) | ⬜ | |
| Migrate CashierDashboard.tsx | ⬜ | |
| Migrate ShiftManager.tsx | ⬜ | |
| Migrate MonthlyReport.tsx | ⬜ | |

---

## Phase 8: Other Modules

| Task | Status | Commit |
|------|--------|--------|
| Extract maintenance.json (ES/EN) | ⬜ | |
| Migrate MaintenanceListClient.tsx | ⬜ | |
| Extract blacklist.json (ES/EN) | ⬜ | |
| Migrate BlacklistForm.tsx | ⬜ | |
| Extract backoffice.json (ES/EN) | ⬜ | |
| Migrate BackOffice tabs | ⬜ | |
| Extract messages.json (ES/EN) | ⬜ | |
| Migrate MessagesClient.tsx | ⬜ | |

---

## Phase 9: Profile & Auth

| Task | Status | Commit |
|------|--------|--------|
| Extract profile.json (ES) | ⬜ | |
| Translate profile.json (EN) | ⬜ | |
| Migrate ProfileSidebar.tsx | ⬜ | |
| Migrate SettingsPanel.tsx | ⬜ | |
| Extract auth.json (ES/EN) | ⬜ | |
| Migrate LoginForm.tsx | ⬜ | |

---

## Phase 10: Errors & Validations

| Task | Status | Commit |
|------|--------|--------|
| Extract errors.json (ES) | ⬜ | |
| Translate errors.json (EN) | ⬜ | |
| Extract validation.json (ES) | ⬜ | |
| Translate validation.json (EN) | ⬜ | |
| Update Zod schemas to use codes | ⬜ | |
| Update toast error handlers | ⬜ | |

---

## Phase 11: Backend Error Codes

| Task | Status | Commit |
|------|--------|--------|
| Create error codes map | ⬜ | |
| Update auth-controllers.ts | ⬜ | |
| Update bookings.controller.ts | ⬜ | |
| Update group controllers | ⬜ | |
| Update logbook controllers | ⬜ | |
| Update other controllers | ⬜ | |

---

## Phase 12: Testing & Cleanup

| Task | Status | Commit |
|------|--------|--------|
| Test all modules in ES | ⬜ | |
| Test all modules in EN | ⬜ | |
| Test language switching | ⬜ | |
| Test persistence (cookie) | ⬜ | |
| Fix any missing translations | ⬜ | |
| Build production test | ⬜ | |
| Merge to main | ⬜ | |

---

## Commits Log

| Date | Commit | Description |
|------|--------|-------------|
| 23-dic-2025 | TBD | Initial i18n setup with next-intl |
| | | |
| | | |

---

## Notes

- All dates/numbers stay in Spanish format (no locale change)
- Backend returns error CODES, frontend translates
- Zod validations use CODES, UI translates
- Cookie `NEXT_LOCALE` stores user preference
- Auto-detection on first visit via `navigator.language`

---

*Last updated: 23-dic-2025*
