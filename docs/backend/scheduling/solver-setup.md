# Scheduling Solver — Setup y Referencia

**Ubicación:** `backend/scheduling-solver/`  
**Runtime:** Python 3.10+ con Google OR-Tools (CP-SAT)  
**Última actualización:** Mayo 2026

---

## Tabla de Contenidos

1. [Cómo funciona el daemon](#1-cómo-funciona-el-daemon)
2. [Setup inicial (una sola vez)](#2-setup-inicial-una-sola-vez)
3. [Workflow día a día](#3-workflow-día-a-día)
4. [Protocolo de comunicación stdin/stdout](#4-protocolo-de-comunicación-stdinstdout)
5. [Estados del daemon](#5-estados-del-daemon)
6. [SolverInput — campos](#6-solverinput--campos)
7. [SolverOutput — campos](#7-solveroutput--campos)
8. [Constraints Python — referencia](#8-constraints-python--referencia)
9. [Función objetivo (soft)](#9-función-objetivo-soft)
10. [Reglas cross-month](#10-reglas-cross-month)
11. [Tests del solver](#11-tests-del-solver)
12. [Debugging](#12-debugging)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Cómo funciona el daemon

El solver **no es un proceso que se lanza por petición**. Es un **daemon persistente** que el backend Node.js arranca una única vez al iniciarse y mantiene vivo durante toda la vida del servidor.

```
Backend Node.js (index.ts)
        │
        │ warmupSolver()   ← llamado al arrancar
        ▼
solver-client.ts
        │
        │ spawn("python", ["scheduling-solver/daemon.py"])
        ▼
daemon.py
        │
        │ importa OR-Tools (lento, ~5-10s, solo una vez)
        │ imprime "READY" en stdout
        ▼
Estado: ready
        │
        │ Por cada petición de generación:
        │   stdin  ← JSON (una línea)
        │   stdout → JSON (una línea)
        ▼
```

**Por qué**: Importar OR-Tools tarda varios segundos. El daemon lo importa una vez al arrancar y reutiliza el proceso para todas las peticiones. El semáforo en `solver-client.ts` garantiza que solo haya una petición activa a la vez.

---

## 2. Setup inicial (una sola vez)

```bash
cd backend/scheduling-solver

# Crear entorno virtual local
python -m venv venv

# Instalar dependencias (Windows)
venv\Scripts\pip install ortools pydantic pytest

# Instalar dependencias (Linux/Mac)
venv/bin/pip install ortools pydantic pytest
```

El venv queda en `backend/scheduling-solver/venv/` y está en `.gitignore`.

> **En producción (Render):** el build command debe recrear el venv. Ver `TODO.md` sección "Deploy en Render".

---

## 3. Workflow día a día

```bash
# Opción A: backend completo (recomendado)
cd backend
pnpm dev:local        # arranca Node + spawn del daemon automáticamente

# Opción B: solo el solver (sin Node, para iterar en constraints Python)
cd backend/scheduling-solver
venv\Scripts\python daemon.py    # Windows
venv/bin/python daemon.py        # Linux/Mac
```

Al arrancar el backend, `solver-client.ts` lanza `daemon.py` y llama a `warmupSolver()` desde `index.ts`. OR-Tools se importa mientras el servidor está iniciando — cuando llega la primera petición, el daemon ya está en estado `ready`.

---

## 4. Protocolo de comunicación stdin/stdout

El daemon lee y escribe **una línea JSON por mensaje** (newline-delimited JSON).

### Request (Node → Python)

```json
{"month": {...}, "employees": [...], "days": [...], ...}
```

Una sola línea, terminada en `\n`. El formato exacto corresponde al schema `SolverInput` (ver §6).

### Response (Python → Node)

```json
{"status": "ok", "matrix": {...}, "stats": {...}}
```

o en caso de insolubilidad:

```json
{"status": "infeasible", "conflictingConstraints": [...], "suggestedRelaxations": [...]}
```

### Handshake inicial

Al arrancar, el daemon imprime `READY` en stdout (antes de cualquier petición). `solver-client.ts` espera este mensaje antes de marcar el daemon como disponible.

---

## 5. Estados del daemon

Gestionados en `services/scheduling/solver-client.ts`:

| Estado | Descripción |
|--------|-------------|
| `idle` | No iniciado todavía |
| `starting` | Proceso spawneado, esperando `"READY"` en stdout (timeout: 30 min) |
| `ready` | Disponible para recibir peticiones |
| `solving` | Procesando una petición (semáforo activo) |

Si el daemon muere inesperadamente (crash Python, error de OR-Tools), la siguiente llamada detecta el broken pipe y **re-lanza el daemon automáticamente**.

---

## 6. SolverInput — campos

Definido en `scheduling-solver/schemas.py` (Pydantic) y `backend/services/scheduling/types/solver.ts` (TypeScript).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `month` | objeto | `{ year, month, numDays }` |
| `employees` | lista | Ver sub-tabla abajo |
| `days` | lista | `[{ dayNumber, date, dayOfWeek, isHoliday }]` |
| `assignments` | dict | `{ employeeId: { dayNumber: shiftCode } }` — assignments actuales |
| `lockedCells` | lista | `[{ employeeId, dayNumber, shiftCode }]` — no modificar |
| `config` | objeto | Todos los campos de `scheduling_config` |
| `previousMonthHistory` | objeto/null | Últimos 7 días del mes anterior + historial de noches |
| `nightsHistory` | lista | Noches acumuladas por empleado hasta este mes |

#### Employee fields

| Campo | Descripción |
|-------|-------------|
| `id` | ID del empleado |
| `name` | Nombre |
| `shiftPriority` | Turno preferente (`M`, `T`, `N`, `P`, etc.) |
| `fixedShift` | Turno fijo (si aplica) |
| `fixedDays` | Patrón de días fijos (pre-expandido en `lockedCells` por `build-solver-input.ts`) |
| `noWeekends` | Boolean |

#### Config fields relevantes para el solver

| Clave | Default Python | Descripción |
|-------|---------------|-------------|
| `minNightBlock` | 4 | Mínimo de noches consecutivas por bloque |
| `maxNightBlock` | 6 | Máximo de noches consecutivas por bloque |
| `prefNightBlock` | 5 | Tamaño preferido del bloque de noches |
| `minMonthlyLibre` | 9 | Mínimo de días L por mes |
| `maxMonthlyLibre` | 11 | Máximo de días L por mes |
| `minMorningStaff` | — | Mínimo de personal de mañana |
| `maxConsecutiveWorkDays` | — | Máximo de días consecutivos de trabajo |

> Los valores de `config` siempre se envían desde Node. Los defaults de Python solo actúan como fallback si falta algún campo.

---

## 7. SolverOutput — campos

### Si status = 'ok'

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `"ok"` | |
| `matrix` | dict | `{ employeeId: { dayNumber: shiftCode } }` — horario generado |
| `stats` | objeto | Estadísticas: noches por empleado, libres, penalizaciones soft |
| `stats.softPenalty` | number | Penalización total de la función objetivo |
| `stats.softPenaltyBreakdown` | dict | Desglose por clave de weight (S1, S2, S3) |

### Si status = 'infeasible'

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `"infeasible"` | |
| `conflictingConstraints` | lista | Constraints que se contradicen |
| `suggestedRelaxations` | lista | Sugerencias de qué relajar |

---

## 8. Constraints Python — referencia

Cada constraint vive en `scheduling-solver/constraints/` y expone `apply(model, x, input, employees, days, virtual_days_by_emp=None)`.

### `coverage.py` — Cobertura de personal

**Hard:** cada día debe tener entre `min` y `max` empleados de cada turno (M, T, N).  
No itera sobre días virtuales (solo aplica a días reales del mes).

### `night_block.py` — Bloque de noches

**Hard:** cada empleado que hace noches debe tener **exactamente 1 bloque** de `minNightBlock..maxNightBlock` noches consecutivas por mes.

Lógica cross-month (`trailing_N` = noches consecutivas al final del mes anterior):

| trailing_N | Comportamiento |
|-----------|----------------|
| 0 | Puede empezar bloque normalmente |
| 0 < trailing_N < minNightBlock | Bloque incompleto: debe completarlo al inicio del mes. **Excepción**: si las celdas necesarias están bloqueadas (vacación), se levanta la restricción y puede empezar bloque nuevo |
| trailing_N ≥ minNightBlock | Bloque ya completado; puede empezar bloque nuevo en este mes |
| trailing_N ≥ maxNightBlock | Día 1 forzado a no-N (ya alcanzó el máximo) |

### `transitions.py` — Transiciones prohibidas

**Hard:** Las siguientes transiciones de turno están prohibidas:
- `N → M`
- `N → T`
- `N → PI`
- `N → P`
- `T → M`

Aplica cross-month usando días virtuales.

### `rest.py` — Descanso consecutivo

**Hard:**
- Máximo 6 días consecutivos de trabajo.
- Mínimo 2 días de descanso en cualquier ventana de 7 días.

Aplica cross-month.

### `day_blocks.py` — Bloques de turno

**Hard:**
- Los turnos M y T deben hacerse en bloques consecutivos de mínimo 3 días (`MIN_SHIFT_BLOCK=3`).
- El cambio directo M → T está prohibido.

Cross-month con `_TAIL_LENGTH=7`.

### `libres.py` — Libres mensuales

**Hard (mínimo):** cada empleado sin `fixedDays` debe tener al menos `minMonthlyLibre` días L por mes.  
El mínimo efectivo se reduce por cada día de descanso especial bloqueado (`V`, `B`, `E`, `IT`, `FO`, `A`) en el mes.

`_SPECIAL_REST = {"V", "B", "E", "IT", "FO", "A"}`

**Hard (máximo):** no más de `maxMonthlyLibre` días L.

No aplica a empleados con `fixedDays` (su patrón ya garantiza los libres).

### `locked_cells.py` — Celdas bloqueadas

**Hard:** las celdas en `lockedCells` deben mantenerse exactamente como están.  
`_BASE_SHIFTS = {"M", "T", "N", "L"}` — solo estas se bloquean mediante este constraint; los especiales (V, B, etc.) ya llegan como lockedCells con su código real.  
Los días virtuales (índice negativo) se ignoran aquí.

### `employee_rules.py` — Reglas de empleado

**Hard:**
- `noWeekends`: fuerza `L` en sábados y domingos del empleado.
- `fixedShift`: prohíbe asignar turnos de trabajo distintos al fijo. `WORK_SHIFTS = {"M", "T", "N"}`.

---

## 9. Función objetivo (soft)

El solver minimiza la suma ponderada:

| ID | Peso | Descripción |
|----|------|-------------|
| **S1** | 10 | Balanceo de noches — minimiza el rango (max − min) de noches acumuladas usando `nightsHistory` |
| **S2** | 2 | Penaliza L aislado: un L sin L adyacente el día anterior ni el siguiente |
| **S3** | 1 | Penaliza turnos distintos al `shiftPriority` del empleado |

Los pesos están fijados en `model.py`. Los equivalentes TypeScript están en `soft-weights.ts` (aunque el validador TS usa claves distintas; son paralelos, no el mismo objeto).

---

## 10. Reglas cross-month

Varios constraints iteran sobre `all_days = virtual_days + real_days` para manejar continuidad entre meses.

- Los días virtuales tienen índices `-7` a `-1`.
- Sus shift codes vienen de `previousMonthHistory.tail` y se pre-bloquean en `locked_cells.py`.
- Constraints que usan días virtuales: `night_block`, `transitions`, `rest`, `day_blocks`.

El historial de noches acumuladas (`nightsHistory`) se usa en la función objetivo S1 para balancear el reparto de noches a lo largo del año.

---

## 11. Tests del solver

### Suite Python (sin Node)

```bash
cd backend/scheduling-solver

# Suite completa (~15s)
venv\Scripts\python -m pytest tests\

# Solo corpus (fixtures JSON)
venv\Scripts\python -m pytest tests\test_corpus.py

# Stress test 30×31 (desactivado por defecto)
venv\Scripts\python -m pytest tests\test_benchmark.py --runbenchmark
```

| Archivo | Qué verifica |
|---------|-------------|
| `test_corpus.py` | Carga fixtures de `backend/tests/scheduling-corpus/fixtures/`; ningún fixture crashea; los marcados en `SOLVABLE_FIXTURES` dan `status='ok'` |
| `test_daemon_stress.py` | Arranque del daemon, peticiones válidas/inválidas, recuperación tras error |
| `test_benchmark.py` | 30 empleados × 31 días; solo se ejecuta con `--runbenchmark` |
| `conftest.py` | Fixtures compartidos |

### Suite de paridad (Node + Python)

```bash
cd backend

# Verifica que el output del solver pasa el validador TS sin errores hard
pnpm vitest run tests/scheduling/solver-parity.test.ts

# Solo el validador TS contra los fixtures JSON (sin Python)
pnpm vitest run tests/scheduling/corpus.test.ts
```

Los cuatro tests deben estar en verde antes de hacer merge de cambios en constraints.

---

## 12. Debugging

### Ver el mes en DB sin arrancar el servidor

Hay tres helpers Node en `backend/` (no son tests):

| Script | Qué hace |
|--------|----------|
| `debug-compare.js` | Lista meses en la DB con su estado |
| `debug-month.js` | Imprime todos los assignments de un mes por ID |
| `debug-sept.js` | Dump completo: empleados, locked cells, el SolverInput exacto que se enviaría, y el output del solver |

```bash
# Edita el mes ID dentro del script, luego:
cd backend
node debug-sept.js
```

Útil cuando el solver devuelve `infeasible` en producción y quieres ver exactamente qué recibió.

### Probar el daemon en aislado

```bash
cd backend/scheduling-solver
venv\Scripts\python daemon.py
# Espera "READY"
# Luego pega una línea JSON de SolverInput y pulsa Enter
```

### Logs del solver-client

`solver-client.ts` loguea en consola los cambios de estado del daemon. Busca:

```
[solver-client] Daemon spawned, waiting for READY...
[solver-client] Daemon ready
[solver-client] Solving request...
[solver-client] Solve completed in Xms
[solver-client] Daemon died unexpectedly, respawning...
```

---

## 13. Troubleshooting

### `"Solver not ready"` al hacer clic en Generar

El daemon no ha completado el arranque. Espera unos segundos y reintenta. Si el problema persiste:
1. Comprueba que el venv existe: `backend/scheduling-solver/venv/`
2. Comprueba que OR-Tools está instalado: `venv\Scripts\pip show ortools`
3. Revisa los logs del backend en la consola.

### `"infeasible"` en la generación

El solver no encontró solución con las constraints actuales. Causas comunes:
1. Demasiadas celdas bloqueadas (vacaciones, bajas) que impiden cumplir la cobertura mínima.
2. Un bloque de noches incompleto del mes anterior más vacaciones al inicio del mes actual que no dejan margen.
3. Configuración de staffing mínimo demasiado alta para el número de empleados disponibles.

**Para diagnosticar:** usa `debug-sept.js` para inspeccionar el `SolverInput` exacto y el campo `conflictingConstraints` del output.

### OR-Tools no se instala en Windows

```bash
# Asegúrate de usar Python 3.10+ de 64 bits
python --version
# Si hay problemas con pip:
venv\Scripts\python -m pip install --upgrade pip
venv\Scripts\pip install ortools
```

### El daemon no arranca en producción (Render)

El build command de Render debe incluir la creación del venv Python. Ver `TODO.md` sección "Deploy en Render" para el comando exacto.

---

**Ver también:**
- [`README.md`](./README.md) — Arquitectura completa del módulo de Scheduling
- [`AGENTS.md`](/AGENTS.md) — Referencia de reglas del solver y guía para añadir constraints
