# Four-Points

Internal operations app for a hotel, complementing its commercial PMS (Opera):
logbook, parking, maintenance, groups, cashier, blacklist, staff scheduling,
shift checklists, F&B revenue and invoice backoffice.

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, NextUI.
- **Backend**: Express 5 + TypeScript, MySQL 8, Cloudinary for files.
- **Scheduling**: Python + OR-Tools (CP-SAT) solver, run as a child process.

Full documentation lives in [`docs/`](docs/general/README.md):

- [General](docs/general/README.md) — architecture, roles, stack, deployment,
  local setup.
- [Logbook](docs/logbook/README.md)
- [Parking](docs/parking/README.md)
- [Maintenance](docs/maintenance/README.md)
- [Groups](docs/groups/README.md)
- [Scheduling](docs/scheduling/README.md) ([solver](docs/scheduling/solver.md))
- [Checklist](docs/checklist/README.md)
- [Cashier](docs/cashier/README.md)
- [F&B](docs/fnb/README.md)
- [Backoffice](docs/backoffice/README.md)
- [Blacklist](docs/blacklist/README.md)
- [Conciliation](docs/conciliation/README.md)

## Local development

```bash
cd backend && pnpm install && pnpm dev:aiven   # API against Aiven; frontend looks for it on :4000
cd frontend && pnpm install && pnpm dev        # http://localhost:3000
```

Node ≥ 22.16, pnpm. `frontend/` and `backend/` are independent pnpm projects,
each with its own lockfile.
