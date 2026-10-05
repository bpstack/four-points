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

## Try it

A public demo runs on the project site: **Try our live demo** on the login
page signs you in as an administrator, with fictitious data that resets every
day. User management and settings are locked there. To see everything, run it
locally.

## Run it locally

You need Node ≥ 22.16, pnpm, Python 3.11+ (for the scheduling solver) and
MySQL 8, either installed or through Docker. `frontend/` and `backend/` are
independent pnpm projects, each with its own lockfile.

```bash
# 1. Settings: copy and fill in (LOCAL_DB_USER=root, a LOCAL_DB_PASSWORD of
#    your choice, a long random SECRET_JWT_KEY)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. MySQL in Docker (skip it if you already run MySQL 8; if that one uses
#    port 3306, set LOCAL_DB_PORT=3307 for Docker)
docker compose --env-file backend/.env up -d

# 3. Database: tables, the local admin and fictitious data in every module
#    (scheduling included). It creates hotel_db and refuses to touch one that
#    already has tables (add -- --force to replace it)
cd backend && pnpm install && pnpm setup:local

# 4. Scheduling solver (once)
cd scheduling-solver && python -m venv venv
venv/Scripts/pip install -r requirements.txt   # Linux/macOS: venv/bin/pip
cd ..

# 5. Run, in two terminals
pnpm dev:local                                  # backend/: API on :4000
cd frontend && pnpm install && pnpm dev         # http://localhost:3000
```

Sign in as **`admin`** / **`fourpoints-local`**: a full administrator,
users, roles and settings included. The password is public on purpose:
`setup:local` only runs against a local database, so this account never
exists anywhere else. Change it in Profile if you like.

Uploading photos and PDFs needs a Cloudinary account in `backend/.env`.
Without it everything else works, and an upload just says storage is not
configured.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
