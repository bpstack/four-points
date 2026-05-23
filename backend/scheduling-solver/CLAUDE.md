# CLAUDE.md — Scheduling Solver (Python / CP-SAT)

> Contexto específico de este directorio. El `CLAUDE.md` raíz cubre el sistema de scheduling de extremo a extremo (UI + backend TS + solver). Este archivo se centra en la pieza Python: daemon, modelo CP-SAT, constraints, tests y deploy.

## Propósito

Resolver el problema de asignación mensual de turnos como un modelo de Constraint Programming (CP-SAT, Google OR-Tools). Recibe un `SolverInput` JSON desde el backend TS, devuelve un `SolverOutput` con la matriz `empleado → día → turno` o un diagnóstico de infeasibilidad.

No tiene estado propio: cada petición es pura. La única razón por la que existe como daemon persistente y no como proceso por petición es el coste de importar `ortools` (~2-3 s) — pagarlo una vez al arrancar Node es ~100× más barato.

## Arquitectura

```
daemon.py        ← entry point persistente; bucle stdin/stdout JSON line-delimited
main.py          ← entry point one-shot CLI (legacy, mantener para debug puntual)
schemas.py       ← Pydantic: SolverInput / SolverOutput (contrato con Node)
model.py         ← Construye el modelo CP-SAT, aplica constraints, optimiza, decodifica
constraints/     ← Un archivo por constraint hard, mismo signature apply(model, x, input, ...)
  coverage.py        — H1: cobertura mínima M/T/N por día
  night_block.py     — H2: bloques de noches consecutivos [min, max]
  transitions.py     — H3: transiciones prohibidas (N→M/T/PI/P, T→M)
  rest.py            — H4 (max consec work) + H5 (≥2 rest en ventana 7)
  libres.py          — H6: libres mensuales [min, max]
  locked_cells.py    — H7: celdas bloqueadas + turnos especiales solo en bloqueos
  day_blocks.py      — Bloques mínimos M/T consecutivos, prohíbe M→T
  employee_rules.py  — noWeekends, fixedShift por empleado
tests/
  test_corpus.py        — Recorre fixtures JSON del repo y verifica que ninguno crashea; los marcados SOLVABLE devuelven status='ok'
  test_daemon_stress.py — Arranque, requests válidas/inválidas, recuperación del daemon
  test_benchmark.py     — 30×31 stress (opt-in con --runbenchmark)
```

## Comunicación con Node

**Protocolo (línea por petición, sincrónico):**

```
stdin  → 1 línea JSON (SolverInput)
stdout → 1 línea JSON (SolverOutput o {"status":"ready"} en el arranque)
stderr → logs de debug (Node los expone con prefijo)
```

Al arrancar, el daemon imprime `{"status":"ready"}` para que `solver-client.ts` (Node) sepa que `ortools` ya está cargado y puede aceptar peticiones. Si recibe EOF en stdin termina limpiamente.

El cliente Node (`backend/services/scheduling/solver-client.ts`) gestiona:
- Estado del daemon: `idle` → `starting` → `ready` → `busy`
- Semáforo: una petición a la vez (CP-SAT no es thread-safe per process)
- Abort-safe: el semáforo no se libera hasta que el daemon responde
- Respawn transparente si el proceso muere (broken pipe → relanza)

## Variables del modelo CP-SAT

```python
x[e, d, s] = BoolVar   # empleado índice e, día d, turno s
```

Restricción base: `exactly_one(x[e, d, s] for s in all_shifts_needed)` por cada (e, d).

**Días reales:** 1..N (N=28-31). **Días virtuales:** -7..-1, sólo para empleados con `previousMonthTail` no vacío; las celdas virtuales están bloqueadas desde el tail del mes anterior publicado. Todos los constraints iteran sobre `all_days = virt_days + real_days` para que la continuidad cross-month sea uniforme.

**Conjuntos de turnos relevantes en `model.py`:**

| Constante | Contenido | Uso |
|---|---|---|
| `ASSIGNABLE_SHIFTS` | M, T, N, L | Lo que el solver puede asignar libremente |
| `WORK_SHIFTS` | M, T, N | Para shiftPriority y métricas estándar de trabajo |
| `ALL_WORK_SHIFTS` | M, T, N, P, PI | Detección de bloques de trabajo para S4 — incluye P/PI para paridad con `isWorkShift` del validator TS |
| `_SPECIAL_REST` | V, B, E, IT, FO, A | Tipos de descanso especial (vacación, IT, etc.) — el solver no los asigna libremente; sólo entran por lockedCells |
| `TAIL_LENGTH = 7` | — | Días del mes anterior que se proyectan como virtuales |

El conjunto `all_shifts_needed` que se materializa en variables es `ASSIGNABLE_SHIFTS ∪ (códigos vistos en lockedCells) ∪ (códigos vistos en previousMonthTail)`. Así si un mes tiene vacaciones bloqueadas, V se materializa; si no las hay, no se crea variable inútil.

## Hard constraints

Cada archivo en `constraints/` expone una función:

```python
def apply(model, x, input, employees, days, virtual_days_by_emp=None):
    ...
```

`employees` y `days` se pasan por conveniencia (evita reextraerlos de `input`). `virtual_days_by_emp` es opcional; las constraints que necesitan continuidad cross-month (`rest`, `night_block`, `transitions`, `day_blocks`) iteran sobre `all_days_e = virt_days + day_numbers`. Las que no (`coverage`, `libres`, `employee_rules`, `locked_cells`), no.

**Notas finas por constraint:**

- **H2 night_block.** Cada empleado rotatorio hace exactamente **1 bloque** de `minNightBlock..maxNightBlock` noches consecutivas por mes. Reglas según `trailing_N` (noches consecutivas que arrastra del mes anterior):
  - `trailing_N == 0`: puede iniciar bloque nuevo libremente.
  - `0 < trailing_N < minNightBlock`: bloque incompleto del mes anterior; **prohibido iniciar bloque nuevo** (debe completar el del mes anterior al inicio del mes). **Excepción**: si las celdas necesarias para completar el mínimo están bloqueadas (ej: vacación al inicio del mes), se levanta la restricción y puede iniciar bloque nuevo más adelante.
  - `trailing_N >= minNightBlock`: bloque ya completado; puede iniciar nuevo en el mes actual.
  - `trailing_N >= maxNightBlock`: día 1 forzado a **no-N** (bloque en máximo).

- **H5 rest (ventana 7 con ≥2 descansos) y H4 (max consec work).** Iteran sobre `all_days_e`. **Gotcha cross-month documentado (2026-05-20):** si el tail virtual del mes anterior ya viola el constraint matemáticamente (ej: 6 turnos seguidos al cierre del mes anterior), la ventana es unsatisfiable y produciría INFEASIBLE artificial al generar el nuevo mes. `rest.py` **omite explícitamente** estas ventanas "doomed" — la validación del mes anterior es responsabilidad del mes anterior. Razonamiento completo en `SCHEDULING-DECISIONS-LOG.md` (entrada 2026-05-20). Deuda pendiente: el TS validator no aplica esta misma exención todavía → posible drift. Ver `SCHEDULING-CONSTRAINTS.md §H5`.

- **H6 libres.** El mínimo mensual se reduce por el número de días de descanso especial bloqueados (V/B/E/IT/FO/A) que ya tenga el empleado.

- **H7 locked_cells.** Skip de claves negativas (los días virtuales ya se bloquean en `model.py` al crear las variables del tail). Turnos especiales (V/B/IT/E/FO/A) solo aparecen donde hay lockedCell; el solver nunca los asigna libremente a otros empleados.

- **day_blocks.** Bloques mínimos consecutivos M y T (`day_block_min` del config). Prohíbe transición M→T sin libre intermedio.

- **employee_rules.** `noWeekends` fuerza L en sábado/domingo para el empleado afectado. `fixedShift ∈ {M,T,N}` prohíbe otros turnos de trabajo (solo el fijo o L). `fixedDays` **NO se aplica aquí** — se pre-expande en `build-solver-input.ts` y entra como `lockedCells`. Empleados con `fixedShift='P'` y sin `fixedDays` son **excluidos del solver** (patrón desconocido).

## Función objetivo (soft)

Pesos en `model.py`:

```python
W_NIGHT_BALANCE    = 10   # S1
W_ISOLATED_L       = 2    # S2
W_SHIFT_PRIORITY   = 1    # S3
W_SHORT_WORK_BLOCK = 3    # S4 (por día faltante; 1-día → ×2, 2-día → ×1)
```

| ID | Qué penaliza | Cómo se mide | Desglose en `softPenaltyBreakdown` |
|---|---|---|---|
| **S1** | Desbalance de noches entre empleados rotatorios | `range(total_N)` = max - min sobre `nightsHistory + noches del mes` | Sí: clave `night_balance` |
| **S2** | L "aislado" (sin L adyacente día anterior ni siguiente) | Indicador booleano `iso[e,d]` por cada celda L candidata | No (contribuye al total) |
| **S3** | Día de trabajo en turno distinto al `shiftPriority` del empleado | Suma directa de `x[e, d, s]` con `s != priority` | No (contribuye al total) |
| **S4** | Bloque de trabajo corto (1-2 días consecutivos cuando el mínimo es 3) | Indicadores `short1` (×2) y `short2` (×1); incluye días virtuales del tail | Sí: clave `min_work_block_short` |

S2/S3 contribuyen al `softPenalty` total pero no se desglosan individualmente — decisión consciente porque no aportan accionabilidad. Si en algún momento se necesita auditar uno, replicar el patrón de S1/S4 (acumulador `*_vars` y lectura post-solve).

## Infeasibility analyzer

`_analyze_infeasibility(input, elapsed_ms)` en `model.py` corre cuando CP-SAT devuelve `INFEASIBLE`. Es **heurístico**, no usa `sufficient_assumptions_for_infeasibility` (eso requeriría refactor a modelo con assumption vars).

Detecta:
1. **Coverage vs capacity:** demanda agregada (`min*Staff × num_days`) vs capacidad (`empleados rotatorios × días - libres mínimos - turnos especiales bloqueados`).
2. **Empleado individual sobrebloqueado:** demasiados M/T/N en lockedCells → no caben los libres mínimos.
3. **Night block demasiado largo:** `minNightBlock > num_days / num_rotatorios`.
4. **Rest hours absurdas:** `minRestHours > 48`.

Devuelve `(conflictingConstraints, suggestedRelaxations)`. Sugerencias por defecto: bajar `minMonthlyLibre` antes que bajar cobertura (menos disruptivo). Si nada matchea, fallback genérico.

Cuando aparezca un INFEASIBLE en producción que el analyzer no diagnostica, **no añadir parche aquí ciegamente**: usa `debug-sept.js` (ver abajo) para inspeccionar el `SolverInput` real, identifica el patrón, y entonces extiende el analyzer con una nueva rama. Mejor un mensaje correcto y específico que mil mensajes genéricos.

## Setup local

```bash
cd backend/scheduling-solver
python -m venv venv                       # crear venv
venv/Scripts/pip install ortools pydantic pytest    # Windows
# venv/bin/pip install ortools pydantic pytest      # Linux/Mac
```

El venv vive aquí y está en `.gitignore`. En Render (deploy), el build command recrea el venv — ver `TODO.md` § "Deploy en Render" si toca tocar el deploy.

`requirements.txt` y `pyproject.toml` son fuentes alternativas; en la práctica usamos los pins inline arriba para el dev local.

## Tests

| Suite | Cmd | Tiempo aprox | Qué cubre |
|---|---|---:|---|
| Corpus Python | `venv/Scripts/python -m pytest tests/test_corpus.py` | ~5 s | Fixtures del repo (`backend/tests/scheduling-corpus/fixtures/`) — todos deben parsearse y los SOLVABLE devolver status='ok' |
| Daemon stress | `venv/Scripts/python -m pytest tests/test_daemon_stress.py` | ~5 s | Arranque, JSON inválido, schema inválido, recuperación tras error |
| Benchmark | `venv/Scripts/python -m pytest tests/test_benchmark.py --runbenchmark` | ~30-60 s | 30 empleados × 31 días — perf check, opt-in |
| **Parity (vive en TS)** | desde `backend/`: `pnpm vitest run tests/scheduling/solver-parity.test.ts` | ~5 s | Solver output → TS validator → 0 errores hard. Detecta drift entre la lógica Python y la TS. **El test que más vale la pena correr cuando tocas una constraint.** |

`SOLVABLE_FIXTURES` en `tests/test_corpus.py` y `PARITY_FIXTURES` en el test TS son las dos listas a mantener sincronizadas si añades un fixture nuevo solver-reachable.

## Cómo añadir una constraint nueva (lado Python)

> Guía completa cross-lenguaje (TS validator + Python solver + fixtures) en el `CLAUDE.md` raíz, § "Adding a new constraint". Aquí solo la parte Python.

1. Crear `constraints/<nombre>.py` con la signatura estándar `apply(model, x, input, employees, days, virtual_days_by_emp=None)`. Mirar `coverage.py` para template simple, `rest.py` para template con cross-month, `night_block.py` para template con trailing.

2. **Hard:** usar `model.add(...)` para asertar la regla. **Soft:** introducir BoolVars indicadoras y añadir términos ponderados a `objective_terms` en `solve()`. Patrón de referencia para soft con cross-month: la implementación de S4 (`W_SHORT_WORK_BLOCK`) en `model.py`.

3. Importar y llamar `apply()` desde `model.solve()` después de las constraints existentes. El orden no importa para correctness (CP-SAT es declarativo), pero agrupar reglas relacionadas mejora la legibilidad.

4. Si contribuye al `softPenalty`, exponerla en `softPenaltyBreakdown` con la **misma clave** que use `soft-weights.ts` del lado TS. La paridad de claves es lo que hace que el dashboard de stats pueda comparar.

5. Correr en este orden:

```bash
venv/Scripts/python -m pytest tests/test_corpus.py    # no crashes
cd .. && pnpm vitest run tests/scheduling/solver-parity.test.ts   # 0 hard errors post-solve
```

Si parity falla, el solver y el validator TS discrepan: revisa qué dice `SCHEDULING-CONSTRAINTS.md` (la fuente de verdad) y arregla el lado que diverge.

6. Documentar la decisión en `SCHEDULING-DECISIONS-LOG.md` (fecha, regla, hard/soft, peso si aplica).

## Debug helpers (viven en `backend/`, no aquí)

Tres helpers Node conectan directamente a la BD local para inspeccionar estado sin levantar el servidor entero:

- `backend/debug-compare.js` — lista meses en BD con su estado.
- `backend/debug-month.js` — vuelca todas las assignments de un mes (editar ID dentro).
- `backend/debug-sept.js` — debug dump completo de un mes hardcodeado: empleados, locked cells, el `SolverInput` JSON que se enviaría, y el solver output. **Útil cuando producción devuelve INFEASIBLE y quieres reproducir localmente lo que entró exactamente.**

Uso típico: editas el `monthId` dentro del script y `node debug-sept.js`.

## Referencias cruzadas

- `SCHEDULING-CONSTRAINTS.md` (raíz del repo) — especificación textual de las reglas. Fuente de verdad cuando código y constraints discrepan.
- `SCHEDULING-DECISIONS-LOG.md` (raíz del repo) — bitácora de decisiones (por qué cada constraint es hard/soft, por qué los pesos, qué se intentó y descartó).
- `SCHEDULING-SOLVER-PLAN.md` (raíz del repo) — plan original del solver. Histórico, no se actualiza; el código es la verdad actual.
- `backend/services/scheduling/build-solver-input.ts` — el lado TS que arma el `SolverInput`. Cualquier campo nuevo aquí necesita su contraparte allí.
- `backend/services/scheduling/solver-client.ts` — gestión del proceso daemon, semáforo, respawn.
