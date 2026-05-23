# CLAUDE.md — Scheduling (backend TS)

> Contexto específico de la pieza backend del módulo de scheduling: validator, constraints TS, registry, soft weights, builder del input del solver, cliente del daemon Python, controllers y repository. El solver Python tiene su propio archivo en `backend/scheduling-solver/CLAUDE.md` — leer ese además de éste cuando la tarea cruce la frontera.

## Concepto general del módulo

El sistema gestiona horarios mensuales del personal mediante **edición manual celda a celda con validación en tiempo real**, con **generación automática opcional** vía un solver CP-SAT (Python).

**Estados de un mes:** `draft` (editable, validación con warnings) ↔ `published` (read-only para staff).

**Cell locking.** Las celdas con `source_constraint_id` están **bloqueadas**: provienen de aprobaciones (vacaciones, IT, etc.) y no se pueden sobreescribir desde la UI ni desde el solver. El locking es la pieza que permite que solver y edición manual convivan: el solver respeta lo bloqueado, el manager puede preasignar lo que sea, y la validación distingue entre celdas "del usuario" y celdas "del sistema".

**Constraint flow.** Manager crea una constraint (ej: vacación) → admin aprueba → al aprobar se aplica el shift correspondiente como assignment **con `source_constraint_id`** (queda bloqueada). Si se rechaza, no se toca el grid. Si se borra la constraint aprobada, las assignments derivadas se desbloquean / borran.

**Retroactive constraints.** Los admins pueden añadir constraints para fechas pasadas (ej: registrar un día de baja IT a posteriori). Esto es por diseño — el módulo no asume que los meses pasados son inmutables hasta que entran en `published`.

**Auto-generación.** El solver CP-SAT genera un mes completo respetando todos los hard constraints, las locked cells, y las reglas de empleado. Se invoca desde la UI en un mes `draft`. La salida se vuelca en `scheduling_assignments` dentro de una transacción.

## Arquitectura de la pieza backend TS

```
routes/scheduling/scheduling-routes.ts
   ↓
controllers/scheduling/
   ├── scheduling-controller.ts        (~2000 líneas — CRUD de meses, días, assignments,
   │                                    constraints, employee rules, contracts, totals)
   └── schedule-generate.controller.ts (~200 líneas — orquesta generación: build input,
                                        invoca solver, vuelca matriz, persiste run log)
   ↓
services/scheduling/
   ├── schedule-validator.ts           (~1000 líneas — valida un mes existente; usa
   │                                    constraints/ + lógica per-employee en runFinalValidation)
   ├── build-solver-input.ts           (construye SolverInput desde BD; lockedCells de 3 fuentes)
   ├── solver-client.ts                (gestiona el daemon Python: state machine + semáforo)
   ├── soft-weights.ts                 (pesos numéricos del catálogo soft, sincronizado con Python)
   ├── constraints/
   │   ├── base-constraint.ts          (clase abstract con helpers warn/softWarn/failure/success)
   │   ├── registry.ts                 (ConstraintRegistry: register, getEnabled, checkAll)
   │   ├── coverage.constraint.ts      (H1: cobertura mínima M/T/N por día)
   │   ├── consecutive-rest.constraint.ts  (H5: ≥2 rest en ventana 7)
   │   ├── max-consecutive-work.constraint.ts  (H4: max días consecutivos trabajo)
   │   ├── monthly-libre.constraint.ts (H6: libres mensuales [min, max])
   │   ├── night-block.constraint.ts   (H2: bloques noche [min, max])
   │   ├── rotation-continuity.constraint.ts (continuidad de patrón rotacional)
   │   └── employee-rules.constraint.ts (noWeekends, fixedShift, fixedDays)
   ├── utils/
   │   ├── matrix.ts                   (isWorkShift, isLibreShift, getEmployeeShiftCounts...)
   │   └── day-helpers.ts              (getWeeksInMonth, areConsecutive)
   └── types/                          (Employee, DayInfo, GeneratorContext, ScheduleMatrix, etc.)
   ↓
repositories/scheduling/
   ├── scheduling-repository.ts        (~2000 líneas — toda la DB del módulo)
   └── employee-requests-repository.ts (peticiones aprobadas para el solver)
```

**Importante:** validator y solver son **dos sistemas paralelos** con la misma especificación pero implementaciones distintas. El validator corre en TS sobre una matriz ya hecha y devuelve warnings/errors; el solver corre en Python y construye la matriz desde cero. La especificación textual común vive en `SCHEDULING-CONSTRAINTS.md` (raíz del repo) y es la fuente de verdad cuando ambos discrepan.

## Validator (`schedule-validator.ts`)

Toma un mes (matriz `empleado → día → turno`) y devuelve:

```ts
interface ValidationResult {
  isValid: boolean
  errors: GenerationWarning[]
  warnings: GenerationWarning[]
  softPenalty: number
  softPenaltyBreakdown: Record<string, number>
  stats: { totalErrors, totalWarnings, byType }
}
```

**Estructura interna:**
1. **Constructor:** recibe `monthId`, `year`, `month`, config, shifts, days, employees, assignments, `previousMonthHistory`. Construye el `GeneratorContext`.
2. **`validate()`:** instancia un `ConstraintRegistry`, registra las constraints relevantes (`CoverageConstraint`, `EmployeeRulesConstraint`, etc.), corre `checkAll(context)` → agrega violations y soft penalties.
3. **`runFinalValidation()`:** lógica per-employee que no encaja en una constraint suelta (libre counts acumulados, weekend-off missing, M/T variety, etc.). Emite warnings adicionales directamente con `severity: 'error'` o `'warning'` y acumula soft penalty con la misma convención `softPenaltyBreakdown[key] += ...`.

**Decisión:** algunas reglas viven dentro de `runFinalValidation` porque necesitan **estado acumulado por empleado** que sería costoso (o feo) pasar a través del API de `BaseConstraint`. No es deuda técnica, es pragmatismo — si en el futuro la suma supera lo razonable se promueve a constraint con context extendido.

`isValid = errors.length === 0`. Soft penalty es independiente: una validación puede ser válida (sin hard errors) y aún así tener penalty alta.

## Constraints TS (`constraints/`)

Cada constraint extiende `BaseConstraint`:

```ts
abstract class BaseConstraint {
  abstract readonly name: string
  abstract readonly priority: number   // higher = checked first
  enabled: boolean = true
  abstract check(context: GeneratorContext): ConstraintResult
  
  // helpers heredados:
  protected warn(message, { type, severity: 'error'|'warning', day, employeeId })
  protected softWarn(weightKey: SoftWeightKey, units: number, message, ...)
  protected success() / failure(violations)
}
```

**`warn` vs `softWarn`:**
- `warn` con `severity: 'error'` → hard violation (anula isValid).
- `warn` con `severity: 'warning'` → warning de UI sin coste numérico.
- `softWarn(weightKey, units, ...)` → automaticamente: emite warning + suma `SOFT_WEIGHTS[weightKey] * units` al `softPenalty` y al `softPenaltyBreakdown[weightKey]`.

Para añadir una constraint nueva al validator, ver § "Cómo añadir una constraint" abajo.

## Soft weights (`soft-weights.ts`)

Tabla numérica con los pesos del catálogo soft. **Fuente de verdad para los pesos:** este archivo. La especificación textual está en `SCHEDULING-CONSTRAINTS.md §6`. Los pesos también se replican en `model.py` del solver Python para que ambos lados produzcan números comparables.

**Convención `@emitter` en JSDoc:** cada peso lleva un tag `@emitter <path>` apuntando al archivo que actualmente emite ese soft penalty. Si añades un soft nuevo, declara `@emitter` apuntando a tu constraint. Si un peso está declarado pero ningún archivo lo emite todavía, marca `@deferred <reason>` — esto se hace para reservar la clave sin implementarla aún (S2 weekly_shifts_off, weekend_imbalance, shift_variety_low, request_preference_unmet están en este estado a 2026-05-23).

Las claves del `softPenaltyBreakdown` que devuelve el validator TS deben **coincidir exactamente** con las claves que devuelve el solver Python en su `stats.softPenaltyBreakdown`. Esa paridad de naming es lo que permite que el dashboard compare los soft penalty entre solver output y validator-post-solve.

## `build-solver-input.ts`

Construye el `SolverInput` JSON desde la BD. Lo crítico está en cómo arma los **lockedCells**, que tienen **3 fuentes** en este orden de prioridad:

1. **Assignments con `source_constraint_id`** — aprobaciones ya volcadas en `scheduling_assignments`.
2. **Approved requests** (`scheduling_employee_requests` con `status='approved'`) — expandidas en su rango de fechas. `shift_code` viene de `requested_value` o se mapea desde `request_type` (vacation→V, bonificable→B, baja_temporal→IT). `shift_preference` y `shift_exclusion` se gestionan diferente y no entran como locked. **No sobreescriben** lo que ya pusiera la fuente 1.
3. **`fixedDays` patterns** — empleados con regla `fixed_days` (ej: "1,2,3,4,5" = L-V). Para cada día del mes, se inyecta como locked: `workShift` (= `fixedShift` o 'P' por defecto) si `dayOfWeek ∈ fixedDays`, `L` si no. **No sobreescriben** las fuentes 1 ni 2 — vacación / petición aprobada ganan sobre fixedDays.

**`DOW_TO_NUM` mapping** (para fixedDays): L=1, M=2, X=3, J=4, V=5, S=6, D=7.

**Empleados excluidos:** los que tengan `fixedShift === 'P'` y **no** tengan `fixedDays` se filtran fuera del solver (patrón manual desconocido — el solver no sabría cuándo asignarles P). Sí participan si tienen fixedDays porque su patrón es determinístico.

**Otros campos del input:**
- `employees`: cargados con `getSchedulableEmployeesForMonth(year, month)` — filtra por `start_date`/`end_date` de `scheduling_employees`. Empleados ya desvinculados o aún no contratados no entran al solver.
- `days`: con `isHoliday` desde `scheduling_days`.
- `previousMonthTail`: últimos 7 días de assignments del mes anterior (draft o published — `getPreviousMonthEndAssignments` lee ambos).
- `nightsHistory`: noches acumuladas en meses publicados anteriores; alimenta S1 del solver.
- `config`: vuelca todos los campos de `scheduling_config` con fallbacks razonables.

Cualquier campo nuevo del lado Python (`schemas.py`) necesita su contraparte aquí. Si añades un parámetro de config, asegúrate de que el fallback aquí coincida con el default en el schema Python.

## `solver-client.ts`

Envuelve el daemon Python persistente. Detalle del daemon en `backend/scheduling-solver/CLAUDE.md`; aquí lo relevante es el lado Node.

**State machine:**
```
idle → starting → ready → busy → ready → busy → ...
                    ↑          ↓
                    └──────────┘
                  (semáforo por petición)
```

**Garantías:**
- **Semáforo**: una petición a la vez. CP-SAT no es thread-safe por proceso, así que serializamos.
- **Abort-safe**: si el cliente HTTP se desconecta (`req.on('close')`), el `AbortSignal` no libera el semáforo hasta que el daemon responda — evita desincronización entre Node y el proceso Python.
- **Respawn transparente**: si el daemon muere (broken pipe), la siguiente petición lo relanza.
- **Startup timeout largo (30 min)**: la primera vez en Windows con Defender activo, importar OR-Tools puede tardar hasta 20 minutos. En Linux/Mac son segundos.
- **Solve timeout**: 60 s. El timeout interno del solver es 30 s (`SolverOptions.timeoutSeconds`), aquí dejamos margen.

**Warmup:** `index.ts` llama `warmupSolver()` al boot del backend → arranca el daemon en background mientras Express termina de levantar. Cuando llega la primera generación, el daemon ya está `ready`.

## Controllers

**`scheduling-controller.ts`** (~2000 líneas): CRUD masivo de todos los recursos del módulo. Lo divide por bloques `// ──── Config ────`, `// ──── Months ────`, etc. Exporta funciones nombradas que `routes/scheduling/scheduling-routes.ts` ensambla.

**`schedule-generate.controller.ts`** (~200 líneas): hace **una sola cosa** — orquestar la generación. Flujo:

1. Validar que el mes existe, está en `draft`, tiene días generados, tiene empleados.
2. `buildSolverInput()` → SolverInput JSON.
3. `runSolver(input, abortSignal)` → SolverOutput.
4. Si `status === 'ok'`: aplicar `matrix` a `scheduling_assignments` **dentro de una transacción** (las claves negativas — días virtuales — se ignoran).
5. Si `status === 'infeasible'`: devolver 422 con `conflictingConstraints` y `suggestedRelaxations`.
6. Si `status === 'error'`: devolver 500 con el `errorCode`.
7. Persistir el run completo en `scheduling_solver_runs` (input + output + stats + tiempo).

**Persistencia del run log es non-fatal:** si fallar el insert en `scheduling_solver_runs`, la respuesta al usuario sigue siendo OK. Logging interno con `logger.error`.

## Repository

`scheduling-repository.ts` es enorme (~2000 líneas) y agrupa toda la persistencia: config, shifts, months, days, assignments, constraints, employee rules, schedulable employees con `start_date`/`end_date`, contracts, annual totals, holidays, solver run logs, history.

Cuando toques este archivo:

- Casi todas las funciones reciben `monthId` o `year/month` — son por mes, no globales.
- Las assignments con `source_constraint_id !== null` están bloqueadas: respeta esa invariante en cualquier query de bulk update.
- `getSchedulableEmployeesForMonth(year, month)` aplica filtros por `start_date`/`end_date`. Para listas crudas de empleados (Totales tab, etc.) usa `getAllEmployeesWithStatus`.
- `getPreviousMonthEndAssignments(year, month, N)` lee mes anterior aunque esté en `draft` — esto es intencional para que las cadenas Ene→Feb→Mar funcionen sin tener que publicar mes a mes.

**Bug conocido (TODO.md):** `setSchedulableEmployees` hace `DELETE` + `INSERT` masivos que pierden `start_date`/`end_date`. Fix propuesto: diff selectivo (solo DELETE de los que salen, INSERT de los que entran). Ver `TODO.md` § "Bug: setSchedulableEmployees".

## Endpoints principales

| Método y ruta | Propósito |
|---|---|
| `GET /months/:id` | Full month data (days, assignments, constraints, stats) |
| `GET /months/:id/info` | Approved constraints + employee rules para el panel lateral |
| `POST /months/:id/generate` | Invoca CP-SAT solver, aplica matriz a assignments |
| `POST /months/:id/reset` | Wipe all assignments, re-seed from approved constraints |
| `POST /months/:id/unpublish` | Vuelve a draft (transición controlada) |
| `PATCH /assignments/:id` | Update single cell (409 si está locked) |
| `POST /assignments/bulk` | Bulk update; respeta locks |
| `POST /constraints/:id/approve` | Approve/reject + auto-sync assignments |
| `GET /employee-rules` | Lista de reglas en camelCase para el panel |
| `PUT /scheduling/employees` | Set schedulable employees list (⚠️ ver bug arriba) |

Ruta completa en `routes/scheduling/scheduling-routes.ts` con middleware `authenticateToken` + `isAdmin` / `excludeMantenimiento` según el endpoint.

## Shift types

**Work shifts:**
- `M` — Morning
- `T` — Afternoon
- `N` — Night
- `PI` — Internal Support
- `P` — Presencia (requiere `fixedShift=P` + `fixedDays` o queda excluido del solver)

**Off / special states:**
- `L` — Libre (libre regular del mes)
- `V` — Vacation (vacación aprobada — locked)
- `B` — Bonificable (festivo/holiday compensado — locked)
- `E` — Sick day (eventual, point-in-time — locked)
- `IT` — Incapacidad Temporal (baja larga — locked)
- `FO` — Day Off (día libre por compensación — locked)
- `A` — Ausencia injustificada (locked, suele entrar a posteriori)
- `LI` — Libre Disposición (libre extraordinario fuera de la rotación semanal — locked)

Helpers para clasificar shifts: `services/scheduling/utils/matrix.ts` exporta `isWorkShift`, `isLibreShift`, `getEmployeeShiftCounts`. **`isWorkShift` incluye N, P, PI** — recordarlo cuando se cuentan bloques de trabajo (paridad con `ALL_WORK_SHIFTS` del solver Python).

## Configuration tables

**`scheduling_config`** — KV de parámetros globales del scheduling (min/max staff por turno, rest hours, libre ranges, night block mins, etc.). Cargado vía `getConfigMap()`. Cambios desde la UI en `/dashboard/scheduling/config` → tab "General".

**`scheduling_employee_rules`** — reglas por empleado: `fixed_shift`, `no_weekends`, `shift_priority`, `fixed_days`. Una fila por (employee_id, rule_type). `is_active=1` para reglas vigentes; histórico se conserva con `is_active=0`. Cargado vía `getAllEmployeeRules()` (camelCase) o `getEmployeeRulesByEmployee(id)`.

**`scheduling_employees`** — qué empleados forman parte del scheduling del hotel. Incluye `start_date` / `end_date`: ambos NULL = activo sin restricción; con fechas = empleado solo aparece en meses dentro del rango. Editable desde *Totales* → *Período activo en horarios*.

**`scheduling_employee_requests`** — peticiones del empleado: vacaciones, IT, preferencias. Estados `pending` / `approved` / `rejected`. Solo las aprobadas entran al solver vía `findApprovedForSolver(year, month)`.

**`scheduling_solver_runs`** — log de cada generación: input, output, status, time, conflicts, soft penalty breakdown. Útil para diagnosticar INFEASIBLE de producción reproduciendo el input exacto.

## Cómo añadir una constraint nueva (guía completa cross-lenguaje)

> Esta es la guía single-source para añadir una regla nueva al sistema. Toca tres sitios: validator TS, solver Python, fixtures del corpus. Saltarse uno crea drift, que el parity test eventualmente cazará pero tarde.

### Paso 1 — Decidir hard vs soft y documentarlo

Abre `SCHEDULING-CONSTRAINTS.md` (raíz del repo).

- **Hard:** un violation invalida el mes. Añadir a §2 con ID `H<n>`.
- **Soft:** un violation es aceptable pero penalizado. Añadir a §3 con ID `S<n>`, peso tentativo 1-10, y explicar *por qué* ese peso relativo a los demás. El peso se afinará con feedback del manager; lo importante es el orden relativo.

Si la regla depende de continuidad cross-month, listarla también en §9.5 (cross-month invariant) para que un futuro lector sepa que necesita cablear `previousMonthHistory` (TS) / `previousMonthTail` (Python).

### Paso 2 — Implementar en el validator TS

Crear `backend/services/scheduling/constraints/<rule-name>.constraint.ts` extendiendo `BaseConstraint`. Recibe `GeneratorContext` con `matrix`, `employees`, `days`, `config`, `previousMonthHistory` (null en el primer mes histórico).

- Hard rules → `this.warn(message, { severity: 'error', ... })`.
- Soft rules → `this.softWarn(weightKey, units, message, ...)` — automáticamente añade el peso desde `SOFT_WEIGHTS[weightKey]` y acumula `softPenalty` + `softPenaltyBreakdown`.

Si añades un peso soft nuevo:
1. Declárarlo en `services/scheduling/soft-weights.ts`.
2. Tag JSDoc `@emitter constraints/<tu-rule>.constraint.ts` apuntando al archivo emisor.
3. Si no lo vas a emitir aún, márcalo `@deferred <reason>`.

Registra la constraint en `schedule-validator.ts` dentro del bloque `ConstraintRegistry` de `validate()`, al lado de `CoverageConstraint` / `EmployeeRulesConstraint`. **Excepción:** si la regla necesita estado acumulado per-employee (libre counts, weekend off check, M/T variety…), inline-la en `runFinalValidation()` siguiendo el patrón existente — no fuerces el API de `BaseConstraint`.

### Paso 3 — Implementar en el solver Python

→ Detalle completo en `backend/scheduling-solver/CLAUDE.md` § "Cómo añadir una constraint nueva (lado Python)". Resumen:

1. Crear `backend/scheduling-solver/constraints/<rule_name>.py` con signature `apply(model, x, input, employees, days, virtual_days_by_emp=None)`.
2. Hard: `model.add(...)`. Soft: BoolVars indicadores + términos ponderados en `objective_terms` de `solve()`.
3. Importar y llamar `apply()` desde `model.solve()`. Orden no importa.
4. Si contribuye al `softPenalty`, exponer en `softPenaltyBreakdown` con la **misma key** que `soft-weights.ts`.

### Paso 4 — Añadir un fixture al corpus

Crear `backend/tests/scheduling-corpus/fixtures/F<nn>-<descriptive-name>.json` siguiendo `_schema.ts`. Tres secciones:

1. `input` — month, employees, days, config, lockedCells, previousMonthHistory, **matrix totalmente formada**. La matrix debe ejercitar la regla: para hard, incluir un schedule que la rompa; para soft, incluir uno cuya penalty sea calculable a mano.
2. `expected.isValid` — `true` si la matrix no tiene hard errors, `false` si los tiene.
3. `expected.violations` — lista de matchers (type, severity, employeeId, day) que el validator debe emitir. Plus `expected.softPenalty` y `expected.softPenaltyBreakdown` para contribuciones soft.

Si el fixture es solver-reachable (la matrix podría provenir del solver), añadir su ID a:
- `SOLVABLE_FIXTURES` en `backend/scheduling-solver/tests/test_corpus.py`
- `PARITY_FIXTURES` en `backend/tests/scheduling/solver-parity.test.ts`

Fixtures con `minMorningStaff: 0` (cobertura desactivada) suelen ser candidatos seguros para ambos sets.

### Paso 5 — Correr las cuatro suites

```bash
cd backend
pnpm vitest run tests/scheduling/corpus.test.ts          # TS validator vs fixtures
pnpm vitest run tests/scheduling/solver-parity.test.ts   # solver → TS validator (0 hard errors)
cd scheduling-solver
venv/Scripts/python -m pytest tests/test_corpus.py       # solver Python no crashea
venv/Scripts/python -m pytest tests/test_daemon_stress.py  # daemon stress
```

Todas verdes. Si parity falla, validator y solver discrepan: arregla el lado que se desvía de `SCHEDULING-CONSTRAINTS.md` (la spec es la verdad, no el código).

### Paso 6 — Documentar la decisión

Append a `SCHEDULING-DECISIONS-LOG.md`: fecha, regla, hard/soft, peso si aplica, razonamiento. Esto es el audit trail que permite a un agente futuro (o a ti dentro de 6 meses) entender por qué la constraint existe sin spelunking del git log.

## Importador histórico desde Excel

`backend/scripts/import-planning-2026.ts` (tsx + xlsx) vuelca `PLANNING 2026.xlsx` (Enero-Mayo) en `scheduling_months` / `scheduling_days` / `scheduling_assignments` en estado *draft*. Idempotente por mes. Whitelist explícita de empleados (excluye personal de otros departamentos). Mapeo de códigos `L1..L9 → L+libre_number`, `PI1 → FO`, `BT → IT`. Uso:

```bash
pnpm exec cross-env DB_ENVIRONMENT=aiven tsx --env-file=.env scripts/import-planning-2026.ts [Enero|...|all]
```

Útil cuando se hace setup en una BD limpia o se quiere replicar el estado histórico para tests integrados.

## Cross-month gotcha (H4/H5) — deuda pendiente

El solver Python aplica H4 (max consecutive work) y H5 (≥2 rest en ventana 7) sobre `all_days = virtual_days + real_days`. Si el tail virtual del mes anterior ya viola el constraint matemáticamente (ej: 6 turnos M seguidos al cierre del mes anterior), la ventana es unsatisfiable y produciría INFEASIBLE artificial. `rest.py` **omite** estas ventanas "doomed".

**Deuda:** el TS validator NO aplica esta misma exención todavía. Posible drift: un mes generado por solver puede dar warnings espurios al revalidarlo con el validator TS. Cuando ocurra, replicar la lógica de skip cross-month en `consecutive-rest.constraint.ts` y `max-consecutive-work.constraint.ts`. Ver `SCHEDULING-DECISIONS-LOG.md` (entrada 2026-05-20) y `SCHEDULING-CONSTRAINTS.md §H5`.

## Referencias cruzadas

- `backend/scheduling-solver/CLAUDE.md` — el solver Python (daemon, modelo CP-SAT, constraints, tests).
- `SCHEDULING-CONSTRAINTS.md` (raíz) — especificación textual completa. Fuente de verdad.
- `SCHEDULING-DECISIONS-LOG.md` (raíz) — bitácora de decisiones (por qué hard/soft, por qué los pesos, qué se intentó).
- `SCHEDULING-SOLVER-PLAN.md` (raíz) — plan original. Histórico.
- `TODO.md` (raíz) — bugs conocidos del módulo (setSchedulableEmployees, deuda H5 cross-month, etc.).
- `frontend/app/components/scheduling/` — UI (cuando se cree su CLAUDE.md, irá aquí).
