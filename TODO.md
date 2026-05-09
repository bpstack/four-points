# TODO — Four-Points PMS

> El roadmap del solver de scheduling está en `SCHEDULING-SOLVER-PLAN.md`.
> Este archivo es para tareas generales del proyecto que no tienen plan detallado propio.

---

## ⚠️ IMPORTANTE — Deploy en Render: dependencia Python (scheduling solver)

El solver de scheduling requiere Python 3.11 + ortools (~350 MB) corriendo como daemon.
Hay problemas reales a resolver **antes de desplegar a producción en Render**:

### Problema 1 — Venv no existe en el deploy (BLOQUEANTE)
`backend/scheduling-solver/venv/` está en `.gitignore` → nunca llega a Render.
El backend hace `spawn('venv/bin/python')` y falla con ENOENT.

**Fix**: añadir al build command de Render:
```
pnpm install && python3 -m venv scheduling-solver/venv && scheduling-solver/venv/bin/pip install --no-cache-dir ortools pydantic
```
O como script `build` en `backend/package.json` para que Render lo ejecute automáticamente.

### Problema 2 — Python 3.11 no garantizado en Render (BLOQUEANTE)
Render usa Ubuntu pero no garantiza Python 3.11 en todos los buildpacks.
Verificar la versión disponible o forzarla con:
```
# backend/scheduling-solver/.python-version
3.11
```

### Problema 3 — Build lento por ortools (~350 MB)
Cada deploy reinstala ortools desde cero. En Render free/starter puede tardar 5-10 min.
Solución real: habilitar **build cache** en Render (planes pagados) o aceptar el tiempo.

### Problema 4 — Cold start tras inactividad (Render free tier)
El plan gratuito para el servidor tras 15 min sin tráfico. Al despertar:
- Node arranca (~3s)
- Daemon Python se lanza + ortools se importa (~10-15s en Linux)
La primera petición de generación tras el sleep sufre esta espera.

### Aiven
Sin impacto. El solver es stateless respecto a la BD: Node lee de Aiven, construye el
input, manda al daemon Python, y escribe el resultado de vuelta a Aiven. Python no
toca la BD directamente.

---

## Checks anuales (Diciembre)

- Ver que todos los empleados tengan sus bonificables correspondientes → warning positivo si faltan
- Ver que todos tengan sus vacaciones correspondientes del año

---

## Módulo Maintenance

- Fix del sistema de tabs y panel de búsqueda (roto actualmente)

---

## Gestión de contactos y contraseñas

- Sistema de gestión de contactos (el de contraseñas ya está en Matrix)
- Simple y fácil de usar

---

## Proyectos futuros (nuevas ramas desde main)

- **Testing branch**: suite de tests end-to-end para módulos principales (scheduling, parking, logbook, maintenance). Partir de main.
- **Feature/multi-hotel**: escalar para soportar múltiples hoteles. Implica hotel_id en tablas principales, autenticación por hotel, configuración independiente, panel super-admin. Partir de main cuando todo lo actual esté en producción.

---

## Scheduling — Fix cross-month: días virtuales ✅ COMPLETADO

### Implementado (feature/ai-schedule-generator)

Se añadieron variables CP-SAT para los días `-7..-1` (bloqueados desde `previousMonthTail`) en `model.py`. Cada constraint relevante usa `all_days = virt_days + real_days`:

- **`model.py`**: crea y bloquea variables virtuales; pasa `virtual_days_by_emp` a constraints; incluye días virtuales en el matrix output (debug, claves negativas ignoradas por el controller TS).
- **`locked_cells.py`**: salta `d < 0` en paso 2 (evita conflicto con variables ya bloqueadas en model.py).
- **`transitions.py`**: itera sobre `all_days` — la transición virtual→real (turno `-1` → día 1) sale sola.
- **`rest.py`**: H4 y H5 sobre `all_days` — ventanas cross-month sin código especial.
- **`night_block.py`**: max_block sobre `all_days`; continuación cross-month **condicional** (si día 1=N, completar mínimo; el día 1 no se fuerza). Reglas trailing: `trailing_N=0` libre; `0<trailing_N<minBlock` sin vacación bloqueante → solo continuación; `trailing_N>=minBlock` → puede iniciar bloque nuevo; `trailing_N>=maxBlock` → día 1 forzado no-N.
- **`day_blocks.py`**: continuación M/T **condicional** (old behavior); `not_can_complete` restaurado; M→T prohibition sobre `all_days`.

### Decisiones de diseño clave

- Bloques N: el solver siempre completa el bloque dentro del mes (`not_can_complete` restaurado). Si el tail muestra trailing_N incompleto (por edición manual), la continuación es condicional (no forzada).
- Bloques M/T: ídem — siempre completan dentro del mes.
- `locked_cells` paso 2 MUST skipear `d < 0` — sin esto, el modelo es INFEASIBLE inmediatamente.
- Los días virtuales en el matrix son para debug; el controller TS los ignora (dayMap.get(negative) = undefined → skip).

### Fix adicional: tail disponible en draft ✅ COMPLETADO

`getPreviousMonthEndAssignments` ahora lee el mes anterior en cualquier estado (`published` o `draft`). Antes solo leía meses publicados → al generar meses en secuencia sin publicar, el tail era siempre vacío y las constraints cross-month nunca se activaban.

---

## Scheduling — Función objetivo soft ✅ COMPLETADO (2026-04-30)

**Implementado** en `backend/scheduling-solver/model.py`:

- **S1 — Balanceo de noches** (`W=10`): minimiza `max(total_N) - min(total_N)` entre empleados rotatorios. `total_N = nightsHistory[emp] + noches_mes_actual`. `nightsHistory` viene de query SQL sobre meses publicados anteriores (en `getNightHistoryForEmployees` del repo + `build-solver-input.ts`).
- **S2 — Libres sueltos** (`W=2`): penaliza L aislado (sin L adyacente). Incentiva agrupar libres en pares o tríos.
- **S3 — Preferencia de turno** (`W=1`): penaliza asignar turno distinto al `shiftPriority` del empleado.

**Pendiente (tuning)**:
- Ajustar pesos W1/W2/W3 con feedback del manager tras 2-3 meses en producción.
- Considerar ventana temporal (1 año rolling vs all-time) para `nightsHistory`.

---

## Scheduling — pendientes menores (no solver)

- **Validación en tiempo real en 1 request**: tras `PATCH /assignments/:id` devolver también el resultado de validación para evitar la segunda llamada a `validateSchedule`. Diseño en `backend/services/scheduling/new-ROADMAP.md` §2.4.
- **Promise.all sin catch en recalculate** (`schedule-generate.controller.ts:117`): si una recalculación de libre_number falla, el schedule ya está aplicado (transacción committed) pero los libres quedan mal numerados y el cliente recibe 500. Usar try/catch o `Promise.allSettled`.
- **MIN_NIGHTS_REQUIRED hardcodeado** (`schedule-validator.ts:229`): `const MIN_NIGHTS_REQUIRED = 3` debería leer `config.minNightBlock` para mantenerse en sync si el config cambia.
- **Migración Aiven** `scheduling_employee_requests`: diferida a pre-producción. Aplicar `scripts/20260425_create_scheduling_employee_requests.sql` + actualizar `aiven/19_scheduling.sql` + `MASTER_INSTALL_AIVEN.sql`.

  ⚠️ **Importante para la migración Aiven**: el script maestro de Aiven empieza con:
  ```sql
  DROP DATABASE IF EXISTS hotel_db;
  CREATE DATABASE hotel_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
  ```
  Esto borra y recrea la base de datos completa. Cualquier tabla nueva (como `scheduling_employee_requests`) debe estar incluida en `MASTER_INSTALL_AIVEN.sql` antes de ejecutarlo, no aplicarse por separado después. Verificar también que el collate `utf8mb4_0900_ai_ci` es compatible con el MySQL de Aiven (algunas versiones de Aiven usan MariaDB que no soporta ese collate — usar `utf8mb4_unicode_ci` como fallback si falla).

## Scheduling — Histórico de trabajo (Fase 2)

> Log cronológico de los items de Fase 2. El estado actual y los siguientes
> pasos están en la sección "Scheduling — punto de retoma" más abajo. Si solo
> quieres saber qué falta, salta directamente a esa.

  ---

  B.1 — Paridad validator TS ↔ solver Python
                                                                                                                                                                                   
  Trabajo mecánico: leer qué fixtures existen, ver cuáles tienen expectedStatus: 'valid', añadirlos al parity test. Yo lo hago más rápido y barato en tokens que explicártelo
  suficientemente bien para que lo hagas tú.

  → Lo hago yo.
  ---

  B.2 — Ampliar corpus a 50+ fixtures (25 nuevos: F26-F51)

  Lista de edge cases a cubrir:

  **[BLOQUES DE NOCHE]**
  1.  F26 — Vacation al inicio del mes (días 1-3 con V bloqueado, Nights disponibles en medio) → solver no debe romper minBlock
  2.  F27 — Vacation al final del mes (días 29-31 con V) → solver respeta vacación
  3.  F28 — Bonificable (B) en medio del mes → no interfiere con bloques N
  4.  F29 — Múltiples empleados con vacación simultaneously → cobertura ajustada
  5.  F30 — Trailing N incompleto (0 < trailing_N < minBlock) con vacación early → continuation_blocked exception activa
  6.  F31 — Trailing N >= maxBlock → día 1 forzado no-N
  7.  F32 — Trailing N >= minBlock → puede iniciar bloque nuevo
  8.  F33 — Mes corto (28 días) → bloque N de 4 noches (si minBlock=4) fit in month end
  9.  F34 — Mes corto (29 días feb) → block starts late but still completes minBlock
  10. F35 — Night block con minBlock=3 (excepción, debería funcionar)

  **[LIBRES / BONIFICABLES]**
  11. F36 — employee con 4 días libres (below min 9, warning) → solver debe generar schedule con más libres
  12. F37 — employee con 12 días libres (above max 11, warning) → solver debe generar schedule con menos
  13. F38 — Libres agrupados en pares vs sueltos (soft penalty S2)
  14. F39 — Bonificable (B) como locked cell → cuenta para reducir minMonthlyLibre
  15. F40 — employee mixto: 3B + 6L = 9 total rest days (valid boundary case)

  **[CROSS-MONTH]**
  16. F41 — Mes anterior draft (no tail disponible) → solver sin contexto cross-month
  17. F42 — Secuencia 2 meses sin publicar (tail del mes anterior viene de draft) → continuidad
  18. F43 — T→M cross-month sin descanso → rotation_continuity error
  19. F44 — N→L cross-month (fin bloque N, día 1=L) → correcto
  20. F45 — Previous month ended with N block completed, this month starts with N → new block prohibited (trailing_N >= minBlock → puede)

  **[REGLAS EMPLEADO]**
  21. F46 — noWeekends + vacación el sábado → no violation (V bloqueado)
  22. F47 — fixedShift=P (Presencia only) → excluido del solver (fixedShift=P ignore in WORK_SHIFTS)
  23. F48 — fixedShift con fixedDays conflicting → solver respeta fixedDays primero
  24. F49 — employee con solo fixedShift=P (no fixedDays) →未知 pattern, excluded
  25. F50 — multiple employees con reglas activas simultáneas → solver las respeta todas

  **[CASOS DEGENERADOS]**
  26. F51 — Coverage mínima activada (minM=2, minT=2, minN=1) → solver debe cubrir

  **[CÓDIGO RELEVANTE]**
  - Python night_block.py línea 167: `can_complete = (real_pos + min_block <= num_real)` → si mes corto y bloque no cabe, no empieza. El solver nunca genera bloques que no puedan completar.
  - Python night_block.py líneas 119-127: `continuation_blocked` exception — si celdas early están bloqueadas con no-N, se permite iniciar bloque nuevo.
  - Python libres.py línea 11: `_SPECIAL_REST = {"V", "B", "E", "IT", "FO", "A"}` → B ya cuenta como descanso.
  - TS monthly-libre.constraint.ts: B cuenta en `countTotalRestDays`.
  - annualHolidays=20 en config → días bonificables disponibles. REFERENCIADO en schema.py línea 54 (sin campo activo en input).
  - `dias_bonificables INT NOT NULL DEFAULT 20` en scheduling_employee_contracts (aiven/19_scheduling.sql línea 101).

  ⚠️ Issues conocidos a verificar tras crear fixtures:
  - El solver Python no tiene `annualHolidays` ni `dias_bonificables` como constraint activa — solo como config reference. El balanceo de B es manual (celdas B anotadas por el manager).
  - En night_block.py línea 166-184: si `can_complete=false` y `real_pos>0`, se permite iniciar bloque si el día anterior NO es N (para no romper un bloque que ya terminó). Si `trailing_N==0` y día 1, NO puede iniciar bloque.

  → F26-F51 creados. SOLVABLE_FIXTURES actualizado. Marcar B.2 completo tras ejecutar tests.
  → NO commit ni push.

  ---

  B.3 — Rotation continuity (cross-month M↔T) ✅ COMPLETADO 2026-05-02

  Comportamiento definido con manager (2026-05-02): igual que dentro de un mes.
  - T→M directo sin descanso = ERROR (hard)
  - Cambio M↔T en límite de mes sin descanso = ERROR (hard)

  Implementado en rotation-continuity.constraint.ts (TS) y transitions.py
  (Python solver, vía días virtuales cross-month). F13 cubre el caso
  cross-month en el corpus (isValid: false con error de rotación + soft
  penalty rotation_continuity_break para tracking).

  ---

  B.4 — Migración Aiven `scheduling_employee_requests` ⏳ PENDIENTE

  Bloquea producción. Detalle de pasos en "Scheduling — punto de retoma"
  más abajo (sección "1. Migración Aiven"). Aquí solo se deja el marcador
  cronológico para no romper el orden de items.

  ---

  B.5 — S4 min_work_block (soft, no hard) ✅ COMPLETADO 2026-05-09

  Decisión: S4 es soft (peso 3) según catálogo CONSTRAINTS §3. Validator TS emitía
  error por bug. Solver Python ahora penaliza bloques 1-2 días en función objetivo.
  Las noches siguen hard via night_block.py.

  Cambios:
  - soft-weights.ts: + min_work_block_short: 3
  - schedule-validator.ts: createError → createWarning + softPenalty acumulado
  - scheduling-solver/model.py: S4 en objective (is_work bool + indicadores short1/short2)
  - solver-parity.test.ts: F11 y F30 reincluidos (24 fixtures)
  - 28 fixtures actualizadas con nueva expected.softPenalty/severity

  Tests: 51 TS corpus + 24 TS parity + 103 Python = todos verdes.

  ---

  B.6 — Benchmark 30×31 ✅ COMPLETADO 2026-05-09

  Script: scheduling-solver/tests/test_benchmark.py (ejecución directa o pytest --runbenchmark).
  30 emps rotatorios × 31 días, config escalada (minM=8/maxM=15, minT=5/maxT=10, minN=1/maxN=2).

  Resultados:
  - Encuentra factible en <5s ✅
  - Status FEASIBLE (no OPTIMAL) — solver agota timeout sin probar óptimo
  - softPenalty=40 clavado (night_balance × 10, range=4) — estructural sin nightsHistory
  - 60s no mejora respecto a 5s

  Bugs descubiertos:
  - fixedShift=P sin fixedDays → INFEASIBLE en Python (filtrado en TS antes, no replicado).
    Posible mejora: guard en Python o error explícito.

  Viabilidad hotel 30 personas:
  - Motor: viable ✅
  - Producto: falta segmentación por rol/departamento ❌ (gap conocido, no bloqueante para 1 dept)
  - UI grid 30×31: sin probar ⚠️

  Detalle completo: SCHEDULING-DECISIONS-LOG.md 2026-05-09.

  ---

  B.7 — Tuning pesos soft ⏸ DIFERIDO A PRODUCCIÓN 2026-05-09

  Pesos actuales (model.py): W_NIGHT_BALANCE=10, W_ISOLATED_L=2,
  W_SHIFT_PRIORITY=1, W_SHORT_WORK_BLOCK=3.

  Sin uso productivo no hay base para tunear. Plan: 2-3 meses producción,
  manager evalúa "raro / ok / perfecto", se ajustan pesos por evidencia.

  Pendiente menor: persistir softPenaltyBreakdown por run en
  scheduling_solver_runs (Fase 3 paso 1) para tener datos cuando llegue
  el momento.

  ---

  B.8 — Rotation continuity ✅ CERRADO DE FACTO 2026-05-09

  Originalmente planificado como "guiar patrón M→T→N". Spec con manager
  (2026-05-02) lo redujo a "T→M sin descanso = hard error".

  Ya implementado:
  - TS: rotation-continuity.constraint.ts
  - Python: transitions.py (cross-month vía días virtuales)
  - F12, F13 cubren cross-month

  No queda trabajo. Solo faltaba marcarlo cerrado. Detalle: DECISIONS-LOG 2026-05-09.

---

## Scheduling — punto de retoma (2026-05-09)

**Estado actual:**
- Fase 2 cerrada en código (S4 soft, F11/F30 parity, benchmark 30×31, rotation continuity confirmada cerrada).
- Tuning de pesos S1-S4 diferido a producción (necesita 2-3 meses de uso real).
- Fase 3 paso 4 (docs CLAUDE.md) cerrado.
- **Fase 3 abierta:** quedan paso 1 (tabla `scheduling_solver_runs`) y paso 2 (UX infeasibilidad).
- Migración Aiven de `scheduling_employee_requests` sigue pendiente y bloquea producción.

**Cuando volvamos al scheduling, atacar en este orden:**

### 1. Migración Aiven `scheduling_employee_requests` (bloquea producción)
- DDL ya existe en local (`scripts/20260425_create_scheduling_employee_requests.sql`).
- Hay que añadirlo a `aiven/19_scheduling.sql` o crear `aiven/20_scheduling_requests.sql` + incluir SOURCE en `MASTER_INSTALL_AIVEN.sql`.
- Verificar collate `utf8mb4_0900_ai_ci` vs `utf8mb4_unicode_ci` según la versión MySQL/MariaDB de Aiven.
- ⚠ El `MASTER_INSTALL_AIVEN.sql` empieza con DROP DATABASE — no aplicar el script suelto, debe quedar dentro del master para reinstall completo.

### 2. Fase 3 paso 1 — tabla `scheduling_solver_runs`
Persistir cada ejecución del solver para análisis posterior.

Esquema mínimo propuesto:
```sql
CREATE TABLE scheduling_solver_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  month_id INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by CHAR(36),                    -- usuario que disparó
  status ENUM('ok','infeasible','error') NOT NULL,
  solve_time_ms INT,
  cp_status VARCHAR(20),                    -- OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
  soft_penalty INT,
  soft_penalty_breakdown JSON,
  solver_input JSON,                        -- snapshot del input enviado al solver
  solver_matrix JSON,                       -- matriz original generada (pre-edición)
  conflicting_constraints JSON,             -- solo si infeasible
  FOREIGN KEY (month_id) REFERENCES scheduling_months(id) ON DELETE CASCADE
);
```

Hook: en `schedule-generate.controller.ts`, dentro de la transacción que aplica la matriz, hacer también un `INSERT INTO scheduling_solver_runs`.

### 3. Fase 3 paso 2 — UX de infeasibilidad
Mejorar el modal del frontend cuando el solver devuelve `status: 'infeasible'`.

- Renderizar `conflictingConstraints` con texto claro en el modal.
- Mostrar `suggestedRelaxations` como acciones clickables (cada una un botón "Aplicar y reintentar").
- En `model.py` rama `INFEASIBLE`, mejorar el motor de sugerencias usando `CpSolver.sufficient_assumptions_for_infeasibility()` en lugar del hardcode actual (devuelve siempre las dos mismas).
- Tests con 3 escenarios de infeasibility (ya hay fixtures: F31 trailing-n-at-max, F51 coverage-minimums-active; añadir 1 más).

### 4. Bucle de feedback "manager edita → mejora pesos" (post-Fase 3)
Idea clave del manager (2026-05-09): **solo cuenta el horario PUBLICADO, no las ediciones en draft**.

Razón: en draft el manager experimenta, prueba, deshace, itera. Esa señal es ruido. La señal real es la matriz final que se publica — esa es la que el equipo va a trabajar y representa el juicio definitivo del manager.

Diseño:
1. `scheduling_solver_runs.solver_matrix` guarda la matriz original generada.
2. Cuando el mes transiciona `draft → published` (endpoint de publicación), se snapshotea la matriz final del momento en `scheduling_solver_runs.published_matrix` (columna nueva).
3. Diff = `published_matrix - solver_matrix`. Cada celda cambiada es una "preferencia revelada" del manager.
4. Análisis fuera del flujo en caliente (cron job semanal o herramienta de admin): agrupar diffs por patrón ("M→T en lunes", "L→V en viernes festivos", etc.) y mostrar al admin como tabla de "ajustes recurrentes".
5. El admin (o dev) usa esos datos para ajustar pesos S1-S4 manualmente cada 2-3 meses, o cambiar config (`shiftPriority` por defecto, etc.).

⚠ **Las ediciones en draft NO cuentan.** Se persisten en `scheduling_assignments` igual (es la BD viva del mes), pero no se alimentan al análisis de feedback.

Decisión registrada en DECISIONS-LOG 2026-05-09 (entrada del bucle de feedback).