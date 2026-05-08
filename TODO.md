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

## Scheduling — Siguiente paso (post feature/ai-schedule-generator) 🎯

El branch `feature/ai-schedule-generator` tiene el solver end-to-end funcionando y está listo para commit + merge.

**Siguiente paso inmediato (Fase 2 de SCHEDULING-SOLVER-PLAN.md):**

1. **Ampliar corpus de tests**: añadir fixtures para los escenarios ahora posibles — vacación al inicio del mes, trailing_N >= minBlock, meses consecutivos sin publicar. Objetivo 50+ fixtures.
2. **Paridad validator TS ↔ solver Python**: ejecutar el corpus completo contra ambos y verificar que coinciden. Actualmente parity test cubre 4 fixtures; debería cubrir todos los que tienen `expectedStatus: 'valid'`.
3. **Tuning de pesos soft (S1/S2/S3)**: tras 2-3 meses en producción con el solver real, ajustar W1=10/W2=2/W3=1 con feedback del manager.
4. **Rotation continuity (soft)**: guiar el patrón M→T→N entre meses usando `previousMonthTail`. Pendiente de especificación con el manager.


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

  B.3 — Rotation continuity (cross-month M↔T)

  Comportamiento definido con manager (2026-05-02): igual que dentro de un mes.
  - T→M directo sin descanso = ERROR (hard)
  - Cambio M↔T en límite de mes sin descanso = ERROR (hard)

  Implementado en rotation-continuity.constraint.ts.
  F13 ya era correcto (isValid: false, isValid: false, rotation_continuity_break soft penalty).

  → COMPLETADO.

  ---

  B.4 — Migración Aiven

  Trabajo de SQL + verificación manual en la DB real. Tú tienes que ejecutar los scripts; yo puedo preparar el SQL actualizado.

  → Yo preparo los scripts, tú los ejecutas y verificas.