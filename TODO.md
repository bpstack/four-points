# TODO — Four-Points PMS

> **Cómo leer este documento:** lista accionable para la próxima sesión.
> El plan estratégico vive en `Global-Plan.md`. Las decisiones de scheduling en `SCHEDULING-DECISIONS-LOG.md` y `SCHEDULING-CONSTRAINTS.md`.

---

## Repo housekeeping (pendiente)

- [ ] **`docs/` gitignored — decidir destino de `docs/checklists/checklist.md`** — el `.gitignore` línea 67 (`**/docs/`) excluye toda la carpeta `docs/`. El archivo `docs/checklists/checklist.md` creado en sesión 2026-05-15 como reemplazo de `CHECKLIST-ROADMAP.md` **NO está bajo control de versiones**; existe solo en disco local. Tres opciones:
  - (a) Añadir `!docs/` al `.gitignore` para versionar toda la carpeta (recomendado si la intención era tener docs públicos).
  - (b) Mover `docs/checklists/checklist.md` a un sitio tracked (ej. `CHECKLIST.md` en raíz, o `frontend/content/checklist/README.md`).
  - (c) Aceptar que `docs/` es scratch local y reescribir el contenido en sitio tracked.

- [ ] **Commits pendientes en working tree** — cambios acumulados sin commitear (decidido posponer 2026-05-15). Tres lotes lógicos cuando se decida lanzar:
  - **Lote A — Quickies código/config**: `backend/scheduling-solver/.python-version` + `frontend/vercel.json` + `engines.node` en `backend/package.json` y `frontend/package.json` + `.trim()` en `backend/validations/checklist/checklist-schemas.ts`. Mensaje sugerido: `chore: pin runtime versions + security headers + zod trim`.
  - **Lote A.1 — Trust proxy fix**: `app.set('trust proxy', 1)` en `backend/index.ts` tras `const app = express()`. Arregla el ValidationError de express-rate-limit en logs Render + bug funcional de rate limiters (antes limitaban por IP del proxy de Render = todos los usuarios cuentan como uno). Puede ir junto con Lote A o como commit separado. Mensaje sugerido: `fix: enable trust proxy for Render to identify real client IPs in rate limiters`.
  - **Lote C — Timezone Fase 1**: `cron-service.ts` (timezone Madrid en 2 crons) + `logbook-repository.ts` (fallback `getTodayMadrid`) + `checklist-repository.ts` y `checklist.service.ts` (elim. `getHotelDate` duplicado, importar `getTodayMadrid` de `date-utils.ts`) + `cashier-report-controller.ts` (elim. helper inline, importar `getTodayMadrid`). Mensaje sugerido: `refactor(timezone): centralize Madrid date helper, fix UTC fallbacks, add timezone to crons`. **Pendiente verificación local antes de commit — ver checklist abajo.**
  - **Lote D — Timezone Fase 2 (auto-close lazy)**: `services/checklist/checklist.service.ts::getRunState` añade `await repo.closeStaleRuns()` al inicio. Workaround para cron-sleep en Render free tier. Mensaje sugerido: `fix(checklist): auto-close stale runs on getRunState to bypass render free-tier cron sleep`. **Pendiente verificación local antes de commit — ver checklist abajo.**
  - **Lote E — Timezone Fase 3 (UTC fallbacks lógica negocio)**: 14 sitios en 9 archivos (parking + backoffice + scheduling + cashier + group + conciliation + script). Nuevo helper `getLastDayOfMonth` en `date-utils.ts`. Mensaje sugerido: `refactor(timezone): replace UTC fallbacks with Madrid-correct helpers across repos and controllers`. **Pendiente verificación local antes de commit — ver checklist abajo.**
  - **Lote F — Timezone Fase 4 (frontend display + TZ Madrid explícito)**: helpers/date.ts (TZ Madrid en `formatDateLocal`/`formatDateForInput`/`formatDateDisplayShort`; `parseInputDate` robusto a ISO y datetime naive; nuevo `formatTimestampSmart`) + 6 bo/tabs + VehicleSearchModal + blacklistUtils + export-utils + ChecklistHeader + LogbooksList + StepDetailsPanel. Arregla "Invalid Date" en backoffice + parking (la API devolvía ISO con T y `parseInputDate` solo aceptaba YYYY-MM-DD). Mensaje sugerido: `fix(frontend): force Europe/Madrid timezone in date helpers and accept ISO strings in parseInputDate`. **Pendiente verificación local antes de commit — ver checklist abajo.**

#### Verificación pre-commit Lote C (timezone Fase 1) — pendiente

Ejecutar con `pnpm dev:local` antes de commitear el Lote C.

- [ ] **Boot limpio**: `cd backend && pnpm typecheck` verde + `pnpm dev:local` arranca sin errores; los 3 crons se registran en logs sin `ValidationError`.
- [ ] **Checklist `hotel_date` Madrid**: abrir `/dashboard/checklist/cl-night-audit` desde frontend local; verificar en MySQL `SELECT hotel_date FROM checklist_runs ORDER BY id DESC LIMIT 1` que `hotel_date` = fecha de hoy en Madrid.
- [ ] **Logbook fallback**: `POST /api/logbooks` sin campo `date` (con cookie de access_token); verificar en MySQL `SELECT date FROM logbooks ORDER BY id DESC LIMIT 1` que `date` = hoy Madrid (no UTC). El `created_at` sí debe ser UTC — correcto.
- [ ] **Cashier dashboard**: `GET /api/cashier/reports/dashboard` con cookie admin; debe devolver 200, no 500 (confirma que el `import { getTodayMadrid }` resuelve).
- [ ] **Crons timezone** — verificación pasiva (no esperar 07:00 Madrid real): leer logs de arranque y confirmar que las 3 líneas de cron se registran sin que node-cron lance error por parámetro de timezone inválido. Cron node-cron solo lanza error si el string de timezone no existe en la lista IANA; `'Europe/Madrid'` es válido. Esto basta como smoke test.

Una vez verificados los 5 puntos, lanzar el commit del Lote C.

#### Verificación pre-commit Lote D (timezone Fase 2 / auto-close lazy) — pendiente

Ejecutar con `pnpm dev:local` antes de commitear el Lote D. Requiere acceso a MySQL local.

- [ ] **Boot limpio**: `pnpm typecheck` verde (ya confirmado) + `pnpm dev:local` arranca sin errores.

- [ ] **Crear run "viejo" manualmente en DB**:
  ```sql
  -- Insertar un run con hotel_date de ayer, sin cerrar (simula el cron que no disparó)
  INSERT INTO checklist_runs (checklist_id, hotel_id, hotel_date)
  VALUES ('cl-night-audit', 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY));
  -- Anotar el id devuelto (LAST_INSERT_ID())
  SELECT LAST_INSERT_ID();
  ```

- [ ] **Disparar `getRunState` desde el frontend**: abrir `http://localhost:3000/dashboard/checklist/cl-night-audit` (o cualquier otro checklist) con usuario admin. La apertura llama a `GET /api/checklists/:id/run` → `getRunState`.

- [ ] **Verificar que el run viejo quedó cerrado**:
  ```sql
  SELECT id, hotel_date, reset_at, reset_by_user_id, reset_reason
  FROM checklist_runs WHERE id = <id_anotado>;
  ```
  **Esperado:** `reset_at IS NOT NULL`, `reset_by_user_id = 'system-cron'`, `reset_reason = 'cron'`.

- [ ] **Verificar que el run de hoy se creó normal** (no se ve afectado por el cierre del viejo):
  ```sql
  SELECT id, hotel_date, reset_at
  FROM checklist_runs WHERE checklist_id = 'cl-night-audit' AND hotel_date = CURDATE();
  ```
  **Esperado:** una row con `reset_at IS NULL`.

- [ ] **Verificar idempotencia (noop tras primera apertura)**: recargar la página → `closeStaleRuns()` se llama de nuevo pero no hay nada que cerrar. No debe fallar ni cambiar nada en DB. Opcional: añadir un log temporal en `closeStaleRuns` para confirmar `affectedRows = 0` en la segunda llamada.

Una vez verificados los 5 puntos, lanzar el commit del Lote D.

#### Verificación pre-commit Lote E (timezone Fase 3 / UTC fallbacks lógica negocio) — pendiente

Smoke tests, todos contra `pnpm dev:local`. Validan que las 14 sustituciones no han roto el comportamiento esperado de los endpoints.

- [ ] **Boot limpio**: `pnpm typecheck` verde (ya confirmado) + `pnpm dev:local` arranca sin errores.

- [ ] **Parking — Stats del día sin `?date`** (verifica `getDailyStats` + `getOccupancyByLevel` + `getAvailabilityByLevel` con fallback Madrid):
  ```
  GET http://localhost:4000/api/parking/stats
  GET http://localhost:4000/api/parking/stats/occupancy
  GET http://localhost:4000/api/parking/stats/availability
  ```
  Esperado: 200, campo `date` en response = hoy Madrid.

- [ ] **Parking — Stats con `?date=YYYY-MM-DD`** (verifica que un string Madrid YYYY-MM-DD no se altera):
  ```
  GET http://localhost:4000/api/parking/stats?date=2026-05-14
  ```
  Esperado: 200, `date: "14/05/2026"` (formato Madrid), datos del día solicitado.

- [ ] **Parking — Spots disponibles sin fecha** (verifica `getAvailableSpots` fallback):
  ```
  GET http://localhost:4000/api/parking/spots/available
  ```
  Esperado: 200, response.date = hoy Madrid.

- [ ] **Parking — Checkins/Checkouts por fecha** (verifica las líneas 266 y 385 de stats.repository):
  ```
  GET http://localhost:4000/api/parking/stats/checkins?date=2026-05-15
  GET http://localhost:4000/api/parking/stats/checkouts?date=2026-05-15
  ```
  Esperado: 200, listado filtrado por la fecha pasada.

- [ ] **Backoffice — Summary stats** (verifica `currentMonth` Madrid):
  ```
  GET http://localhost:4000/api/backoffice/summary
  ```
  Esperado: 200, `paid_this_month` cuenta facturas con `paid_date` del mes actual Madrid (no UTC). Si el deploy es el día 1 a las 01:00 Madrid, debe contar facturas del mes actual, no del anterior.

- [ ] **Backoffice — Monthly summary sin year** (verifica `getMonthlySummary` fallback):
  ```
  GET http://localhost:4000/api/backoffice/monthly-summary
  ```
  Esperado: 200, response usa el año actual Madrid.

- [ ] **Cashier — Monthly summary fin de mes** (verifica `getLastDayOfMonth` en cashier-daily):
  ```
  GET http://localhost:4000/api/cashier/daily/monthly-summary?year=2026&month=5
  ```
  Esperado: 200. Mirar logs de query SQL — `endDate` debe ser `'2026-05-31'`, no `'2026-05-30'`.

- [ ] **Scheduling — Shift stats sin year** (verifica scheduling-controller:1852):
  ```
  GET http://localhost:4000/api/scheduling/shift-stats
  ```
  Esperado: 200, datos del año Madrid actual.

- [ ] **Group — Dashboard timeline sin year** (verifica group-controller:316):
  ```
  GET http://localhost:4000/api/groups/dashboard/timeline
  ```
  Esperado: 200, response.year = año Madrid actual.

- [ ] **Conciliation — Monthly summary** (verifica conciliation-monthly:95):
  ```
  GET http://localhost:4000/api/conciliations/monthly?year=2026&month=2
  ```
  Esperado: 200, `totalDays = 28` (febrero 2026, no bisiesto). Si febrero bisiesto: 29.

- [ ] **Solver Scheduling — verificar `findByMonth`** (verifica employee-requests-repository:18):
  - Abrir `/dashboard/scheduling` en frontend.
  - Cargar un mes de scheduling (debe llamar a `findByMonth` indirectamente).
  - Mirar logs SQL: la query debe usar `date_from <= '2026-05-31'` para mayo (último día correcto), no `'2026-05-30'`.

- [ ] **Script standalone** (verifica scripts/checklist-report.ts:19 fallback):
  ```bash
  cd backend && pnpm exec tsx --env-file=.env scripts/checklist-report.ts
  ```
  Esperado: el script consulta el run de **hoy Madrid** del checklist `cl-night-audit` (sin argumentos).

Una vez verificados los 11 puntos, lanzar el commit del Lote E.

#### Verificación pre-commit Lote F (timezone Fase 4 / frontend) — pendiente

Ejecutar con `pnpm dev` (frontend) y `pnpm dev:aiven` (backend) antes de commitear el Lote F.

- [ ] **Typecheck frontend**:
  ```bash
  cd frontend && pnpm exec tsc --noEmit
  ```
  Esperado: sin errores.

- [ ] **Backoffice — fechas factura** (`/dashboard/backoffice`, pestañas Proveedores / Pendientes / Pagadas):
  - Las fechas aparecen como `21 dic 2025` (formato `DD mmm YYYY` con mes en minúsculas).
  - **No** aparece "Invalid Date" en ninguna fila.

- [ ] **Parking — búsqueda vehículo** (`/dashboard/parking` → icono lupa):
  - Las fechas en los resultados (Registrado, Historial Reservas) aparecen como `21 dic 2025`.
  - **No** aparece "Invalid Date".

- [ ] **Checklist — comentarios en tarea** (abrir cualquier checklist → click en tarea → comentarios):
  - Si el comentario es de **hoy** Madrid → solo `HH:mm` (ej. `23:32`).
  - Si el comentario es de **otro día** → `DD/MM/YYYY HH:mm`.

- [ ] **Checklist — tarea marcada hecha** (marcar una tarea):
  - Junto al usuario aparece solo `HH:mm`, ya que está en contexto del día actual.

- [ ] **Blacklist — detalle de registro** (`/dashboard/blacklist` → entrar en uno):
  - "Resumen del Registro" muestra `Fecha de Entrada` y `Fecha de Salida` como `DD/MM/YYYY`.
  - `Registrado por` muestra `DD/MM/YYYY, HH:mm` (formato con coma del `toLocaleString` original).

- [ ] **Logbook — entradas en libro de consigna** (`/dashboard/logbook`):
  - Desktop: solo `HH:mm` (la fecha del día está en cabecera de sección).
  - Mobile: `HH:mm · DD/MM/YYYY` (porque podría escribirse desde un día distinto).

- [ ] **Verificar TZ implícita Madrid** (defensivo — el user está en Madrid, esto solo importa si el browser se configura en otra TZ):
  - Abrir DevTools → Sensors → Timezone ID → `America/Los_Angeles`.
  - Recargar página.
  - Las fechas en las pantallas anteriores siguen siendo Madrid (porque ahora todos los helpers fuerzan `timeZone: 'Europe/Madrid'`).
  - Volver a "No override".

Una vez verificados los 7 puntos, lanzar el commit del Lote F.

  - **Lote B — Docs/planning**: `TODO.md` + `Global-Plan.md` (revisión Sprint 2) + `merge-timesZone.md` (plan de refactor) + borrado de `CHECKLIST-ROADMAP.md`. Mensaje sugerido: `docs: revise sprint 2 scope, rewrite timezone refactor plan, remove old checklist roadmap`.
  - **Untracked sin decidir**: `migration-nextjs-to-vite.md`, `react-query-doubts.md` (notas personales — no relacionados con los lotes A/B).

---

## Estado actual (2026-05-15)

- **Sprint 0** ✅ cerrado — PR #4 (`chore/audit-prep-sprint-0`)
- **Sprint 1** ✅ casi cerrado — PR #5 (auth hardening) + PR #6 (Pino logger)
- **Sprint 2** ⏳ pendiente, **alcance reducido tras revisión 2026-05-15** — Sentry, pin deps Python, security headers Vercel, Cloudflare Access. Ver §"Revisión 2026-05-15" abajo.

Backend en Render funcionando. Solver Python operativo (ver §"Python solver — estado actual" abajo).

---

## Revisión 2026-05-15 — Alcance Sprint 2

Tras análisis objetivo (sesión 2026-05-15) considerando la **escala real del producto** — PMS interno, 1-3 hoteles previstos, 5-30 usuarios totales del equipo de recepción, sin tráfico público — se revisó el alcance original de Sprint 2.

**Contexto del razonamiento:**
- 1 dev, 1 servicio Render, 1 entorno productivo, tier gratis.
- App funcionando en producción hoy.
- El producto real (scheduling, timezone, features) sigue sin terminar.
- Tiempo invertido en infraestructura es tiempo NO invertido en features.

**Cambios respecto al plan original:**

| Item | Plan original | Plan revisado | Razón |
|---|---|---|---|
| **H1-13 Sentry** | Sprint 2 | Sprint 2 (sin cambio) | Valor real, bloqueado solo en alta externa |
| **H1-16** "render.yaml + vercel.json" en un único item | Sprint 2 | **Desagregado** en H1-16.1 a H1-16.6 según valor real | El item original mezclaba cosas de valor real con ceremonia |
| **H1-16.1** Pinear deps Python | (no existía como item) | **Sprint 2 (hacer)** | Único riesgo silencioso con probabilidad no despreciable hoy |
| **H1-16.4** vercel.json security headers | (subsumido en H1-16) | **Sprint 2 (hacer)** | Valor objetivo medible en securityheaders.com |
| **H1-16.2/3** Pinear Python/Node | (no existían como items) | Opcional (cheap, valor marginal) | 3 min en total, no salvan mucho hoy |
| **H1-16.5** render.yaml Blueprint | Sprint 2 | **Diferido** hasta 2º entorno (staging o 2º hotel) | IaC con 1 servicio/1 entorno es ceremonia; valor real aparece al duplicar |
| **H1-16.6** `^` → exacto en deps | Sprint 2 | **Descartado** (cosmético) | `pnpm-lock.yaml` ya pinea las versiones efectivas |
| **H1-17 Cloudflare Access** | Sprint 2 | Sprint 2 (sin cambio) | Alto valor, sin código, mitiga el grueso de vectores externos |
| **H2-1 Refresh token rotation** | Sprint 2 (promovido) | **Descartado a esta escala** | Ver justificación abajo. Revisa §0.2 de Global-Plan.md |

**Por qué H2-1 (refresh token rotation) queda descartado a esta escala:**

1. Cookies `HttpOnly` ya impiden que XSS lea el refresh token (es el vector más común).
2. Cloudflare Access (H1-17) añade Google OAuth como capa previa antes de que la petición llegue al backend.
3. Rotar `SECRET_JWT_KEY` en Render funciona como "botón nuclear" de revocación: relogea a los ≤30 usuarios, coste manejable en un equipo interno que se entera por WhatsApp.
4. Coste de implementación (tabla + migración local + migración Aiven + cambios en login/refresh/logout/updatePassword + tests específicos + ventana de despliegue arriesgada) desproporcionado al riesgo residual.

**Reabrir H2-1 si:** crecimiento a 50+ usuarios reales, apertura a tráfico público, o entrada en compliance regulado (PCI, HIPAA, ePrivacy estricta).

**Alternativas más útiles a esta escala** (no entran en Sprint 2 — apuntadas para evaluación en Horizonte 2):
- **Audit log básico** — tabla `security_audit_log` con quién/cuándo/qué acción. Más útil que rotation para GDPR e investigación de incidentes a escala interna.
- **2FA opcional para admins** — TOTP en el usuario admin. Corta de raíz el blast radius del usuario con más privilegios.
- **Endpoint admin "listar/expulsar sesiones"** — cubre el caso "perdí el portátil" sin la complejidad de rotation completa. Implementable con la rotación de `SECRET_JWT_KEY` o introduciendo un campo `tokens_invalidated_after` en `users`.

Estas tres ideas se evaluarán cuando se conozca mejor el patrón de uso real, no antes.

---

## Sprint 2 — Próxima sesión (alcance revisado 2026-05-15)

### Orden de ataque

**Hacer (valor real, este sprint):**

1. **H1-13 Sentry** — bloqueado hasta el DSN de sentry.io. 10 min cuando llegue.
2. **H1-16.1** Pinear deps Python (`requirements.txt` + cambio del script `build`). 10 min. Detalle en §"H1-16 — Plan granular".
3. **H1-16.4** Crear `frontend/vercel.json` con security headers. 5 min. Receta en §"Ficheros listos para copiar B".
4. **H1-17 Cloudflare Zero Trust Access** — solo panel CF, sin código. 30 min. Guía paso a paso en §"Guía Cloudflare Zero Trust Access".

**Opcional (cheap, valor marginal):**

- **H1-16.2** `.python-version` con `3.11`. 1 min.
- **H1-16.3** `engines.node` o `.nvmrc` con `22.16.0`. 2 min.

**Diferido (no en este sprint):**

- **H1-16.5** `render.yaml` Blueprint → reabrir cuando se monte staging o 2º hotel.
- **H1-16.6** `^` → exacto en deps → no hacer, lockfile ya lo cubre.

**Descartado a esta escala:**

- **H2-1 Refresh token rotation** → ver §"Revisión 2026-05-15" arriba para razonamiento. Reabrir solo si la escala o el modelo de amenaza cambian.

### Precondición antes de Sprint 2

Verificar que el merge de Sprint 1 (PR #6) lleva ≥24h estable en producción.

---

## H1-16 — Plan granular (Infrastructure as Code)

Cada item es independiente y se puede mergear suelto. Orden de menor a mayor riesgo.
Marca `[x]` cuando esté hecho y referencia el commit/PR a la derecha.

### Estado del panel de Render (verificado 2026-05-15)

| Campo | Valor real |
|---|---|
| Plan | Free (0.1 CPU, 512 MB) |
| Región | Frankfurt (EU Central) |
| Root Directory | `backend` |
| Branch | `main` |
| Build Command | `pnpm install && pnpm build` |
| Start Command | `pnpm start` |
| Pre-Deploy Command | vacío |
| Auto-Deploy | On Commit |
| Health Check Path | vacío |
| PR Previews | Off |
| Build Filters | ninguno |
| Custom domain | `api.four-points.stackbp.es` (verified) |
| Render subdomain | habilitado (`four-points.onrender.com`) |
| Node version | 22.16.0 (default del buildpack — no anclado) |
| Python version | 3.11 (default del buildpack — visible en wheel `cp311`) |

### Checklist

- [ ] **H1-16.1 — Pinear deps Python (ortools, pydantic, transitivas)**
  Hoy `pip install ortools pydantic` no fija versión → cada deploy descarga lo último. Una release rota de pandas/numpy/ortools tumba el siguiente build sin aviso.
  **Acción:** crear `backend/scheduling-solver/requirements.txt` con las versiones del último deploy (`ortools==9.15.6755`, `pydantic==2.13.4`) + cambiar el script `build` en `backend/package.json` a `python3 -m venv scheduling-solver/venv && scheduling-solver/venv/bin/pip install --no-cache-dir -r scheduling-solver/requirements.txt`.
  **Verificar:** el siguiente deploy en Render logea exactamente las mismas versiones.
  → commit/PR: _pendiente_

- [x] **H1-16.2 — Anclar versión de Python** ✅ 2026-05-15
  Creado `backend/scheduling-solver/.python-version` con `3.11`.

- [x] **H1-16.3 — Anclar versión de Node** ✅ 2026-05-15
  Añadido `"engines": { "node": "22.16.0" }` en `backend/package.json` y `frontend/package.json`.
  **Verificar tras próximo deploy:** log de Render muestra `Using Node.js version 22.16.0`.

- [x] **H1-16.4 — Crear `frontend/vercel.json`** ✅ 2026-05-15
  Creado con security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS). Región `cdg1` (París).
  **Verificar tras próximo deploy:** `https://securityheaders.com` puntúa al menos A.

- ⏸️ **H1-16.5 — Crear `backend/render.yaml`** — **DIFERIDO 2026-05-15**
  El valor de IaC aparece con ≥2 entornos / ≥2 servicios / equipo de devs. Hoy: 1 servicio, 1 entorno, 1 dev → ceremonia, no protección. La receta ya actualizada con valores reales sigue disponible en §"Ficheros listos para copiar A" para cuando se reabra.
  **Reabrir cuando:** se monte un entorno de staging, un 2º hotel con su propio servicio, o entren más devs al proyecto.

- ❌ **H1-16.6 — Convertir `^` → versiones exactas en `dependencies`** — **DESCARTADO 2026-05-15**
  Hoy `pnpm-lock.yaml` ya pinea las versiones efectivas. El cambio es cosmético y no aporta estabilidad nueva. Si en el futuro se quiere política estricta, basta con una norma de PR ("no aceptamos `pnpm update` masivos sin review").

---

## Ficheros listos para copiar

### A) `backend/render.yaml`

```yaml
# Render Blueprint — captura el estado funcional actual.
# Para activar: dashboard Render → servicio → Settings → Connect Blueprint
# Los secretos (sync: false) se gestionan en el panel; el resto vive aquí.

services:
  - type: web
    name: four-points-api
    runtime: node
    region: frankfurt          # verificado en panel 2026-05-15
    plan: free                 # verificado en panel 2026-05-15
    rootDir: backend
    branch: main
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    autoDeploy: true           # panel: "On Commit"
    # healthCheckPath: omitido — el panel lo tiene vacío hoy. Si añades un endpoint
    # de health en el futuro, declárarlo aquí.

    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "4000"
      - key: DB_ENVIRONMENT
        value: aiven

      # Auth
      - key: SECRET_JWT_KEY
        sync: false
      - key: SALT_ROUNDS
        value: "10"

      # Aiven MySQL (valores en panel, no se commitean)
      - key: AIVEN_DB_HOST
        sync: false
      - key: AIVEN_DB_PORT
        value: "23225"
      - key: AIVEN_DB_USER
        value: avnadmin
      - key: AIVEN_PASSWORD
        sync: false
      - key: AIVEN_DB_NAME
        value: hotel_db

      # Cloudinary
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false

      # Frontend para CORS
      - key: FRONTEND_URL
        value: https://four-points.stackbp.es

      # Observabilidad (Pino)
      - key: LOG_LEVEL
        value: info

      # AI Schedule (si se sigue usando)
      - key: AI_ENABLED
        value: "true"
      - key: CLAUDE_API_KEY
        sync: false
      - key: CLAUDE_MODEL
        value: claude-sonnet-4-20250514
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_MODEL
        value: gemini-2.0-flash

      # Sentry (cuando H1-13 esté listo)
      # - key: SENTRY_DSN
      #   sync: false
```

**⚠ Antes de conectar el Blueprint en Render:**
- Los valores arriba ya están verificados contra el panel (2026-05-15). Si pasa tiempo, revolver a confirmar.
- Los env vars `sync: false` siguen en el panel; comparar **uno a uno** que estén todos antes de conectar — si falta alguno, el deploy arranca pero falla en runtime.
- Conectar Blueprint puede sobrescribir el panel con lo que diga el yaml. Hacer primero un `Manual Deploy` tras conectar para confirmar que sigue funcionando.

### B) `frontend/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

Vercel auto-detecta Next.js — no hace falta `buildCommand` ni `framework`. Región cdg1 (París) por latencia óptima desde España.

### C) `backend/scheduling-solver/.python-version`

```
3.11
```

Ancla la versión de Python que usa Render. Sin esto, si Render cambia el buildpack por defecto, las wheels precompiladas de `ortools` podrían dejar de encajar y el build romperá silenciosamente.

**Antes de crear:** verificar qué versión de Python usa Render actualmente. En el log de un deploy reciente, buscar líneas tipo `Python 3.x.x`. Usar esa versión exacta.

---

## Guía Cloudflare Zero Trust Access (H1-17)

**Objetivo:** capa de login (Google o email magic link) delante de `four-points.stackbp.es`. Sólo tú y tu equipo entráis. Free tier hasta 50 usuarios.

**⚠ Importante:** el backend (`api.four-points.stackbp.es`) **NO** lo metas detrás de CF Access. Si lo haces, el frontend no puede llamarlo (las peticiones fetch del browser no pasan la auth). Sólo el frontend va detrás de Access.

### Pasos (en este orden)

**1. Mover DNS del dominio a Cloudflare** (si no está ya)
- Crear cuenta en `cloudflare.com` (free tier).
- Añadir el dominio `stackbp.es` → CF te da 2 nameservers.
- En tu registrador (donde compraste el dominio) → cambiar nameservers a los de CF.
- Esperar propagación (5-30 min).

**2. Apuntar `four-points.stackbp.es` a Vercel vía CF**
- CF dashboard → DNS → Records.
- CNAME `four-points` → `cname.vercel-dns.com` (lo que Vercel pide).
- **Proxy status: orange cloud activado** (esto es clave — sin esto, no hay Access).

**3. Activar Zero Trust**
- CF dashboard → menú izquierdo → **Zero Trust**.
- Te pide crear un team name (ej: `bpstack`).
- Plan: **Free** (≤50 usuarios — suficiente).

**4. Configurar identity provider**
- Zero Trust → Settings → Authentication → Login methods.
- Añadir **Google** (más simple) o **One-time PIN** (email magic link).
- Para Google: te pide OAuth credentials de Google Cloud Console (~5 min).

**5. Crear Access Application**
- Zero Trust → Access → Applications → **Add an application**.
- Tipo: **Self-hosted**.
- Application name: `Four-Points PMS`.
- Session duration: 24 horas.
- Application domain: `four-points.stackbp.es`.
- **Identity providers**: marca el que configuraste.
- **Policies**:
  - Name: `Allowed users`.
  - Action: `Allow`.
  - Include: `Emails → tu email, tu equipo, etc.`.

**6. Verificar**
- Abre `https://four-points.stackbp.es` en una ventana de incógnito.
- Debe redirigir a la pantalla de CF Access → login Google → entra a la app.

---

## Python solver — estado actual

### Funciona porque

1. `backend/package.json` tiene un script `build`:
   ```
   "build": "python3 -m venv scheduling-solver/venv && scheduling-solver/venv/bin/pip install --no-cache-dir ortools pydantic"
   ```
2. El **Node buildpack de Render incluye `python3` por defecto** (lo necesita para node-gyp y bindings nativos como bcrypt/sharp).
3. En el panel de Render el build command es `pnpm install && pnpm run build` (o Render lo deduce automáticamente desde el script `build` de package.json).
4. El daemon Python se spawnea desde Node al arrancar (`solver-client.ts`) y `warmupSolver()` precalienta ortools.

### Riesgos residuales (cerrar en Sprint 2 o cuando toque)

| Riesgo | Severidad | Fix |
|---|---|---|
| Versión de Python no anclada. Si Render actualiza el buildpack y cambia la versión por defecto, las wheels de `ortools` podrían no encajar y el build romperá silenciosamente | 🟡 Medio | Crear `backend/scheduling-solver/.python-version` (contenido arriba en §"Ficheros listos para copiar") |
| Daemon Python puede crashear silenciosamente. Sólo lo notas cuando alguien intenta generar un horario y recibe 500. `warmupSolver()` corre al arrancar pero su fallo no bloquea el server | 🟡 Medio | Cuando H1-13 (Sentry) esté listo, capturar errores del daemon allí. Alternativa: endpoint `/health/solver` que prueba el daemon con un input mínimo |
| Cold start tras inactividad (Render free tier suspende tras 15 min sin tráfico). Primera petición tras el sleep: Node arranca (~3s) + daemon Python carga ortools (~10-15s) | 🟢 Bajo | Solución real: plan pagado de Render. Workaround: pinger externo cada 10 min |
| Build lento por reinstalación de ortools en cada deploy (~5-10 min en free/starter, ~350MB) | 🟢 Bajo | Habilitar **build cache** en Render (planes pagados) o aceptar el tiempo |

### Sin impacto (verificado)

- **Aiven**: el solver es stateless respecto a la BD. Node lee de Aiven, construye el input, manda al daemon Python, escribe el resultado a Aiven. Python no toca la BD directamente.

---

## H2-1 Refresh token rotation — ❌ DESCARTADO a esta escala (2026-05-15)

> **No implementar.** Esta sección se mantiene como referencia técnica por si la decisión se revierte (crecimiento a 50+ usuarios, apertura pública, o compliance regulado).
>
> **Razón del descarte:** sobreingeniería para PMS interno de 5-30 usuarios. Cookies HttpOnly + Cloudflare Access + rotación manual de `SECRET_JWT_KEY` cubren el modelo de amenaza real con coste de implementación cero. Razonamiento completo en §"Revisión 2026-05-15" arriba y en `Global-Plan.md §0.2`.
>
> **Alternativas más útiles a esta escala** (apuntadas para Horizonte 2): audit log básico, 2FA para admins, endpoint admin de listar/expulsar sesiones.

**Por qué importa (si se reabre):** hoy un refresh token comprometido (XSS, body leak, log leak) es válido 7 días sin posibilidad de invalidarlo manualmente. Cambio de password no invalida tokens emitidos previamente.

**Diseño aproximado:**

1. Nueva tabla en Aiven + local:
   ```sql
   CREATE TABLE refresh_tokens (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id CHAR(36) NOT NULL,
     token_hash VARCHAR(255) NOT NULL,
     issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     expires_at TIMESTAMP NOT NULL,
     revoked_at TIMESTAMP NULL,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     INDEX idx_user_id (user_id),
     INDEX idx_token_hash (token_hash)
   );
   ```
2. `generateRefreshToken()` también inserta el hash en la tabla.
3. `refreshToken` controller:
   - Valida JWT.
   - Verifica que el hash existe en BD y `revoked_at IS NULL`.
   - Marca el token actual como revocado (rotación).
   - Emite nuevo refresh token + lo inserta.
4. `logout` controller: marca el token actual como revocado.
5. `updatePassword`: revoca todos los tokens del usuario (`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?`).
6. Cron diario: limpia tokens expirados (`DELETE WHERE expires_at < NOW() - INTERVAL 30 DAY`).

**Riesgo del cambio:** si rompe algo, todas las sesiones activas se cierran y los usuarios deben volver a loguearse. Hacer en una ventana de tráfico bajo.

**Migración:**
- DDL local primero: `backend/db-mysql/scripts/YYYYMMDD_create_refresh_tokens.sql`.
- Después incluir en `aiven/02_core_tables.sql` o crear `aiven/22_refresh_tokens.sql` + actualizar `MASTER_INSTALL_AIVEN.sql`.

**Tests a añadir:**
- Login crea row en `refresh_tokens`.
- Refresh consume el token viejo (queda `revoked_at`) y crea uno nuevo.
- Refresh con token revocado → 403.
- Logout revoca el token.
- Cambio de password revoca todos los tokens del usuario.

---

## Plan de la nueva sesión (revisado 2026-05-15)

```
[verificar Sprint 1 estable ≥24h en prod]
   ↓
[rama feature/sprint-2-infra]
   · H1-16.1 — backend/scheduling-solver/requirements.txt + cambio script build
   · H1-16.4 — frontend/vercel.json security headers
   · (opcional) H1-16.2 — backend/scheduling-solver/.python-version
   · (opcional) H1-16.3 — engines.node en ambos package.json
   · PR → main, verificar que el siguiente deploy logea las mismas versiones
   ↓
[crear cuenta sentry.io] → traer DSN → cerrar H1-13 (10 min)
   ↓
[seguir guía Cloudflare paso a paso desde el panel]
   · H1-17 — Zero Trust Access delante de four-points.stackbp.es
   · sin código, sólo dashboard CF
   ↓
[meta Sprint 2 alcanzada → empezar a meter datos reales]
   ↓
[Horizonte 2 — re-evaluar con uso real]
   · ¿hace falta audit log? (probablemente sí por GDPR)
   · ¿hace falta 2FA admins?
   · ¿hace falta endpoint expulsar sesiones?
```

**Descartado del plan original:** rama `feature/refresh-token-rotation` (H2-1). Ver §"Revisión 2026-05-15" y `Global-Plan.md §0.2`.

## Plan para Timezone & Hotel Date Refactor

@merge-timesZone.md

---

## Checklist module — pendientes

> Módulo en producción (F1, F2, F3, F5 entregadas). Documentación completa en `docs/checklists/checklist.md`. Estas son las tareas residuales tras cerrar `CHECKLIST-ROADMAP.md`.

### Confirmadas hechas (sin marcar en su día)

- [x] Mobile TOC navigation — drawer/toggle responsive funcionando.
- [x] Migración Aiven aplicada — `db-mysql/aiven/20_checklist.sql` ejecutado en producción.

### Pendientes técnicos

- [ ] **Workaround cron-sleep Render free tier (auto-close lazy)** — el cron `30 6 * * *` Madrid en `services/cron/cron-service.ts:78-86` no dispara mientras el servicio está dormido (Render free tier suspende tras 15 min sin tráfico). Resultado: runs con `hotel_date` del día anterior quedan con `reset_at IS NULL` hasta el siguiente despertar. **Fix:** llamar `repo.closeStaleRuns()` al inicio de `getRunState()` en `services/checklist/checklist.service.ts`. Coste: 1 UPDATE indexado por apertura, noop tras la primera del día. Tracked como Fase 2 del refactor timezone — ver `merge-timesZone.md §3 Fase 2`. **Reabrir si:** se contrata plan pagado o se monta pinger externo (entonces el cron primario basta y el lazy es defensa en profundidad).

- [ ] **Historial en Reports** — añadir sección `checklist` a `ReportSection` en `frontend/app/components/profile/reports/types.ts:134` + crear `ChecklistSection.tsx`. Mostrará runs por checklist (fecha, turno, pasos completados, autor). **Requiere endpoint nuevo:** `GET /api/checklists/:id/history?limit=N` → últimos N runs con step_states. Datos disponibles en `checklist_runs` + `checklist_step_state` + `checklist_event_log`. Ubicación UI: `/dashboard/profile?panel=settings&tab=reports`. TODO con detalle ya en `reports/types.ts:136-140`.

- [ ] **Tests Vitest checklist** — crear `backend/tests/checklist/`. Cubrir como mínimo:
  - `toggleStep` idempotente (mismo body 2 veces → mismo estado, segundo no genera event_log).
  - Reset preserva `step_state` del run cerrado (histórico vivo).
  - `canResetChecklist` rechaza `mantenimiento` y `group-admin`.
  - Cron de reset cierra runs con `hotel_date < today` y no toca los del día actual.

- [ ] **Zod validación `stepId` contra el JSON** — hoy `toggleStepSchema` (`validations/checklist/checklist-schemas.ts:5`) solo valida `done: z.boolean()`. Debería rechazar `stepId` que no exista en el checklist JSON. Dos opciones:
  - (a) Cargar el JSON en el controller y validar `stepId ∈ steps[*].id` antes de tocar DB.
  - (b) Pasar `checklist_id` al endpoint y mantener un cache en memoria del catálogo.

- [ ] **Mejora Zod en comentarios** — `createCommentSchema` (`validations/checklist/checklist-schemas.ts:9`). Pendientes restantes:
  - [x] `.trim()` para rechazar entradas solo-espacios ✅ 2026-05-15
  - [ ] Decidir si bajar el max de 1000 a 500.
  - [ ] Contador en UI (`142/500`) + deshabilitar botón si vacío o excede límite en `StepDetailsPanel`.

- [ ] **Protección desmarcar trabajo ajeno** — modal de confirmación cuando un usuario destica un paso completado por otro (especialmente entre turnos). Hoy se puede desmarcar libremente. UX: pop-up "Este paso fue marcado por {nombre} a las {hora}. ¿Confirmas desmarcar?". Considerar restringirlo solo a admin/recepcionista en producción.

- [ ] **Retención audit log** — `checklist_event_log` crece sin límite. Estimación: ~3000 rows/año con 3 checklists diarios + comentarios. No urgente pero **documentar estrategia de purge** (ej: cron mensual que archive a `checklist_event_log_archive` rows > 1 año, o purge directo a > 2 años). Actualizar `docs/checklists/checklist.md` cuando se decida.

### Pendientes de contenido (tarea del manager, no dev)

- [ ] Rellenar `tasks/morning-shift.json` con pasos reales del turno de mañana.
- [ ] Rellenar `tasks/housekeeping-daily.json` con tareas reales de housekeeping.
- [ ] Completar stubs de procedimientos: `guides/fidelizacion-postcheckin.md`, `guides/balancing-opera.md`.
- [ ] Completar stubs de referencia: `references/shift-f3.md`, `references/reports-t122.md`.

### Futuro (no urgente, evaluar con uso real)

- Reactivar upload de imágenes en F3 cuando se decidan límites de Cloudinary y formatos (¿solo imágenes? ¿PDF? ¿tamaño máximo?).
- Si hay multi-hotel (`HotelCode`), reabrir F4 (editor admin UI).
- Reset por turno (morning 06:30, afternoon 14:00, night 23:00) si el flujo operativo lo pide. Schema: añadir `daily_reset_overrides` JSON a `checklist_config`.

---

## Cierre sesión 2026-05-16 ~00:21 Madrid — punto de partida para la próxima

> **Sesión:** 2026-05-15 ~21:00 → 2026-05-16 ~00:21 Madrid (continuación de la sesión `Analyze deployment configs and dependency versions` del 15-may que murió por cuota a mitad de Fase 4).
>
> Este bloque es el contexto rápido para la siguiente sesión. Resume qué se hizo, en qué estado está cada cosa, y propone el siguiente paso priorizado.

### Lo que se hizo en esta sesión (15-16 may 2026)

Continuación de la sesión anterior (`Analyze deployment configs and dependency versions`, 15-may), que murió por agotamiento de cuota a mitad de Fase 4 del refactor de timezone.

**Cerrado:**

1. **Fase 4 del refactor de timezone (frontend)** — cerrada con criterio distinto al inicial:
   - El plan original era unificar todo a `DD-MM-YY` (formato común). **Descartado**: los formatos legibles ya consolidados en producción (`21 dic 2025`, `28/10/2025`, `DD/MM/YYYY HH:mm`) son lo que el usuario quiere ver. La fuente de bugs era el TZ, no el formato.
   - **Lo que sí quedó aplicado:**
     - `parseInputDate` acepta ISO datetime (`...T...`) y datetime naive (`YYYY-MM-DD HH:mm:ss`), no solo `YYYY-MM-DD`. **Arregla "Invalid Date"** que se veía en backoffice (fechas de factura, ej. `ELEC-2025-002`) y en parking vehicle search modal.
     - Todos los helpers de `frontend/app/lib/helpers/date.ts` tienen `timeZone: 'Europe/Madrid'` explícito (`formatDateLocal`, `formatDateForInput`, `formatDateDisplayShort`, `formatMadridDate`, `formatMadridDateLong`, `formatMadridDateTime`, `formatMadridTime`, `formatDateRange`).
     - **Nuevo helper `formatTimestampSmart`** — devuelve `HH:mm` si la fecha es hoy en Madrid, `DD/MM/YYYY HH:mm` si no. Diseñado para streams donde la mayoría de items son recientes (comentarios, activity logs). Aplicado a `StepDetailsPanel.tsx` (comentarios de checklist).
     - 6 archivos `bo/tabs/*` (Suppliers/Pending/Paid + Lazy) + `parking/VehicleSearchModal.tsx`: migrados a thin wrapper que delega a `formatDateDisplayShort` (formato `DD mmm YYYY` original conservado).
     - `lib/blacklist/blacklistUtils.ts` + `lib/backoffice/export-utils.ts`: mantienen su implementación propia (no se centralizan en helpers globales) pero con `timeZone: 'Europe/Madrid'` añadido. Decisión consciente: la consolidación pierde valor frente al ruido de tocar 5 componentes consumidores cada uno.
     - `checklist/ChecklistHeader.tsx`: `timeZone: 'Europe/Madrid'` añadido al `toLocaleDateString` del print-date (formato original conservado).
     - `logbooks/LogbooksList.tsx`: `timeZone: 'Europe/Madrid'` añadido a desktop y mobile (formato original conservado: HH:mm en desktop, HH:mm + DD/MM/YYYY en mobile, porque un usuario puede escribir desde un día distinto y la fecha importa).
   - `pnpm exec tsc --noEmit` verde tras todos los cambios.

2. **Documentación actualizada:**
   - `merge-timesZone.md` §3 Fase 4 marcada ✅ 2026-05-16 con todos los detalles (incluida la decisión de no unificar a `DD-MM-YY`).
   - Tabla resumen de problemas en `merge-timesZone.md` §2: items 7 y 8 marcados ✅.
   - `TODO.md` añadido **Lote F** (commit timezone Fase 4) con 7 puntos de verificación pre-commit.

3. **Investigación timezone backend (importante para entender por qué local muestra raro):**
   - Confirmado que **producción funciona correctamente** (Render Node UTC + Aiven MySQL en UTC + browser Madrid del usuario → fechas se muestran bien).
   - El bug "muestro 21:32 cuando son 23:32 Madrid" que se vio en local es un **artefacto de mysql2 + Node Madrid leyendo una DB que tiene mezcla de writes UTC (Render) y writes Madrid (sesiones pasadas de `pnpm dev:aiven` desde Windows)**. mysql2 sin `timezone: 'Z'` interpreta los strings de la DB usando el TZ de Node local, lo que en Madrid local da -2h.
   - **Decisión tomada (16-may): Opción 1 = no tocar mysql2.** Producción ya funciona. Las "filas torcidas" son todas test data del usuario, no datos de usuarios reales (la app está en producción técnica pero sin usuarios todavía). Regla: validar visualización de fechas siempre contra producción, no contra `dev:aiven` local.
   - Script de inspección creado (`inspect-timestamps.mjs`) y borrado tras uso — confirmó que MySQL global/session/system TZ es UTC; mysql2 devuelve `Date` con ISO Z; la "interpretación torcida" pasa al SERIALIZAR para INSERT desde Node Madrid (escribiría wall clock Madrid como si fuera UTC). No se ejecutó ningún wipe ni cambio en DB.

### Estado del working tree (sin commitear todavía)

Cambios acumulados desde 14-may pendientes de commit, agrupados en lotes lógicos:

- **Lote A** — quickies código/config: `.python-version`, `vercel.json`, `engines.node` ×2, `.trim()` Zod.
- **Lote A.1** — trust proxy fix en `backend/index.ts`.
- **Lote B** — docs/planning: `TODO.md`, `Global-Plan.md`, `merge-timesZone.md` reescrito, `CHECKLIST-ROADMAP.md` borrado.
- **Lote C** — timezone Fase 1: crons + logbook fallback + getHotelDate consolidation + cashier helper.
- **Lote D** — timezone Fase 2: auto-close lazy en `checklist.service.ts::getRunState`.
- **Lote E** — timezone Fase 3: 14 sitios en 9 archivos (parking + backoffice + scheduling + cashier + group + conciliation + script standalone). Helper nuevo `getLastDayOfMonth`.
- **Lote F** — timezone Fase 4 (frontend): el grueso descrito arriba.

Smoke tests pre-commit detallados para C/D/E/F en sus secciones respectivas más arriba en este archivo.

---

### Pendientes priorizados por dificultad

#### 🟢 Quickies (5-15 min, low risk) — empezar por aquí

1. **H1-16.1 — Pinear deps Python** (10 min) — `backend/scheduling-solver/requirements.txt` con versiones exactas + cambiar el script `build` del backend para `pip install --no-cache-dir -r requirements.txt`. **Por qué importa:** hoy `pip install ortools pydantic` sin pin descarga la última versión cada deploy. Si OR-Tools rompe API, el solver deja de funcionar en producción sin que tú hayas tocado nada. Único riesgo silencioso con probabilidad no despreciable en el deploy actual. Detalle completo en §"H1-16 — Plan granular" arriba.
2. **Zod comentarios — max 500 + contador UI** (10 min) — `validations/checklist/checklist-schemas.ts:9` bajar el max de 1000 a 500 (no se necesitan comentarios largos en operativa de recepción). En `StepDetailsPanel.tsx` añadir contador `{body.length}/500` debajo del textarea y deshabilitar el botón "Enviar" si `body.trim() === '' || body.length > 500`. Completa la sección "Mejora Zod en comentarios" que está medio hecha (el `.trim()` ya se aplicó el 15-may).
3. **Smoke tests Lotes D, E, F en local** (30 min total — esto es **tarea tuya, no de Claude**) — pasos detallados ya escritos en `§Verificación pre-commit Lote D/E/F` más arriba en este archivo. Requiere `pnpm dev:local` (no `dev:aiven`, porque mysql2 + Node Madrid contamina las pruebas de timezone). Tras los smoke tests, se pueden lanzar los commits.

#### 🟡 Medios (30-60 min)

4. **H1-17 Cloudflare Zero Trust Access** (30 min — **tarea tuya, panel-only**) — configurar Google OAuth delante de `api.four-points.stackbp.es`. Restringe el acceso al backend a emails autorizados, antes de que la request llegue a Express. Mitiga el grueso de vectores externos sin tocar código. Guía completa paso a paso en §"Guía Cloudflare Zero Trust Access (H1-17)" arriba.
5. **Tests Vitest checklist** (~1h) — crear `backend/tests/checklist/` con casos básicos. Cobertura mínima propuesta:
   - `getRunState` crea un run nuevo si no existe para `hotel_date` Madrid de hoy.
   - `getRunState` devuelve run existente si ya hay uno para hoy (idempotencia).
   - `getRunState` cierra runs viejos (`hotel_date < today`) en la primera llamada del día (Fase 2 auto-close lazy).
   - `toggleStep(stepId, done=true)` inserta row en `checklist_step_state` con `done_by_user_id` y `done_at`.
   - `toggleStep` registra event_log con `kind='step_done'` o `step_undone`.
   - `closeStaleRuns` con DB vacía es noop (no falla, `affectedRows=0`).
   - `closeStaleRuns` con un run viejo en `checklist_runs` lo marca con `reset_at=NOW()`, `reset_reason='cron'`, `reset_by_user_id='system-cron'`.
   - Comentarios: `.trim()` rechaza solo-espacios (regresión del fix 2026-05-15).
6. **Zod validación `stepId`** (45 min) — `toggleStepSchema` (`validations/checklist/checklist-schemas.ts:5`) hoy solo valida `done: z.boolean()`. Debería rechazar `stepId` que no exista en el JSON de pasos del checklist. Dos opciones:
   - **a)** Mantener Zod simple (solo body) y delegar la validación de `stepId` a una función dedicada en el controller que cargue el JSON del checklist y compruebe la existencia. Más rápido de implementar.
   - **b)** Refinar Zod para que reciba la lista de stepIds válidos como contexto. Más correcto pero requiere refactor de cómo se construye el schema. Evaluar coste/beneficio.
   - Recomendación: opción **a** porque mantiene Zod desacoplado del filesystem.
7. **Protección desmarcar trabajo ajeno** (45 min) — modal de confirmación cuando un usuario destica un step `done` que marcó OTRO usuario (especialmente útil entre turnos para evitar pisar el trabajo del compañero). UX: pop-up "Este paso fue marcado por {done_by_username} a las {done_at HH:mm}. ¿Confirmas desmarcar?" con botones "Cancelar" / "Sí, desmarcar". El check `done_by_user_id !== currentUser.id` está disponible en `state` que ya llega al componente. Lugar: `ChecklistTasksContent.tsx` o `StepDetailsPanel.tsx` según el flujo exacto.

#### 🟠 Grandes (>1h)

8. **Historial en Reports** (~2-3h) — añadir sección `checklist` a `ReportSection` en `frontend/app/components/profile/reports/types.ts:134` + crear `ChecklistSection.tsx`. Mostrará runs por checklist (fecha, turno, pasos completados, autor). **Requiere endpoint nuevo**: `GET /api/checklists/:id/history?limit=N` → últimos N runs con `step_states` agregados. Datos disponibles en `checklist_runs` + `checklist_step_state` + `checklist_event_log`. UI ubicación: `/dashboard/profile?panel=settings&tab=reports`. TODO con detalle del endpoint y schema ya en `reports/types.ts:136-140`.
9. **Retención audit log `checklist_event_log`** (1-2h, no urgente) — la tabla crece sin límite. Estimación: ~3000 rows/año con 3 checklists diarios + comentarios. Documentar estrategia de purge antes de implementar:
   - Opción A: cron mensual que archive a `checklist_event_log_archive` rows > 1 año.
   - Opción B: purge directo de rows > 2 años (más simple, asume que el histórico viejo no se consulta).
   - Cuando se decida, actualizar `docs/checklists/checklist.md` con la decisión y mecanismo.

#### 🔴 Bloqueado por dependencia externa

10. **H1-13 Sentry** (10 min cuando llegue el DSN) — alta en sentry.io del usuario. Una vez tengas el DSN, integrar con `@sentry/node` en `backend/index.ts` (envoltorio del error handler global) y `@sentry/nextjs` en frontend. Sentry da error tracking + breadcrumbs gratis hasta 5k errores/mes — más que suficiente para esta escala.

#### ⚪ Stale en working tree — decisión necesaria

11. **Commits Lotes A, A.1, B, C, D, E, F** — todos en working tree sin pushear. Cuando decidas lanzar, los mensajes sugeridos están en `§"Commits pendientes en working tree"` arriba en este archivo. Probablemente conviene hacerlos en este orden:
    - Primero Lote B (docs) — bajo riesgo, deja la historia limpia.
    - Luego Lotes A + A.1 (config + trust proxy) — bajo riesgo, mejoras puntuales.
    - Luego Lote C (Fase 1 timezone) — tras smoke test.
    - Luego Lote D (Fase 2 auto-close) — tras smoke test.
    - Luego Lote E (Fase 3 fallbacks) — tras smoke test.
    - Finalmente Lote F (Fase 4 frontend) — tras smoke test.
12. **`docs/` gitignored** — decidir destino de `docs/checklists/checklist.md`. Tres opciones documentadas más arriba en `§Repo housekeeping`.
13. **Notas personales sin tracker** — `migration-nextjs-to-vite.md` y `react-query-doubts.md` en raíz. Decidir si mover a `docs/scratch/` (cuando se decida lo de docs/), commitear como están, o borrar tras consolidar lo aprendido en otros docs.

---

### Recomendación de orden de ataque para la próxima sesión

**Primera media hora — quickies para sumar wins rápidos:**
1. #1 (Pin Python deps, 10 min) — cierra el último riesgo silencioso de deploy.
2. #2 (Zod max + contador comentarios, 10 min) — completa la sección "Zod comentarios" ya empezada.
3. Decidir #12 (destino de `docs/`).

**Si queda tiempo / sesión más larga:**
4. #3 (smoke tests Lotes D/E/F locales) — tarea tuya, ~30 min — porque desbloquea poder commitear todo el refactor de timezone.
5. #4 (Cloudflare Access) — tarea tuya, ~30 min — cierra Sprint 2 prácticamente entero.
6. #5 (Tests Vitest checklist) — primer round de cobertura del módulo más maduro.

**Sesión dedicada a un solo tema:**
7. #8 (Historial en Reports) — necesita ~2-3h sin interrupciones.

**Esperando externo:**
8. #10 (Sentry) — cuando llegue DSN.

---

### Detectado en revisión final 2026-05-16 (no bloqueante, anotado para no perderlo)

- **Log cosmético `cron-service.ts:89`** — el log de arranque dice `"Notificaciones: Todos los días a las 7:00 AM"` sin mencionar `(Europe/Madrid)`, mientras el log del checklist reset (línea 91) sí lo dice. Los 3 crons tienen timezone Madrid configurado correctamente; solo es inconsistencia visual en logs. Fix de 2 líneas si se quiere unificar el formato.

- **Errores prettier pre-existentes** en `ChecklistTasksContent.tsx:68` y `StepDetailsPanel.tsx:91`. Detectados durante revisión final pero NO introducidos en esta sesión (mis cambios fueron en líneas 85 y 67 respectivamente). Auto-fixables con `cd frontend && pnpm lint --fix`. Hay 15 errores totales similares en otros archivos del repo — el `--fix` los reformatea todos. Decisión pendiente: ¿hacer el `--fix` global como commit cosmético separado, o dejarlo para cuando alguien toque cada archivo? Recomendación: `--fix` global es 1 min y deja la base limpia.

- **Vitest backend: 142 tests pasando** — confirmado en revisión final. Buen punto de partida para añadir los tests de checklist (#5 en pendientes).