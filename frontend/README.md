# Four Points - Frontend

Hotel Property Management System (PMS) frontend built with Next.js 16, React 19, and TypeScript.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework (App Router + Turbopack) |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **TailwindCSS** | Utility-first styling |
| **NextUI** | Component library |
| **Zustand** | Client state management |
| **TanStack Query** | Server state & caching |
| **next-intl** | Internationalization (EN/ES) |
| **next-themes** | Dark/Light mode |
| **Framer Motion** | Animations |
| **React Hook Form + Zod** | Form handling & validation |
| **Recharts** | Data visualization |

---

## Project Structure

```
app/
├── (auth)/              # Auth pages (login)
├── api/auth/            # Route Handlers (API proxy to backend)
├── components/          # React components by module
├── dashboard/           # Protected pages
├── i18n/                # Internationalization config
├── lib/                 # Business logic, hooks, API client
├── stores/              # Zustand stores
└── ui/                  # Base UI components (panels, calendar, etc.)

messages/
├── en/                  # English translations (19 namespaces)
└── es/                  # Spanish translations
```

---

## Authentication

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

---

## State Management

| Type | Tool | Usage |
|------|------|-------|
| Server state | React Query | Data fetching, caching, mutations |
| Client state | Zustand | UI state (selected items, filters) |

### React Query Modules
BackOffice, Parking, Maintenance, Logbooks, Notifications, Groups (SSR)

---

## Internationalization

- **Languages**: English, Spanish
- **19 namespaces**: common, auth, dashboard, groups, parking, logbook, cashier, maintenance, blacklist, conciliation, backoffice, messages, notifications, profile, activity, errors, validation, settings, schedule

```typescript
const t = useTranslations('groups')
return <h1>{t('title')}</h1>
```

---

## Modules

| Module | Description |
|--------|-------------|
| Dashboard | KPIs, quick actions, activity feed |
| Groups | Hotel group reservations |
| Parking | Multi-level parking with bookings |
| Logbooks | Digital shift notes |
| Cashier | Daily cash management (4 shifts) |
| Maintenance | Work order tracking |
| Blacklist | Guest incident records |
| Conciliation | Room count reconciliation |
| BackOffice | Invoice & supplier management |
| Messages | Internal messaging |
| Profile | User settings & preferences |

---

## Scripts

```bash
pnpm dev        # Development (Turbopack)
pnpm build      # Production build
pnpm start      # Start production
pnpm lint       # ESLint
```

---

## Environment

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Four Points
NEXT_PUBLIC_DEMO_MODE=false
```

---

## Code Conventions

- **Components**: PascalCase (`GroupCard.tsx`)
- **Hooks**: `use` prefix (`useGroups.ts`)
- **Types**: PascalCase (`Group`, `GroupFormData`)
- **Formatting**: ESLint + Prettier, LF line endings, 2 spaces
