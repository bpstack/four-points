# Schedule Scripts - Migración de esquema

> Scripts de migración para reestructurar el sistema de scheduling de generación automática a manual.

## Ejecución

Desde `backend/`:

```bash
# Ejecutar todo de golpe (recomendado):
npx tsx db-mysql/aiven/schedule-scripts/run_all.ts

# O ejecutar scripts individuales en orden:
npx tsx db-mysql/aiven/schedule-scripts/01_clean_data.ts
npx tsx db-mysql/aiven/schedule-scripts/02_alter_months.ts
npx tsx db-mysql/aiven/schedule-scripts/03_alter_history.ts
npx tsx db-mysql/aiven/schedule-scripts/04_alter_assignments.ts
npx tsx db-mysql/aiven/schedule-scripts/07_add_source_constraint_id.ts
npx tsx db-mysql/aiven/schedule-scripts/05_clean_config.ts
npx tsx db-mysql/aiven/schedule-scripts/06_verify_all.ts
```

## Scripts y cambios

### 01_clean_data.ts

Vacía tablas transaccionales (datos mock de desarrollo):

- `TRUNCATE`: scheduling_history, scheduling_assignments, scheduling_constraints, scheduling_days, scheduling_months
- **PRESERVA**: scheduling_config, scheduling_shifts, scheduling_employees, scheduling_employee_contracts, scheduling_employee_rules

### 02_alter_months.ts

Modifica `scheduling_months`:

- Elimina FK `fk_sched_month_generated_by`
- Elimina columna `generated_at` (huérfana: ya no se genera automáticamente)
- Elimina columna `generated_by` (huérfana: ya no se genera automáticamente)
- Cambia ENUM status: `('draft','generated','published','archived')` → `('draft','published')`

### 03_alter_history.ts

Modifica `scheduling_history`:

- Cambia ENUM action: quita `'generated'`, añade `'reset'`
- Resultado: `('created','published','unpublished','assignment_changed','constraint_added','constraint_approved','constraint_rejected','manual_edit','reset')`

### 04_alter_assignments.ts

Modifica `scheduling_assignments`:

- Elimina índice `idx_is_manual`
- Elimina columna `is_manual` (huérfana: todo es manual ahora)

### 07_add_source_constraint_id.ts

Modifica `scheduling_assignments`:

- Añade columna `source_constraint_id` (FK a `scheduling_constraints.id`) para trazabilidad de celdas precargadas/bloqueadas.
- Añade índice `idx_source_constraint_id`.
- Añade FK `fk_sched_assign_source_constraint` (ON DELETE SET NULL).

### 05_clean_config.ts

Limpia `scheduling_config`:

- Elimina key `ai_provider` (ya no se usa IA)
- Elimina keys `scoring_weight_*` (ya no hay scoring)
- Elimina keys `ai_*` (cualquier config de IA residual)
- **Mantiene**: todas las keys de validación (cobertura, noches, libres, descanso, etc.)

### 06_verify_all.ts

Verificación completa post-migración:

- Comprueba que no quedan columnas huérfanas
- Verifica ENUMs correctos
- Verifica FKs (eliminadas y existentes)
- Verifica índices
- Verifica config limpia
- Verifica tablas transaccionales vacías
- Verifica datos de referencia intactos

### run_all.ts

Script maestro que ejecuta todos los pasos (01-06) secuencialmente con una única conexión al pool.

## Después de ejecutar

Actualizar manualmente los archivos de esquema master:

- `backend/db-mysql/aiven/19_scheduling.sql`
- `backend/db-mysql/local/19_scheduling.sql`

Para que reflejen el nuevo esquema (sin `generated_at`, `generated_by`, `is_manual`, con ENUMs actualizados, sin `ai_provider` en config).
