# Índice General - Sistema Hotel DB

## Estructura de Carpetas

```
db-mysql/
├── aiven/                    # Scripts para desarrollo (utf8mb4_0900_ai_ci)
│   ├── 01_create_database.sql
│   ├── 02_core_tables.sql
│   ├── 03_logbook_tables.sql
│   ├── 04_parking_tables.sql
│   ├── 05_parking_functions_triggers.sql
│   ├── 06_parking_procedures.sql
│   ├── 07_parking_initial_data.sql
│   ├── 08_parking_sample_data.sql
│   ├── 09_conciliation.sql
│   ├── 10_group-tracking.sql
│   ├── 11_cashier.sql
│   ├── 12_blacklist.sql
│   ├── 13_maintenance.sql
│   ├── 14_messages.sql
│   ├── 15_demo_user.sql
│   ├── 16_backoffice.sql
│   ├── 17_notifications.sql
│   ├── 18_user_avatar.sql
│   ├── 19_scheduling.sql
│   ├── 99_verification.sql
│   └── aiven-conexion.md
│
├── backup/
│   ├── backup_hotel_db-local.sql
│   └── backup_hotel_db-aiven.sql
│
├── MASTER_INSTALL.sql        # Instalación completa (apunta a aiven/)
├── INDEX.md
├── README.md
├── cleanup-scheduling.sql
└── mock-data.sql        # Vacía los módulos y carga datos ficticios (no toca usuarios ni horarios)
```

---

## Módulos del Sistema

> ⚠️ **Los archivos `aiven/NN_*.sql` están congelados desde 2026-05-20** como snapshot del install base. Cualquier cambio posterior vive en `scripts/`. Ver `MIGRATIONS_POLICY.md`.

### Core (01-03)

| #   | Archivo                  | Descripción         | Tablas                                                             |
| --- | ------------------------ | ------------------- | ------------------------------------------------------------------ |
| 01  | `01_create_database.sql` | Crea DB con UTF-8   | -                                                                  |
| 02  | `02_core_tables.sql`     | Sistema de usuarios | `roles`, `departments`, `users`                                    |
| 03  | `03_logbook_tables.sql`  | Bitácora            | `logbooks`, `logbook_comments`, `logbook_reads`, `logbook_history` |

### Parking (04-08)

| #   | Archivo                             | Descripción          | Componentes                                                                                      |
| --- | ----------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------ |
| 04  | `04_parking_tables.sql`             | Tablas parking       | `parking_spots`, `parking_vehicles`, `parking_rates`, `parking_bookings`, `parking_availability` |
| 05  | `05_parking_functions_triggers.sql` | Funciones y triggers | `check_availability()`, `get_total_availability()`, triggers automáticos                         |
| 06  | `06_parking_procedures.sql`         | Procedimientos       | `generate_availability()`, `get_available_spots()`, etc.                                         |
| 07  | `07_parking_initial_data.sql`       | Datos iniciales      | 20 plazas, 30 tarifas                                                                            |
| 08  | `08_parking_sample_data.sql`        | Datos de ejemplo     | Opcional                                                                                         |

### Módulos Adicionales (09-19)

| #   | Archivo                 | Descripción            | Tablas                                                                                                                          |
| --- | ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 09  | `09_conciliation.sql`   | Conciliación bancaria  | `conciliation_*` (4 tablas)                                                                                                     |
| 10  | `10_group-tracking.sql` | Seguimiento de grupos  | `hotel_groups`, `group_*` (6 tablas)                                                                                            |
| 11  | `11_cashier.sql`        | Sistema de caja        | `payment_methods`, `cashier_*` (9 tablas)                                                                                       |
| 12  | `12_blacklist.sql`      | Lista negra            | `blacklist_entries`                                                                                                             |
| 13  | `13_maintenance.sql`    | Mantenimiento          | `maintenance_*` (3 tablas)                                                                                                      |
| 14  | `14_messages.sql`       | Mensajería             | `conversations`, `conversation_participants`, `messages`                                                                        |
| 15  | `15_demo_user.sql`      | Usuario demo           | Rol `demo-admin` (id=7) + usuario `demo`                                                                                        |
| 16  | `16_backoffice.sql`     | Backoffice             | `bo_categories`, `bo_suppliers`, `bo_invoices`, `bo_invoice_history`, `bo_assets` + 3 vistas                                    |
| 17  | `17_notifications.sql`  | Notificaciones         | `notifications`, `notification_recipients`                                                                                      |
| 18  | `18_user_avatar.sql`    | Avatares de usuario    | Columnas `avatar_url`, `avatar_public_id` en `users` (Cloudinary)                                                               |
| 19  | `19_scheduling.sql`     | Programación de turnos | `scheduling_months`, `scheduling_assignments`, `scheduling_config`, `scheduling_employee_rules`, `scheduling_constraints`, etc. |

### Migraciones incrementales (`scripts/`)

> Scripts con etiqueta **[RETROACTIVE]** documentan cambios de schema que entraron históricamente editando directo `aiven/NN_*.sql` antes de que existiera la política de incrementales. Reconstruidos a posteriori desde git para trazabilidad completa. Todos son idempotentes (no-op contra BD ya actualizada).

| Fecha      | Archivo                                                | Descripción                                                                                                                                                                                                                                                                                                                                | Estado              |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 2025-12-20 | `20251220_add_backoffice.sql`                          | **[RETROACTIVE]** Módulo Backoffice: 5 tablas (`bo_categories`, `bo_suppliers`, `bo_invoices`, `bo_invoice_history`, `bo_assets`) + 3 vistas (`v_bo_invoices_detail`, `v_bo_monthly_summary`, `v_bo_suppliers_stats`). Commit `4bc0543`.                                                                                                   | ✅ local · ✅ Aiven |
| 2025-12-22 | `20251222_add_user_avatar_columns.sql`                 | **[RETROACTIVE]** Columnas `avatar_url` (VARCHAR 500) y `avatar_public_id` (VARCHAR 255) en `users` para almacenamiento Cloudinary. Commit `9f2b443`.                                                                                                                                                                                      | ✅ local · ✅ Aiven |
| 2025-12-24 | `20251224_add_scheduling.sql`                          | **[RETROACTIVE]** Módulo Scheduling completo: 10 tablas (`scheduling_config`, `scheduling_shifts`, `scheduling_employees`, `scheduling_employee_contracts`, `scheduling_employee_rules`, `scheduling_months`, `scheduling_days`, `scheduling_assignments`, `scheduling_constraints`, `scheduling_history`). Commits `86ea812` + `f438d81`. | ✅ local · ✅ Aiven |
| 2025-12-30 | `20251230_add_demo_activity_log.sql`                   | **[RETROACTIVE]** Tabla `demo_activity_log` para registrar intentos de escritura bloqueados de usuarios demo. Commit `68a4589`.                                                                                                                                                                                                            | ✅ local · ✅ Aiven |
| 2026-02-26 | `20260226_unify_collation.sql`                         | **[RETROACTIVE — marker]** Unificación de collation a `utf8mb4_0900_ai_ci` en todo `hotel_db` + fusión de `MASTER_INSTALL_AIVEN.sql` + `MASTER_INSTALL_LOCAL.sql` en uno único. Commit `f5d47d6`. Script es no-op informativo.                                                                                                             | ✅ local · ✅ Aiven |
| 2026-02-28 | `20260228_add_libre_number_column.sql`                 | **[RETROACTIVE]** Columna `libre_number` (INT) en `scheduling_assignments` para agrupar pares de libre semanales (1-45). Commit `142372d`. Companion TS: `add-libre-number.ts`, `backfill-libre-numbers.ts`.                                                                                                                               | ✅ local · ✅ Aiven |
| 2026-04-25 | `20260425_create_scheduling_employee_requests.sql`     | Nueva tabla `scheduling_employee_requests` — peticiones de turno de empleados (Fase 1 del solver). Referencia FK a `users(id)`.                                                                                                                                                                                                            | ✅ local · ✅ Aiven |
| 2026-05-12 | `20260512_disable_demo_user.sql`                       | **[RETROACTIVE]** Desactivación del usuario demo (`is_active=0`) tras hallazgo H1-12. Commit `5644aab`.                                                                                                                                                                                                                                    | ✅ local · ✅ Aiven |
| 2026-05-12 | `20260512_add_checklist_tables.sql`                    | Tablas del módulo checklist: `checklist_runs`, `checklist_step_state`, `checklist_event_log`, `checklist_config`. Daemon de reset diario. Commit `a9024a3`.                                                                                                                                                                                | ✅ local · ✅ Aiven |
| 2026-05-12 | `20260512_add_scheduling_solver_runs_and_requests.sql` | Tabla `scheduling_solver_runs` (logging estructurado de cada ejecución del solver CP-SAT) + ajustes a `scheduling_employee_requests`. Commit `a9024a3`.                                                                                                                                                                                    | ✅ local · ✅ Aiven |
| 2026-05-19 | `20260519_add_scheduling_employee_display_order.sql`   | Columna `display_order` en `scheduling_employees` para reordenar manualmente la lista en las UIs de scheduling. NULL = fallback alfabético. Idempotente.                                                                                                                                                                                   | ✅ local · ✅ Aiven |
| 2026-05-20 | `20260520_add_scheduling_employee_dates.sql`           | Columnas `start_date` y `end_date` en `scheduling_employees` para modelar tenencias parciales (altas y bajas a mitad de año). NULL = activo sin restricción. Idempotente.                                                                                                                                                                  | ✅ local · ✅ Aiven |
| 2026-05-20 | `20260520_add_shift_LI.sql`                            | Nuevo código `LI` (Libre Disposición) en `scheduling_shifts`. Día libre extraordinario fuera de la rotación semanal. Idempotente (`INSERT IGNORE`).                                                                                                                                                                                        | ✅ local · ✅ Aiven |
| 2026-05-20 | `20260520_insert_user_*.sql` (retirado)                | Alta de una recepcionista con su periodo en `scheduling_employees` (Ene-Feb 2026). El fichero se quitó el 2026-10-04 porque era una persona real; el alta ya estaba aplicada.                                                                                                                                     | ✅ local · ✅ Aiven |
| 2026-05-21 | `20260521_add_fnb_revenue.sql`                         | Módulo F&B Daily Revenue: `fnb_category` (seed 7 categorías Breakfast/Lunch/Dinner) + `fnb_daily_revenue` (valores diarios por código Opera). Idempotente.                                                                                                                                                                                 | ✅ local · ✅ Aiven |
| 2026-09-29 | `20260929_add_cashier_voucher_status_dates.sql`        | `justified_at` y `cancelled_at` (DATETIME NULL) en `cashier_vouchers`. El backend las escribía y los informes muestran la fecha de justificación, pero nunca existieron: justificar y cancelar vales fallaban siempre. Idempotente (`information_schema`).                                                                                   | ✅ local · ✅ Aiven |
| 2026-09-29 | `20260929_fix_cashier_daily_trigger.sql`               | Recrea `trg_cashier_shift_update_daily`: separa el cálculo de `income` (suma directa de `cashier_shifts`) del de pagos electrónicos (subquery agregado), eliminando la inflación por LEFT JOIN. No toca esquema; solo DDL del trigger. Aplicado manualmente en Aiven + recálculo de las 10 filas de `cashier_daily` desde origen.             | ✅ local · ✅ Aiven |
| 2026-10-04 | `20261004_add_messages_to_notifications_module.sql`    | Añade `messages` al ENUM `notifications.module`. Desde `9be16b1` el aviso de mensaje urgente se guarda con ese módulo y el INSERT fallaba en silencio («Data truncated»). Solo cambia la columna si tiene la definición anterior exacta. En local ya estaba (BD montada desde el baseline); en Aiven se aplicó el 2026-10-04.                 | ✅ local · ✅ Aiven |
| 2026-10-04 | `20261004_fix_parking_availability_triggers.sql`       | Recrea `trg_free_availability_on_status_change` (solo libera los días de la propia reserva) y `trg_update_availability_on_date_change` (solo ocupa días libres o propios). Antes completar, cancelar o mover una reserva podía liberar u ocupar días de otra. La comprobación de solapes está en `bookings.repository.ts`. Local tenía otro cuerpo de `date_change`; se parte del de Aiven. | ⏳ local · ✅ Aiven |
| 2026-10-05 | `20261005_add_is_demo_to_users.sql`                     | Añade `users.is_demo` (0 por defecto): marca la cuenta demo pública, que el backend lleva en el token y `demoRestriction` limita (ADR-038). Hay que aplicarla **antes** de desplegar el código: el login lee la columna. Solo añade la columna si no existe. En Aiven se aplicó el 2026-10-05, antes del código. | ✅ local · ✅ Aiven |
| 2026-10-05 | `20261005_add_demo_reset_log.sql`                       | Crea `demo_reset_log`: un registro por cada reinicio diario de la demo y por cada base de horarios guardada (ADR-038). La base vive en tablas `demo_snapshot_scheduling_*` que crea el backend al guardarla. Hay que aplicarla antes de desplegar el código. `CREATE TABLE IF NOT EXISTS`. | ✅ local · ✅ Aiven |
| 2026-10-05 | `20261005_complete_fresh_install.sql`                   | Completa una instalación desde cero: el baseline congelado no crea `cashier_history` (nombre de clave duplicado), `scheduling_assignments` (referencia a una tabla creada después) ni `demo_activity_log`, y deja `roles.name` en `varchar(50)`. Definiciones copiadas de Aiven. En Aiven no cambia nada; en local creó `demo_activity_log`, que faltaba. `pnpm setup:local` además corrige esos dos fallos del baseline en memoria. | ✅ local · ✅ Aiven (sin cambios) |
| 2026-10-05 | `20261005_fix_bo_monthly_summary_view.sql`              | Recrea `v_bo_monthly_summary` con `period` en el `GROUP BY`. Con `ONLY_FULL_GROUP_BY` (activo en Aiven y local) toda consulta a la vista fallaba con el error 1055 y `GET /api/backoffice/stats/monthly` respondía siempre 500. Mismas columnas y mismos grupos; comprobada contra un cálculo directo sobre `bo_invoices`. | ✅ local · ✅ Aiven |
| 2026-10-05 | `20261005_drop_demo_admin_role.sql`                     | Borra el rol `demo-admin` si ningún usuario lo tiene (ADR-038): la cuenta demo es un admin con `is_demo` y el código ya no conoce ese rol. En local no existía. | ✅ local (sin cambios) · ✅ Aiven |

### Verificación (99)

| #   | Archivo               | Descripción                   |
| --- | --------------------- | ----------------------------- |
| 99  | `99_verification.sql` | Verifica instalación completa |

---

## Instalación

### Desarrollo Local (MySQL 8.0+)

```bash
mysql -u root -p < MASTER_INSTALL.sql
```

### Aiven (Producción)

```bash
# Ver aiven/aiven-conexion.md para detalles de conexión
mysql -h HOST -P PORT -u USER -p --ssl-ca=../config/certs/ca-certificate.pem < MASTER_INSTALL.sql
```

---

## Notas

- **Collation**: `utf8mb4_0900_ai_ci` (MySQL 8.0+)
- SSL requerido para Aiven (ca-certificate.pem)
- **Política de migraciones**: ver [`MIGRATIONS_POLICY.md`](./MIGRATIONS_POLICY.md). Resumen: cambios de schema → script incremental idempotente en `scripts/` + registro en la tabla "Migraciones incrementales" de este archivo. **NO** editar archivos `aiven/NN_*.sql` (congelados desde 2026-05-20). **NO** ejecutar `MASTER_INSTALL.sql` ni los scripts numerados contra una BD con datos.

---

## Roles del Sistema

| ID  | Nombre        | Descripción                       |
| --- | ------------- | --------------------------------- |
| 1   | recepcionista | Usuario estándar (default)        |
| 2   | admin         | Administrador completo            |
| 3   | mantenimiento | Personal de mantenimiento         |
| 6   | group-admin   | Administrador de grupos           |
| 7   | demo-admin    | Usuario demo (permisos limitados) |

---

## Resumen de Tablas

### Total: ~50 tablas + 3 vistas

- **Core**: 3 tablas (roles, departments, users)
- **Logbook**: 4 tablas
- **Parking**: 5 tablas + funciones + triggers + procedimientos
- **Conciliation**: 4 tablas
- **Groups**: 6 tablas
- **Cashier**: 9 tablas
- **Blacklist**: 1 tabla
- **Maintenance**: 3 tablas
- **Messages**: 3 tablas
- **Notifications**: 2 tablas
- **Backoffice**: 5 tablas + 3 vistas
- **User Avatar**: 1 tabla
- **Scheduling**: 7+ tablas

---

**Versión**: 3.0  
**Fecha**: Febrero 2026
