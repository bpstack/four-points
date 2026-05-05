# Four Points - Frontend Architecture

> Hotel Property Management System - Frontend Application

**[Live Demo](https://four-points.stackbp.es)**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

A comprehensive, full-stack **Hotel Management System** designed for real-world hotel operations. Features a modern, responsive dashboard with role-based access control, multi-language support (EN/ES), and dark/light mode theming.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Key Components](#3-key-components)
4. [API Client](#4-api-client)
5. [State Management](#5-state-management)
6. [Internationalization](#6-internationalization)
7. [Features & Modules](#7-features--modules)
8. [Data Export](#8-data-export)
9. [Authentication](#9-authentication)
10. [Demo Mode](#10-demo-mode)
11. [Theme System](#11-theme-system)
12. [Getting Started](#12-getting-started)
13. [Scripts](#13-scripts)
14. [Related Documentation](#14-related-documentation)

---

## 1. Tech Stack

### Core Technologies

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **Next.js** | 16.0.8 | React framework (App Router + Turbopack) |
| **React** | 19 | UI library (latest) |
| **TypeScript** | 5.7.3 | Type-safe development |
| **TailwindCSS** | 3.4.17 | Utility-first styling |
| **NextUI** | 2.6.11 | Component library (Tailwind-based) |
| **HeadlessUI** | 2.2.9 | Unstyled accessible components |
| **Heroicons** | 2.2.0 | SVG icon library |

### State & Data Management

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **Zustand** | 5.0.8 | Lightweight state management |
| **TanStack Query** | 5.90.11 | Server state, caching & mutations |
| **React Hook Form** | 7.66.0 | Form handling |
| **Zod** | 3.25.17 | Schema validation |

### UI & UX

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **Framer Motion** | 12.23.22 | Smooth animations & transitions |
| **React Hot Toast** | 2.6.0 | Toast notifications |
| **React Day Picker** | 9.11.1 | Date selection components |
| **Recharts** | 3.5.1 | Data visualization & charts |

### Internationalization & Themes

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **next-intl** | 4.6.1 | Internationalization (EN/ES) |
| **next-themes** | 0.4.6 | Dark/Light mode with system detection |

### Documents & Export

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **xlsx (SheetJS)** | 0.18.5 | Excel file generation & export |
| **pdf-lib** | 1.17.1 | PDF document generation |
| **pdfjs-dist** | 5.4.449 | PDF viewing & rendering |

### Utilities

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **date-fns** | 4.1.0 | Date manipulation utilities |
| **clsx** | 2.1.1 | Conditional class utilities |
| **tailwind-merge** | 3.3.1 | Tailwind class merging |
| **use-debounce** | 10.0.4 | Input debouncing |
| **uuid** | 13.0.0 | Unique ID generation |
| **js-cookie** | 3.0.5 | Cookie management |
| **react-icons** | 5.5.0 | Icon library (multiple sets) |

### Analytics & SEO

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **@vercel/analytics** | 1.6.1 | Vercel Analytics |

### Authentication

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
| **bcrypt** | 5.1.1 | Password hashing (client-side) |
| **next-auth** | 5.0.0-beta.25 | Authentication (optional) |

### Dev Dependencies

| Tool | Version | Purpose |
| ---- | ------- | ------- |
| **ESLint** | 8.57.1 | Code linting |
| **Prettier** | 3.6.2 | Code formatting |
| **TypeScript** | 5.7.3 | Type checking |
| **@types/** | Various | TypeScript definitions |

---

## 2. Project Structure

```
frontend/
├── app/
│   ├── (auth)/              # Authentication pages (login)
│   ├── api/                 # API Routes (Next.js)
│   ├── components/          # React components
│   │   ├── _utils/
│   │   │   └── ClientBody.tsx
│   │   ├── auth/
│   │   │   └── NewUserModal.tsx
│   │   ├── bo/
│   │   │   ├── StatsCards.tsx
│   │   │   ├── TabsNavigation.tsx
│   │   │   ├── TabContent.tsx
│   │   │   └── tabs/
│   │   │       ├── PendingInvoicesTab.tsx
│   │   │       ├── PaidInvoicesTab.tsx
│   │   │       └── SettingsTab.tsx
│   │   ├── booking/
│   │   │   ├── BookingWizard/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── steps/
│   │   │   │   │   ├── DateSpotStep.tsx
│   │   │   │   │   ├── VehicleStep.tsx
│   │   │   │   │   └── ConfirmationStep.tsx
│   │   │   │   └── types.ts
│   │   │   └── CreateBookingPanel.tsx
│   │   ├── cashier/
│   │   │   ├── CashierCalendarNav.tsx
│   │   │   ├── CloseDayModal.tsx
│   │   │   ├── CloseShiftModal.tsx
│   │   │   ├── CreateVoucherModal.tsx
│   │   │   ├── DateNavigator.tsx
│   │   │   ├── DenominationForm.tsx
│   │   │   ├── ShiftTabs.tsx
│   │   │   ├── ShiftUsersManager.tsx
│   │   │   └── VoucherList.tsx
│   │   ├── conciliation/
│   │   │   ├── ActionButtons.tsx
│   │   │   ├── ConciliationClient.tsx
│   │   │   ├── ConciliationForm.tsx
│   │   │   ├── ConciliationTable.tsx
│   │   │   ├── DaySummary.tsx
│   │   │   ├── NotePopover.tsx
│   │   │   └── RoomPopover.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── DashboardSkeleton.tsx
│   │   │   ├── GlobalStatusGrid.tsx
│   │   │   ├── ImportantLogbooksCard.tsx
│   │   │   ├── QuickActionsCard.tsx
│   │   │   └── RecentActivityCard.tsx
│   │   ├── groups/
│   │   │   ├── GroupDetailClient.tsx
│   │   │   ├── GroupsListClient.tsx
│   │   │   └── tabs/
│   │   │       ├── OverviewTab.tsx
│   │   │       ├── ContactsTab.tsx
│   │   │       ├── RoomsTab.tsx
│   │   │       ├── PaymentsTab.tsx
│   │   │       └── HistoryTab.tsx
│   │   ├── layout/
│   │   │   ├── LanguageSwitcher.tsx
│   │   │   └── ProfileDropdown.tsx
│   │   ├── maintenance/
│   │   │   └── ReportDetailClient.tsx
│   │   ├── notifications/
│   │   │   ├── items/
│   │   │   │   └── NotificationItem.tsx
│   │   │   └── lists/
│   │   │       └── NotificationsList.tsx
│   │   ├── parking/
│   │   │   ├── StatusBadge.tsx
│   │   │   └── VehicleSearchModal.tsx
│   │   ├── search/
│   │   │   ├── GlobalSearch.tsx
│   │   │   └── MobileSearchModal.tsx
│   │   └── theme/
│   │       ├── SetThemeButton.tsx
│   │       └── ThemeSwitcher.tsx
│   ├── dashboard/           # Dashboard pages
│   │   ├── parking/         # Parking management
│   │   │   ├── page.tsx     # Main parking page
│   │   │   ├── status/      # Parking status view
│   │   │   │   ├── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── ParkingTable.tsx
│   │   │   │   │   ├── ParkingNavigator.tsx
│   │   │   │   │   ├── StatusPanels.tsx
│   │   │   │   │   └── modals/
│   │   │   │   │       ├── CheckInModal.tsx
│   │   │   │   │       ├── CheckOutModal.tsx
│   │   │   │   │       ├── OverdueModal.tsx
│   │   │   │   │       └── CancelModal.tsx
│   │   │   │   └── utils/
│   │   │   │       └── statusBadges.tsx
│   │   │   ├── bookings/    # Booking management
│   │   │   │   ├── page.tsx
│   │   │   │   └── [code]/
│   │   │   │       └── page.tsx
│   │   │   ├── components/
│   │   │   │   └── ParkingDashboardClient.tsx
│   │   │   └── actions/
│   │   │       └── getParkingDashboardStats.ts
│   │   ├── logbooks/        # Logbooks (bitácoras)
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── groups/          # Groups (reservas grupales)
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── actions/
│   │   │       └── getGroups.ts
│   │   ├── cashier/         # Cashier (caja)
│   │   │   ├── page.tsx
│   │   │   ├── hotel/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── logs/        # Cashier logs
│   │   │   ├── reports/     # Cashier reports
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── maintenance/     # Maintenance (mantenimiento)
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── actions/
│   │   │       ├── createMaintenance.ts
│   │   │       ├── getMaintenance.ts
│   │   │       └── updateMaintenanceStatus.ts
│   │   ├── blacklist/       # Blacklist (lista negra)
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx
│   │   │   └── actions/
│   │   │       ├── createBlacklist.ts
│   │   │       └── getBlacklist.ts
│   │   ├── conciliation/    # Conciliation (conciliación)
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── bo/              # Backoffice (facturas)
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── profile/         # User profile
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── layout.tsx       # Dashboard layout
│   │   ├── page.tsx         # Dashboard home
│   │   └── loading.tsx
│   ├── i18n/                # Internationalization config
│   │   └── config.ts
│   ├── lib/                 # Utilities & hooks
│   │   ├── activity/
│   │   │   ├── index.ts
│   │   │   ├── queries.ts
│   │   │   └── types.ts
│   │   ├── auth/
│   │   │   ├── authService.ts
│   │   │   ├── cookieHandler.ts
│   │   │   └── useAuth.tsx
│   │   ├── apiClient.ts     # Centralized API client (490 líneas)
│   │   ├── backoffice/
│   │   │   ├── backofficeApi.ts
│   │   │   ├── data.ts
│   │   │   ├── export-utils.ts
│   │   │   └── types.ts
│   │   ├── blacklist/
│   │   │   ├── blacklistApi.ts
│   │   │   ├── blacklistSchema.ts
│   │   │   └── types.ts
│   │   ├── cashier/
│   │   │   ├── queries.ts
│   │   │   ├── types.ts
│   │   │   └── exportDailyPdf.ts
│   │   ├── conciliation/
│   │   │   ├── config.ts
│   │   │   ├── queries.ts
│   │   │   └── types.ts
│   │   ├── departments/
│   │   │   ├── queries.ts
│   │   │   └── types.ts
│   │   ├── groups/
│   │   │   ├── queries.ts
│   │   │   ├── types.ts
│   │   │   └── schemas/
│   │   │       └── group-schemas.ts
│   │   ├── helpers/
│   │   │   ├── date.ts
│   │   │   ├── error-utils.ts
│   │   │   └── utils.ts
│   │   ├── logbooks/
│   │   │   ├── hooks/
│   │   │   │   ├── useDepartments.ts
│   │   │   │   └── useLogbooks.ts
│   │   │   ├── queries.ts
│   │   │   └── types.ts
│   │   ├── maintenance/
│   │   │   ├── maintenanceApi.ts
│   │   │   ├── maintenance-schemas.ts
│   │   │   └── maintenance.ts
│   │   ├── messaging/
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useChat.ts
│   │   │   │   └── useConversations.ts
│   │   │   ├── queries.ts
│   │   │   └── types.ts
│   │   ├── notifications/
│   │   │   ├── queries.ts
│   │   │   ├── types.ts
│   │   │   └── useNotifications.ts
│   │   ├── parking/
│   │   │   ├── queries.ts
│   │   │   ├── types.ts
│   │   │   └── actions.ts
│   │   ├── theme/
│   │   │   └── ThemeProvider.tsx
│   │   ├── users/
│   │   │   ├── queries.ts
│   │   │   └── types.ts
│   │   └── env.ts            # Environment variables
│   ├── stores/              # Zustand stores
│   │   ├── useCashierStore.ts
│   │   ├── useGroupStore.ts
│   │   ├── useMaintenanceStore.ts
│   │   └── useNotificationStore.ts
│   ├── ui/                  # Base UI components
│   │   ├── calendar/
│   │   │   ├── DatePickerInput.tsx
│   │   │   ├── HorizontalDatePicker.tsx
│   │   │   ├── SimpleCalendarCompact.tsx
│   │   │   ├── simplecalendar.tsx
│   │   │   └── timepicker.tsx
│   │   ├── dashboard/
│   │   │   ├── nav-links.tsx
│   │   │   └── sidenav.tsx
│   │   ├── errors/
│   │   │   └── ModuleError.tsx
│   │   ├── fonts-design/
│   │   │   ├── design-system.ts
│   │   │   ├── fonts.helper.ts
│   │   │   └── fonts.ts
│   │   ├── panels/
│   │   │   ├── CenterModal.tsx
│   │   │   ├── SlidePanel.tsx
│   │   │   ├── SlidePanelFooterWithDelete.tsx
│   │   │   └── index.ts
│   │   ├── global.css
│   │   └── skeletons.tsx
│   ├── layout.tsx           # Root layout (118 líneas)
│   └── page.tsx             # Home page
├── messages/                # Translations
│   ├── en/                  # English (19 files)
│   │   ├── auth.json
│   │   ├── cashier.json
│   │   ├── common.json
│   │   ├── conciliation.json
│   │   ├── dashboard.json
│   │   ├── errors.json
│   │   ├── groups.json
│   │   ├── logbook.json
│   │   ├── maintenance.json
│   │   ├── messages.json
│   │   ├── notifications.json
│   │   ├── parking.json
│   │   ├── profile.json
│   │   └── ...
│   └── es/                  # Spanish (19 files)
│       ├── auth.json
│       ├── backoffice.json
│       ├── blacklist.json
│       ├── cashier.json
│       ├── common.json
│       ├── conciliation.json
│       ├── dashboard.json
│       ├── errors.json
│       ├── groups.json
│       └── ...
├── public/
│   ├── screenshots/         # App screenshots
│   ├── icons/               # Favicons
│   └── manifest.json        # PWA manifest
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Key Components

### Dashboard Components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `DashboardHeader` | dashboard/DashboardHeader.tsx | Header with search and profile |
| `GlobalStatusGrid` | dashboard/GlobalStatusGrid.tsx | KPI cards grid |
| `QuickActionsCard` | dashboard/QuickActionsCard.tsx | Quick action buttons |
| `RecentActivityCard` | dashboard/RecentActivityCard.tsx | Activity feed |
| `ImportantLogbooksCard` | dashboard/ImportantLogbooksCard.tsx | Critical logbooks |

### Parking Components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `ParkingDashboardClient` | dashboard/parking/components/ | Main parking dashboard |
| `ParkingStatusClient` | dashboard/parking/status/components/ | Status view |
| `ParkingTable` | dashboard/parking/status/components/ | Spaces table |
| `CheckInModal` | modals/ | Check-in modal |
| `CheckOutModal` | modals/ | Check-out modal |
| `VehicleSearchModal` | VehicleSearchModal.tsx | Search vehicle |

### Cashier Components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `CloseShiftModal` | CloseShiftModal.tsx | Close shift dialog |
| `DenominationForm` | DenominationForm.tsx | Currency input |
| `ShiftTabs` | ShiftTabs.tsx | Shift navigation |
| `ShiftUsersManager` | ShiftUsersManager.tsx | User shift assignment |

### Group Components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `GroupDetailClient` | groups/GroupDetailClient.tsx | Group detail view |
| `GroupsListClient` | groups/GroupsListClient.tsx | Groups list |
| `ContactCard` | groups/cards/ | Contact info |
| `PaymentCard` | groups/cards/ | Payment tracking |
| `RoomCard` | groups/cards/ | Room assignment |

### UI Components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `SlidePanel` | panels/SlidePanel.tsx | Slide-out panel |
| `CenterModal` | panels/CenterModal.tsx | Modal dialog |
| `DatePickerInput` | calendar/DatePickerInput.tsx | Date selection |
| `HorizontalDatePicker` | calendar/ | Date range picker |
| `ModuleError` | errors/ModuleError.tsx | Error boundary |
| `SkeletonLoader` | skeletons.tsx | Loading states |

---

## 4. API Client

**File:** `app/lib/apiClient.ts` (490 líneas)

### Features

The API client provides centralized HTTP handling with advanced features:

```typescript
interface FetchOptions extends RequestInit {
  skipRefresh?: boolean
}

// Key features:
- Auto-refresh JWT on 401 responses
- Concurrent refresh handling with queue
- Circuit breaker (max 3 refresh attempts)
- Credentials always included (cookies)
- FormData support for file uploads
- Blob support for file downloads
- Error handling with i18n codes
- Toast notifications for demo mode
```

### Auto-Refresh Flow

```typescript
1. Request → API
2. If 401:
   - Check if already refreshing
   - If yes, queue request
   - If no, attempt refresh
   - Retry original request
3. If refresh fails (3 attempts):
   - Clear cookies
   - Redirect to /login
```

### Methods

| Method | Purpose |
| ------- | ------- |
| `apiClient.get<T>()` | GET request |
| `apiClient.post<T>()` | POST request |
| `apiClient.patch<T>()` | PATCH request |
| `apiClient.put<T>()` | PUT request |
| `apiClient.delete<T>()` | DELETE request |
| `apiClient.postFormData<T>()` | File upload |
| `apiClient.getBlob()` | Download file |

### Error Handling

```typescript
class ApiError extends Error {
  demo: boolean      // Is demo mode restriction
  status: number     // HTTP status
  code?: string      // Backend error code for i18n
}

// Demo errors show toast notification
// Regular errors are thrown for handling
```

---

## 5. State Management

### Server State (TanStack Query)

| Module | Hook/Query | Purpose |
| ------ | ---------- | ------- |
| **Activity** | `useActivity()` | Dashboard feed |
| **Parking** | `useParkingSpaces()` | Parking data |
| **Groups** | `useGroups()` | Group reservations |
| **Logbooks** | `useLogbooks()` | Shift notes |
| **Cashier** | `useCashierShifts()` | Shift data |
| **Maintenance** | `useMaintenanceOrders()` | Work orders |
| **Notifications** | `useNotifications()` | Alert system |
| **Backoffice** | `useInvoices()` | Invoice management |

### Client State (Zustand)

```typescript
// useCashierStore.ts
interface CashierStore {
  selectedShift: Shift | null
  selectedDate: Date
  denominationMode: boolean
  setSelectedShift: (shift: Shift) => void
  setSelectedDate: (date: Date) => void
  toggleDenominationMode: () => void
}

// useGroupStore.ts
interface GroupStore {
  selectedGroup: Group | null
  activeTab: string
  filters: GroupFilters
  setSelectedGroup: (group: Group) => void
  setActiveTab: (tab: string) => void
  setFilters: (filters: GroupFilters) => void
}

// useMaintenanceStore.ts
interface MaintenanceStore {
  priorityFilter: string
  statusFilter: string
  setPriorityFilter: (priority: string) => void
  setStatusFilter: (status: string) => void
}

// useNotificationStore.ts
interface NotificationStore {
  unreadCount: number
  isOpen: boolean
  setUnreadCount: (count: number) => void
  setIsOpen: (isOpen: boolean) => void
}
```

---

## 6. Internationalization

**Configuration:** `app/i18n/config.ts`

### Supported Languages

| Language | Code | Namespace Files |
| -------- | ---- | --------------- |
| **English** | en | 19 files |
| **Spanish** | es | 19 files |

### Translation Namespaces

| Namespace | Module |
| --------- | ------ |
| `auth` | Authentication |
| `cashier` | Cashier module |
| `conciliation` | Conciliation |
| `dashboard` | Dashboard |
| `errors` | Error messages |
| `groups` | Groups/Reservations |
| `logbook` | Logbooks |
| `maintenance` | Maintenance |
| `messages` | Messaging |
| `notifications` | Notifications |
| `parking` | Parking |
| `profile` | User profile |
| `common` | Shared strings |
| `validation` | Form validation |
| `backoffice` | Backoffice |
| `blacklist` | Blacklist |
| `booking` | Booking |
| `restaurant` | Restaurant |

### Usage

```typescript
// In components
import { useTranslations } from 'next-intl'

function MyComponent() {
  const t = useTranslations('namespace')
  return <div>{t('key')}</div>
}

// In server components
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('namespace')
  return <div>{t('key')}</div>
}
```

---

## 7. Features & Modules

### Core Modules

| Module | Description |
| ------ | ----------- |
| **Authentication** | JWT auth with access/refresh tokens, role-based access (admin, receptionist, maintenance, group-admin), avatar upload |
| **Dashboard** | KPIs, quick actions, activity feed, important alerts |
| **Groups** | Hotel group reservations with contacts, rooms, payments tracking, status workflow, complete audit history |
| **Parking** | Multi-level parking management, bookings with unique codes, check-in/out, rates, analytics |
| **Logbooks** | Digital shift notes with priority levels, comments, read tracking, department organization |
| **Cashier** | Daily cash management with 4 shifts, denomination counting, electronic payments, vouchers, daily reports |
| **Maintenance** | Work order tracking with custom IDs, image uploads, status workflow, assignment to staff/contractors |
| **Blacklist** | Guest incident records with severity levels, document verification, image gallery |
| **Conciliation** | Daily room count reconciliation between Reception and Housekeeping |
| **Backoffice** | Invoice & supplier management with PDF uploads, validation workflow, monthly summaries |
| **Messaging** | Internal communication system with direct messages and group chats |
| **Notifications** | Multi-module alert system with priority levels, scheduled delivery, email integration |

### Schedule Module (In Development)

> Currently being developed on a separate branch

Automated staff scheduling system featuring a **hybrid generation engine** that combines a custom algorithm with optional AI optimization.

### Special Features

| Feature | Description |
| ------- | ----------- |
| **Internationalization** | Full English and Spanish support with 19 translation namespaces |
| **Dark/Light Mode** | Complete theme support with system preference detection |
| **Role-Based Access** | 4 roles with granular permissions per module |
| **Real-time Updates** | Live notifications, unread counters, activity feeds |
| **Responsive Design** | Mobile-first approach, works on all devices |
| **Demo Mode** | Restricted operations for public deployments |

---

## 8. Data Export

### Excel Export (xlsx)

| Module | Export Feature |
| ------ | -------------- |
| **Cashier** | Daily shift reports with denomination breakdown |
| **Parking** | Booking history, analytics data |
| **Groups** | Reservation lists, payment summaries |
| **Conciliation** | Monthly room count reports |

### PDF Generation (pdf-lib)

| Module | PDF Feature |
| ------ | ----------- |
| **Cashier** | Daily cash reports |
| **Groups** | Reservation confirmations |
| **Backoffice** | Invoice summaries |

### PDF Viewing (pdfjs-dist)

- In-app PDF preview for uploaded invoices
- Thumbnail generation for document lists
- Full document viewer with zoom controls

---

## 9. Authentication

Uses **HttpOnly cookies** for JWT tokens (XSS-protected). No localStorage.

```
Login → Access Token (15min) + Refresh Token (7 days)
         ↓
Request fails 401 → Auto-refresh via cookie
         ↓
Refresh expires → Redirect to /login
```

### Key Features

- Automatic token refresh
- Role-based access (admin, receptionist, maintenance, group-admin)
- Centralized `apiClient` with `credentials: 'include'`
- Session management with cookies

### Auth Hooks

```typescript
// useAuth.tsx
interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

// authService.ts
interface LoginCredentials {
  username: string
  password: string
}

interface User {
  id: string
  username: string
  role: 'admin' | 'receptionist' | 'maintenance' | 'group-admin'
  avatar?: string
}
```

---

## 10. Demo Mode

This application includes a **Demo Mode** for safe public deployment. Demo users can **view everything** but have **limited write access**.

### Allowed Operations

| Module | Allowed Actions |
| ------ | --------------- |
| **Auth** | Logout |
| **Parking** | Create bookings |
| **Logbooks** | Add comments |
| **Maintenance** | Create work orders |

All other write operations are blocked with a friendly toast message.

---

## 11. Theme System

**Configuration:** `app/lib/theme/ThemeProvider.tsx`

### Features

- Dark/Light mode toggle
- System preference detection
- Persistent storage (localStorage)
- Hydration mismatch prevention
- Tailwind CSS integration

### Fonts System

**Files:**
- `app/ui/fonts-design/fonts.ts` - Font definitions
- `app/ui/fonts-design/fonts.helper.ts` - Font utilities
- `app/ui/fonts-design/design-system.ts` - Design tokens

```typescript
// Available fonts (configured via CSS variables)
--font-primary   // Main font
--font-display   // Headings font
```

### Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible sidebar for mobile
- Touch-friendly components

---

## 12. Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/bpstack/four-points-frontend.git
cd four-points-frontend

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start development server
pnpm dev
```

Open [https://four-points.stackbp.es/](https://four-points.stackbp.es/) to view the application.

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# App Configuration
NEXT_PUBLIC_APP_NAME=Four Points
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_DEMO_MODE=true
```

### Demo Credentials

```
Username: demo
Password: demo987654
```

---

## 13. Scripts

```bash
pnpm dev              # Development (Turbopack, port 3000)
pnpm build            # Production build
pnpm start            # Start production
pnpm lint             # ESLint
pnpm format           # Prettier
```

---

---

## Author

**Salvador Pérez**

- GitHub: [@bpstack](https://github.com/bpstack)
- Email: contact.bpstack@gmail.com

---

<p align="center">
  Made with Next.js, TypeScript, and TailwindCSS
</p>
