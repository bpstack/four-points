# TODO-old — pendientes del TODO antiguo

> **Qué responde:** qué quedaba pendiente en el `TODO.md` antiguo de la raíz
> (hoy `docs/_archive/TODO.md`, estado del 2026-05-16) y no pasó al `TODO.md`
> nuevo. · **Quién lo lee:** quien haga la pasada de rescate del archivo
> (`ROADMAP.md`). · **Cómo se poda:** cada punto se **mueve** a `TODO.md` o a la
> documentación, o se **borra** si ya está hecho o se descarta. Cuando quede
> vacío, se borra el fichero.

Fichero de trabajo: en español y no se publica (ADR-020, ADR-022).

Traído tal cual el 2026-09-28. Las referencias a documentos archivados apuntan
ya a `docs/_archive/`. ✅ marca lo que el código indica que ya está hecho
(comprobado el 2026-09-28, sin probarlo en ejecución); sin marca, no se ha
comprobado.

---

## Sprint 2 — cerrar (2 items)

### H1-13 Sentry ⏸️ bloqueado por DSN externo (10 min cuando llegue)

_Comprobado el 2026-09-28: ni `backend/package.json` ni `frontend/package.json`
tienen Sentry; sigue pendiente._

Cuando tengas DSN:

1. `cd backend && pnpm add @sentry/node` +
   `cd frontend && pnpm add @sentry/nextjs`.
2. `Sentry.init({ dsn: process.env.SENTRY_DSN })` al inicio de
   `backend/index.ts`.
3. Envoltorio del error handler global para capturar errores no manejados.
4. Sentry free tier: 5k errores/mes — suficiente para esta escala.

Una vez activo, cerrar el §3.5 hallazgo de observabilidad de
`docs/_archive/Global-Plan.md`.

### H1-17 Cloudflare Zero Trust Access ⏳ (tarea panel, ~30 min)

**Objetivo:** Google OAuth delante de `four-points.stackbp.es`. Solo el equipo
entra. Free tier hasta 50 usuarios.

⚠ **No metas `api.four-points.stackbp.es` detrás de Access** — el frontend no
podría llamarlo (fetch del browser no pasa la auth). Solo el frontend va detrás.

**Pasos:**

1. **DNS a Cloudflare** (si no está): crear cuenta CF free → añadir `stackbp.es`
   → cambiar nameservers en tu registrador → esperar propagación (5-30 min).
2. **CNAME del frontend vía CF**: DNS → Records → CNAME `four-points` →
   `cname.vercel-dns.com`. **Proxy status: orange cloud activado** (clave).
3. **Activar Zero Trust**: menú izquierdo → Zero Trust → team name (ej:
   `bpstack`) → plan Free.
4. **Identity provider**: Zero Trust → Settings → Authentication → Login methods
   → añadir Google (necesita OAuth credentials de Google Cloud Console, ~5 min)
   o One-time PIN.
5. **Access Application**: Zero Trust → Access → Applications → Add → tipo
   Self-hosted → name `Four-Points PMS` → session 24h → domain
   `four-points.stackbp.es` → marcar identity provider → Policy `Allowed users`
   → Action Allow → Include `Emails → tu equipo`.
6. **Verificar**: abre `https://four-points.stackbp.es` en incógnito → redirige
   a CF Access → login Google → entra a la app.

---

## Módulo Checklist — pendientes técnicos

> Módulo en producción (F1, F2, F3, F5 entregadas). Documentación antigua en
> `docs/_archive/docs/checklists/checklist.md`.

- [ ] **Tests Vitest checklist** (~1h) — crear `backend/tests/checklist/`.
      _Comprobado el 2026-09-28: existe
      `backend/tests/checklist/checklist.test.ts`; falta ver qué casos de la
      lista cubre._ Cobertura mínima:
  - `getRunState` crea run nuevo si no existe para `hotel_date` Madrid de hoy.
  - `getRunState` devuelve run existente (idempotencia).
  - `getRunState` cierra runs viejos (`hotel_date < today`) en la primera
    llamada del día (auto-close lazy, ya en prod desde commit `b1d2a20`).
  - `toggleStep(stepId, done=true)` inserta row en `checklist_step_state` con
    `done_by_user_id` y `done_at`.
  - `toggleStep` registra event_log con `kind='step_done'`/`'step_undone'`.
  - `closeStaleRuns` con DB vacía es noop (`affectedRows=0`).
  - `closeStaleRuns` con run viejo marca `reset_at=NOW()`,
    `reset_reason='cron'`, `reset_by_user_id='system-cron'`.
  - Comentarios: `.trim()` rechaza solo-espacios (regresión del fix 2026-05-15).

- [ ] ✅ **Historial en Reports** (2-3h) — _Comprobado el 2026-09-28: existen
      `GET /api/checklists/:id/history`
      (`backend/routes/checklist/checklist-routes.ts`) y
      `frontend/app/components/profile/reports/sections/ChecklistSection.tsx`._
      Texto original: añadir sección `checklist` a `ReportSection` en
      `frontend/app/components/profile/reports/types.ts` + crear
      `ChecklistSection.tsx`. Mostrará runs por checklist (fecha, turno, pasos
      completados, autor). **Requiere endpoint nuevo:**
      `GET /api/checklists/:id/history?limit=N`. Datos en `checklist_runs` +
      `checklist_step_state` + `checklist_event_log`. UI:
      `/dashboard/profile?panel=settings&tab=reports`.

- [ ] **Zod validación `stepId` contra el JSON** (45 min) — `toggleStepSchema`
      (`validations/checklist/checklist-schemas.ts`) solo valida
      `done: z.boolean()`. Debería rechazar `stepId` que no existe en el
      checklist JSON. Recomendado: opción (a) — función dedicada en el
      controller que cargue el JSON y compruebe existencia. Mantiene Zod
      desacoplado del filesystem. _Comprobado el 2026-09-28: el esquema sigue
      validando solo `done`._

- [ ] ✅ **Retención `checklist_event_log`** (decisión + 1-2h implementación, no
      urgente) — _Comprobado el 2026-09-28: `checklist-repository.ts` borra
      filas por antigüedad (`DELETE FROM checklist_event_log WHERE at < …`)._
      Texto original: tabla crece sin límite (~3000 rows/año con 3 checklists
      diarios). Documentar estrategia antes:
  - Opción A: cron mensual archive a `checklist_event_log_archive` rows > 1 año.
  - Opción B: purge directo > 2 años (más simple).
  - Actualizar la doc del módulo cuando se decida.

### Pendientes de contenido (manager, no dev)

_Comprobado el 2026-09-28: en `backend/content/checklist/tasks/` hay
`afternoon-shift.json`, `morning-shift.json` y `night-audit.json`; no existen
`housekeeping-daily.json` ni las carpetas `guides/` y `references/`. Falta ver
si `morning-shift.json` ya tiene los pasos reales._

- [ ] `tasks/morning-shift.json` — pasos reales turno de mañana.
- [ ] `tasks/housekeeping-daily.json` — tareas reales housekeeping.
- [ ] Procedimientos: `guides/fidelizacion-postcheckin.md`,
      `guides/balancing-opera.md`.
- [ ] Referencias: `references/shift-f3.md`, `references/reports-t122.md`.

### Futuro (evaluar con uso real)

- Reactivar upload de imágenes en F3 cuando se decidan límites Cloudinary y
  formatos.
- Si hay multi-hotel (`HotelCode`), reabrir F4 (editor admin UI).
- Reset por turno (06:30/14:00/23:00) si el flujo operativo lo pide. Schema:
  `daily_reset_overrides` JSON en `checklist_config`.

---

## Módulo Scheduling Solver — pendientes

> Plan técnico completo en `docs/_archive/SCHEDULING-SOLVER-PLAN.md`. Fase 1 ✅
>
> - Fase 2 ✅ (en código). Fase 3 🟡 en progreso.

- [ ] **Fase 3 criterio abierto: `scheduling_solver_runs` ≥ 30 runs de
      producción** (bloqueado por uso real). El logging estructurado está
      implementado (commit `f34e20d`), solo falta acumular datos. Cuando llegues
      a 30 runs, hacer query agregada para detectar patrones (status, soft
      penalty, breakdown) y registrar findings en
      `docs/scheduling/decisions.md`.

- [ ] **Fase 3 criterio abierto: UX de infeasibilidad probada con ≥ 3 escenarios
      reales** — motor `_analyze_infeasibility` ya implementado (commit
      `f34e20d`), pero solo testeado con corpus sintético. Hacer 3 generaciones
      con configs imposibles a propósito (ej: 2 empleados rotatorios + cobertura
      mínima 3) → comprobar que las relajaciones sugeridas son aplicables y
      arreglan el infeasibility.

- [ ] **Fase 2 punto 4 diferido — tuning de pesos soft S1/S2/S3/S4** (bloqueado
      por uso productivo). Cuando el manager valide 3 meses consecutivos en
      producción, analizar el `softPenaltyBreakdown` real y los diffs entre
      matriz solver-generada y matriz final editada por el manager (en
      `scheduling_solver_runs`). Cada patrón recurrente = señal para subir/bajar
      un peso. Detalle del método en
      `docs/_archive/SCHEDULING-SOLVER-PLAN.md §4 Después de Fase 3 - Bucle de feedback`.

---

## Horizonte 2 — post-datos reales

> Solo apuntados; detalle y razonamiento en
> `docs/_archive/Global-Plan.md §6 Roadmap por horizontes`. **No iniciar nada de
> esto hasta que entren datos reales y se conozca el patrón de uso real.**

| ID    | Item                                                                   | Por qué importa                                                          |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| H2-11 | Audit log básico (`security_audit_log`)                                | GDPR + investigación incidentes. Alternativa práctica al descartado H2-1 |
| H2-12 | 2FA opcional para admins (TOTP `otplib`)                               | Corta blast radius del usuario con más privilegios                       |
| H2-13 | Endpoint admin "listar/expulsar sesiones"                              | Caso "perdí el portátil" sin la complejidad de H2-1                      |
| H2-2  | Columnas `last_login`, `failed_login_count`, `locked_until` en `users` | Base para H2-3                                                           |
| H2-3  | Lockout por usuario tras N intentos fallidos                           | UX + tabla de unlock                                                     |
| H2-7  | Logging estructurado eventos auth                                      | Coordina con H2-11                                                       |
| H2-9  | Mensajes error genéricos en prod (no leak enumerate users)             | Quickie defensivo                                                        |
| H2-5  | Auditar cobertura Zod en todos los endpoints                           | Una vez, sistemático                                                     |
| H2-6  | GitHub Actions CI (lint + typecheck + test pre-merge)                  | Acelera dev cuando haya más manos                                        |
| H2-4  | CSRF token explícito para mutaciones                                   | Más relevante si crece la superficie pública                             |

Solapan con el `TODO.md` nuevo: H2-6 («CI mínimo»), H2-4 («CSRF solo depende de
`SameSite=Lax`»), H2-5 (las entradas «sin Zod» por módulo) y H2-3 («El límite de
intentos de login se esquiva»).

---

## Mantenimiento local — PC principal (`dz`)

- [ ] **Revisar si se pueden borrar las copias de seguridad de la limpieza de
      permisos** (creadas el 2026-09-28). Tras varias sesiones de `claude` sin
      avisos al arrancar, borrar ambas:
  - `C:\Users\dz\.claude\settings.json.bak` — copia previa a quitar el hook
    `SessionStart` roto (apuntaba a `harness/scripts/probe-node.mjs`, borrado
    del harness el 2026-09-16).
  - `C:\Users\dz\projects\Four-Points\.claude\settings.local.json.bak` — copia
    previa a reducir las reglas `permissions.allow` de 32 a 3 (rotas, duplicadas
    y las que permitían leer `.env` sin preguntar).
  - Criterio: no aparece `SessionStart:startup hook error` ni el aviso de regla
    con comodín. Ninguno de los dos ficheros está versionado (el primero está
    fuera del repo, el segundo lo ignora `.gitignore`).
