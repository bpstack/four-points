# Four-Points — Frontend

Next.js 16 (App Router) + React 19, Tailwind CSS and NextUI, in Spanish and
English (next-intl). It talks to the backend API with HttpOnly cookies. To
install and run the whole project, see the [root README](../README.md).

## Layout

| Folder               | What it holds                                       |
| -------------------- | --------------------------------------------------- |
| `app/dashboard/`     | One route per module                                |
| `app/components/`    | Module components (some with their own `AGENTS.md`) |
| `app/lib/`           | API client, per-module API calls, helpers, types    |
| `messages/{es,en}/`  | Translations, one file per module                   |
| `content/checklist/` | Shift guides and references, in Markdown            |

## Commands

| Command                                              | Does                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                                           | http://localhost:3000, API from `NEXT_PUBLIC_API_URL` |
| `pnpm build` · `pnpm start`                          | Production build                                      |
| `pnpm typecheck` · `pnpm lint` · `pnpm format:check` | What CI runs                                          |

The product documentation lives in [`docs/`](../docs/general/README.md).
