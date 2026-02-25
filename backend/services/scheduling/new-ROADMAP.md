# ROADMAP - Reestructuración Sistema Scheduling

> Plan detallado paso a paso para migrar de generación automática a sistema manual.
> Orden de ejecución: de arriba a abajo. Cada fase depende de la anterior.

---

## FASE 0: Scripts de Limpieza y Reset de Base de Datos ✅ COMPLETADA

> **Prioridad: CRÍTICA** — Se ejecuta primero. Sin esto no se puede avanzar.
> Scripts ejecutados en Aiven. Schemas master (local + aiven) actualizados.
> Directorio: `backend/db-mysql/aiven/schedule-scripts/`

### 0.1 Script: Limpiar datos existentes

**Archivo:** `01_clean_scheduling_data.sql`

- Vaciar tablas en orden (respetando FK):
  ```
  DELETE FROM scheduling_history
  DELETE FROM scheduling_assignments
  DELETE FROM scheduling_constraints
  DELETE FROM scheduling_days
  DELETE FROM scheduling_months
  ```
- NO tocar: `scheduling_config`, `scheduling_shifts`, `scheduling_employees`, `scheduling_employee_contracts`, `scheduling_employee_rules`

### 0.2 Script: ALTER scheduling_months

**Archivo:** `02_alter_scheduling_months.sql`

- Cambiar ENUM status: `('draft', 'published')` — quitar `generated` y `archived`
- Eliminar columna `generated_at`
- Eliminar columna `generated_by` (y su FK `fk_sched_month_generated_by`)

### 0.3 Script: ALTER scheduling_history

**Archivo:** `03_alter_scheduling_history.sql`

- Cambiar ENUM action: quitar `generated` del ENUM
- Nuevos valores: `('created', 'published', 'unpublished', 'assignment_changed', 'constraint_added', 'constraint_approved', 'constraint_rejected', 'manual_edit', 'reset')`
- Se añade `reset` para el nuevo botón de resetear mes

### 0.4 Script: ALTER scheduling_assignments

**Archivo:** `04_alter_scheduling_assignments.sql`

- Eliminar columna `is_manual`
- Eliminar índice `idx_is_manual`

### 0.5 Script: Limpiar scheduling_config

**Archivo:** `05_clean_scheduling_config.sql`

- Eliminar key `ai_provider`
- Revisar y eliminar keys de scoring si existen (`scoring_weight_*`)
- Mantener: todas las keys de cobertura, noches, libres, descanso, etc.

### 0.6 Script: Actualizar 19_scheduling.sql (master)

**Archivo:** Editar directamente `backend/db-mysql/local/19_scheduling.sql`

- Actualizar el archivo master de creación de tablas para que refleje el nuevo esquema
- Este es el archivo que se usa para instalaciones limpias
- Debe coincidir con el resultado de aplicar las migraciones 01-05

### 0.7 Script: Verificación

**Archivo:** `07_verify_schema.sql`

- DESCRIBE de cada tabla scheduling\_\*
- Verificar que no quedan columnas huérfanas
- Verificar ENUMs correctos
- Verificar FKs correctas

---

## FASE 1: Archivar y Eliminar Código Backend ✅ COMPLETADA

> Mover lo que no se usa, eliminar lo que sobra. El código debe compilar después de esta fase.

### 1.1 Crear estructura de archivo ✅

```
backend/services/scheduling/archive/
├── ai/                    ← mover módulo IA completo
├── phases/                ← mover todas las fases
├── scoring/               ← mover sistema de scoring
└── schedule-generator-v2.ts  ← mover generador
```

### 1.2 Mover a archive/ ✅

- `ai/` → `archive/ai/` (todo el directorio) - ELIMINADO
- `phases/` → `archive/phases/` (todo el directorio) - ELIMINADO
- `scoring/` → `archive/scoring/` (todo el directorio) - ELIMINADO
- `schedule-generator-v2.ts` → `archive/schedule-generator-v2.ts` - ELIMINADO

**Nota:** El directorio archive fue posteriormente eliminado ya que el código no se usa y causaba errores de compilación.

### 1.3 Eliminar archivos obsoletos ✅

- `old-logica-nueva.md` ✅
- `old-ROADMAP.md` ✅
- `info-prompt.md` ✅
- Documentación interna de fases/scoring/AI (`.md` files dentro de archive) ✅

### 1.4 Limpiar types/ ✅

- Eliminado: `IPhase`, `PhaseResult`, `GenerationResult`, `BulkAssignment`, `EmployeeStats`, `DailyStats`
- Mantener tipos de validación, assignments, constraints, shifts, employees

### 1.5 Limpiar utils/ ✅

- Eliminado: `randomization.ts` (shuffle, randomInt ya no se usan)
- Mantener: `matrix.ts`, `day-helpers.ts` (usados por constraints/validación)
- Exports limpios en `utils/index.ts`

### 1.6 Verificar compilación ✅

- `pnpm typecheck` pasa sin errores
- Dependencia `@anthropic-ai/sdk` eliminada del package.json

---

## FASE 2: Adaptar Sistema de Validación (Backend) ✅ COMPLETADA

> El validador actual (`schedule-validator.ts`) ya funciona. Hay que adaptarlo para tiempo real.

### 2.1 Refactorizar schedule-validator.ts ✅

- Extraída lógica de `FinalValidationPhase` al propio validador
- Eliminado import de `phases/final-validation.phase.js`
- El validador funciona de forma autónoma

### 2.2 Verificar constraints ✅

- Todos los constraints revisados: coverage, night-block, consecutive-rest, max-consecutive-work, rotation-continuity, monthly-libre
- No tienen dependencias de campos exclusivos de generación

### 2.3 Añadir validación de reglas de empleado ✅

- Creado `employee-rules.constraint.ts`:
  - Turno fijo no respetado → warning
  - Fin de semana asignado con regla `no_weekends` → warning
  - Max/min turnos por mes excedidos → warning
  - Prioridad de turno no respetada → info/warning

### 2.4 Optimización para tiempo real

- Pendiente de implementar

**Mejora propuesta (pendiente): Validación en tiempo real en 1 request**

- Problema actual: tras `updateAssignment` se hace una segunda llamada a `validateSchedule` para refrescar warnings.
- Objetivo: reducir a 1 request.
- Propuesta:
  - Modificar `PATCH /api/scheduling/assignments/:id` para que devuelva también el resultado de validación.
  - Respuesta sugerida:
    - `assignment`: la asignación actualizada
    - `validation`: `{ errors: GenerationWarning[], warnings: GenerationWarning[], stats: ... }`
  - El backend, tras persistir el cambio, ejecuta `validateSchedule(monthId)` y lo incluye en la respuesta.
  - El frontend deja de llamar a `validateSchedule` y usa `validation` del response para actualizar `ValidationWarnings`.
  - Nota: si el rendimiento fuese un problema, se podría implementar validación incremental más adelante.

---

## FASE 3: Adaptar Endpoints Backend ✅ COMPLETADA

### 3.1 Eliminar endpoint de generación ✅

- Eliminado `POST /api/scheduling/months/:id/generate`
- Controller y routes actualizados

### 3.2 Adaptar creación de mes ✅

- `POST /api/scheduling/months` — mantener
- Pre-carga assignments desde peticiones aprobadas (`status='approved'`)
- Mapear: vacation→V, sick_leave→IT, sick_day→E, training→FO, holiday→B, request_off→L

- `POST /api/scheduling/months/:id/reset`
- Elimina todos los `scheduling_assignments` del mes.
- Ejecuta la **Inicialización Total** (peticiones aprobadas + 'L' por defecto para TODOS los empleados seleccionados).
- Registra acción `reset` en `scheduling_history`.
- Solo permitido en estado `draft`.

### 3.4 Adaptar publicar/despublicar ✅

- `unpublishMonth` ahora revierte a `draft` (no `generated`)
- Añadido TODO para calcular acumulados al publicar (Fase 5)

### 3.5 Adaptar edición de celda

- Pendiente de implementar ( Fase 4)

### 3.6 Nuevo endpoint: Info del mes ✅

- `GET /api/scheduling/months/:id/info`
- Devuelve: reglas de empleados activas, peticiones aprobadas del mes, resumen informativo

---

## FASE 4: Adaptar Frontend ✅ PARCIALMENTE COMPLETADA

### 4.1 SchedulingClient.tsx ✅

- Eliminar `generateMutation` y lógica de generación
- Eliminar botones "Generar" / "Regenerar"
- Añadir botón "Resetear" (visible en `draft`, pide confirmación)
- Mantener: Publicar, Despublicar, Exportar PDF
- Renombrar `generationWarnings` → `validationWarnings`
- Validación en tiempo real: actualizar warnings desde la respuesta de `updateAssignmentMutation`

### 4.2 ScheduleGrid.tsx ⏳ PENDIENTE

- Celdas precargadas (peticiones aprobadas): marcar visualmente como bloqueadas (icono candado, borde diferente, no editable)
  Esto requiere cambios en el backend para marcar qué asignaciones vienen de peticiones aprobadas. Actualmente el sistema precarga las asignaciones pero no las marca como "bloqueadas".
  Opciones:

1. Añadir campo isLocked en las asignaciones desde el backend (requiere cambios en BD y repo)
2. Proporcionar lista de constraints aprobadas al frontend y comparar

- Grid editable en `draft` (en `published` NO se puede editar; hay que despublicar)
- Sin otros cambios mayores en la estructura

#### Plan de implementación (Opción A: DB + repo + types + UI) — bloqueo de celdas por peticiones aprobadas

Objetivo: que las celdas derivadas de `scheduling_constraints` con `status='approved'` queden bloqueadas en el grid y el backend rechace su edición.

1. Base de datos (migración)

- Añadir a `scheduling_assignments`:
  - `source_constraint_id INT NULL` (FK a `scheduling_constraints.id`) o, alternativamente, `is_locked TINYINT(1) NOT NULL DEFAULT 0`.
- Recomendación: usar `source_constraint_id` porque permite trazabilidad y desbloqueo automático al cambiar el estado de la constraint.

2. Repository

- En la inicialización del mes (`createMonth` / `resetMonth`):
  - Al precargar una constraint aprobada, guardar `source_constraint_id` (y opcionalmente `is_locked=1`).
  - Si no hay constraint, guardar `source_constraint_id=NULL`.
- En `updateAssignment`:
  - Leer la asignación actual y si `source_constraint_id` no es null (o `is_locked=1`) entonces rechazar con `409` o `400`.

3. Types (backend)

- Extender el tipo/row de assignments para incluir:
  - `source_constraint_id?: number | null`
  - `is_locked?: boolean` (si se añade)
- Asegurar que `getMonthById` incluye este campo en `employees.assignments[dayNumber]`.

4. Controller / validaciones

- `PATCH /assignments/:id`:
  - Devolver error claro cuando la celda está bloqueada.
- Opcional: endpoint para desbloqueo indirecto (p.ej. al rechazar/eliminar la constraint).

5. Frontend UI

- En el modelo que llega a `ScheduleGrid`, cada celda debe exponer `isLocked` o `sourceConstraintId`.
- UI:
  - Mostrar icono de candado y estilo distinto.
  - Evitar abrir el selector de turnos en celdas bloqueadas.
  - Tooltip: "Celda bloqueada por petición aprobada".

6. Tests

- Backend:
  - Editar celda bloqueada → debe fallar.
  - Editar celda normal → debe funcionar.
- Frontend (si aplica):
  - Click en celda bloqueada no abre selector.

### 4.3 GenerationWarnings.tsx → ValidationWarnings.tsx ✅

- Renombrar componente y archivo
- Eliminar referencia a "tiempo de generación" y "intentos"
- Mantener: contadores errores/warnings, lista con iconos y colores
- Añadir indicador de "validando..." durante la llamada al endpoint

### 4.4 Nuevo: Panel informativo de reglas ✅

- Nuevo componente o sección colapsable debajo del grid
- Muestra reglas activas por empleado (texto legible)
- Muestra resumen de peticiones precargadas del mes
- Datos desde `GET /months/:id/info`

### 4.5 Limpiar código frontend ✅

- Eliminar importaciones y referencias a generación, IA, scoring
- Limpiar tipos/interfaces del frontend que ya no apliquen
- Limpiar API client functions de generación

---

## FASE 5: Acumulados Anuales y Totales ✅ COMPLETADA

### 5.1 Corregir annual-accumulators.service.ts ✅

- Ya estaba implementado correctamente en el repository
- La función `calculateAnnualTotals` filtra por meses con `status='published'`
- Usa `shift_code` correctamente (no había bug)

### 5.2 Flujo publicación → totales ✅

- Al publicar: solo marca `published_at`
- Al consultar anuales: filtra solo meses publicados y calcula desde cero
- Tab totals siempre consulta acumulados de meses publicados

---

## FASE 6: Testing

### 6.1 Limpiar tests existentes ✅ COMPLETADO

- Eliminar `backend/tests/scheduling/phases.test.ts` ✅
- Eliminar `backend/tests/scheduling/phases-objective.test.ts` ✅
- Eliminar `backend/tests/scheduling/scoring.test.ts` ✅
- Eliminar `backend/tests/scheduling/ai-validator.test.ts` ✅
- Eliminar `backend/tests/scheduling/edge-cases.test.ts` ✅
- `constraints.test.ts` funciona correctamente (37 tests passing)

### 6.2 Nuevos tests ⏳ PENDIENTE

- Test: crear mes → pre-carga peticiones aprobadas correctamente
- Test: resetear mes → mantiene peticiones, borra el resto
- Test: validación detecta errores de cobertura, noches, descanso, etc.
- Test: validación detecta violación de reglas de empleado → warning
- Test: publicar → calcula acumulados correctamente
- Test: despublicar → vuelve a draft, acumulados se recalculan
- Test: editar celda bloqueada (petición aprobada) → rechazado
- Test: editar celda normal → respuesta incluye validación actualizada

> Nota: Los tests existentes de constraints pasan. Los nuevos tests requieren datos de prueba en BD.

---

## FASE 7: Limpieza Final

### 7.1 Actualizar CLAUDE.md

- Actualizar sección "Scheduling System" con nuevo flujo manual
- Eliminar referencias a generación automática, fases, scoring, IA

### 7.2 Limpieza de archivos

- Eliminar `logica-nueva.md` y `new-ROADMAP.md` (se traslada info relevante a código/CLAUDE.md)
- Verificar que no quedan archivos .md obsoletos

### 7.3 Decisión sobre archive/

- ✅ Archive eliminado completamente

### 7.4 Verificación final completa

- `pnpm typecheck` — sin errores
- `pnpm test` — todos los tests pasan
- Test manual flujo completo:
  1. Crear mes → grid con peticiones precargadas
  2. Editar celdas → validación en tiempo real
  3. Resetear → limpia grid, mantiene peticiones
  4. Completar horario → publicar → totales actualizados
  5. Despublicar → editar → republicar → totales recalculados

---

## Resumen de Fases

| Fase  | Descripción                                 | Estado        |
| ----- | ------------------------------------------- | ------------- |
| **0** | Scripts SQL: limpiar datos + migrar esquema | ✅ Completada |
| **1** | Archivar/eliminar código backend            | ✅ Completada |
| **2** | Adaptar validador y constraints             | ✅ Completada |
| **3** | Adaptar/crear endpoints backend             | ✅ Completada |
| **4** | Adaptar frontend (4.2 pendiente)            | ✅ Completada |
| **5** | Acumulados anuales y totals                 | ✅ Completada |
| **6** | Testing                                     | ⏳ Pendiente  |
| **7** | Limpieza final y documentación              | ⏳ Pendiente  |
