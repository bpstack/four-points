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

## Bug: setSchedulableEmployees borra start_date/end_date

**Descripción:** El endpoint `PUT /api/scheduling/employees` hace un `DELETE FROM scheduling_employees` total seguido de un `INSERT (employee_id, added_by)`. Cualquier `start_date`/`end_date` configurado previamente (ej: Clara, Cristina, Víctor) se pierde silenciosamente si un admin guarda la lista desde `EmployeesTab`.

**Reproducción:** Ir a `/config` → pestaña Empleados → desmarcar y volver a marcar cualquier empleado con fechas → guardar → las fechas desaparecen.

**Fix propuesto:** Cambiar el replace-all por un diff selectivo: solo `DELETE` las filas de empleados que se eliminaron de la lista, solo `INSERT` los nuevos que se añaden. Los que permanecen no se tocan → `start_date`/`end_date` se preservan.

**Archivos afectados:** `backend/repositories/scheduling/scheduling-repository.ts` (`setSchedulableEmployees`).

---

## Reestructurar CLAUDE.md en capas por módulo

> **Objetivo:** dividir el `CLAUDE.md` raíz (≈400 líneas monolíticas) en archivos por módulo para que Claude Code cargue solo el contexto relevante al directorio desde donde se abre la sesión. Esto reduce ruido, libera contexto, y hace que el agente trabaje con la documentación específica del módulo en mano sin tener que filtrarla mentalmente del resto.

### Cómo funciona la carga (referencia)

Cuando se abre Claude desde un directorio, carga **todos los `CLAUDE.md` desde ese directorio hacia la raíz** en el arranque. Los subdirectorios hermanos **no** se cargan. Ejemplo: abrir desde `backend/services/logbook/` carga `logbook/CLAUDE.md` + `backend/CLAUDE.md` + raíz, pero **no** carga `frontend/CLAUDE.md` ni `backend/scheduling-solver/CLAUDE.md`.

Consecuencia operativa: **abrir Claude siempre desde el directorio más específico de la tarea**, no desde la raíz, salvo trabajo cross-módulo real.

### Principio rector

- Crear `CLAUDE.md` solo donde aporte valor real. No por completitud, no "uno por carpeta".
- Cada archivo debe ser **autocontenido para tareas en su módulo** — no obligar a Claude a leer el raíz para entender la pieza local.
- El raíz queda con lo verdaderamente global: stack, auth, convenciones de commit, comandos de dev, política de DB. Todo lo específico de un módulo sale fuera.
- La granularidad la decide la complejidad del módulo, no su tamaño en archivos. Logbook puede vivir con un solo `CLAUDE.md`; scheduling probablemente necesita varios (solver, backend, frontend).

### Fase 1 — Inventario de módulos (sin tocar archivos)

Mapear cada módulo del proyecto identificando:

1. Su ubicación en backend y frontend.
2. Su complejidad real (líneas, número de componentes/servicios, decisiones de diseño documentadas).
3. Si tiene gotchas / convenciones / patrones que merezcan documentación dedicada.
4. Qué fragmento del `CLAUDE.md` raíz actual le corresponde.

Módulos identificados a priori (a refinar en el inventario):

- [x] **Scheduling** — ✅ cerrado 2026-05-23 (commit `04959a4`). 3 archivos: solver Python + backend TS + frontend.
- [x] **Logbook** — ✅ cerrado 2026-05-23. 1 archivo en `backend/services/logbook/`.
- [ ] **Parking**
- [ ] **Maintenance**
- [ ] **Messaging**
- [x] **Checklist** — ✅ cerrado 2026-05-23. Sync rule entre frontend/backend JSON documentada. 1 archivo en `backend/services/checklist/`.
- [x] **Auth** — confirmado: queda en raíz (transversal, no necesita archivo propio).
- [ ] **Cashier**
- [ ] **Backoffice**
- [ ] **Restaurant / F&B** — añadido recientemente
- [ ] **DB / migraciones** — `backend/db-mysql/` candidato propio
- [ ] **Otros** (revisar `backend/services/` y `frontend/app/dashboard/` exhaustivamente)

Entregable de la Fase 1: tabla en este TODO con módulo → ubicación(es) → necesita CLAUDE.md sí/no → dónde.

#### Resultado del inventario (2026-05-23)

Métrica usada: archivos en `backend/{controllers,services,repositories,routes,validations}/<modulo>/` + componentes en `frontend/app/components/<modulo>/` + rutas en `frontend/app/dashboard/<modulo>/`. Complejidad real medida también por presencia en el `CLAUDE.md` raíz actual y gotchas documentados.

| Módulo | Backend files | Frontend comp | Dashboard | Complejidad | Necesita CLAUDE.md | Ubicación(es) propuesta(s) |
|---|---:|---:|---:|---|---|---|
| **scheduling** | 26 | 20 | 3 | 🔴 Alta (solver + UI + cross-month) | **Sí — múltiple** | `backend/services/scheduling/` + `backend/scheduling-solver/` + `frontend/app/components/scheduling/` |
| **parking** | 14 | 16 | 23 | 🟠 Alta (mayor superficie UI) | **Sí** | `frontend/app/dashboard/parking/` (es la referencia de responsive del proyecto) + evaluar `backend/services/parking/` |
| **cashier** | 17 | 26 | 6 | 🟠 Alta | **Sí** | `backend/services/cashier/` + `frontend/app/components/cashier/` (evaluar uno o dos en Fase 2) |
| **group** | 17 | 30 | 5 | 🟠 Alta (multi-tenancy) | **Sí** | `backend/services/group/` + `frontend/app/components/groups/` |
| **logbook** | 11 | 6 | 3 | 🟡 Media (read/unread, comments, history table) | **Sí** | `backend/services/logbook/` (lógica de estado más densa que el UI) |
| **checklist** | 9 | 8 | 4 | 🟡 Media (regla de sync JSON dual) | **Sí** | `backend/services/checklist/` (la regla de sync vive aquí; el frontend lee, no es la fuente) |
| **conciliation** | 7 | 11 | 4 | 🟡 Media | **Evaluar** en Fase 2 | A decidir tras leer código |
| **maintenance** | 4 | 11 | 6 | 🟡 Media (workflow estados) | **Evaluar** en Fase 2 | Probablemente `frontend/app/components/maintenance/` |
| **blacklist** | 5 | 14 | 15 | 🟡 Media | **Evaluar** en Fase 2 | A decidir |
| **fnb / restaurant** | 8 | 5 | 3 | 🟡 Media (reciente, en evolución) | **Sí (light)** | `backend/services/fnb/` |
| **backoffice / bo** | 3 | 23 | 3 | 🟡 Frontend-heavy | **Evaluar** en Fase 2 | Probablemente `frontend/app/components/bo/` |
| **messages** | 5 | — | — | 🟢 Baja-media | **No (por ahora)** | Queda en raíz |
| **notifications** | 4 | 6 | — | 🟢 Baja | **No** | Queda en raíz |
| **activity** | 3 | — | — | 🟢 Baja | **No** | — |
| **auth** | 7 | 1 | — | 🟢 Transversal | **No (queda en raíz)** | El raíz es su sitio natural — afecta a todo |
| **demo** | 3 | — | — | 🟢 Baja | **No** | — |
| **departments** | 3 | — | — | 🟢 Baja | **No** | — |
| **search** | 3 | 4 | — | 🟢 Baja | **No** | — |
| **profile** | — | 17 | 3 | 🟢 Frontend-only ligero | **No** | — |

Infraestructura (no son módulos de negocio pero sí necesitan documentación dedicada):

| Pieza | Ubicación | Necesita CLAUDE.md | Por qué |
|---|---|---|---|
| **Solver Python** | `backend/scheduling-solver/` | **Sí** | Daemon, OR-Tools, corpus, fixtures, cómo añadir constraint, tests Python — todo muy específico y denso. Ya incluido como uno de los 3 de scheduling. |
| **DB / migraciones** | `backend/db-mysql/` | **Sí** | Política migraciones incrementales, prohibición de MASTER_INSTALL, INDEX.md a mantener — gotchas críticos. |
| **Scripts one-off** | `backend/scripts/` | **No** | Son utilidades puntuales (import-planning-2026, import-fnb-2026). Documentación inline en cada script basta. |
| **Cron** | `backend/services/cron/` | **No** | 1 archivo central, basta con mención en raíz. |

**Conteo final estimado: 9-12 archivos `CLAUDE.md` modulares** (3 de scheduling + parking + cashier + group + logbook + checklist + fnb + db-mysql + 3-4 condicionales tras Fase 2). Lejos de "uno por módulo" — coherente con el principio de no sobre-documentar.

**Decisión sobre el índice en raíz:** sí se incluirá. Sección compacta al final del raíz, formato `ruta → propósito` en una línea por entrada. ~12-15 líneas total. Razón: el descubrimiento de `CLAUDE.md` en subdirectorios hermanos no es automático para Claude; un índice explícito evita que el agente trabaje sin saber que existe documentación local en otro módulo cuando la tarea cruza fronteras.

**Próximo paso (Fase 2):** empezar por **scheduling** — el más complejo y el que más libera el raíz. Tres archivos en este orden: solver Python → backend TS → frontend.

### Fase 2 — Crear los `CLAUDE.md` módulo a módulo

> **Regla de seguridad innegociable:** no se borra **ni una línea** del `CLAUDE.md` raíz hasta que la información correspondiente esté **transferida, verificada e integrada** en el archivo modular. El orden es siempre **crear → verificar → eliminar del raíz**, idealmente en el mismo commit para que git nunca registre un estado intermedio donde la información no exista en ningún sitio. Si en algún momento de Fase 2 se interrumpe la sesión, el `CLAUDE.md` raíz debe seguir siendo igual de informativo que ahora — es la red de seguridad.

Para cada módulo marcado como "necesita":

1. Leer en profundidad sus archivos clave (backend + frontend) en el código real, no solo en el raíz.
2. Identificar la(s) sección(es) del `CLAUDE.md` raíz actual que le corresponden — **copiar, no cortar**.
3. Detectar qué decisiones de diseño / gotchas / convenciones específicas existen en el código y aún no están documentadas (oportunidad de enriquecer, no solo mover).
4. Escribir el `CLAUDE.md` modular autocontenido en el directorio elegido (puede ser dentro de `backend/services/<modulo>/`, `frontend/app/dashboard/<modulo>/`, `frontend/app/components/<modulo>/`, o varios según la lógica del módulo).
5. Validar que el archivo se entiende sin el contexto del raíz y que **toda la información del raíz relativa al módulo está presente** (verificación explícita pre-borrado).
6. **Solo ahora** eliminar del `CLAUDE.md` raíz las secciones ya transferidas, dejando en su lugar (si procede) una entrada en el índice apuntando al nuevo archivo.
7. Commit único agrupando creación + limpieza del raíz, con mensaje del tipo `docs(claude): split <modulo> module context`.

Orden sugerido (de más a menos complejo, para amortizar el aprendizaje):

1. ✅ Scheduling (3 archivos: solver Python, backend, frontend grid) — cerrado 2026-05-23, commit `04959a4`
2. ✅ Checklist (regla de sync frontend/backend JSON documentada) — cerrado 2026-05-23
3. ✅ Logbook — cerrado 2026-05-23
4. ⏳ Parking
5. Maintenance
6. Restaurant / F&B
7. Messaging
8. Cashier / Backoffice (revisar si justifican archivo propio)
9. DB / migraciones (`backend/db-mysql/CLAUDE.md`)

### Fase 3 — Adelgazar el `CLAUDE.md` raíz

Una vez extraído todo lo modular, el raíz queda **solo con**:

- Project overview (1 párrafo)
- Tech stack (lista breve)
- Comandos comunes (frontend + backend + DB)
- Convenciones globales: imports `.js`, auth JWT, política de commits, política de migraciones (puntero a `MIGRATIONS_POLICY.md`)
- Pitfalls verdaderamente globales (credentials include, server vs client components a nivel concepto)
- Índice de los `CLAUDE.md` modulares con ruta y propósito de cada uno

Objetivo cuantitativo: **raíz ≤100 líneas**.

### Fase 4 — Validación

- Probar abrir sesión en 3-4 módulos distintos y verificar que el contexto cargado es suficiente y no redundante.
- Ajustar lo que falte o sobre tras uso real.
- Documentar la nueva convención en el `CLAUDE.md` raíz como referencia para futuras incorporaciones de módulos.

### Estrategia de commits (decidido 2026-05-23)

**Regla: un commit por módulo, no por archivo, no bundle al final del proyecto entero.**

Razones que llevaron a esta decisión (registradas para no reabrir el debate):

1. **Trabajo multi-sesión.** La reestructura ocupa varias sesiones. Commits por módulo = checkpoint en git que sobrevive a cualquier accidente (cuelgue, push wrong branch, context loss). Si se commiteara solo al final, un imprevisto a mitad de Fase 2 puede tirar horas de trabajo.
2. **Mensaje describe una unidad coherente.** Un commit `docs(claude): split scheduling module context` describe los 3 archivos del módulo (solver Python + backend TS + frontend) en una sola pieza legible. Un commit "restructure all CLAUDE.md across all modules" sería ilegible en el git log y nadie lo abriría.
3. **Revert quirúrgico.** Si dentro de 2 meses se descubre que el split de un módulo (p.ej. parking) está mal hecho, revertir un commit específico es trivial. Revertir "todo el restructure" obligaría a perder el trabajo bueno con el malo.

**Granularidad concreta:**

- Módulos con varios `CLAUDE.md` (ej: scheduling con 3 archivos: solver Python + backend TS + frontend): **un commit al cerrar los 3 archivos** con la limpieza correspondiente del raíz. Mensaje tipo `docs(claude): split scheduling module context into layered files`.
- Módulos con un solo `CLAUDE.md` (ej: logbook, checklist): **un commit por módulo**, incluyendo el archivo nuevo + la limpieza de su sección en el raíz.
- Fase 3 (adelgazar el raíz a ≤100 líneas) y Fase 4 (validación + índice final): commits separados al final.

**No se commitea hasta cerrar el módulo entero.** Si una sesión termina con un módulo a medias (p.ej. solver Python creado pero backend TS aún pendiente), se deja **no commiteado** en el working tree — la "Regla de seguridad innegociable" (crear → verificar → eliminar) garantiza que el raíz sigue íntegro mientras tanto, así que git en ese momento no pierde nada.

### Notas operativas

- Esta tarea puede ocupar varias sesiones. Cada fase es checkpointable: completar e ir al siguiente módulo sin perder estado.
- El sistema de memoria (`memory/MEMORY.md`) sigue siendo complementario, no sustitutivo. Reglas que valgan para *todo* el proyecto siguen en memoria; lo específico de módulo va en su `CLAUDE.md`.

---

## Untracked intencional (no tocar)

`migration-nextjs-to-vite.md` y `react-query-doubts.md` en raíz son notas personales del usuario sobre análisis futuro de arquitectura/rendimiento (potencial migración Next→Vite, refactor React Query). Untracked a propósito mientras evolucionan. **No commitearlas, no borrarlas, no proponer moverlas.**
