# 🚀 GUÍA DE MIGRACIÓN - HOTEL DB

Esta guía te permite reconstruir completamente la base de datos en cualquier momento.

## 📋 ORDEN DE EJECUCIÓN

Ejecuta los scripts en orden usando `MASTER_INSTALL.sql` o manualmente desde el directorio `aiven/`:

```bash
# Opción 1: Un solo comando (recomendado)
mysql -u root -p < MASTER_INSTALL.sql

# Opción 2: Manual, script por script (desde directorio aiven/)
cd aiven/
mysql -u root -p < 01_create_database.sql
mysql -u root -p < 02_core_tables.sql
# ... etc
```

### Scripts disponibles (01-19)

| # | Archivo | Descripción |
|---|---------|-------------|
| 01 | `01_create_database.sql` | Crea BD con UTF-8 |
| 02 | `02_core_tables.sql` | Roles, departments, users |
| 03 | `03_logbook_tables.sql` | Sistema de bitácora |
| 04 | `04_parking_tables.sql` | Tablas de parking |
| 05 | `05_parking_functions_triggers.sql` | Funciones y triggers |
| 06 | `06_parking_procedures.sql` | Procedimientos almacenados |
| 07 | `07_parking_initial_data.sql` | Datos iniciales (plazas + tarifas) |
| 08 | `08_parking_sample_data.sql` | Datos de ejemplo (opcional) |
| 09 | `09_conciliation.sql` | Conciliación bancaria |
| 10 | `10_group-tracking.sql` | Seguimiento de grupos |
| 11 | `11_cashier.sql` | Sistema de caja |
| 12 | `12_blacklist.sql` | Lista negra |
| 13 | `13_maintenance.sql` | Mantenimiento |
| 14 | `14_messages.sql` | Mensajería |
| 15 | `15_demo_user.sql` | Usuario demo |
| 16 | `16_backoffice.sql` | Backoffice |
| 17 | `17_notifications.sql` | Notificaciones |
| 18 | `18_user_avatar.sql` | Avatares de usuario |
| 19 | `19_scheduling.sql` | Programación de turnos |
| 99 | `99_verification.sql` | Verificación de instalación |

---

## ✅ VERIFICACIÓN POST-MIGRACIÓN

Después de ejecutar todos los scripts, verifica que todo esté correcto:

```sql
USE hotel_db;

-- Verificar tablas
SHOW TABLES;

-- Verificar plazas
SELECT COUNT(*) AS total_plazas FROM parking_spots;
-- Debe devolver: 20

-- Verificar tarifas
SELECT COUNT(*) AS total_tarifas FROM parking_rates;
-- Debe devolver: 30

-- Verificar disponibilidad
SELECT COUNT(*) AS total_disponibilidad FROM parking_availability;
-- Debe devolver: ~7300 (20 plazas × 365 días)

-- Verificar funciones
SELECT ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db'
  AND ROUTINE_TYPE = 'FUNCTION';

-- Verificar procedimientos
SELECT ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = 'hotel_db'
  AND ROUTINE_TYPE = 'PROCEDURE';

-- Verificar triggers
SELECT TRIGGER_NAME
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'hotel_db';
```

---

## 🔄 RESET COMPLETO

Si necesitas empezar desde cero (⚠️ CUIDADO: Borra TODO):

```bash
# 1. Hacer backup
mysqldump -u root -p hotel_db > backup_$(date +%Y%m%d).sql

# 2. Ejecutar instalación completa
mysql -u root -p < MASTER_INSTALL.sql
```

---

## 🛠️ MANTENIMIENTO

### Sincronización diaria automática (Parking)

Añade a cron (Linux/Mac) o usa evento MySQL:

```sql
USE hotel_db;

SET GLOBAL event_scheduler = ON;

CREATE EVENT daily_maintenance
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY + INTERVAL 3 HOUR)
DO
  CALL daily_parking_maintenance();
```

### Sincronización manual (Parking)

```sql
CALL sync_parking_availability();
```

---

## 📦 ESTRUCTURA DE ARCHIVOS

```
db-mysql/
├── aiven/
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
│   └── 99_verification.sql
├── MASTER_INSTALL.sql
├── INDEX.md
└── MIGRATION_GUIDE.md
```

---

## 🎯 CARACTERÍSTICAS DEL SISTEMA

### Parking

- **Generación automática de booking_code**: Formato `PK-YYYYMMDD-0001`
- **Control de disponibilidad**: Triggers mantienen sincronizada la tabla `parking_availability`
- **Integridad referencial flexible**: SET NULL para preservar historial

### Scheduling

- **Gestión de turnos mensuales**: Meses en estado `draft` o `published`
- **Bloqueo de celdas**: Assignments con `source_constraint_id` están bloqueados
- **Validación en tiempo real**: Validator evalúa constraints

---

## 🆘 TROUBLESHOOTING

### Error: "Foreign key constraint fails"
- Asegúrate de ejecutar los scripts en orden
- Verifica que la tabla `users` existe antes de crear `parking_bookings`

### Error: "Trigger already exists"
- Los scripts incluyen `DROP TRIGGER IF EXISTS`

### Error: "Function does not exist"
- Verifica que ejecutaste `05_parking_functions_triggers.sql`

### Disponibilidad no se actualiza (Parking)
```sql
CALL sync_parking_availability();
SHOW TRIGGERS LIKE 'parking_bookings';
```

---

## 📞 NOTAS IMPORTANTES

1. **Backup**: Siempre haz backup antes de cualquier migración
2. **Orden**: Los scripts DEBEN ejecutarse en orden
3. **UTF-8**: Todos los scripts usan `utf8mb4_0900_ai_ci` (MySQL 8.0+)
4. **Passwords**: Cambia las contraseñas por defecto
5. **Producción**: Revisa y ajusta las tarifas según tu negocio

---

**Última actualización**: Febrero 2026  
**Versión**: 2.0  
**Estado**: ✅ Producción
