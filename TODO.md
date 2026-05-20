# TODO — Four-Points PMS

> **Lista accionable para la próxima sesión.** Curada. Decisiones de scheduling en `SCHEDULING-DECISIONS-LOG.md` y `SCHEDULING-CONSTRAINTS.md`. Arquitectura del solver en `docs/backend/scheduling/`.

---

## Estado breve (2026-05-16)

- **Sprint 2** 🚧 al 80% — 5 items cerrados (H1-16.1/2/3/4 + H1-18 trust proxy + H1-19 refactor timezone). Quedan **H1-13 Sentry** (bloqueado externo) y **H1-17 Cloudflare Access** (panel).
- Refactor timezone Madrid/UTC completo en backend + frontend (7 commits).
- Housekeeping cerrado: Prettier global, Zod comentarios 500 + contador UI, `docs/` ahora versionada en repo, protección desmarcar trabajo ajeno (modal confirmación) (commits `d75c940`, `41c4df8`, `3157d01`, este push).

---

## Sprint 2 — cerrar (2 items)

### H1-13 Sentry ⏸️ bloqueado por DSN externo (10 min cuando llegue)

Cuando tengas DSN:

1. `cd backend && pnpm add @sentry/node` + `cd frontend && pnpm add @sentry/nextjs`.
2. `Sentry.init({ dsn: process.env.SENTRY_DSN })` al inicio de `backend/index.ts`.
3. Envoltorio del error handler global para capturar errores no manejados.
4. Sentry free tier: 5k errores/mes — suficiente para esta escala.

Una vez activo, registrar el hallazgo en `SCHEDULING-DECISIONS-LOG.md`.

### H1-17 Cloudflare Zero Trust Access ⏳ (tarea panel, ~30 min)

**Objetivo:** Google OAuth delante de `four-points.stackbp.es`. Solo el equipo entra. Free tier hasta 50 usuarios.

⚠ **No metas `api.four-points.stackbp.es` detrás de Access** — el frontend no podría llamarlo (fetch del browser no pasa la auth). Solo el frontend va detrás.

**Pasos:**

1. **DNS a Cloudflare** (si no está): crear cuenta CF free → añadir `stackbp.es` → cambiar nameservers en tu registrador → esperar propagación (5-30 min).
2. **CNAME del frontend vía CF**: DNS → Records → CNAME `four-points` → `cname.vercel-dns.com`. **Proxy status: orange cloud activado** (clave).
3. **Activar Zero Trust**: menú izquierdo → Zero Trust → team name (ej: `bpstack`) → plan Free.
4. **Identity provider**: Zero Trust → Settings → Authentication → Login methods → añadir Google (necesita OAuth credentials de Google Cloud Console, ~5 min) o One-time PIN.
5. **Access Application**: Zero Trust → Access → Applications → Add → tipo Self-hosted → name `Four-Points PMS` → session 24h → domain `four-points.stackbp.es` → marcar identity provider → Policy `Allowed users` → Action Allow → Include `Emails → tu equipo`.
6. **Verificar**: abre `https://four-points.stackbp.es` en incógnito → redirige a CF Access → login Google → entra a la app.

---


## Módulo Scheduling Solver — pendientes

> Fase 1 ✅ + Fase 2 ✅ (en código). Fase 3 🟡 en progreso. Decisiones en `SCHEDULING-DECISIONS-LOG.md`.

- [ ] **Fase 3 criterio abierto: `scheduling_solver_runs` ≥ 30 runs de producción** (bloqueado por uso real). El logging estructurado está implementado (commit `f34e20d`), solo falta acumular datos. Cuando llegues a 30 runs, hacer query agregada para detectar patrones (status, soft penalty, breakdown) y registrar findings en `SCHEDULING-DECISIONS-LOG.md`.

- [ ] **Fase 3 criterio abierto: UX de infeasibilidad probada con ≥ 3 escenarios reales** — motor `_analyze_infeasibility` ya implementado (commit `f34e20d`), pero solo testeado con corpus sintético. Hacer 3 generaciones con configs imposibles a propósito (ej: 2 empleados rotatorios + cobertura mínima 3) → comprobar que las relajaciones sugeridas son aplicables y arreglan el infeasibility.

- [ ] **Fase 2 punto 4 diferido — tuning de pesos soft S1/S2/S3/S4** (bloqueado por uso productivo). Cuando el manager valide 3 meses consecutivos en producción, analizar el `softPenaltyBreakdown` real y los diffs entre matriz solver-generada y matriz final editada por el manager (en `scheduling_solver_runs`). Cada patrón recurrente = señal para subir/bajar un peso.

---

## Horizonte 2 — post-datos reales

> Solo apuntados; **no iniciar nada de esto hasta que entren datos reales y se conozca el patrón de uso real.**

| ID | Item | Por qué importa |
|---|---|---|
| H2-11 | Audit log básico (`security_audit_log`) | GDPR + investigación incidentes. Alternativa práctica al descartado H2-1 |
| H2-12 | 2FA opcional para admins (TOTP `otplib`) | Corta blast radius del usuario con más privilegios |
| H2-13 | Endpoint admin "listar/expulsar sesiones" | Caso "perdí el portátil" sin la complejidad de H2-1 |
| H2-2 | Columnas `last_login`, `failed_login_count`, `locked_until` en `users` | Base para H2-3 |
| H2-3 | Lockout por usuario tras N intentos fallidos | UX + tabla de unlock |
| H2-7 | Logging estructurado eventos auth | Coordina con H2-11 |
| H2-9 | Mensajes error genéricos en prod (no leak enumerate users) | Quickie defensivo |
| H2-5 | Auditar cobertura Zod en todos los endpoints | Una vez, sistemático |
| H2-6 | GitHub Actions CI (lint + typecheck + test pre-merge) | Acelera dev cuando haya más manos |
| H2-4 | CSRF token explícito para mutaciones | Más relevante si crece la superficie pública |

---

## Scheduling solver — deuda técnica detectada al importar histórico

### H5: alinear semántica Python ↔ TS validator ↔ spec (~30-60 min)

**Spec documentado** (`SCHEDULING-CONSTRAINTS.md §H5`): "≥2 días **consecutivos** de descanso en ventana 7 días" (necesita par `L,L`).

**TS validator** (`services/scheduling/constraints/consecutive-rest.constraint.ts`): correcto — exige par consecutivo.

**Python solver** (`scheduling-solver/constraints/rest.py`): drift histórico — implementa `sum(rest) ≥ 2`, no exige consecutivos. Más laxo.

Resultado actual: el solver puede generar schedules que el validator marca como inválidos (par no encontrado pero suma ≥2). El parity test no lo cazó porque los fixtures actuales casualmente no exhiben el caso degenerado (`L M M M M L M` = 2 rest no consecutivos en 7 días).

**Acción:** reescribir `rest.py` H5 con boolean indicator `is_consecutive_rest_pair_in_window[w]` reificado sobre pares de días adyacentes (`L_d ∧ L_{d+1}`), exigir suma ≥ 1 por ventana. Verificar parity post-cambio.

### H4 vs H5: contradicción de bound efectivo (~1-2h de discusión + cambio)

H4 dice `maxConsecutiveWorkDays = 6`. H5 (ventana 7 días, ≥2 rest **consecutivos**) implica efectivamente `max consecutive work = 5` (un par WWWWWWL en 7 días → solo 1 rest, viola H5).

H4 está muerto: H5 siempre le gana.

**Decisión pendiente:**

- **Opción A**: aceptar el bound real (5 consecutivos) y bajar H4 a 5. Honesto, evita confusión.
- **Opción B**: cambiar H5 a ventana 8 días (`≥2 rest en 8 días`). Permitiría patrón hostelero "6 trabajo + 2 descanso", muy común. Cambio más invasivo: afecta `rest.py`, validator TS, fixtures que asumen 7, documentación.

Si se elige B, evaluar también si esto resolvería retroactivamente el caso Andrés (6 M al cierre de mayo) sin necesitar la excepción cross-month que añadimos el 2026-05-20.

### Cross-month "doomed windows" — fix aplicado, monitorizar

Aplicado el 2026-05-20 en `rest.py` (ver `SCHEDULING-DECISIONS-LOG.md`). Funciona para el caso Andrés real y para F31/F52. Pero:

- Mismo patrón puede aparecer en otros constraints con ventana deslizante cross-month (`night_block.py` ventana max-block, `day_blocks.py`). Auditarlos por completitud cuando aparezca un INFEASIBLE similar.
- Si más adelante se rehace H5 a "consecutive pair" (item anterior), revisar si la lógica de skip cross-month sigue siendo correcta o necesita ajuste.

---

## Untracked intencional (no tocar)

`migration-nextjs-to-vite.md` y `react-query-doubts.md` en raíz son notas personales del usuario sobre análisis futuro de arquitectura/rendimiento (potencial migración Next→Vite, refactor React Query). Untracked a propósito mientras evolucionan. **No commitearlas, no borrarlas, no proponer moverlas.**
