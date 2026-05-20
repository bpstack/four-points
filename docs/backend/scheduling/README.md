# Scheduling System — Arquitectura y Referencia

**Módulo:** `backend/services/scheduling/`, `backend/controllers/scheduling/`, `frontend/app/dashboard/scheduling/`  
**Última actualización:** Mayo 2026

---

## Tabla de Contenidos

1. [Visión general](#1-visión-general)
2. [Conceptos fundamentales](#2-conceptos-fundamentales)
3. [Arquitectura del backend](#3-arquitectura-del-backend)
4. [Endpoints — Referencia completa](#4-endpoints--referencia-completa)
5. [Flujo: edición manual de celdas](#5-flujo-edición-manual-de-celdas)
6. [Flujo: generación automática (solver)](#6-flujo-generación-automática-solver)
7. [Sistema de validación (TypeScript)](#7-sistema-de-validación-typescript)
8. [Sistema de constraints](#8-sistema-de-constraints)
9. [Reglas de empleado](#9-reglas-de-empleado)
10. [Tipos de turno y códigos de turno](#10-tipos-de-turno-y-códigos-de-turno)
11. [Esquema de base de datos](#11-esquema-de-base-de-datos)
12. [Arquitectura del frontend](#12-arquitectura-del-frontend)
13. [Exportación PDF y utilidad Presencias](#13-exportación-pdf-y-utilidad-presencias)

---

## 1. Visión general

El módulo de Scheduling gestiona la planificación mensual de turnos del personal. Soporta dos modos:

- **Edición manual** célda a célda con validación en tiempo real.
- **Generación automática** mediante un solver CP-SAT (Google OR-Tools, Python).

Los meses tienen dos estados: `draft` (editable, solo visible para admins) y `published` (bloqueado para escritura, visible para el personal).

---

## 2. Conceptos fundamentales

### Estado del mes

| Estado | Descripción |
|--------|-------------|
| `draft` | Editable. Solo visible para administradores. |
| `published` | Bloqueado. Visible para todo el personal. |

La transición `draft → published` se hace mediante el botón "Publicar". La operación inversa (`published → draft`) existe pero requiere confirmación explícita (endpoint `POST /months/:id/unpublish`).

### Bloqueo de celdas

Una celda (employee × day) queda **bloqueada** cuando su `scheduling_assignment.source_constraint_id` es no nulo. Las celdas bloqueadas:
- Se muestran con estilo visual distinto en el grid.
- El endpoint `PATCH /assignments/:id` devuelve **409** si se intenta modificarlas.
- El solver las respeta y nunca las sobreescribe.

Las celdas se bloquean automáticamente al **aprobar una constraint** (vacación, baja, etc.) mediante `PUT /constraints/:id/approve`.

### Constraints vs. Reglas de empleado

| Concepto | Tabla | Propósito |
|----------|-------|-----------|
| **Constraint** | `scheduling_constraints` | Evento concreto con fechas (vacación del 5 al 15) |
| **Regla de empleado** | `scheduling_employee_rules` | Política permanente (siempre turno de mañana, no trabaja fines de semana) |

---

## 3. Arquitectura del backend

```
routes/scheduling/scheduling-routes.ts
        │
        ▼
controllers/scheduling/
├── scheduling-controller.ts      ← CRUD general (meses, días, assignments, config, empleados, contratos)
└── schedule-generate.controller.ts  ← POST /months/:id/generate

services/scheduling/
├── build-solver-input.ts         ← Construye SolverInput desde la DB
├── solver-client.ts              ← Gestiona el daemon Python (spawn, semáforo, respawn)
├── schedule-validator.ts         ← Valida el horario completo (TypeScript)
├── soft-weights.ts               ← Pesos para penalizaciones soft
├── types/
│   ├── index.ts                  ← GeneratorContext, ValidationResult, ConstraintViolation
│   └── solver.ts                 ← SolverInput, SolverOutput
├── utils/
│   ├── matrix.ts                 ← isWorkShift(), isLibreShift(), isAbsenceShift()
│   └── day-helpers.ts            ← getDayOfWeek(), getWeekNumber(), isWeekend()
└── constraints/
    ├── base-constraint.ts
    ├── registry.ts
    ├── coverage.constraint.ts
    ├── night-block.constraint.ts
    ├── consecutive-rest.constraint.ts
    ├── max-consecutive-work.constraint.ts
    ├── rotation-continuity.constraint.ts
    ├── employee-rules.constraint.ts
    └── monthly-libre.constraint.ts

repositories/scheduling/
├── scheduling-repository.ts
└── employee-requests-repository.ts

scheduling-solver/               ← Proceso Python separado
├── daemon.py
├── model.py
├── schemas.py
└── constraints/
    ├── coverage.py
    ├── night_block.py
    ├── transitions.py
    ├── rest.py
    ├── day_blocks.py
    ├── libres.py
    ├── locked_cells.py
    └── employee_rules.py
```

### Acceso al módulo (frontend)

El layout `app/dashboard/scheduling/layout.tsx` es un **guard de admin**: si el usuario no tiene rol `admin`, redirige a `/dashboard` antes de cargar ningún dato de scheduling.

---

## 4. Endpoints — Referencia completa

Todos bajo `/api/scheduling/`. Requieren `authenticateToken` + rol admin (excepto lectura básica).

### Config

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/config` | Todos los pares clave/valor de configuración |
| GET | `/config/map` | Config como objeto tipado (`SchedulingConfigMap`) |
| PUT | `/config/:key` | Actualizar un valor de configuración |

### Shifts (tipos de turno)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/shifts` | Todos los tipos de turno |
| POST | `/shifts` | Crear tipo de turno |
| PUT | `/shifts/:id` | Actualizar tipo de turno |
| DELETE | `/shifts/:id` | Eliminar tipo de turno |

### Meses

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/months` | Lista de meses |
| POST | `/months` | Crear mes (año + mes) |
| GET | `/months/:id` | Mes completo (días, empleados, assignments, constraints, `dailyStats`) |
| PUT | `/months/:id` | Actualizar estado del mes (publicar, etc.) |
| DELETE | `/months/:id` | Eliminar mes |
| GET | `/months/:id/info` | Panel de info: constraints aprobadas + reglas de empleado |
| POST | `/months/:id/generate` | Invocar solver CP-SAT y aplicar resultado |
| POST | `/months/:id/reset` | Borrar todos los assignments y resembrar desde constraints aprobadas |
| POST | `/months/:id/validate` | Validar horario completo y devolver errores/warnings |
| POST | `/months/:id/unpublish` | Revertir de published a draft |

### Días

| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/months/:id/days/:dayId` | Actualizar un día (festivo, ocupación, etc.) |
| POST | `/months/:id/days/bulk` | Actualizar varios días a la vez |

### Assignments

| Método | Ruta | Descripción |
|--------|------|-------------|
| PUT | `/months/:id/assignments` | Actualización masiva de assignments |
| PATCH | `/assignments/:id` | Actualizar una celda (409 si está bloqueada) |

### Constraints (peticiones)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/months/:id/constraints` | Constraints de un mes |
| GET | `/constraints/by-period` | Constraints en un rango de fechas |
| POST | `/constraints` | Crear constraint |
| PUT | `/constraints/:id` | Editar constraint |
| PUT | `/constraints/:id/approve` | Aprobar o rechazar; auto-sincroniza assignments y bloquea celdas |
| DELETE | `/constraints/:id` | Eliminar constraint |

### Reglas de empleado

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/rules` | Todas las reglas |
| GET | `/rules/employee/:employeeId` | Reglas de un empleado |
| POST | `/rules` | Crear regla |
| PUT | `/rules/:id` | Editar regla |
| DELETE | `/rules/:id` | Eliminar regla |

### Empleados schedulables

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/employees` | Empleados marcados como schedulables |
| GET | `/employees/all` | Todos los empleados con estado schedulable |
| PUT | `/employees` | Reemplazar lista completa de schedulables |
| PATCH | `/employees/order` | Reordenar empleados en el grid |
| POST | `/employees/:id` | Añadir empleado a schedulables |
| DELETE | `/employees/:id` | Quitar empleado de schedulables |
| PATCH | `/employees/:id/dates` | Actualizar fechas de alta/baja (`start_date`, `end_date`) |

### Contratos anuales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/contracts/:year` | Todos los contratos de un año |
| POST | `/contracts` | Crear contrato |
| GET | `/contracts/:year/:employeeId` | Contrato de un empleado en un año |
| POST | `/contracts/:year/initialize` | Inicializar contratos para todos los empleados de un año |
| POST | `/contracts/:year/employee/:employeeId` | Inicializar contrato individual (con cálculo proporcional opcional) |
| GET | `/contracts/:year/calculate` | Preview de cálculo proporcional dado `startDate` |
| PUT | `/contracts/:id` | Actualizar contrato |
| DELETE | `/contracts/:id` | Eliminar contrato |

### Totales y estadísticas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/totals/:year` | Totales anuales por empleado |
| GET | `/shift-stats` | Conteo de turnos anuales por empleado (`?year=`) |

---

## 5. Flujo: edición manual de celdas

```
Usuario hace clic en una celda
        │
        ▼
ShiftSelector (popover)
        │
        ▼
PATCH /assignments/:id
        │
        ├─ 409 → celda bloqueada (source_constraint_id != null)
        │        El frontend muestra error, no actualiza la celda.
        │
        └─ 200 → assignment actualizado
                 React Query invalida la query del mes
                 ValidationWarnings se recalculan (POST /months/:id/validate)
```

---

## 6. Flujo: generación automática (solver)

```
Admin hace clic en "Generar horario"
        │
        ▼
POST /months/:id/generate
        │
        ▼
schedule-generate.controller.ts
├── Verifica status === 'draft'
├── buildSolverInput(monthId)
│   ├── Fetch: mes, días, empleados, assignments, constraints aprobadas,
│   │         reglas, config, tail del mes anterior (últimos 7 días),
│   │         historial de noches por empleado
│   ├── Pre-expande fixedDays en lockedCells
│   └── Excluye empleados con fixedShift=P y sin fixedDays
│
├── runSolver(input)   ← solver-client.ts
│   ├── Envía JSON por stdin al daemon Python
│   └── Lee respuesta JSON de stdout (timeout 60s)
│
├── Inserta registro en scheduling_solver_runs
│
├── Si status='ok':
│   └── Escribe assignments en DB (transacción, omite días virtuales negativos)
│
└── Responde { status, assignmentsCreated, stats }
        │
        ▼
Frontend aplica resultado
├── Si ok → invalida query del mes, muestra stats
└── Si infeasible → muestra conflictingConstraints + suggestedRelaxations
```

### Lo que el solver respeta

- **Celdas bloqueadas** (`lockedCells`): nunca sobreescribe assignments con `source_constraint_id`.
- **Continuidad cross-month**: los últimos 7 días del mes anterior se inyectan como días virtuales (índices -7 a -1). Todos los constraints iteran sobre `all_days = virtual_days + real_days`.
- **Códigos especiales** (V, B, IT, E, FO, A): solo pueden asignarse mediante constraints aprobadas. El solver nunca los asigna libremente.

---

## 7. Sistema de validación (TypeScript)

`schedule-validator.ts` → `validate(context: GeneratorContext): ValidationResult`

### GeneratorContext

```typescript
{
  month: SchedulingMonth
  employees: Employee[]
  days: Day[]
  assignments: Record<employeeId, Record<dayNumber, Assignment>>
  config: SchedulingConfigMap
  previousMonthHistory: PreviousMonthHistory | null
}
```

### ValidationResult

```typescript
{
  isValid: boolean          // true si no hay errores hard
  errors: ConstraintViolation[]
  warnings: ConstraintViolation[]
  softPenalty: number
  softPenaltyBreakdown: Record<string, number>
  stats: ValidationStats
}
```

### Severidades

| Severidad | Descripción |
|-----------|-------------|
| `error` | Violación hard — el horario no es válido |
| `warning` | Violación soft — penalización, pero aceptable |
| `info` | Información sin impacto en validez |

### Orden de ejecución de constraints

| Prioridad | Constraint | Tipo |
|-----------|-----------|------|
| 100 | `CoverageConstraint` | Hard + Soft |
| 100 | `NightBlockConstraint` | Hard |
| 95 | `ConsecutiveRestConstraint` | Hard |
| 90 | `MaxConsecutiveWorkConstraint` | Hard |
| 85 | `RotationContinuityConstraint` | Soft |
| 75 | `EmployeeRulesConstraint` | Mixed |
| 70 | `MonthlyLibreConstraint` | Hard + Soft |

### Soft weights (`soft-weights.ts`)

| Clave | Peso | Emitido por |
|-------|------|-------------|
| `pref_morning_staff_below` | 5 | CoverageConstraint |
| `pref_afternoon_staff_below` | 5 | CoverageConstraint |
| `pref_weekly_shifts_off` | 3 | RotationContinuityConstraint |
| `pref_night_block_size_off` | 4 | NightBlockConstraint |
| `libre_below_pref` | 2 | MonthlyLibreConstraint |
| `libre_above_pref` | 1 | MonthlyLibreConstraint |

---

## 8. Sistema de constraints

Las constraints son peticiones con fechas (vacación, baja, festivo) que fluyen así:

```
Crear constraint (status=pending)
        │
        ▼
Aprobar constraint (PUT /constraints/:id/approve)
        │
        ▼
Auto-sync assignments:
├── Se aplica el shift_code correspondiente en las fechas del rango
└── source_constraint_id se rellena → celda queda bloqueada
```

### Mapping constraint_type → shift_code

| constraint_type | shift_code |
|-----------------|------------|
| `request_off` | `L` |
| `vacation` | `V` |
| `sick_leave` | `IT` |
| `sick_day` | `E` |
| `training` | `FO` |
| `holiday` | `B` |

### Constraints retroactivas

Los admins pueden crear constraints para fechas pasadas (ej: baja retroactiva). El sistema las aplica igualmente.

---

## 9. Reglas de empleado

Definidas en `scheduling_employee_rules`. Se aplican tanto en el solver como en el validador TS.

| rule_type | Descripción | Efecto en solver | Efecto en validador |
|-----------|-------------|-----------------|---------------------|
| `shift_priority` | Turno preferente del empleado (M/T/N) | Penalización soft S3 si no se cumple | — |
| `fixed_shift` | Solo puede hacer este turno | Prohíbe otros turnos de trabajo (M/T/N) | Error si asignado a otro turno |
| `fixed_days` | Patrón L-V / S-D | Pre-expandido en `lockedCells` antes de enviar al solver | Verificado en EmployeeRulesConstraint |
| `no_weekends` | No trabaja S/D | Fuerza L en sábados y domingos | Error si trabaja fin de semana |
| `max_shift_per_month` | Máximo de un turno concreto al mes | — | Warning si supera |
| `min_shift_per_month` | Mínimo de un turno concreto al mes | — | Warning si no alcanza |

> **Nota:** Empleados con `fixedShift=P` pero sin `fixedDays` son **excluidos totalmente del solver** (patrón desconocido). El solver no les asigna nada.

---

## 10. Tipos de turno y códigos de turno

### Turnos de trabajo

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `M` | Mañana | Turno de mañana |
| `T` | Tarde | Turno de tarde |
| `N` | Noche | Turno de noche |
| `PI` | Presencia Interna | Apoyo interno |
| `P` | Presencia | Turno presencia |

### Estados de libre / ausencia

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `L` | Libre | Día libre estándar |
| `LI` | Libre Disposición | Libre extraordinario fuera de rotación (añadido 2026-05-20) |
| `V` | Vacaciones | Solo via constraint aprobada |
| `B` | Bonificable | Festivo bonificable. Solo via constraint |
| `E` | Baja | Baja por enfermedad puntual. Solo via constraint |
| `IT` | Incapacidad Temporal | Baja de larga duración. Solo via constraint |
| `FO` | Formación | Día de formación / training. Solo via constraint |
| `A` | Ausencia injustificada | Solo via constraint |

### Lógica del solver — turnos asignables

El solver CP-SAT solo asigna libremente: `M`, `T`, `N`, `L`.  
Los demás códigos (`V`, `B`, `E`, `IT`, `FO`, `A`, `LI`) solo entran como `lockedCells`.

---

## 11. Esquema de base de datos

> Los archivos `aiven/NN_*.sql` están congelados desde 2026-05-20. Los cambios posteriores viven en `backend/db-mysql/scripts/`. Ver `MIGRATIONS_POLICY.md`.

### `scheduling_config`
Almacén clave/valor de parámetros de configuración.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `key` | VARCHAR | Identificador del parámetro |
| `value` | VARCHAR | Valor |
| `description` | TEXT | Descripción legible |

Parámetros relevantes: `minMorningStaff`, `prefMorningStaff`, `maxMorningStaff`, `minAfternoonStaff`, `prefAfternoonStaff`, `maxAfternoonStaff`, `minNightStaff`, `prefNightStaff`, `maxNightStaff`, `minNightBlock`, `maxNightBlock`, `prefNightBlock`, `minMonthlyLibre`, `maxMonthlyLibre`, `prefMonthlyLibre`, `maxConsecutiveWorkDays`, `minRestHoursBetweenShifts`, `weeklyShiftLimit`.

### `scheduling_shifts`
Definición de tipos de turno.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `code` | VARCHAR | Código único (M, T, N, L, V...) |
| `name` | VARCHAR | Nombre legible |
| `start_time` | TIME | Hora inicio |
| `end_time` | TIME | Hora fin |
| `hours` | DECIMAL | Horas del turno |
| `color` | VARCHAR | Color hex para el grid |
| `is_work_shift` | TINYINT | 1 si es turno de trabajo |
| `is_paid` | TINYINT | 1 si cuenta para nómina |
| `display_order` | INT | Orden en la UI |
| `is_active` | TINYINT | Activo/inactivo |

### `scheduling_employees`
Empleados incluidos en la planificación de turnos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `user_id` | INT | FK → `users.id` |
| `display_order` | INT NULL | Orden en el grid (NULL = alfabético) — añadido 2026-05-19 |
| `start_date` | DATE NULL | Fecha de alta en scheduling (NULL = sin restricción) — añadido 2026-05-20 |
| `end_date` | DATE NULL | Fecha de baja en scheduling (NULL = activo) — añadido 2026-05-20 |

### `scheduling_employee_contracts`
Contrato anual por empleado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `employee_id` | INT | FK → `scheduling_employees.id` |
| `year` | INT | Año del contrato |
| `diasTrabajo` | INT | Días de trabajo en el año |
| `horasAnuales` | DECIMAL | Horas anuales |
| `diasVacaciones` | INT | Días de vacaciones |
| `diasLibreSemanal` | INT | Días libres semanales |
| `diasBonificables` | INT | Días bonificables |
| `diasIt` | INT | Días de IT |
| `diasLaborablesAno` | INT | Días laborables en el año |
| `observaciones` | TEXT | Notas |

### `scheduling_employee_rules`
Reglas permanentes por empleado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `employee_id` | INT | FK → `scheduling_employees.id` |
| `rule_type` | ENUM | `shift_priority`, `fixed_shift`, `fixed_days`, `no_weekends`, `max_shift_per_month`, `min_shift_per_month` |
| `rule_value` | VARCHAR | Valor de la regla (ej: `"M"`, `"L-V"`) |
| `priority` | INT | Prioridad de aplicación |
| `is_active` | TINYINT | Activa/inactiva |

### `scheduling_months`
Registro de cada mes planificado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `year` | INT | Año |
| `month` | INT | Mes (1-12) |
| `status` | ENUM | `draft` / `published` |
| `published_at` | DATETIME | Fecha de publicación |
| `published_by` | INT | FK → `users.id` |
| `created_by` | INT | FK → `users.id` |
| `created_at` | DATETIME | — |
| `updated_at` | DATETIME | — |

### `scheduling_days`
Un registro por día del mes.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `month_id` | INT | FK → `scheduling_months.id` |
| `day_number` | INT | Número del día (1-31) |
| `date` | DATE | Fecha completa |
| `day_of_week` | INT | 0=Lunes … 6=Domingo |
| `week_number` | INT | Semana del año |
| `is_holiday` | TINYINT | 1 si es festivo |
| `occupancy_pct` | INT | % de ocupación del hotel |
| `arrivals` | INT | Llegadas previstas |
| `departures` | INT | Salidas previstas |

### `scheduling_assignments`
Una fila por empleado × día.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `month_id` | INT | FK → `scheduling_months.id` |
| `employee_id` | INT | FK → `scheduling_employees.id` |
| `day_id` | INT | FK → `scheduling_days.id` |
| `day_number` | INT | Número del día |
| `shift_code` | VARCHAR | Código de turno asignado |
| `notes` | TEXT | Notas opcionales |
| `source_constraint_id` | INT NULL | FK → `scheduling_constraints.id`; no nulo = celda bloqueada |
| `libre_number` | INT NULL | Número de par libre semanal (1-45) — añadido 2026-02-28 |

### `scheduling_constraints`
Peticiones con fechas (vacaciones, bajas, etc.).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `month_id` | INT | FK → `scheduling_months.id` |
| `employee_id` | INT | FK → `scheduling_employees.id` |
| `constraint_type` | ENUM | `request_off`, `vacation`, `sick_leave`, `sick_day`, `training`, `holiday` |
| `start_date` | DATE | Inicio del período |
| `end_date` | DATE | Fin del período |
| `shift_code` | VARCHAR | Código resultante al aprobar |
| `status` | ENUM | `pending` / `approved` / `rejected` |
| `priority` | INT | Prioridad de aplicación |
| `notes` | TEXT | Notas |

### `scheduling_employee_requests`
Peticiones de nuevo estilo (Fase 1 del solver).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `employee_id` | INT | FK → `users.id` |
| `date_from` | DATE | Inicio |
| `date_to` | DATE | Fin |
| `request_type` | VARCHAR | Tipo de petición |
| `requested_value` | VARCHAR | Valor solicitado |
| `status` | ENUM | `pending` / `approved` / `rejected` |

### `scheduling_solver_runs`
Log de cada invocación del solver.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `month_id` | INT | FK → `scheduling_months.id` |
| `input_json` | JSON | SolverInput enviado |
| `output_json` | JSON | SolverOutput recibido |
| `status` | VARCHAR | `ok` / `infeasible` / `error` |
| `solve_time_ms` | INT | Tiempo de resolución |
| `created_at` | DATETIME | — |

### `scheduling_history`
Log de auditoría de cambios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT | PK |
| `month_id` | INT | FK → `scheduling_months.id` |
| `action` | VARCHAR | Tipo de acción |
| `table_affected` | VARCHAR | Tabla modificada |
| `record_id` | INT | ID del registro modificado |
| `old_value` | JSON | Valor anterior |
| `new_value` | JSON | Valor nuevo |
| `created_by` | INT | FK → `users.id` |
| `created_at` | DATETIME | — |

---

## 12. Arquitectura del frontend

```
app/dashboard/scheduling/
├── layout.tsx                  ← Guard admin; redirige a /dashboard si no es admin
├── page.tsx                    ← Server Component; monta <SchedulingClient> en Suspense
└── config/
    └── page.tsx                ← Monta <SchedulingConfigClient>

frontend/app/components/scheduling/
├── SchedulingClient.tsx        ← Orquestador principal (estado global del mes, celda, bulk)
├── ScheduleGrid.tsx            ← Grid interactivo mensual
├── MonthInfoPanel.tsx          ← Panel de constraints aprobadas + reglas de empleado
├── ValidationWarnings.tsx      ← Feedback de validación en tiempo real
├── SchedulingConfigClient.tsx  ← Panel de configuración (5 tabs)
├── EmployeeTotals.tsx          ← Edición de contratos anuales
├── ManageHolidaysModal.tsx     ← Marcado masivo de festivos
├── MonthSelector.tsx           ← Selector de año/mes; crea meses nuevos
├── ScheduleStats.tsx           ← Resumen estadístico por empleado y día
├── ShiftLegend.tsx             ← Leyenda de colores de turno
└── ShiftSelector.tsx           ← Popover para elegir turno en una celda

frontend/app/lib/scheduling/
├── types.ts                    ← Tipos TypeScript (espejo del backend)
├── queries.ts                  ← schedulingApi (~40 funciones) + schedulingKeys (React Query)
├── shift-styles.ts             ← SHIFT_STYLES y getShiftClasses(code) para Tailwind
├── export-pdf.ts               ← Exportación PDF del grid mensual
└── server.ts                   ← Server-side fetch helpers
```

### Tabs de configuración (`SchedulingConfigClient.tsx`)

| Tab | Componente | Descripción |
|-----|-----------|-------------|
| `employees` | `EmployeesTab` | Activar/desactivar empleados; reordenar con flechas |
| `totals` | `TotalsTab` + `EmployeeTotals` | Editar contratos anuales por empleado |
| `general` | `GeneralConfigTab` + `ShiftsSection` | Parámetros de staffing, bloques de noche, libres, CRUD de tipos de turno |
| `rules` | `RulesTab` | CRUD de reglas permanentes por empleado |
| `requests` | `RequestsTab` | CRUD + aprobación de constraints (vacaciones, bajas, etc.) |
| `shift-stats` | `ShiftStatsTab` | Conteo anual de turnos por empleado |
| `presencias` | `PresenciasTab` | Herramienta offline: convierte schedule pegado de Excel a formato Presencias/Variables |

### Estado gestionado en `SchedulingClient.tsx`

| Estado | Tipo | Descripción |
|--------|------|-------------|
| `selectedMonth` | `SchedulingMonth \| null` | Mes actualmente seleccionado |
| `selectedCell` | `SelectedCell \| null` | Celda activa (employeeId, dayId, assignmentId, currentShiftCode, position) |
| `bulkSelection` | `BulkSelection` | Selección múltiple de celdas |

---

## 13. Exportación PDF y utilidad Presencias

### PDF (`export-pdf.ts`)
Exporta el grid mensual completo a PDF. Se invoca desde el botón "Exportar PDF" en `SchedulingClient`. Incluye nombre del mes, empleados, días y códigos de turno con colores.

### Presencias (`PresenciasTab` + `utils/presencias.ts`)
Herramienta **completamente offline** (sin llamadas a la API). El usuario:
1. Pega el schedule en formato Excel (tab-separated).
2. Hace clic en "Calcular".
3. Obtiene dos bloques de texto listos para copiar-pegar en las pestañas "Presencias" y "Variables" del Excel de nóminas.

No escribe nada en la base de datos.

---

**Ver también:**
- [`solver-setup.md`](./solver-setup.md) — Setup del daemon Python, OR-Tools, debugging
- [`AGENTS.md`](/AGENTS.md) — Referencia de arquitectura general y reglas del solver
- [`backend/db-mysql/MIGRATIONS_POLICY.md`](/backend/db-mysql/MIGRATIONS_POLICY.md) — Política de migraciones
