# SCHEDULING-SOLVER-PLAN

> **Qué es este archivo**
>
> Plan técnico de la migración del generador de horarios de enfoque LLM a arquitectura basada en solver CSP (OR-tools CP-SAT) con capas de optimización y refinamiento humano.
>
> **Alcance:** únicamente el módulo de scheduling. No afecta a logbook, parking, maintenance ni otros módulos del PMS.
>
> **Vigencia:** vivo durante la migración. Cuando termine, este archivo se archiva o se borra y las decisiones relevantes se promueven a `ROADMAP.md` (proyecto completo) y/o a `CLAUDE.md` (instrucciones permanentes para agentes).
>
> **Qué NO contiene:**
> - Catálogo de reglas del convenio/operativas → ver `SCHEDULING-CONSTRAINTS.md`
> - Histórico de decisiones de diseño y su justificación → ver `SCHEDULING-DECISIONS-LOG.md`
> - Roadmap general del proyecto Four-Points → ver `ROADMAP.md`

---

## 1. Contexto y norte

### Estado actual

El módulo de scheduling tiene dos generadores:

- **Manual**: el manager edita celda a celda. Un validador TS (`backend/services/scheduling/schedule-validator.ts`) da feedback en tiempo real.
- **LLM**: un generador basado en Opus 4.7 (`ai-generator.ts`, `ai-prompt.ts`) que intenta producir un mes completo. Actualmente no fiable: con 7 empleados × 28 días y ~10 constraints deja 30+ errores y 20+ warnings por iteración. No escala a hoteles más grandes.

### Problema

Generar un horario respetando reglas de convenio y cobertura es un **CSP** (Constraint Satisfaction Problem). Los LLMs son herramienta equivocada para CSP: no dan garantías, son caros ($0.10-$1 por generación con Opus) y la calidad se degrada con el tamaño.

### Norte

Arquitectura en 3 capas:

```
┌──────────────────────────────────────────────────────────┐
│ Capa 1: SOLVER (hard constraints)                        │
│ OR-tools CP-SAT en Python, invocado como subproceso CLI  │
│ Entrada: empleados, reglas, celdas bloqueadas, config    │
│ Salida: matriz 100% válida o {unsat, reasons}            │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ Capa 2: OPTIMIZER (soft constraints)                     │
│ Minimización de función de coste ponderada dentro del    │
│ mismo modelo CP-SAT (preferencias, equilibrio, variedad) │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ Capa 3: LLM (interfaz humana — FUTURO, no en este plan)  │
│ - Parsear reglas de lenguaje natural a constraints       │
│ - Explicar el horario al manager                         │
│ - Sugerir relajaciones cuando UNSAT                      │
└──────────────────────────────────────────────────────────┘
```

**Este plan cubre Capa 1 y Capa 2.** La Capa 3 se abordará en un plan posterior cuando el core esté estable en producción. El código LLM actual queda archivado (feature flag OFF), no se borra.

### Criterio global de éxito

El plan se considera **completado** cuando:

1. Un mes de 30 empleados × 31 días se resuelve con horario 100% válido (todas las hard constraints satisfechas) en < 30 segundos en una máquina de desarrollo estándar.
2. La función de coste de los soft constraints está tuneada con feedback del manager real para al menos 3 meses consecutivos en producción.
3. El validator TS y el solver Python coinciden en 100% de los casos del corpus de tests compartido.
4. El endpoint actual `POST /months/:id/generate-ai` queda reemplazado por `POST /months/:id/generate` que invoca el solver.

---

## 2. Decisiones arquitectónicas invariantes

Estas decisiones **no se revisan** salvo que aparezca evidencia objetiva que las invalide. Cambiarlas a mitad de camino es garantía de cronograma imposible.

### 2.1 Solver

**OR-tools CP-SAT** (Google). Motivo: estándar de la industria para nurse-rostering y staff scheduling, open source, soporte nativo de hard+soft, reporting de infeasibilidad (`CpSolver.sufficient_assumptions_for_infeasibility`). Alternativas consideradas y descartadas: simulated annealing puro (sin garantías), MiniZinc (runtime externo adicional), solvers JS nativos (inmaduros).

### 2.2 Lenguaje del solver

**Python 3.11+**. OR-tools tiene API Python madura y documentación/ejemplos abundantes. TypeScript queda para el resto del backend.

### 2.3 Integración backend ↔ solver

**Daemon Python persistente (migrado desde CLI en 2026-04-30).** Node mantiene un único proceso Python vivo durante toda la vida del servidor. OR-Tools se importa una sola vez al arrancar. Cada petición envía una línea JSON por stdin y lee la respuesta por stdout (newline-delimited protocol).

Motivos del cambio a daemon (ver `SCHEDULING-DECISIONS-LOG.md` entrada 2026-04-30):
- En Windows con Windows Defender, el import de OR-Tools puede tardar 1-20 minutos por DLL scan. Con spawn-por-petición, cada generación pagaba ese coste; con daemon se paga una sola vez.
- En Linux/producción también mejora: elimina ~3s de startup Python por petición.
- El protocolo JSON por stdin/stdout no cambia respecto al plan CLI original; solo cambia quién lo invoca.

Archivos clave: `scheduling-solver/daemon.py` (proceso Python), `services/scheduling/solver-client.ts` (gestión del daemon desde Node).

`main.py` sigue existiendo como entry point CLI **solo para debugging manual** (ej: probar un input JSON suelto en consola). El flujo productivo NO lo usa — todas las generaciones reales pasan por el daemon. Adicionalmente, existen scripts de debug en el backend para inspeccionar el sistema:

| Script | Propósito |
| ------ | --------- |
| `debug-compare.js` | Consultar base de datos y listar meses existentes |
| `debug-month.js` | Ver asignaciones de un mes específico |
| `debug-sept.js` | Debug completo del mes septiembre 2026: empleados, locked cells, input/output del solver |

**Uso**:
```bash
cd backend
node debug-sept.js    # Debug mes específico
node debug-compare.js # Ver meses en BD
node debug-month.js  # Ver asignaciones
```

### 2.4 Source of truth de constraints

- **Valores numéricos configurables** (min staff, max rest hours, etc.): DB (`scheduling_config`, `scheduling_employee_rules`).
- **Lógica de cada constraint** (cómo se aplica): duplicada en validator TS y solver Python, mantenida en sync mediante **tests compartidos** (corpus JSON con input/output esperado que corre en ambos lados).
- **Catálogo de qué constraints existen y su clasificación hard/soft**: `SCHEDULING-CONSTRAINTS.md` (source of truth de producto).

No hay forma de evitar la duplicación de lógica sin pagar otro coste inaceptable (validator llamando al solver en cada edición = latencia). Asumimos la duplicación; los tests la gobiernan.

### 2.5 Clasificación hard/soft

- **Hard**: derechos legales/convenio (descanso mínimo, libres mensuales mínimos, cobertura mínima, celdas bloqueadas por peticiones aprobadas).
- **Soft**: preferencias (preferencia de turno, equilibrio M/T, fines de semana libres, variedad, rotación "justa").

Detalle por regla en `SCHEDULING-CONSTRAINTS.md`.

### 2.6 Compatibilidad con edición manual

El solver **no reemplaza** la edición manual celda a celda. Genera un punto de partida (o lo regenera completo). El validator TS sigue siendo el motor de feedback en tiempo real. Ambos deben coincidir.

### 2.7 Celdas bloqueadas (`source_constraint_id`)

El solver **respeta** las celdas con `source_constraint_id` no nulo (vacaciones aprobadas, bajas, libres aprobados). Se pasan como asignaciones fijas en el input, no como variables libres.

---

## 3. Contratos de datos

### 3.1 Input del solver (Node → Python, stdin JSON)

```typescript
interface SolverInput {
  monthId: number
  year: number
  month: number           // 1-12
  days: Array<{
    dayNumber: number     // 1-31
    dayOfWeek: 'L'|'M'|'X'|'J'|'V'|'S'|'D'
    weekNumber: number    // 1-5 dentro del mes
    isHoliday: boolean
  }>
  shifts: Array<{
    code: string          // 'M', 'T', 'N', 'PI', 'P', 'L', 'V', 'B', 'E', 'IT', 'FO', 'A'
    hours: number
    isWorkShift: boolean
    isPaid: boolean
    startTime: string | null  // 'HH:MM'
    endTime: string | null
  }>
  employees: Array<{
    id: string            // UUID
    name: string
    rules: {
      shiftPriority?: string
      maxShiftPerMonth?: Record<string, number>
      minShiftPerMonth?: Record<string, number>
      fixedDays?: number[]
      fixedShift?: string
      noWeekends?: boolean
    }
  }>
  config: {
    minMorningStaff: number
    prefMorningStaff: number
    maxMorningStaff?: number
    minAfternoonStaff: number
    prefAfternoonStaff: number
    maxAfternoonStaff?: number
    minNightStaff: number
    maxNightStaff: number
    maxWeeklyShifts: number
    prefWeeklyShifts: number
    minRestHours: number
    minNightBlock: number
    prefNightBlock: number
    maxNightBlock: number
    minMonthlyLibre: number
    maxMonthlyLibre: number
    maxConsecutiveWorkDays: number
  }
  lockedCells: Array<{
    employeeId: string
    dayNumber: number
    shiftCode: string
    reason: string        // 'vacation' | 'sick' | 'approved_request' | ...
  }>
  previousMonthTail?: {
    // Últimos N días del mes anterior por empleado — necesario para continuidad
    // de bloques de noche, descanso entre meses, rotación.
    lastDays: Record<string, Array<{ dayNumber: number; shiftCode: string }>>
  }
  options: {
    timeoutSeconds: number    // default 30
    optimizationLevel: 'fast' | 'balanced' | 'thorough'  // controla tiempo vs calidad soft
    seed?: number             // para reproducibilidad en tests
  }
}
```

### 3.2 Output del solver (Python → Node, stdout JSON)

```typescript
type SolverOutput = SolverSuccess | SolverInfeasible | SolverError

interface SolverSuccess {
  status: 'ok'
  matrix: Record<string, Record<number, string>>   // employeeId → dayNumber → shiftCode
  stats: {
    solveTimeMs: number
    hardConstraintsSatisfied: true
    softPenalty: number            // valor de la función de coste minimizada
    softPenaltyBreakdown: Record<string, number>  // qué soft pesa más
    iterationsOrBranches: number
  }
}

interface SolverInfeasible {
  status: 'infeasible'
  conflictingConstraints: Array<{
    constraintName: string         // 'coverage_min_morning', 'rest_12h', ...
    employeeIds?: string[]
    dayNumbers?: number[]
    humanExplanation: string       // "No hay suficientes empleados disponibles el día 15"
  }>
  suggestedRelaxations: Array<{
    constraint: string
    currentValue: number
    proposedValue: number
    impact: string
  }>
}

interface SolverError {
  status: 'error'
  errorCode: 'INVALID_INPUT' | 'TIMEOUT' | 'INTERNAL'
  message: string
  details?: Record<string, unknown>
}
```

### 3.3 Cambios de DB

**⚠ Gap detectado 2026-04-24 (bloqueante para Fase 1):** el esquema actual **no** soporta peticiones por fecha o rango de fechas, ni reglas de empleado con vigencia temporal. El contrato del solver ya contempla `lockedCells` con `reason: 'approved_request'` (§3.1), pero no hay tabla donde vivan esas peticiones. Evidencia: las hojas del Excel real tienen notas tipo *"EMP_05 librar 28/29"* como texto libre. Detalle y tipos de petición en `SCHEDULING-CONSTRAINTS.md` §"Inputs del sistema — Peticiones".

**Requerido antes de Fase 1 (decidido 2026-04-25):**
- Crear tabla `scheduling_employee_requests` (DDL completo en `SCHEDULING-CONSTRAINTS.md` §7.5). Campos: `employee_id`, `date_from`, `date_to`, `request_type` ENUM(`shift_preference`, `shift_exclusion`, `bonificable`, `baja_temporal`, `vacation`), `requested_value`, `status`, `created_by`, `approved_by`, `notes`.
- `scheduling_employee_rules` **no** se modifica: las reglas con vigencia temporal (ej: EMP_07 sin `M` durante 3 meses) se modelan como `shift_exclusion` con rango largo en la nueva tabla.

**Propuestos para Fase 2** (cuando tuneemos soft constraints):
- Añadir columna `enforcement ENUM('hard','soft')` a una futura tabla `scheduling_constraint_definitions` **si** decidimos que el tipo hard/soft de cada regla es configurable por hotel. Por ahora es hardcoded en el código.
- Nada más.

### 3.4 Contrato CLI

```bash
python backend/scheduling-solver/main.py < input.json > output.json 2> errors.log
```

- Exit code 0: output JSON válido (success o infeasible).
- Exit code 1: error (INTERNAL). Detalles en stderr.
- Exit code 2: input inválido (no es JSON, schema incorrecto).
- Timeout lo maneja Node con `child_process.spawn({ timeout })`, no Python.

### 3.5 Ubicación en el repo

```
backend/
├── scheduling-solver/           ← nuevo directorio Python
│   ├── main.py                 ← entry point CLI
│   ├── model.py                ← construcción del modelo CP-SAT
│   ├── constraints/            ← un archivo por hard/soft constraint
│   ├── schemas.py              ← validación de input/output (pydantic)
│   ├── tests/
│   └── pyproject.toml          ← dependencias Python
├── services/
│   └── scheduling/
│       ├── solver-client.ts    ← nuevo: wrapper que spawnea Python
│       └── schedule-validator.ts  ← se refactoriza (Fase 0)
```

---

## 4. Plan de fases

### Regla

Cada fase tiene **criterios de cierre medibles**. No se avanza a la siguiente hasta que todos los criterios se cumplen. Si una fase se estanca, se replantea aquí (no se ignora).

### Fase 0 — Cimientos ✅ CERRADA 2026-04-25

**Objetivo:** preparar la base sin tocar producción visible.

**Trabajo completado:**

1. ✅ `SCHEDULING-CONSTRAINTS.md` — catálogo completo de reglas hard/soft con pesos, invariante cross-month elevado a §9.5, §7.5 con DDL de `scheduling_employee_requests`.
2. ✅ `schedule-validator.ts` refactorizado — devuelve `softPenalty` + `softPenaltyBreakdown`. 7 de 11 pesos activos; 4 diferidos con `@deferred` en `soft-weights.ts`. Cross-month wiring completo en 4 constraints.
3. ✅ Corpus de tests — `backend/tests/scheduling-corpus/` con 25 fixtures JSON (cubre smoke, coverage M/T/N, rest, night-block, cross-month, libres, work-blocks, weekend-off, employee-rules, locked-cells, edge-cases). 64/64 tests verdes.
4. ✅ Código LLM eliminado — `ai-generator.ts`, `ai-prompt.ts`, endpoint `/generate-ai` y SDKs descartados antes del primer commit de la rama.
5. ✅ `scheduling_employee_requests` — tabla creada en local (FK a `users(id)`), modelo + repo + Zod creados. Aiven diferido a pre-producción.
6. ⏭ PoC OR-tools `poc.py` — **absorbido por Fase 1 paso 1**: el primer entregable de Fase 1 es el setup Python + PoC 3×7 que valida la viabilidad. No tiene sentido hacerlo como item aislado de Fase 0 cuando Fase 1 arranca con eso.

**Criterios de cierre:**

- [x] `SCHEDULING-CONSTRAINTS.md` completo con constraints documentadas, clasificadas hard/soft y con pesos.
- [x] `ScheduleValidator` devuelve `softPenalty`; 64/64 tests verdes.
- [x] Corpus ≥ 20 fixtures cubriendo todos los casos requeridos (25 fixtures).
- [x] Código LLM eliminado del repo.
- [x] `scheduling_employee_requests` creada en local; gap de esquema de Fase 1 resuelto.

### Fase 1 — MVP del solver ✅ CERRADA 2026-04-30

**Objetivo:** pipeline end-to-end Node → Python → Node funcionando con hard constraints.

> **Precondición de esquema:** ✅ resuelta 2026-04-25 — `scheduling_employee_requests` creada en local.

**Trabajo implementado:**

| Componente | Estado | Notas |
|---|---|---|
| Setup Python + estructura | ✅ | `scheduling-solver/` con venv, pyproject.toml, main.py, schemas.py |
| H1 — Cobertura mínima M/T/N | ✅ | `constraints/coverage.py` |
| H4 — Máx. días consecutivos | ✅ | `constraints/rest.py` |
| H5 — ≥2 libres en ventana 7d | ✅ | `constraints/rest.py` |
| H6 — Libres mensuales min/max | ✅ | `constraints/libres.py` |
| H7 — Celdas bloqueadas | ✅ | `constraints/locked_cells.py` |
| H2 — Bloques de noche | ✅ | `constraints/night_block.py` (adelantado de Fase 2) |
| H3 — Transiciones prohibidas | ✅ | `constraints/transitions.py` (adelantado de Fase 2) |
| Bloques mínimos M/T | ✅ | `constraints/day_blocks.py` (adelantado de Fase 2) |
| Reglas de empleado (noWeekends, fixedShift) | ✅ | `constraints/employee_rules.py` (adelantado de Fase 2) |
| fixedDays → lockedCells | ✅ | Pre-expansión en `build-solver-input.ts` (no en Python) |
| `scheduling_employee_requests` aprobadas → lockedCells | ✅ | `build-solver-input.ts` fuente 2 |
| Cross-month tail (previousMonthTail) | ✅ | Variables virtuales (-7..-1) en model.py; todas las constraints iteran sobre all_days |
| `solver-client.ts` | ✅ | Spawn Python, stdin/stdout, timeout, error handling |
| `build-solver-input.ts` | ✅ | 3 fuentes de lockedCells: assignments bloqueados, requests, fixedDays |
| Endpoint `POST /months/:id/generate` | ✅ | `controllers/scheduling/schedule-generate.controller.ts` |
| Frontend botón + modal infeasible (versión básica) | ✅ | `SchedulingClient.tsx`. UX enriquecida (renderizar `conflictingConstraints` + `suggestedRelaxations` accionables) queda para Fase 3 paso 2. |
| Corpus vs solver (Python pytest) | ✅ | `scheduling-solver/tests/test_corpus.py` — 44/44 verdes |
| Parity validator TS | ✅ | `tests/scheduling/solver-parity.test.ts` — 4/4 verdes, 0 hard errors |

**Bugs corregidos en el cierre (2026-04-30):**

- `day_blocks.py`: M→T prohibition entre pares virtual→virtual causaba INFEASIBLE si el tail del mes anterior tenía M→T (e.g. por edición manual). Fix: skip cuando ambos días son virtuales (`d < 0 and d_next < 0`).
- `transitions.py`: mismo bug para N→M/T entre pares virtuales. Mismo fix.
- `night_block.py`: cuando `trailing_N > 0`, el solver podría generar un N-block NUEVO además de la continuación cross-month (2 bloques en el mismo mes). Fix: `sum(block_starts) == 0` cuando `trailing_N > 0` (solo se permite completar el bloque del mes anterior).

**Bugs corregidos post-cierre Fase 1 (encontrados en uso real, 2026-04-30):**

- `night_block.py` (regresión del fix anterior): `sum(block_starts) == 0` se aplicaba también cuando `trailing_N >= minNightBlock` (bloque ya COMPLETADO en el mes anterior). Empleado que terminó el mes con bloque cerrado no podía hacer noches el siguiente mes. Fix: la restricción estricta solo aplica cuando `0 < trailing_N < minNightBlock` (bloque incompleto) y la continuación es físicamente posible.
- `night_block.py` (nuevo caso): cuando `0 < trailing_N < minNightBlock` y las celdas necesarias para completar el mínimo están bloqueadas (ej: vacaciones al inicio del mes), el solver quedaba INFEASIBLE (no podía completar el bloque ni iniciar uno nuevo). Fix: detecta si la continuación es imposible por locked cells y, en ese caso, permite bloque nuevo.
- `build-solver-input.ts`: `minNightBlock`, `maxNightBlock`, `prefNightBlock` no se enviaban al solver — Python usaba defaults del schema. Ahora se leen de `configMap` y se envían explícitamente.

**Diferido a pre-producción (no bloqueante para Fase 1):**
- Migración Aiven de `scheduling_employee_requests` — aplicar `scripts/20260425_create_scheduling_employee_requests.sql` en Aiven + actualizar `aiven/19_scheduling.sql` + `MASTER_INSTALL.sql`.

**Criterios de cierre:**

- [x] `python main.py < input.json` resuelve 7 empleados × 28 días en < 5s con horario factible.
- [x] El endpoint `POST /months/:id/generate` funciona end-to-end desde el frontend.
- [x] Al menos 1 fixture UNSAT devuelve `status: 'infeasible'` con `conflictingConstraints` no vacío.
- [x] Cross-month continuity correcta: sin 4N+4N, sin T→M, libres respetados entre meses.
- [x] Output del solver pasa `ScheduleValidator.validate()` con 0 hard errors (4 fixtures, incl. cross-month).
- [x] Corpus: 44 tests Python (25 fixtures × 2 suites) contra el solver — 44/44 verdes.

### Fase 2 — Paridad de constraints + soft 🟢 CERRADA EN CÓDIGO (2026-04-30 → 2026-05-09; tuning diferido a producción)

**Objetivo:** el solver cubre TODAS las constraints actuales (hard) + minimiza soft penalty.

**Trabajo:**

1. ~~Night blocks, reglas por empleado~~ — adelantados a Fase 1 (H2, H3, employee_rules, day_blocks ya implementados).
2. ~~Rotation continuity~~ — ✅ cerrado 2026-05-09. Spec con manager (2026-05-02) redefinió el alcance: no hay patrón M→T→N predefinido; única regla de continuidad rotacional es T→M sin descanso = hard error. Ya implementado en TS (`rotation-continuity.constraint.ts`) y solver Python (`transitions.py`). F12/F13 cubren cross-month. Detalle en `SCHEDULING-DECISIONS-LOG.md` 2026-05-09.
3. ~~Función de coste para soft constraints~~ — ✅ implementado 2026-04-30.
4. ~~Ampliar corpus a 50+ fixtures~~ — ✅ implementado 2026-05-02: 51 fixtures (F01-F51). Cubre vacaciones boundary, meses cortos, leap year, fixedDays, noWeekends, cross-month, trailing N edge cases, coverage infeasible. Tests: 103 Python + 51 TS corpus + 22 TS parity verdes.
5. ~~Paridad validator TS ↔ solver Python~~ — ✅ implementado 2026-05-09: parity test cubre 24 fixtures (F11 y F30 reincorporados). **S4 `min_work_block` implementado como soft (no hard)** — alineado con catálogo CONSTRAINTS §3 peso 3. Validator TS ahora emite `warning` + softPenalty en vez de `error` (era bug). Solver Python penaliza bloques de 1-2 días en función objetivo (peso × días faltantes). Las noches siguen siendo hard via `night_block.py` (4-6 consec). 28 fixtures actualizadas con nueva softPenalty/severity.
6. ~~Benchmark con hotel sintético de 30 empleados × 31 días~~ — ✅ implementado 2026-05-09 (`scheduling-solver/tests/test_benchmark.py`). 30 rotatorios × 31 días resuelven en < 5s con CP-SAT FEASIBLE; softPenalty=40 (night_balance dominante). No reachea OPTIMAL en 60s — primer-feasible es válido y usable. Bugs detectados: `fixedShift=P` sin `fixedDays` causa INFEASIBLE en Python (filtrado en TS, no replicado en Python). Detalle y valoración de viabilidad: ver `SCHEDULING-DECISIONS-LOG.md` 2026-05-09.
7. ~~Daemon persistente~~ — ✅ implementado 2026-04-30.

**Bugs corregidos en Fase 2 (2026-05-02):**

- `createScheduleValidator` no pasaba `previousMonthHistory` al constructor → cross-month validation inactiva en REST API. Fix: fetch tail en `Promise.all`, helper `buildPreviousMonthHistory`.
- `schedule-generate.controller.ts`: delete + insert en operaciones separadas → mes vacío si insert falla. Fix: `applyGeneratedSchedule` en repo con `beginTransaction/commit/rollback`.
- `build-solver-input.ts`: `prefMonthlyLibre` no se enviaba al solver. Fix: añadido al `SolverConfig` + `SchedulingConfigMap`.

**Criterios de cierre:**

- [x] S4 `min_work_block` implementado como soft (validator TS + solver Python). F11 y F30 pasan parity (2026-05-09).
- [x] Rotation continuity cerrada (spec con manager 2026-05-02; T→M sin descanso = hard error en TS+Python).
- [x] Benchmark 30×31 resuelve en < 30s con optimizationLevel='balanced' (FEASIBLE en <5s, no OPTIMAL — aceptable, 2026-05-09).
- [x] Corpus 50+ fixtures: 51 fixtures, 103+51+24 tests verdes.
- [ ] **Diferido a producción:** el manager valida 3 meses en producción y se tunean pesos S1/S2/S3/S4 con feedback real. Bloqueado por uso productivo, no por código.

### Fase 3 — Producción y observabilidad 🟡 EN PROGRESO (2026-05-09 → en curso)

**Objetivo:** el solver es el camino principal; el flujo manual se mantiene como fallback.

**Trabajo:**

1. ~~Logging estructurado del solver (duración, soft penalty, branches explorados) persistido en tabla nueva `scheduling_solver_runs` para análisis posterior.~~ ✅ COMPLETADO 2026-05-12. DDL en `aiven/19_scheduling.sql` (Tabla 12); repo `insertSolverRun()` + hook en `schedule-generate.controller.ts` persiste cada outcome (ok/infeasible/error/exception) con snapshot de solver_input + solver_matrix (pre-edición) + soft_penalty + breakdown + cpStatus + tiempo. Persistencia best-effort: error de log no rompe la respuesta.
2. ~~UX de infeasibilidad: cuando el solver devuelve `infeasible`, el frontend muestra qué constraints conflictúan y qué relajación sugiere.~~ ✅ COMPLETADO 2026-05-12. Motor Python `_analyze_infeasibility` en `model.py` reemplaza el hardcode anterior — heurística sobre input real detecta `coverage_vs_capacity` (con números: turnos demandados vs capacidad real), `employee_locked_work_overload` (empleado con demasiados M/T/N bloqueados), `night_block_too_long`, `rest_hours_too_high`. Frontend `SchedulingClient.tsx` modal con botón "Aplicar" por relajación + `ConfirmDialog` warning + `applyRelaxationMutation` que llama `updateConfig` (camel→snake mapping) y reintenta `generateSchedule`. Tests: assertion en `test_corpus.py` verifica que el analyzer devuelve conflict con `humanExplanation` no vacía y relajaciones con valores válidos.
3. ~~Retirar el endpoint `generate-ai` y su código.~~ **Ya hecho en Fase 0** (ver entrada del 2026-04-24 en `SCHEDULING-DECISIONS-LOG.md`). Este paso queda vacío.
4. ~~Documentación mínima en `CLAUDE.md`~~ — ✅ implementado 2026-05-09. Dos secciones nuevas dentro del bloque "Scheduling System": "Running the solver locally" (daemon, estados, debug scripts, las 4 suites de tests) y "Adding a new constraint" (flujo de 6 pasos: clasificar en CONSTRAINTS.md → TS validator → Python solver → fixture corpus → 4 tests verdes → log de decisión).

**Criterios de cierre:**

- [ ] `scheduling_solver_runs` acumula ≥ 30 runs de producción.
- [ ] UX de infeasibilidad probada con al menos 3 escenarios.
- [x] `ai-generator.ts` y `ai-prompt.ts` borrados del repo (satisfecho en Fase 0, 2026-04-24).
- [x] Guía de desarrollo para añadir constraints en `CLAUDE.md` (2026-05-09).

#### Alcance acordado de "UX de infeasibilidad" vs. "bucle de feedback"

Distinción registrada 2026-05-09 tras pregunta del manager:

- **UX de infeasibilidad (este paso 2):** se dispara cuando el solver devuelve `status: 'infeasible'`. El motor ya devuelve `conflictingConstraints` + `suggestedRelaxations` (ver §3.2 del plan); falta el frontend que renderice eso de forma comprensible y permita actuar (relajar un parámetro, desbloquear una celda, retry). No tiene relación con horarios buenos/malos — se dispara cuando NO hay solución matemática posible bajo las constraints actuales.
- **Bucle de feedback de horarios generados** (manager edita post-generación, esas ediciones son señal de "esto era mejor que lo del solver"): es un ítem distinto, no incluido en este plan. Pertenece a "Después de Fase 3" y se conecta con tuning de pesos soft (Fase 2 punto 4 diferido). Cómo se ataca:
  1. Persistir la matriz solver-generada **antes** de aplicarla (en `scheduling_solver_runs` junto con stats).
  2. Después de N días, comparar matriz original vs. matriz final editada por el manager (diff celda a celda).
  3. Cada cambio recurrente es un patrón: "el solver pone M, manager cambia a T los lunes" → señal para subir peso S3 (shift_priority) o ajustar config.
  4. Refinar pesos manualmente con esos datos cada 2-3 meses.

  No es ML/RL todavía — es analítica humana sobre los logs. Pasar a ML supone Capa 3 LLM (plan aparte) o un proyecto de "warm-starting con histórico" (anotado en "Después de Fase 3").

### Después de Fase 3

- Capa 3 LLM (plan aparte).
- Explorar warm-starting del solver con soluciones previas.
- Multi-objetivo: permitir al manager elegir entre "mínimas violaciones soft" vs. "máxima estabilidad vs mes anterior".
- **Bucle de feedback "manager edita → ajusta pesos"** (ver subsección "Alcance acordado de UX de infeasibilidad" en Fase 3): construido sobre `scheduling_solver_runs` cuando esa tabla acumule histórico suficiente. Implica analítica de diffs solver↔manager y tuning iterativo de pesos S1-S4. No es ML; es trabajo humano informado por datos. **Solo cuenta la matriz publicada, no las ediciones intermedias en draft** (regla del manager 2026-05-09; ver `SCHEDULING-DECISIONS-LOG.md`).

---

## 5. Riesgos conocidos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Formulación CP-SAT lenta para 30+ empleados | Media | Alto | PoC en Fase 0; si es lento, explorar decomposición por semanas o warm-start |
| Divergencia validator TS vs. solver Python | Alta | Alto | Corpus de tests compartido desde Fase 0; en CI correr ambos contra el mismo corpus |
| Pesos de soft constraints mal tuneados → horarios "raros" | Alta | Medio | Fase 2 dedica trabajo específico al tuneo con meses reales |
| ~~Python no disponible en el deployment target~~ ✅ resuelto | — | — | El Node buildpack de Render incluye `python3`. `package.json` `build` script crea venv + instala ortools. Funciona en producción desde 2026-05. Pendiente menor: anclar versión Python con `.python-version` (TODO.md Sprint 2) |
| Cambios de convenio invalidan constraints | Baja | Medio | `SCHEDULING-CONSTRAINTS.md` es fácil de actualizar; lógica cambia en 2 sitios + tests |
| UNSAT opaco (el solver dice "no hay solución" sin explicar) | Media | Medio | `sufficient_assumptions_for_infeasibility` de CP-SAT + trabajo dedicado en Fase 3 |

---

## 6. Referencias

- **Catálogo de reglas:** `SCHEDULING-CONSTRAINTS.md`
- **Histórico de decisiones:** `SCHEDULING-DECISIONS-LOG.md`
- **Proyecto general:** `ROADMAP.md`
- **Guía para agentes:** `CLAUDE.md` (sección "Scheduling System")
- **OR-tools CP-SAT:** https://developers.google.com/optimization/cp/cp_solver
- **Nurse rostering (problema canónico análogo):** https://developers.google.com/optimization/scheduling/employee_scheduling

---

## 7. Cómo mantener vivo este documento

- Cada cierre de fase: marcar criterios, añadir sección "Cierre Fase N" con fecha, tiempo real vs estimado, decisiones que cambiaron.
- Cada decisión de diseño nueva que surja durante la implementación: registrarla en `SCHEDULING-DECISIONS-LOG.md` (append-only) y, si altera algo invariante aquí, actualizar la sección correspondiente con un changelog al final.
- Si una fase se estanca > 50% sobre estimación: detener, replantear en este archivo, no seguir empujando.


-----------------------

Plan escrito. Resumen de lo que tienes ahora:

  Estructura final del documento                                                                                                        
   
  7 secciones en ~12KB densos:                                                                                                          
                                                                                                                                      
  1. Contexto y norte — estado actual, problema, arquitectura de 3 capas, criterio global de éxito medible                              
  2. Decisiones invariantes — 7 decisiones que no se renegocian (solver, lenguaje, integración CLI, SoT de constraints, hard/soft,
  compatibilidad manual, celdas bloqueadas)
  3. Contratos de datos — schemas TS completos de input/output del CLI, contrato de exit codes, ubicación de archivos
  4. Plan de fases — Fase 0 (1-2 sem), 1 (3-5 sem), 2 (4-6 sem), 3 (2-3 sem), cada una con trabajo y checklist de criterios de cierre
  medibles
  5. Riesgos conocidos — tabla con probabilidad, impacto y mitigación
  6. Referencias cruzadas
  7. Cómo mantener vivo el documento

  Lo que NO hay (deliberadamente)

  - Cronograma día-a-día (es ficción)
  - Código de ejemplo del solver (es descubrimiento de Fase 1)
  - Prompts del LLM o diseño de Capa 3 (muy lejos)
  - Detalles de UI (no es plan técnico del core)

  Qué revisar tú ahora

  Lee el documento y fíjate especialmente en:

  1. Sección 2 (invariantes) — si alguna decisión ahí no te cuadra, es MUCHO más barato replantearla hoy que en Fase 2.
  2. Criterios de cierre de cada fase — ¿son realistas? ¿Falta alguno? Estos son el freno que evita que las fases se alarguen sine die.
  3. Riesgos — ¿falta alguno que te preocupe?

  Siguiente acción

  Cuando valides el plan, lo lógico es pasar a Fase 0 paso 1: completar SCHEDULING-CONSTRAINTS.md. Eso lo hacemos en otra sesión con el
  validator TS delante, extrayendo cada constraint actual, clasificándola y documentándola.

  Pásame feedback, lagunas, objeciones o luz verde.